import { useEffect, useState } from 'react'
import type { Host, Sdk } from '@siafoundation/sia-storage'
import { shortHash } from '../lib/format'

export function HostsPanel({ sdk }: { sdk: Sdk }) {
  const [hosts, setHosts] = useState<Host[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const result = await sdk.hosts({ country: undefined, limit: 12, offset: undefined })
      setHosts(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const countries = hosts ? new Set(hosts.map((h) => h.countryCode).filter(Boolean)) : new Set()

  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium text-slate-100">Storage providers</h2>
        <button className="chip hover:text-slate-200" onClick={load} disabled={loading}>
          {loading ? 'loading…' : '↻ refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {hosts && (
        <p className="mb-3 text-xs text-sia-muted">
          Showing <span className="text-slate-200">{hosts.length}</span> usable hosts across{' '}
          <span className="text-slate-200">{countries.size}</span> countries. Your shards spread
          across distinct providers — no single operator can take your data offline.
        </p>
      )}

      <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
        {hosts?.map((h) => (
          <div
            key={h.publicKey}
            className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-xs"
          >
            <span className="font-mono text-slate-300">{shortHash(h.publicKey, 10, 6)}</span>
            <span className="flex items-center gap-2 text-sia-muted">
              {h.countryCode || '??'}
              <span
                className={`h-2 w-2 rounded-full ${
                  h.goodForUpload ? 'bg-sia-green' : 'bg-sia-border'
                }`}
                title={h.goodForUpload ? 'good for upload' : 'not currently good for upload'}
              />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
