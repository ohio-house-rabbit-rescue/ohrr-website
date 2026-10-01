// Reading an OHRR label (QR or Code 128) or a shop barcode from a picture —
// the website's "Read the code from a photo", and the shared parts of the
// camera view (components/Scanner.tsx, a port of the app's Scanner.tsx).
//
// The browser's own BarcodeDetector is used where it exists (Chrome on a Mac,
// ChromeOS and Android): fast, nothing to download. Elsewhere — Chrome and
// Edge on Windows, Firefox, Safari — ZXing does the reading. ZXing is only
// downloaded the first time it's needed (a dynamic import), so the site's
// main bundle doesn't carry it.

export interface DetectedLike {
  rawValue: string
}
export interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement | ImageBitmap | HTMLCanvasElement): Promise<DetectedLike[]>
}
export interface BarcodeDetectorCtor {
  new (opts?: { formats?: string[] }): BarcodeDetectorLike
  getSupportedFormats?: () => Promise<string[]>
}

/** QR (OHRR labels), Code 128 (the label's bar), and shop barcodes. */
export const WANTED_FORMATS = ['qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128']

export function nativeDetector(): BarcodeDetectorCtor | null {
  const w = window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }
  return typeof w.BarcodeDetector === 'function' ? w.BarcodeDetector : null
}

/** A native detector for the formats this browser knows, or null. */
export async function makeNativeDetector(): Promise<BarcodeDetectorLike | null> {
  const Native = nativeDetector()
  if (!Native) return null
  let formats = WANTED_FORMATS
  try {
    const supported = await Native.getSupportedFormats?.()
    if (supported?.length) formats = WANTED_FORMATS.filter((f) => supported.includes(f))
  } catch {
    /* use the defaults */
  }
  if (!formats.length) return null
  try {
    return new Native({ formats })
  } catch {
    return null
  }
}

/** ZXing's reader, set up for the same formats (loaded on first use). */
export async function makeZxingReader() {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import('@zxing/browser'), import('@zxing/library')])
  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.QR_CODE,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
  ])
  hints.set(DecodeHintType.TRY_HARDER, true)
  return new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 })
}

/** The photo couldn't be opened at all (not a picture, or a kind this browser can't show). */
export class PhotoUnreadable extends Error {
  constructor() {
    super('That file couldn’t be opened as a picture. Try a JPEG or PNG photo, or type the code.')
  }
}

/** The picture drawn at most `maxPx` on its longest side. */
function canvasOf(bitmap: ImageBitmap, maxPx: number): HTMLCanvasElement {
  const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const ctx = canvas.getContext('2d')
  if (ctx) {
    // A white backing, so a PNG with a see-through background reads as dark-on-light.
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  }
  return canvas
}

/**
 * The text of the first code found in a photo, or null when there's none.
 * Throws PhotoUnreadable when the file isn't a picture this browser can open.
 * Tries the browser's own reader first, then ZXing at two sizes (a phone
 * photo is large; ZXing often finds a small label more easily scaled down).
 */
export async function readCodeFromImage(file: Blob): Promise<string | null> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new PhotoUnreadable()
  }
  try {
    const native = await makeNativeDetector()
    if (native) {
      try {
        const found = await native.detect(bitmap)
        const hit = found.find((f) => f.rawValue)
        if (hit) return hit.rawValue
      } catch {
        /* fall through to ZXing */
      }
    }
    const reader = await makeZxingReader()
    for (const size of [1600, 800, 2800]) {
      if (size > 1600 && Math.max(bitmap.width, bitmap.height) <= 1600) break
      try {
        const text = reader.decodeFromCanvas(canvasOf(bitmap, size)).getText()
        if (text) return text
      } catch {
        /* nothing at this size */
      }
    }
    return null
  } finally {
    bitmap.close()
  }
}
