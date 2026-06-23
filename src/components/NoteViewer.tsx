import { useEffect, useState } from 'react'
import type { Sdk } from '@siafoundation/sia-storage'
import { deleteNote, downloadBody, sealNote } from '../sia/notesService'
import type { NoteItem } from '../sia/useNotes'
import { useSia } from '../sia/SiaContext'
import { renderMarkdown } from '../lib/markdown'
import { formatBytes, formatDate, shortHash } from '../lib/format'
import { ShareModal } from './ShareModal'

interface NoteViewerProps {
  sdk: Sdk
  note: NoteItem
  onEdit: () => void
  onDeleted: () => void
}

export function NoteViewer({ sdk, note, onEdit, onDeleted }: NoteViewerProps) {
  const { refreshAccount } = useSia()
  const [body, setBody] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setBody(null)
    setError(null)
    downloadBody(sdk, note.object)
      .then((b) => {
        if (!cancelled) {
          setBody(b)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [note, sdk])

  function exportSealed() {
    try {
      const sealed = sealNote(sdk, note.object)
      const blob = new Blob([JSON.stringify(sealed, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${safeName(note.meta.title)}.sianote`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function remove() {
    if (!confirm(`Delete “${note.meta.title}”? This unpins it and prunes its slabs.`)) return
    setDeleting(true)
    setError(null)
    try {
      await deleteNote(sdk, note.id)
      await refreshAccount()
      onDeleted()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setDeleting(false)
    }
  }

  return (
    <div className="panel flex h-full flex-col p-5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-slate-100">{note.meta.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-sia-muted">
            <span className="chip">📁 {note.meta.folder}</span>
            {note.meta.tags.map((t) => (
              <span key={t} className="chip">
                #{t}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="btn-ghost px-3 py-1.5 text-xs" onClick={onEdit}>
            ✎ Edit
          </button>
          <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setSharing(true)}>
            🔗 Share
          </button>
          <button className="btn-ghost px-3 py-1.5 text-xs" onClick={exportSealed} title="Export encrypted offline bundle only you can re-open">
            ⬇ .sianote
          </button>
          <button className="btn-danger px-3 py-1.5 text-xs" onClick={remove} disabled={deleting}>
            {deleting ? '…' : '🗑'}
          </button>
        </div>
      </div>

      <dl className="mb-3 flex flex-wrap gap-x-5 gap-y-1 border-y border-sia-border py-2 text-[11px] text-sia-muted">
        <Meta k="Object ID" v={shortHash(note.id, 8, 6)} mono />
        <Meta k="On-network" v={formatBytes(note.object.encodedSize())} />
        <Meta k="Created" v={formatDate(note.meta.createdAt)} />
        <Meta k="Updated" v={formatDate(note.meta.updatedAt)} />
      </dl>

      {error && (
        <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-1">
        {body === null && !error ? (
          <div className="flex h-full items-center justify-center text-sm text-sia-muted">
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-sia-border border-t-sia-green" />
            Downloading & decrypting from hosts…
          </div>
        ) : body !== null && body.trim() === '' ? (
          <p className="text-sm italic text-sia-muted">This note is empty.</p>
        ) : body !== null ? (
          <article
            className="prose-note"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
          />
        ) : null}
      </div>

      {sharing && <ShareModal sdk={sdk} note={note} onClose={() => setSharing(false)} />}
    </div>
  )
}

function Meta({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <dt>{k}:</dt>
      <dd className={mono ? 'font-mono text-slate-300' : 'text-slate-300'}>{v}</dd>
    </div>
  )
}

function safeName(name: string): string {
  return name.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'note'
}
