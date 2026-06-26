import type { AppMetadata } from '@siafoundation/sia-storage'

export const APP_ID = import.meta.env.VITE_APP_ID as string
export const INDEXER_URL = (import.meta.env.VITE_INDEXER_URL as string) ?? 'https://sia.storage'

export const APP_META: AppMetadata = {
  appId: APP_ID,
  name: (import.meta.env.VITE_APP_NAME as string) ?? 'Sia Notes',
  description: (import.meta.env.VITE_APP_DESCRIPTION as string) ?? 'An encrypted, decentralized notebook',
  serviceUrl: (import.meta.env.VITE_APP_SERVICE_URL as string) ?? undefined,
  logoUrl: undefined,
  callbackUrl: undefined,
}

export const APP_KEY_STORAGE = 'sia-notes.appKey'

export const DEFAULT_DATA_SHARDS = Number(import.meta.env.VITE_DATA_SHARDS ?? 10)
export const DEFAULT_PARITY_SHARDS = Number(import.meta.env.VITE_PARITY_SHARDS ?? 20)
