import type { Account } from '@siafoundation/sia-storage'
import { formatBytes } from '../lib/format'

export function AccountStats({ account, noteCount }: { account: Account | null; noteCount: number }) {
  const used = account?.pinnedSize ?? 0
  const cap = account?.maxPinnedData ?? 0
  const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0

  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium text-slate-100">Account</h2>
        <span className="chip">from the indexer</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Metric label="Notes" value={`${noteCount}`} />
        <Metric label="Pinned data" value={formatBytes(used)} />
        <Metric
          label="Remaining"
          value={account ? formatBytes(account.remainingStorage) : '—'}
        />
      </div>

      {cap > 0 && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-sia-muted">
            <span>Storage used</span>
            <span>
              {formatBytes(used)} / {formatBytes(cap)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/40">
            <div className="h-full bg-sia-green" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/20 px-3 py-3 text-center">
      <div className="font-mono text-lg text-slate-100">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-sia-muted">{label}</div>
    </div>
  )
}
