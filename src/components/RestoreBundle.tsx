import { useState } from 'react'
import type { SealedObject, Sdk } from '@siafoundation/sia-storage'
import { openSealed } from '../sia/notesService'
import { decodeMetadata } from '../sia/metadata'
import { useSia } from '../sia/SiaContext'
import { Modal } from './Modal'

// CORE CONCEPT demo: sealed objects. A `.sianote` bundle is a self-contained,
// encrypted SealedObject that only this user's App Key can re-open. We parse it,
// open it back into a PinnedObject, and pin it to the notebook.
export function RestoreBundle({
  sdk,
  onClose,
  onRestored,
}: {
  sdk: Sdk
  onClose: () => void
  onRestored: () => void
}) {
  const { refreshAccount } = useSia()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function onFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const sealed = JSON.parse(await file.text()) as SealedObject
      const object = await openSealed(sdk, sealed)
      const meta = decodeMetadata(object.metadata(), object.id())
      await refreshAccount()
      setDone(meta.title)
      onRestored()
    } catch (e) {
      setError(
        e instanceof Error
          ? `Could not restore bundle: ${e.message}`
          : 'Could not restore bundle.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Restore from .sianote bundle" onClose={onClose}>
      <p className="mb-3 text-xs text-sia-muted">
        Select a <span className="font-mono">.sianote</span> file you previously exported. It’s a
        sealed, encrypted bundle that only your App Key can open — restoring re-pins it to your
        notebook.
      </p>

      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-sia-border bg-black/20 px-4 py-6 text-center hover:border-sia-green/50">
        <input
          type="file"
          accept=".sianote,application/json"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
          disabled={busy}
        />
        <span className="text-xl">🔓</span>
        <span className="text-sm text-sia-muted">
          {busy ? 'Opening…' : 'Click to choose a .sianote file'}
        </span>
      </label>

      {done && (
        <div className="mt-3 rounded-lg border border-sia-green/40 bg-sia-green/5 px-3 py-2 text-sm text-slate-200">
          Restored “{done}” to your notebook.
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button className="btn-ghost" onClick={onClose}>
          {done ? 'Done' : 'Cancel'}
        </button>
      </div>
    </Modal>
  )
}
