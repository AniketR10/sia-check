import { useState } from 'react'
import { useSia } from '../sia/SiaContext'
import { APP_ID, INDEXER_URL } from '../sia/config'
import { shortHash } from '../lib/format'

export function Onboarding() {
  const { status, error, approvalUrl, newPhrase, beginRegistration, beginRegistrationWithPhrase } =
    useSia()
  const [mode, setMode] = useState<'choose' | 'phrase'>('choose')
  const [phrase, setPhrase] = useState('')
  const [busy, setBusy] = useState(false)

  const loadingWasm = status === 'loading-wasm'
  const awaiting = status === 'awaiting-approval'

  async function handleNew() {
    setBusy(true)
    await beginRegistration()
    setBusy(false)
  }

  async function handleExisting() {
    setBusy(true)
    await beginRegistrationWithPhrase(phrase)
    setBusy(false)
  }

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 text-2xl font-semibold">
          <span className="text-sia-green">◆</span> Sia Notes
        </div>
        <p className="text-sm text-sia-muted">
          Your private, encrypted notebook — stored on the Sia network.
        </p>
      </div>

      <div className="panel p-6">
        {loadingWasm && <LoadingWasm />}

        {awaiting && approvalUrl && <AwaitingApproval url={approvalUrl} phrase={newPhrase} />}

        {!loadingWasm && !awaiting && (
          <>
            {mode === 'choose' && (
              <div className="grid gap-3">
                <p className="text-sm text-sia-muted">
                  Create a new account or sign in with your recovery phrase to access your notebook.
                </p>
                <button className="btn-primary" onClick={handleNew} disabled={busy}>
                  {busy ? 'Generating…' : 'Create a new account'}
                </button>
                <button className="btn-ghost" onClick={() => setMode('phrase')} disabled={busy}>
                  I already have a recovery phrase
                </button>
              </div>
            )}

            {mode === 'phrase' && (
              <div className="grid gap-3">
                <div>
                  <label className="label">Recovery phrase</label>
                  <textarea
                    className="input mt-1 h-24 resize-none font-mono"
                    placeholder="Enter your 12-word recovery phrase…"
                    value={phrase}
                    onChange={(e) => setPhrase(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-sia-muted">
                    Your phrase is never stored or sent anywhere.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button className="btn-ghost flex-1" onClick={() => setMode('choose')} disabled={busy}>
                    Back
                  </button>
                  <button
                    className="btn-primary flex-1"
                    onClick={handleExisting}
                    disabled={busy || phrase.trim().split(/\s+/).length < 12}
                  >
                    {busy ? 'Connecting…' : 'Sign in'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between px-1 text-xs text-sia-muted">
        <span>
          Network: <span className="text-slate-300">{INDEXER_URL}</span>
        </span>
        <span>
          App: <span className="font-mono text-slate-300">{shortHash(APP_ID, 8, 6)}</span>
        </span>
      </div>
    </div>
  )
}

function LoadingWasm() {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-sia-muted">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-sia-border border-t-sia-green" />
      <p className="text-sm">Starting up…</p>
    </div>
  )
}

function AwaitingApproval({ url, phrase }: { url: string; phrase: string | null }) {
  return (
    <div className="grid gap-4">
      {phrase && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="label mb-2 text-amber-300">Save your recovery phrase</div>
          <code className="block rounded-md bg-black/40 p-3 font-mono text-sm leading-relaxed text-amber-100">
            {phrase}
          </code>
          <p className="mt-2 text-xs text-amber-200/80">
            This is the only way to access your account on another device. Write it down before
            continuing.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-sia-border bg-black/20 p-4">
        <div className="mb-1 font-medium text-slate-100">Authorize access</div>
        <p className="mb-3 text-sm text-sia-muted">
          Open the link below to authorize Sia Notes on your account. Come back here once done —
          we're waiting automatically.
        </p>
        <a className="btn-primary w-full" href={url} target="_blank" rel="noreferrer">
          Open authorization page ↗
        </a>
        <div className="mt-3 flex items-center gap-2 text-xs text-sia-muted">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-sia-border border-t-sia-green" />
          Waiting for authorization…
        </div>
      </div>
    </div>
  )
}
