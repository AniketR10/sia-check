import { useEffect, useMemo, useState } from 'react'
import { encodedSize, type ShardProgress, type Sdk } from '@siafoundation/sia-storage'
import { DEFAULT_DATA_SHARDS, DEFAULT_PARITY_SHARDS } from '../sia/config'
import { parseTags } from '../sia/metadata'
import { createNote, downloadBody, editNote } from '../sia/notesService'
import type { NoteItem } from '../sia/useNotes'
import { useSia } from '../sia/SiaContext'
import { formatBytes } from '../lib/format'

interface NoteEditorProps {
  sdk: Sdk
  /** Existing note to edit, or null for a new note. */
  note: NoteItem | null
  defaultFolder: string
  onSaved: (id: string) => void
  onCancel: () => void
}

type Phase = 'idle' | 'loading' | 'saving' | 'pinning'

export function NoteEditor({ sdk, note, defaultFolder, onSaved, onCancel }: NoteEditorProps) {
  const { refreshAccount } = useSia()
  const isEdit = note !== null

  const [title, setTitle] = useState(note?.meta.title ?? '')
  const [folder, setFolder] = useState(note?.meta.folder ?? defaultFolder)
  const [tags, setTags] = useState(note?.meta.tags.join(', ') ?? '')
  const [body, setBody] = useState('')
  const [advanced, setAdvanced] = useState(false)
  const [dataShards, setDataShards] = useState(DEFAULT_DATA_SHARDS)
  const [parityShards, setParityShards] = useState(DEFAULT_PARITY_SHARDS)

  const [phase, setPhase] = useState<Phase>(isEdit ? 'loading' : 'idle')
  const [uploadedBytes, setUploadedBytes] = useState(0)
  const [hostKeys, setHostKeys] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  // Load the existing body (lazy — the list never downloaded it).
  useEffect(() => {
    let cancelled = false
    if (!note) return
    setPhase('loading')
    downloadBody(sdk, note.object)
      .then((b) => {
        if (!cancelled) {
          setBody(b)
          setPhase('idle')
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e))
          setPhase('idle')
        }
      })
    return () => {
      cancelled = true
    }
  }, [note, sdk])

  const bodyBytes = useMemo(() => new TextEncoder().encode(body).length, [body])
  const totalShards = dataShards + parityShards
  const overhead = totalShards / dataShards
  const overheadValid = overhead >= 1.5 && overhead <= 4
  const encoded = useMemo(() => {
    if (bodyBytes === 0) return 0
    try {
      return encodedSize(bodyBytes, dataShards, parityShards)
    } catch {
      return 0
    }
  }, [bodyBytes, dataShards, parityShards])

  const progressPct = encoded > 0 ? Math.min(100, (uploadedBytes / encoded) * 100) : 0
  const busy = phase === 'saving' || phase === 'pinning'

  async function save() {
    if (!title.trim() && !body.trim()) {
      setError('Add a title or some content first.')
      return
    }
    setError(null)
    setUploadedBytes(0)
    setHostKeys(new Set())
    setPhase('saving')

    const opts = {
      dataShards,
      parityShards,
      onShardUploaded: (p: ShardProgress) => {
        setUploadedBytes((b) => b + p.shardSize)
        setHostKeys((prev) => new Set(prev).add(p.hostKey))
      },
    }
    const fields = { title, tags: parseTags(tags), folder }

    try {
      let saved
      if (isEdit && note) {
        saved = await editNote(sdk, note.id, body, fields, note.meta.createdAt, opts)
      } else {
        saved = await createNote(sdk, body, fields, opts)
      }
      setPhase('pinning')
      await refreshAccount()
      onSaved(saved.id())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase('idle')
    }
  }

  return (
    <div className="panel flex h-full flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <input
          className="w-full bg-transparent text-lg font-semibold text-slate-100 outline-none placeholder:text-sia-muted"
          placeholder="Note title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
        />
        <div className="flex shrink-0 items-center gap-2">
          <button className="btn-ghost px-3 py-1.5 text-xs" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            className="btn-primary px-3 py-1.5 text-xs"
            onClick={save}
            disabled={busy || phase === 'loading' || !overheadValid}
          >
            {phase === 'saving' ? 'Saving…' : phase === 'pinning' ? 'Pinning…' : 'Save note'}
          </button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <label className="label">Folder</label>
          <input
            className="input mt-1"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            disabled={busy}
          />
        </div>
        <div>
          <label className="label">Tags (comma-separated)</label>
          <input
            className="input mt-1"
            placeholder="ideas, research"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            disabled={busy}
          />
        </div>
      </div>

      {phase === 'loading' ? (
        <div className="flex flex-1 items-center justify-center text-sm text-sia-muted">
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-sia-border border-t-sia-green" />
          Downloading & decrypting note body…
        </div>
      ) : (
        <textarea
          className="input flex-1 resize-none font-mono text-sm leading-relaxed"
          placeholder="Write in markdown…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={busy}
        />
      )}

      {isEdit && (
        <p className="mt-2 text-[11px] text-sia-muted">
          Objects are immutable: saving creates a <span className="text-slate-300">new object
          (new ID)</span> and unpins the previous version.
        </p>
      )}

      {/* Erasure-coding footer */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-black/20 px-3 py-2 text-xs text-sia-muted">
        <span>
          {bodyBytes > 0 ? formatBytes(bodyBytes) : '0 B'} raw → on-network{' '}
          <span className="text-slate-200">{formatBytes(encoded)}</span> · {totalShards} shards ·{' '}
          <span className={overheadValid ? '' : 'text-amber-300'}>{overhead.toFixed(2)}×</span>
        </span>
        <button className="hover:text-slate-200" onClick={() => setAdvanced((a) => !a)}>
          {advanced ? 'Hide erasure settings' : 'Erasure settings'}
        </button>
      </div>

      {advanced && (
        <div className="mt-2 grid grid-cols-2 gap-4 rounded-lg border border-sia-border bg-black/10 p-3">
          <Slider label="Data shards (N)" value={dataShards} min={1} max={30} onChange={setDataShards} disabled={busy} />
          <Slider label="Parity shards (M)" value={parityShards} min={0} max={60} onChange={setParityShards} disabled={busy} />
          {!overheadValid && (
            <p className="col-span-2 text-xs text-amber-300">
              The SDK constrains redundancy to the [1.5×, 4×] range. Adjust shards to save.
            </p>
          )}
        </div>
      )}

      {busy && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-sia-muted">
            <span>{phase === 'saving' ? 'Distributing encrypted shards…' : 'Pinning to indexer…'}</span>
            <span>{progressPct.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
            <div className="h-full bg-sia-green transition-all" style={{ width: `${phase === 'pinning' ? 100 : progressPct}%` }} />
          </div>
          {hostKeys.size > 0 && (
            <p className="mt-1 text-[11px] text-sia-muted">
              Shards on <span className="text-slate-200">{hostKeys.size}</span> distinct providers.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (n: number) => void
  disabled: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="label">{label}</label>
        <span className="font-mono text-sm text-slate-100">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-sia-green"
      />
    </div>
  )
}
