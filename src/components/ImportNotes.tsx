import { useState } from 'react'
import type { Sdk } from '@siafoundation/sia-storage'
import { DEFAULT_FOLDER } from '../sia/metadata'
import { importMarkdownFiles } from '../sia/notesService'
import { useSia } from '../sia/SiaContext'
import { formatBytes } from '../lib/format'
import { Modal } from './Modal'

// CORE CONCEPT demo: packed uploads. Many small markdown files are packed into
// shared slabs (rather than one slab per tiny file) before being pinned.
export function ImportNotes({
  sdk,
  defaultFolder,
  onClose,
  onImported,
}: {
  sdk: Sdk
  defaultFolder: string
  onClose: () => void
  onImported: () => void
}) {
  const { refreshAccount } = useSia()
  const [files, setFiles] = useState<File[]>([])
  const [folder, setFolder] = useState(defaultFolder || DEFAULT_FOLDER)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ imported: number; slabs: number } | null>(null)

  const totalSize = files.reduce((n, f) => n + f.size, 0)

  async function run() {
    if (files.length === 0) return
    setBusy(true)
    setError(null)
    try {
      const res = await importMarkdownFiles(sdk, files, folder.trim() || DEFAULT_FOLDER)
      setResult(res)
      await refreshAccount()
      onImported()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Import markdown files" onClose={onClose}>
      <p className="mb-3 text-xs text-sia-muted">
        Select one or more <span className="font-mono">.md</span> files. They’re packed into shared
        slabs in a single upload — efficient for many small notes — then each is pinned as its own
        object.
      </p>

      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-sia-border bg-black/20 px-4 py-6 text-center hover:border-sia-green/50">
        <input
          type="file"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          multiple
          className="hidden"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          disabled={busy}
        />
        <span className="text-xl">📥</span>
        <span className="text-sm text-sia-muted">
          {files.length > 0
            ? `${files.length} file(s) · ${formatBytes(totalSize)}`
            : 'Click to choose markdown files'}
        </span>
      </label>

      <div className="mt-3">
        <label className="label">Import into folder</label>
        <input className="input mt-1" value={folder} onChange={(e) => setFolder(e.target.value)} disabled={busy} />
      </div>

      {result && (
        <div className="mt-3 rounded-lg border border-sia-green/40 bg-sia-green/5 px-3 py-2 text-sm text-slate-200">
          Imported <span className="font-medium">{result.imported}</span> notes packed into{' '}
          <span className="font-medium">{result.slabs}</span> shared slab(s).
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>
          {result ? 'Done' : 'Cancel'}
        </button>
        <button className="btn-primary" onClick={run} disabled={busy || files.length === 0}>
          {busy ? 'Importing…' : `Import ${files.length || ''}`}
        </button>
      </div>
    </Modal>
  )
}
