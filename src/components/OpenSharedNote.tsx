import { useState } from 'react'
import type { PinnedObject, Sdk } from '@siafoundation/sia-storage'
import { decodeMetadata } from '../sia/metadata'
import { downloadBody } from '../sia/notesService'
import { renderMarkdown } from '../lib/markdown'
import { Modal } from './Modal'

// Consumes a share URL from ShareModal: resolves it against the indexer,
// decrypts with the key from the URL fragment, renders it, and optionally pins
// it to the current user's notebook.
export function OpenSharedNote({
  sdk,
  onClose,
  onSaved,
}: {
  sdk: Sdk
  onClose: () => void
  onSaved: () => void
}) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resolved, setResolved] = useState<{ object: PinnedObject; title: string; html: string } | null>(null)
  const [saved, setSaved] = useState(false)

  async function open() {
    setBusy(true)
    setError(null)
    try {
      const object = await sdk.sharedObject(url.trim())
      const meta = decodeMetadata(object.metadata(), object.id())
      const body = await downloadBody(sdk, object)
      setResolved({ object, title: meta.title, html: renderMarkdown(body) })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function saveToNotebook() {
    if (!resolved) return
    setBusy(true)
    setError(null)
    try {
      await sdk.pinObject(resolved.object)
      setSaved(true)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Open a shared note" onClose={onClose} wide={!!resolved}>
      {!resolved ? (
        <>
          <p className="mb-3 text-xs text-sia-muted">
            Paste a <span className="font-mono">sia://</span> share URL. The decryption key travels
            in the URL fragment and never reaches the indexer.
          </p>
          <div className="flex gap-2">
            <input
              className="input font-mono text-xs"
              placeholder="sia://…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button className="btn-primary shrink-0" onClick={open} disabled={busy || !url.trim()}>
              {busy ? 'Opening…' : 'Open'}
            </button>
          </div>
        </>
      ) : (
        <>
          <h4 className="mb-2 text-lg font-semibold text-slate-100">{resolved.title}</h4>
          <article className="prose-note max-h-[50vh] overflow-y-auto rounded-lg border border-sia-border bg-black/20 p-4" dangerouslySetInnerHTML={{ __html: resolved.html }} />
          <div className="mt-4 flex justify-end gap-2">
            <button className="btn-ghost" onClick={onClose}>
              Close
            </button>
            <button className="btn-primary" onClick={saveToNotebook} disabled={busy || saved}>
              {saved ? 'Saved ✓' : busy ? 'Saving…' : 'Save to my notebook'}
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
    </Modal>
  )
}
