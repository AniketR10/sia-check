import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  AppKey,
  Builder,
  generateRecoveryPhrase,
  initSia,
  validateRecoveryPhrase,
  type Account,
  type Sdk,
} from '@siafoundation/sia-storage'
import { APP_KEY_STORAGE, APP_META, INDEXER_URL } from './config'
import type { ConceptId } from '../lib/concepts'

export type Status =
  | 'loading-wasm'
  | 'disconnected'
  | 'awaiting-approval' 
  | 'connected'

interface SiaContextValue {
  status: Status
  error: string | null
  sdk: Sdk | null
  account: Account | null
  /** App Key public key, for display. */
  publicKey: string | null
  /** The approval URL the user must visit while status === 'awaiting-approval'. */
  approvalUrl: string | null
  /** Recovery phrase generated for a brand-new user (show once, then forget). */
  newPhrase: string | null

  /** Concepts the user has exercised this session (for the live concept map). */
  usedConcepts: Set<ConceptId>
  markConcept: (...ids: ConceptId[]) => void

  /** Begin onboarding a NEW user: returns the recovery phrase to display. */
  beginRegistration: () => Promise<void>
  /** Begin onboarding with a recovery phrase the user already holds. */
  beginRegistrationWithPhrase: (phrase: string) => Promise<void>
  /** Forget the session: clears the saved App Key and drops the Sdk. */
  disconnect: () => void
  /** Re-fetch account stats from the indexer. */
  refreshAccount: () => Promise<void>
}

const SiaContext = createContext<SiaContextValue | null>(null)

export function SiaProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading-wasm')
  const [error, setError] = useState<string | null>(null)
  const [sdk, setSdk] = useState<Sdk | null>(null)
  const [account, setAccount] = useState<Account | null>(null)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [approvalUrl, setApprovalUrl] = useState<string | null>(null)
  const [newPhrase, setNewPhrase] = useState<string | null>(null)
  const [usedConcepts, setUsedConcepts] = useState<Set<ConceptId>>(new Set())

  // Hold the in-flight Builder across the async approval handshake.
  const builderRef = useRef<Builder | null>(null)

  const markConcept = useCallback((...ids: ConceptId[]) => {
    setUsedConcepts((prev) => {
      let changed = false
      const next = new Set(prev)
      for (const id of ids) {
        if (!next.has(id)) {
          next.add(id)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [])

  // Promote a freshly obtained Sdk into connected state and load account info.
  const adoptSdk = useCallback(
    async (next: Sdk) => {
      setSdk(next)
      setPublicKey(next.appKey().publicKey())
      setStatus('connected')
      setApprovalUrl(null)
      builderRef.current = null
      markConcept('apps', 'indexers')
      try {
        setAccount(await next.account())
      } catch {
        // Account stats are non-critical for entering the app.
      }
    },
    [markConcept],
  )

  // On mount: init WASM, then try a silent reconnect with a saved App Key.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initSia()
        const savedHex = localStorage.getItem(APP_KEY_STORAGE)
        if (!savedHex) {
          if (!cancelled) setStatus('disconnected')
          return
        }
        const builder = new Builder(INDEXER_URL, APP_META)
        const reconnected = await builder.connected(new AppKey(Uint8Array.fromHex(savedHex)))
        if (cancelled) return
        if (reconnected) {
          await adoptSdk(reconnected)
        } else {
          // Key no longer registered — fall back to onboarding.
          localStorage.removeItem(APP_KEY_STORAGE)
          setStatus('disconnected')
        }
      } catch (e) {
        if (!cancelled) {
          setError(errMessage(e))
          setStatus('disconnected')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [adoptSdk])

  // Shared approval handshake: request connection, surface the approval URL,
  // wait for the user to authorize, then register with the recovery phrase.
  const runApproval = useCallback(
    async (phrase: string) => {
      setError(null)
      const builder = new Builder(INDEXER_URL, APP_META)
      builderRef.current = builder
      await builder.requestConnection()
      setApprovalUrl(builder.responseUrl())
      setStatus('awaiting-approval')
      await builder.waitForApproval()
      const next = await builder.register(phrase)
      // Persist the derived App Key seed so the user reconnects silently later.
      localStorage.setItem(APP_KEY_STORAGE, next.appKey().export().toHex())
      await adoptSdk(next)
    },
    [adoptSdk],
  )

  const beginRegistration = useCallback(async () => {
    try {
      const phrase = generateRecoveryPhrase()
      setNewPhrase(phrase)
      await runApproval(phrase)
    } catch (e) {
      setError(errMessage(e))
      setStatus('disconnected')
    }
  }, [runApproval])

  const beginRegistrationWithPhrase = useCallback(
    async (phrase: string) => {
      try {
        validateRecoveryPhrase(phrase.trim())
        setNewPhrase(null)
        await runApproval(phrase.trim())
      } catch (e) {
        setError(errMessage(e))
        setStatus('disconnected')
      }
    },
    [runApproval],
  )

  const disconnect = useCallback(() => {
    localStorage.removeItem(APP_KEY_STORAGE)
    setSdk(null)
    setAccount(null)
    setPublicKey(null)
    setApprovalUrl(null)
    setNewPhrase(null)
    builderRef.current = null
    setStatus('disconnected')
  }, [])

  const refreshAccount = useCallback(async () => {
    if (!sdk) return
    try {
      setAccount(await sdk.account())
    } catch (e) {
      setError(errMessage(e))
    }
  }, [sdk])

  const value = useMemo<SiaContextValue>(
    () => ({
      status,
      error,
      sdk,
      account,
      publicKey,
      approvalUrl,
      newPhrase,
      usedConcepts,
      markConcept,
      beginRegistration,
      beginRegistrationWithPhrase,
      disconnect,
      refreshAccount,
    }),
    [
      status,
      error,
      sdk,
      account,
      publicKey,
      approvalUrl,
      newPhrase,
      usedConcepts,
      markConcept,
      beginRegistration,
      beginRegistrationWithPhrase,
      disconnect,
      refreshAccount,
    ],
  )

  return <SiaContext.Provider value={value}>{children}</SiaContext.Provider>
}

export function useSia(): SiaContextValue {
  const ctx = useContext(SiaContext)
  if (!ctx) throw new Error('useSia must be used within <SiaProvider>')
  return ctx
}

function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  try {
    return JSON.stringify(e)
  } catch {
    return 'Unknown error'
  }
}
