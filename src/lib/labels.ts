// Copy of ohrr-app src/features/scan/labels.ts — keep in sync.
//
// Item labels for a label printer: a QR code (opens the item), a Code 128
// barcode (the app's scanner reads it), the code in big type, the item's name
// and who gave it. Painted on a canvas at the label's exact size, so the same
// picture prints from a phone (AirPrint / the printer's app), from a laptop
// (any label printer driver) or as a PDF with one label per page. Tall labels
// (3 in and up) get the photo too.
//
// Website differences: the tiny canvas helpers (loadImage, ensureFonts) and
// the code helpers (tagUrl, shortCode) are inlined here — the QR opens the
// APP's /t/CODE page, exactly as the tag sheets (PrintTags) do.
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import { APP_URL } from './constants'

const TAG_PREFIX = 'OHRR-'

/** The URL inside a label's QR code: the app's /t/CODE page (same as the tag sheets). */
export function tagUrl(code: string): string {
  return `${APP_URL}/t/${shortCode(code)}`
}

/** "OHRR-7K3PX" → "7K3PX" (what's printed large on the label). */
export function shortCode(code: string): string {
  return code.startsWith(TAG_PREFIX) ? code.slice(TAG_PREFIX.length) : code
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

async function ensureFonts(sizes: string[]): Promise<void> {
  try {
    await Promise.all(sizes.map((s) => document.fonts.load(s)))
  } catch {
    /* system fonts */
  }
}

export interface LabelSize {
  key: string
  label: string
  wIn: number
  hIn: number
}

/** Common thermal label sizes. Widths from 1½ to 4 inches; custom is allowed. */
export const LABEL_SIZES: LabelSize[] = [
  { key: '2.25x1.25', label: '2¼ × 1¼ in (57 × 32 mm)', wIn: 2.25, hIn: 1.25 },
  { key: '2x1', label: '2 × 1 in (51 × 25 mm)', wIn: 2, hIn: 1 },
  { key: '62x29', label: '62 × 29 mm (Brother DK roll)', wIn: 62 / 25.4, hIn: 29 / 25.4 },
  { key: '3x2', label: '3 × 2 in (76 × 51 mm)', wIn: 3, hIn: 2 },
  { key: '4x2', label: '4 × 2 in (102 × 51 mm)', wIn: 4, hIn: 2 },
  { key: '4x3', label: '4 × 3 in (102 × 76 mm)', wIn: 4, hIn: 3 },
  { key: '4x6', label: '4 × 6 in shipping label, with the photo', wIn: 4, hIn: 6 },
]
export const DEFAULT_LABEL_KEY = '2.25x1.25'
export const LABEL_DPI = 300

const SIZE_KEY = 'ohrr.labels.size'

/** The size this device prints (the printer's roll), remembered on the device. */
export function loadLabelSize(): LabelSize {
  try {
    const raw = localStorage.getItem(SIZE_KEY)
    if (raw) {
      const s = JSON.parse(raw) as LabelSize
      if (s && s.wIn > 0.5 && s.hIn > 0.5 && s.wIn <= 8.5 && s.hIn <= 11) return s
    }
  } catch {
    /* private mode */
  }
  return LABEL_SIZES.find((s) => s.key === DEFAULT_LABEL_KEY)!
}

export function saveLabelSize(s: LabelSize): void {
  try {
    localStorage.setItem(SIZE_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

export function customLabelSize(wIn: number, hIn: number): LabelSize {
  const w = Math.round(wIn * 100) / 100
  const h = Math.round(hIn * 100) / 100
  return { key: `custom:${w}x${h}`, label: `${w} × ${h} in (custom)`, wIn: w, hIn: h }
}

export interface LabelItem {
  code: string
  title: string
  donated_by?: string | null
  photo_url?: string | null
  /** "Silent Auction" / "Raffle prize" / … — printed small when given. */
  kindLabel?: string | null
}

/** A photo from storage, loaded so the canvas can still be exported (CORS). */
function loadPhoto(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width <= maxWidth || !line) {
      line = test
    } else {
      lines.push(line)
      line = w
      if (lines.length === maxLines) break
    }
  }
  if (lines.length < maxLines && line) lines.push(line)
  // a word longer than the line, or the last line overflowing: trim with an ellipsis
  return lines.slice(0, maxLines).map((l, i) => {
    const last = i === maxLines - 1 && (lines.length > maxLines || words.join(' ') !== lines.join(' '))
    let s = l
    while (s && ctx.measureText(last ? `${s}…` : s).width > maxWidth) s = s.slice(0, -1)
    return last && s !== l ? `${s}…` : s
  })
}

function barcodeImage(code: string, widthPx: number, heightPx: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  JsBarcode(c, code, {
    format: 'CODE128',
    displayValue: false,
    margin: 0,
    width: 3,
    height: Math.max(20, Math.round(heightPx)),
    background: '#ffffff',
    lineColor: '#000000',
  })
  void widthPx
  return c
}

/**
 * Paint one label. The canvas becomes exactly wIn×hIn inches at LABEL_DPI.
 * Everything scales with the label's height, so a 1-inch and a 6-inch label
 * both read well.
 */
export async function renderLabel(canvas: HTMLCanvasElement, item: LabelItem, size: LabelSize, dpi = LABEL_DPI): Promise<void> {
  const W = Math.round(size.wIn * dpi)
  const H = Math.round(size.hIn * dpi)
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  await ensureFonts(['800 40px "Nunito"', '900 80px "Nunito"', '600 40px "Open Sans"'])

  const m = Math.round(0.07 * dpi) // margin
  const tall = size.hIn >= 3 && !!item.photo_url
  let top = m

  // Tall labels: the photo across the top (about 45% of the height).
  if (tall) {
    const img = await loadPhoto(item.photo_url!)
    const boxH = Math.round(H * 0.45)
    if (img) {
      const scale = Math.min((W - 2 * m) / img.width, boxH / img.height)
      const dw = img.width * scale
      const dh = img.height * scale
      ctx.drawImage(img, (W - dw) / 2, top, dw, dh)
    }
    top += boxH + m
  }

  const bodyH = H - top - m
  const unit = bodyH // scale everything off the space left
  const barH = Math.round(Math.max(0.22 * dpi, unit * 0.2))
  const codeSize = Math.round(Math.max(0.16 * dpi, unit * 0.16))
  const brandSize = Math.round(Math.max(0.07 * dpi, unit * 0.075))
  const titleSize = Math.round(Math.max(0.11 * dpi, unit * 0.13))
  const smallSize = Math.round(Math.max(0.075 * dpi, unit * 0.085))

  // QR on the left, as tall as the text block allows.
  const qrSide = Math.round(Math.min(unit - barH - codeSize - m, W * 0.42))
  const qr = await QRCode.toDataURL(tagUrl(item.code), { errorCorrectionLevel: 'M', margin: 0, width: 600 }).then(loadImage)
  if (qr) ctx.drawImage(qr, m, top, qrSide, qrSide)

  // Text block to the right of the QR.
  const tx = m + qrSide + m
  const tw = W - tx - m
  let y = top
  ctx.fillStyle = '#0669ac'
  ctx.font = `800 ${brandSize}px "Nunito"`
  ctx.textBaseline = 'top'
  ctx.fillText('OHIO HOUSE RABBIT RESCUE', tx, y, tw)
  y += brandSize * 1.35

  ctx.fillStyle = '#0f172a'
  ctx.font = `900 ${titleSize}px "Nunito"`
  const titleLines = fitText(ctx, item.title || 'Untitled', tw, tall ? 3 : 2)
  for (const l of titleLines) {
    ctx.fillText(l, tx, y)
    y += titleSize * 1.15
  }

  ctx.fillStyle = '#334155'
  ctx.font = `600 ${smallSize}px "Open Sans"`
  const meta = [item.donated_by ? `From ${item.donated_by}` : null, item.kindLabel ?? null].filter(Boolean) as string[]
  for (const line of meta) {
    if (y + smallSize > top + qrSide) break
    const [only] = fitText(ctx, line, tw, 1)
    ctx.fillText(only, tx, y)
    y += smallSize * 1.3
  }

  // Bottom band: the barcode across the full width, the code under it.
  const bandTop = H - m - codeSize - Math.round(codeSize * 0.15) - barH
  const bar = barcodeImage(item.code, W - 2 * m, barH)
  const barW = Math.min(W - 2 * m, Math.round(bar.width * (barH / bar.height)))
  ctx.drawImage(bar, Math.round((W - barW) / 2), bandTop, barW, barH)
  ctx.fillStyle = '#0f172a'
  ctx.font = `900 ${codeSize}px "Courier New", monospace`
  ctx.textAlign = 'center'
  ctx.fillText(shortCode(item.code), W / 2, bandTop + barH + Math.round(codeSize * 0.15))
  ctx.textAlign = 'left'
}

/** One label as a PNG data URL (for previews and the print page). */
export async function labelDataUrl(item: LabelItem, size: LabelSize, dpi = LABEL_DPI): Promise<string> {
  const c = document.createElement('canvas')
  await renderLabel(c, item, size, dpi)
  return c.toDataURL('image/png')
}

/** All the labels as one PDF, one label per page at the label's size. */
export async function labelsPdf(items: LabelItem[], size: LabelSize): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'in', format: [size.wIn, size.hIn], orientation: size.wIn >= size.hIn ? 'landscape' : 'portrait' })
  for (let i = 0; i < items.length; i++) {
    if (i > 0) doc.addPage([size.wIn, size.hIn], size.wIn >= size.hIn ? 'landscape' : 'portrait')
    const png = await labelDataUrl(items[i], size, 203)
    doc.addImage(png, 'PNG', 0, 0, size.wIn, size.hIn)
  }
  return doc.output('blob')
}
