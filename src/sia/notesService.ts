import {
  PinnedObject,
  type SealedObject,
  type Sdk,
  type UploadOptions,
} from '@siafoundation/sia-storage'
import { DEFAULT_DATA_SHARDS, DEFAULT_PARITY_SHARDS } from './config'
import { decodeBody, encodeMetadata, metaFromBody, type NoteMeta } from './metadata'

export interface NoteFields {
  title: string
  tags: string[]
  folder: string
}

function bodyStream(body: string): ReadableStream<Uint8Array> {
  // Blob encodes strings as UTF-8, matching the UTF-8 TextDecoder on download.
  return new Blob([body]).stream()
}

function uploadOpts(extra?: Partial<UploadOptions>): UploadOptions {
  return {
    dataShards: DEFAULT_DATA_SHARDS,
    parityShards: DEFAULT_PARITY_SHARDS,
    maxInflight: 10,
    ...extra,
  }
}

/** Create a brand-new note: upload body -> attach metadata -> pin. */
export async function createNote(
  sdk: Sdk,
  body: string,
  fields: NoteFields,
  opts?: Partial<UploadOptions>,
): Promise<PinnedObject> {
  const object = await sdk.upload(new PinnedObject(), bodyStream(body), uploadOpts(opts))
  object.updateMetadata(encodeMetadata(metaFromBody(body, fields)))
  await sdk.pinObject(object)
  return object
}

/**
 * Edit a note. CORE CONCEPT: "Objects" are immutable — the ID is a hash of the
 * slab layout, so changing the body necessarily produces a NEW object with a new
 * ID. We upload+pin the new version, then unpin the old one. App-level continuity
 * (original createdAt) is carried in the metadata, not the object identity.
 */
export async function editNote(
  sdk: Sdk,
  oldId: string,
  body: string,
  fields: NoteFields,
  createdAt: string,
  opts?: Partial<UploadOptions>,
): Promise<PinnedObject> {
  const object = await sdk.upload(new PinnedObject(), bodyStream(body), uploadOpts(opts))
  object.updateMetadata(encodeMetadata(metaFromBody(body, fields, createdAt)))
  await sdk.pinObject(object)
  // Unpin the previous immutable version and reclaim its slabs.
  if (object.id() !== oldId) {
    await sdk.deleteObject(oldId)
    await sdk.pruneSlabs()
  }
  return object
}

/** Download and decode a note's body from the hosts. */
export async function downloadBody(sdk: Sdk, object: PinnedObject): Promise<string> {
  const buf = await new Response(sdk.download(object)).arrayBuffer()
  return decodeBody(new Uint8Array(buf))
}

/** Delete a note: unpin from the indexer, then prune unreferenced slabs. */
export async function deleteNote(sdk: Sdk, id: string): Promise<void> {
  await sdk.deleteObject(id)
  await sdk.pruneSlabs()
}

/**
 * Seal a note into a self-contained, encrypted offline bundle that only this
 * user's App Key can re-open. Returns the SealedObject for download as JSON.
 */
export function sealNote(sdk: Sdk, object: PinnedObject): SealedObject {
  return object.seal(sdk.appKey())
}

/** Restore a sealed bundle: open with the App Key, then pin it back. */
export async function openSealed(sdk: Sdk, sealed: SealedObject): Promise<PinnedObject> {
  const object = PinnedObject.open(sdk.appKey(), sealed)
  await sdk.pinObject(object)
  return object
}

export interface ImportResult {
  imported: number
  slabs: number
}

/**
 * Bulk-import markdown files. CORE CONCEPT: packed uploads — notes are small, so
 * packing many of them into shared slabs avoids wasting a whole slab (and its
 * erasure-coding overhead) per tiny file. Each resulting object gets metadata
 * derived from its file, then is pinned.
 */
export async function importMarkdownFiles(
  sdk: Sdk,
  files: File[],
  folder: string,
): Promise<ImportResult> {
  const packed = sdk.uploadPacked(uploadOpts())
  // Read bodies up front (we need them for metadata, and File streams are
  // single-use once handed to `add`).
  const bodies: string[] = []
  for (const file of files) {
    const text = await file.text()
    bodies.push(text)
    await packed.add(new Blob([text]).stream())
  }
  const slabs = packed.slabs()
  const objects = await packed.finalize()

  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i]
    const body = bodies[i] ?? ''
    const title = stripExt(files[i]?.name ?? `imported-${i + 1}`)
    obj.updateMetadata(encodeMetadata(metaFromBody(body, { title, tags: ['imported'], folder })))
    await sdk.pinObject(obj)
  }
  return { imported: objects.length, slabs }
}

function stripExt(name: string): string {
  return name.replace(/\.(md|markdown|txt)$/i, '')
}

export type { NoteMeta }
