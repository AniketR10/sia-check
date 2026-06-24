import { useMemo, useState } from 'react'
import type { NoteItem } from '../sia/useNotes'
import { formatDate } from '../lib/format'

interface NoteListProps {
  notes: NoteItem[]
  loading: boolean
  selectedId: string | null
  onSelect: (note: NoteItem) => void
}

export function NoteList({ notes, loading, selectedId, onSelect }: NoteListProps) {
  const [query, setQuery] = useState('')
  const [folder, setFolder] = useState<string | null>(null)
  const [tag, setTag] = useState<string | null>(null)

  const folders = useMemo(() => {
    const counts = new Map<string, number>()
    for (const n of notes) counts.set(n.meta.folder, (counts.get(n.meta.folder) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [notes])

  const tags = useMemo(() => {
    const set = new Set<string>()
    for (const n of notes) for (const t of n.meta.tags) set.add(t)
    return [...set].sort()
  }, [notes])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return notes.filter((n) => {
      if (folder && n.meta.folder !== folder) return false
      if (tag && !n.meta.tags.includes(tag)) return false
      if (q) {
        const hay = `${n.meta.title} ${n.meta.preview} ${n.meta.tags.join(' ')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [notes, query, folder, tag])

  return (
    <div className="panel flex h-full flex-col overflow-hidden">
      <div className="border-b border-sia-border p-3">
        <input
          className="input"
          placeholder="Search notes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {(folders.length > 0 || tags.length > 0) && (
          <div className="mt-2 space-y-2">
            {folders.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <FilterChip label="All" active={folder === null} onClick={() => setFolder(null)} />
                {folders.map(([f, c]) => (
                  <FilterChip
                    key={f}
                    label={`📁 ${f} ${c}`}
                    active={folder === f}
                    onClick={() => setFolder(folder === f ? null : f)}
                  />
                ))}
              </div>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((t) => (
                  <FilterChip
                    key={t}
                    label={`#${t}`}
                    active={tag === t}
                    onClick={() => setTag(tag === t ? null : t)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && notes.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-sia-muted">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-sia-border border-t-sia-green" />
            Syncing from indexer…
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-sia-muted">
            {notes.length === 0 ? 'No notes yet. Create one to begin.' : 'No notes match your filters.'}
          </p>
        ) : (
          <ul>
            {filtered.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => onSelect(n)}
                  className={`w-full border-b border-sia-border/60 px-4 py-3 text-left transition hover:bg-white/5 ${
                    selectedId === n.id ? 'bg-sia-green/5' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-slate-100">{n.meta.title}</span>
                    {selectedId === n.id && <span className="text-xs text-sia-green">●</span>}
                  </div>
                  {n.meta.preview && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-sia-muted">{n.meta.preview}</p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-sia-muted">
                    <span>📁 {n.meta.folder}</span>
                    <span>·</span>
                    <span>{formatDate(n.updatedAt)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
        active
          ? 'border-sia-green/50 bg-sia-green/10 text-sia-green'
          : 'border-sia-border text-sia-muted hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  )
}
