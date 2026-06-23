import { useState } from 'react'
import type { Sdk } from '@siafoundation/sia-storage'
import type { NoteItem } from '../sia/useNotes'

const DURATIONS = [
  { label: '1 hour', ms: 60 * 60 * 1000 },
  { label: '24 hours', ms: 24 * 60 * 60 * 1000 },
  { label: '7 days', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: '30 days', ms: 30 * 24 * 60 * 60 * 1000 },
]

export function ShareModal({
  sdk,
  note,
  onClose,
}: {
  sdk: Sdk
  note: NoteItem
  onClose: () => void
}) {
  const [durationMs, setDurationMs] = useState(DURATIONS[1].ms)
  const [url, setUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function generate() {
    setError(null)
    try {
      // CORE CONCEPT: sharing — a signed, time-limited URL. The decryption key
      // rides in the URL fragment and is never sent to the indexer.
      const validUntil = new Date(Date.now() + durationMs)
      setUrl(sdk.shareObject(note.object, validUntil))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function copy() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="panel w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-medium text-slate-100">Share “{note.meta.title}”</h3>
          <button className="text-sia-muted hover:text-slate-200" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-sia-muted">
          Generates a public, time-limited link anyone can use to read this note. It cannot be
          revoked once shared, and a recipient may save it to their own notebook.
        </p>

        <label className="label">Valid for</label>
        <div className="mt-1 grid grid-cols-4 gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.label}
              className={`btn ${durationMs === d.ms ? 'bg-sia-green text-black' : 'btn-ghost'} px-2 py-1.5 text-xs`}
              onClick={() => setDurationMs(d.ms)}
            >
              {d.label}
            </button>
          ))}
        </div>

        {!url ? (
          <button className="btn-primary mt-5 w-full" onClick={generate}>
            Generate share link
          </button>
        ) : (
          <div className="mt-5">
            <label className="label">
              Share URL (expires {new Date(Date.now() + durationMs).toLocaleString()})
            </label>
            <div className="mt-1 flex gap-2">
              <input className="input font-mono text-xs" readOnly value={url} />
              <button className="btn-ghost shrink-0" onClick={copy}>
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
