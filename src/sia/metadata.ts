export interface NoteMeta {
  title: string
  tags: string[]
  folder: string
  preview: string
  createdAt: string
  updatedAt: string
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export const DEFAULT_FOLDER = 'Notes'

export function metaFromBody(
  body: string,
  fields: { title: string; tags: string[]; folder: string },
  createdAt?: string,
): NoteMeta {
  const now = new Date().toISOString()
  return {
    title: fields.title.trim() || 'Untitled',
    tags: fields.tags,
    folder: fields.folder.trim() || DEFAULT_FOLDER,
    preview: makePreview(body),
    createdAt: createdAt ?? now,
    updatedAt: now,
  }
}

export function encodeMetadata(meta: NoteMeta): Uint8Array {
  return encoder.encode(JSON.stringify(meta))
}

export function encodeBody(body: string): Uint8Array {
  return encoder.encode(body)
}

export function decodeBody(bytes: Uint8Array): string {
  return decoder.decode(bytes)
}

export function decodeMetadata(bytes: Uint8Array, fallbackId: string): NoteMeta {
  if (!bytes || bytes.length === 0) return emptyMeta(fallbackId)
  try {
    const p = JSON.parse(decoder.decode(bytes)) as Partial<NoteMeta>
    return {
      title: p.title ?? `Note ${fallbackId.slice(0, 6)}`,
      tags: Array.isArray(p.tags) ? p.tags : [],
      folder: p.folder ?? DEFAULT_FOLDER,
      preview: p.preview ?? '',
      createdAt: p.createdAt ?? new Date().toISOString(),
      updatedAt: p.updatedAt ?? new Date().toISOString(),
    }
  } catch {
    return emptyMeta(fallbackId)
  }
}

export function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim().replace(/^#/, ''))
    .filter(Boolean)
}

function makePreview(body: string): string {
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.slice(0, 180)
}

function emptyMeta(fallbackId: string): NoteMeta {
  const now = new Date().toISOString()
  return {
    title: `Note ${fallbackId.slice(0, 6)}`,
    tags: [],
    folder: DEFAULT_FOLDER,
    preview: '',
    createdAt: now,
    updatedAt: now,
  }
}
