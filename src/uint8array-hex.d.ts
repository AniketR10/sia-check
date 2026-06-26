// TC39 "Uint8Array to/from base64 and hex" — not yet in TypeScript's lib.
interface Uint8Array {
  toHex(): string
}
interface Uint8ArrayConstructor {
  fromHex(hex: string): Uint8Array
}
