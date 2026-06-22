import { useCallback, useEffect, useState } from 'react'
import type { PinnedObject, Sdk } from '@siafoundation/sia-storage'
import { decodeMetadata, type NoteMeta } from './metadata'

export interface NoteItem {
  id: string
  object: PinnedObject
  meta: NoteMeta
  updatedAt: Date
}

const PAGE = 100

// CORE CONCEPT: "Pinning" / sync — the indexer exposes an object change-feed
// (`sdk.objectEvents`) rather than a list endpoint. We replay it from the start
// into a local map: each non-deleted event sets the latest object state, each
// deleted event removes it. The whole notebook list is built from METADATA only
// — note bodies are downloaded lazily, when a note is opened.
async function loadAll(sdk: Sdk): Promise<NoteItem[]> {
  const byId = new Map<string, NoteItem>()
  let cursor: { id: string; after: Date } | null = null

  for (;;) {
    const events = await sdk.objectEvents(cursor, PAGE)
    if (events.length === 0) break

    for (const ev of events) {
      if (ev.deleted || !ev.object) {
        byId.delete(ev.id)
      } else {
        byId.set(ev.id, {
          id: ev.id,
          object: ev.object,
          meta: decodeMetadata(ev.object.metadata(), ev.id),
          updatedAt: ev.updatedAt,
        })
      }
    }

    const last = events[events.length - 1]
    cursor = { id: last.id, after: last.updatedAt }
    if (events.length < PAGE) break
  }

  return [...byId.values()].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
}

export function useNotes(sdk: Sdk | null) {
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!sdk) return
    setLoading(true)
    setError(null)
    try {
      setNotes(await loadAll(sdk))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [sdk])

  useEffect(() => {
    void reload()
  }, [reload])

  return { notes, loading, error, reload }
}
