import { useEffect, useState } from 'react'
import type { Sdk } from '@siafoundation/sia-storage'
import { useSia } from '../sia/SiaContext'
import { useNotes, type NoteItem } from '../sia/useNotes'
import { DEFAULT_FOLDER } from '../sia/metadata'
import { shortHash } from '../lib/format'
import { INDEXER_URL } from '../sia/config'
import { AccountStats } from './AccountStats'
import { HostsPanel } from './HostsPanel'
import { NoteList } from './NoteList'
import { NoteEditor } from './NoteEditor'
import { NoteViewer } from './NoteViewer'
import { ImportNotes } from './ImportNotes'
import { RestoreBundle } from './RestoreBundle'
import { OpenSharedNote } from './OpenSharedNote'

// What the center pane is showing.
type View =
  | { kind: 'empty' }
  | { kind: 'viewing'; id: string }
  | { kind: 'editing'; id: string }
  | { kind: 'creating' }

type ModalKind = 'import' | 'restore' | 'shared' | null

export function Dashboard({ sdk }: { sdk: Sdk }) {
  const { account, publicKey, disconnect } = useSia()
  const { notes, loading, reload } = useNotes(sdk)
  const [view, setView] = useState<View>({ kind: 'empty' })
  const [modal, setModal] = useState<ModalKind>(null)

  const selectedId = view.kind === 'viewing' || view.kind === 'editing' ? view.id : null
  const selectedNote: NoteItem | null = selectedId
    ? notes.find((n) => n.id === selectedId) ?? null
    : null

  // If a selected note disappears (deleted/replaced and not re-found), reset.
  useEffect(() => {
    if ((view.kind === 'viewing' || view.kind === 'editing') && !selectedNote) {
      setView({ kind: 'empty' })
    }
  }, [view, selectedNote])

  async function afterSave(id: string) {
    await reload()
    setView({ kind: 'viewing', id })
  }

  async function afterDelete() {
    await reload()
    setView({ kind: 'empty' })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-sia-border px-4 py-3">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span className="text-sia-green">◆</span> Sia Notes
          </div>
          <p className="text-[11px] text-sia-muted">
            {INDEXER_URL} · app key{' '}
            <span className="font-mono text-slate-300">
              {publicKey ? shortHash(publicKey, 12, 6) : '—'}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => setView({ kind: 'creating' })}>
            ✎ New note
          </button>
          <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setModal('import')}>
            📥 Import .md
          </button>
          <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setModal('shared')}>
            🔗 Open shared
          </button>
          <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setModal('restore')}>
            🔓 Restore
          </button>
          <button className="btn-ghost px-3 py-1.5 text-xs" onClick={disconnect}>
            Disconnect
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[300px_1fr] xl:grid-cols-[300px_1fr_320px]">
        {/* Left: note list */}
        <div className="min-h-0 lg:h-[calc(100vh-7.5rem)]">
          <NoteList
            notes={notes}
            loading={loading}
            selectedId={selectedId}
            onSelect={(n) => setView({ kind: 'viewing', id: n.id })}
          />
        </div>

        {/* Center: editor / viewer */}
        <div className="min-h-0 lg:h-[calc(100vh-7.5rem)]">
          {view.kind === 'creating' && (
            <NoteEditor
              sdk={sdk}
              note={null}
              defaultFolder={DEFAULT_FOLDER}
              onSaved={afterSave}
              onCancel={() => setView({ kind: 'empty' })}
            />
          )}
          {view.kind === 'editing' && selectedNote && (
            <NoteEditor
              sdk={sdk}
              note={selectedNote}
              defaultFolder={selectedNote.meta.folder}
              onSaved={afterSave}
              onCancel={() => setView({ kind: 'viewing', id: selectedNote.id })}
            />
          )}
          {view.kind === 'viewing' && selectedNote && (
            <NoteViewer
              sdk={sdk}
              note={selectedNote}
              onEdit={() => setView({ kind: 'editing', id: selectedNote.id })}
              onDeleted={afterDelete}
            />
          )}
          {view.kind === 'empty' && <EmptyCenter onNew={() => setView({ kind: 'creating' })} />}
        </div>

        {/* Right rail: account + hosts */}
        <aside className="min-h-0 space-y-4 overflow-y-auto lg:col-span-2 xl:col-span-1 xl:h-[calc(100vh-7.5rem)]">
          <AccountStats account={account} noteCount={notes.length} />
          <HostsPanel sdk={sdk} />
        </aside>
      </div>

      {modal === 'import' && (
        <ImportNotes
          sdk={sdk}
          defaultFolder={selectedNote?.meta.folder ?? DEFAULT_FOLDER}
          onClose={() => setModal(null)}
          onImported={reload}
        />
      )}
      {modal === 'restore' && (
        <RestoreBundle sdk={sdk} onClose={() => setModal(null)} onRestored={reload} />
      )}
      {modal === 'shared' && (
        <OpenSharedNote sdk={sdk} onClose={() => setModal(null)} onSaved={reload} />
      )}
    </div>
  )
}

function EmptyCenter({ onNew }: { onNew: () => void }) {
  return (
    <div className="panel flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-4xl">🗒️</div>
      <div>
        <h2 className="text-lg font-medium text-slate-100">Your encrypted notebook</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-sia-muted">
          Select a note on the left, or create a new one. Every note is encrypted on your device,
          erasure-coded across storage providers, and pinned to the indexer.
        </p>
      </div>
      <button className="btn-primary" onClick={onNew}>
         Write your first note
      </button>
    </div>
  )
}
