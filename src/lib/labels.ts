// Copy of ohrr-app src/features/scan/labels.ts — keep in sync.
//
// Item labels for a label printer: a QR code (opens the item), a Code 128
// barcode (the app's scanner reads it), the number in big type (DON-00042 or a
// SKU like HAY-101-001), the item's name and who gave it — or, for a Hop Shop
// price label, the price. Painted on a canvas at the label's exact size, so the
// same picture prints from a phone (AirPrint / the printer's app), from a
// laptop (any label printer driver) or as a PDF with one label per page. Tall
// labels (3 in and up) get the photo too.
//
// A box of items prints a box label instead (update 46): the same QR and
// barcode, "BOX 12" in big type, where it's kept, and the names of the items
// inside, one per line — "+ 6 more — scan for the full list" when they don't
// all fit.
//
// Website differences: the tiny canvas helpers (loadImage, ensureFonts) are
// inlined here; the QR opens the APP's /t/CODE page (lib/codes.ts tagUrl).
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import { boxName, tagUrl } from './codes'

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

/** When this device's size was last picked (ms); 0 when never picked here. */
export function labelSizePickedAt(): number {
  try {
    const at = (JSON.parse(localStorage.getItem(SIZE_KEY) ?? '{}') as { pickedAt?: unknown }).pickedAt
    return typeof at === 'number' ? at : 0
  } catch {
    return 0
  }
}

export function saveLabelSize(s: LabelSize, pickedAt: number): void {
  try {
    localStorage.setItem(SIZE_KEY, JSON.stringify({ key: s.key, label: s.label, wIn: s.wIn, hIn: s.hIn, pickedAt }))
  } catch {
    /* ignore */
  }
}

/**
 * The rescue's label size (app_settings row {wIn, hIn, at}), shared by every
 * phone and computer. The last size picked stays until someone picks another:
 * whichever is newer — the rescue's or this device's own pick — is used.
 */
export const LABEL_SIZE_SETTING = 'label_size'

/** When the rescue's size was set (ms); 0 when not known. */
export function labelSizeSetAt(v: unknown): number {
  const at = (v as { at?: unknown } | null)?.at
  return typeof at === 'number' ? at : 0
}

/** A stored size, checked — null when missing or out of range. */
export function labelSizeFrom(v: unknown): LabelSize | null {
  const s = v as Partial<LabelSize> | null
  if (!s || typeof s.wIn !== 'number' || typeof s.hIn !== 'number') return null
  if (!(s.wIn >= 0.5 && s.hIn >= 0.5 && s.wIn <= 8.5 && s.hIn <= 11)) return null
  return LABEL_SIZES.find((p) => p.wIn === s.wIn && p.hIn === s.hIn) ?? customLabelSize(s.wIn, s.hIn)
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
  /** A Hop Shop price label: "OHRR HOP SHOP" on top and the price under the name. */
  shop?: boolean
  /** Printed on a shop label when given (leave out for a label without a price). */
  price_cents?: number | null
  /** A box label (update 46): the code is the box's BOX-00012. */
  box?: BoxLabel | null
}

export interface BoxLabel {
  /** The items inside, in the order they went in: each line is "DON-00001  Stuffed bunny". */
  items: { code: string; title: string }[]
  /** Where the box is kept. */
  location?: string | null
}

export const priceText = (cents: number) => `$${(cents / 100).toFixed(2)}`

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

/** Greedy word wrap; a word wider than the line stays on its own line. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (!line || ctx.measureText(test).width <= maxWidth) line = test
    else {
      lines.push(line)
      line = w
    }
  }
  if (line) lines.push(line)
  return lines
}

/** Cut a line so `line…` fits. */
function ellipsize(ctx: CanvasRenderingContext2D, line: string, maxWidth: number): string {
  if (ctx.measureText(line).width <= maxWidth) return line
  let s = line
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1)
  return `${s.trimEnd()}…`
}

/**
 * Lay the text out in at most `maxLines` lines, shrinking the type (down to
 * 55% of `basePx`) before cutting anything. Sets ctx.font to the size used.
 */
function fitBlock(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number, basePx: number, font: (px: number) => string): { lines: string[]; px: number } {
  let px = basePx
  while (px >= basePx * 0.55) {
    ctx.font = font(px)
    const lines = wrapLines(ctx, text, maxWidth)
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxWidth)) return { lines, px }
    px = Math.max(Math.floor(px * 0.92), px - 1)
  }
  px = Math.round(basePx * 0.55)
  ctx.font = font(px)
  const all = wrapLines(ctx, text, maxWidth)
  const lines = all.slice(0, maxLines).map((l, i) => (i === maxLines - 1 && all.length > maxLines ? ellipsize(ctx, `${l} ${all.slice(maxLines).join(' ')}`, maxWidth) : ellipsize(ctx, l, maxWidth)))
  return { lines, px }
}

function barcodeImage(code: string, heightPx: number): HTMLCanvasElement {
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
  return c
}

/**
 * Paint one label. The canvas becomes exactly wIn×hIn inches at `dpi`.
 * Everything scales with the label, so a 1-inch and a 6-inch label both read
 * well; names shrink to fit before they are ever cut.
 */
export async function renderLabel(canvas: HTMLCanvasElement, item: LabelItem, size: LabelSize, dpi = LABEL_DPI): Promise<void> {
  const W = Math.round(size.wIn * dpi)
  const H = Math.round(size.hIn * dpi)
  if (item.box) return renderBoxLabel(canvas, item, item.box, size, dpi)
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  await ensureFonts(['800 40px "Nunito"', '900 80px "Nunito"', '600 40px "Open Sans"'])

  const m = Math.round(0.07 * dpi) // margin
  const photo = size.hIn >= 3 && item.photo_url ? await loadPhoto(item.photo_url) : null
  let top = m

  // Tall labels: the photo across the top (about 45% of the height).
  if (photo) {
    const boxH = Math.round(H * 0.45)
    const scale = Math.min((W - 2 * m) / photo.width, boxH / photo.height)
    const dw = photo.width * scale
    const dh = photo.height * scale
    ctx.drawImage(photo, (W - dw) / 2, top + (boxH - dh) / 2, dw, dh)
    top += boxH + m
  }

  // Sizes scale with the space left, but never past what the width can carry.
  const bodyH = H - top - m
  const unit = Math.min(bodyH, W * 0.7)
  const barH = Math.round(Math.max(0.22 * dpi, unit * 0.2))
  const codeSize = Math.round(Math.min(Math.max(0.16 * dpi, unit * 0.16), W / 7))
  const qrSide = Math.round(Math.min(unit - barH - codeSize * 1.2 - m, W * 0.42))
  const tw = W - (m + qrSide + m) - m
  const brandSize = Math.round(Math.min(Math.max(0.07 * dpi, unit * 0.075), tw / 15))
  const titleSize = Math.round(Math.min(Math.max(0.11 * dpi, unit * 0.13), tw / 8))
  const smallSize = Math.round(Math.min(Math.max(0.075 * dpi, unit * 0.085), tw / 13))
  const contentH = qrSide + m + barH + Math.round(codeSize * 1.2)
  // Without a photo, sit the whole block in the middle of the label.
  if (!photo) top = Math.max(m, Math.round((H - contentH) / 2))

  // QR on the left.
  const qr = await QRCode.toDataURL(tagUrl(item.code), { errorCorrectionLevel: 'M', margin: 0, width: 600 }).then(loadImage)
  if (qr) ctx.drawImage(qr, m, top, qrSide, qrSide)

  // Text block to the right of the QR: brand, name (shrinks to fit), donor.
  const tx = m + qrSide + m
  let y = top
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#0669ac'
  const brand = fitBlock(ctx, item.shop ? 'OHRR HOP SHOP' : 'OHIO HOUSE RABBIT RESCUE', tw, 1, brandSize, (px) => `800 ${px}px "Nunito"`)
  ctx.fillText(brand.lines[0], tx, y)
  y += Math.round(brand.px * 1.35)

  // The name comes first and stays the biggest text: two lines (three with a
  // photo), shrinking before it is cut. Donor and kind fit in what is left.
  const bottom = top + qrSide + Math.round(m / 2)
  // A shop label keeps room for the price under the name.
  const showPrice = !!item.shop && item.price_cents != null
  const pricePx = Math.round(Math.min(titleSize * 1.15, tw / 4.5))
  const titleRoom = bottom - y - (showPrice ? Math.round(pricePx * 1.1) : 0)
  const titleLines = Math.max(1, Math.min(photo ? 3 : 2, Math.floor(titleRoom / (titleSize * 1.15))))
  ctx.fillStyle = '#0f172a'
  const title = fitBlock(ctx, item.title || 'Untitled', tw, titleLines, titleSize, (px) => `900 ${px}px "Nunito"`)
  for (const l of title.lines) {
    ctx.fillText(l, tx, y)
    y += Math.round(title.px * 1.15)
  }
  if (showPrice) {
    ctx.font = `900 ${pricePx}px "Nunito"`
    ctx.fillText(ellipsize(ctx, priceText(item.price_cents ?? 0), tw), tx, Math.min(y, bottom - pricePx))
    y += Math.round(pricePx * 1.1)
  }

  const meta = (item.shop ? [] : [item.donated_by ? `Gift of ${item.donated_by}` : null, item.kindLabel ?? null]).filter(Boolean) as string[]
  const metaPx = Math.min(smallSize, Math.round(title.px * 0.82))
  ctx.fillStyle = '#334155'
  ctx.font = `600 ${metaPx}px "Open Sans"`
  for (const line of meta) {
    if (y + metaPx > bottom) break
    ctx.fillText(ellipsize(ctx, line, tw), tx, y)
    y += Math.round(metaPx * 1.3)
  }

  // Under it all: the barcode across the label, the code beneath.
  const bandTop = top + qrSide + m
  const bar = barcodeImage(item.code, barH)
  const barW = Math.min(W - 2 * m, Math.round(bar.width * (barH / bar.height)))
  ctx.drawImage(bar, Math.round((W - barW) / 2), bandTop, barW, barH)
  ctx.fillStyle = '#0f172a'
  // The whole number, as big as the width allows (HAY-101-001 is 11 characters).
  let codePx = codeSize
  ctx.font = `900 ${codePx}px "Courier New", monospace`
  while (codePx > 12 && ctx.measureText(item.code).width > W - 2 * m) {
    codePx -= 2
    ctx.font = `900 ${codePx}px "Courier New", monospace`
  }
  ctx.textAlign = 'center'
  ctx.fillText(item.code, W / 2, bandTop + barH + Math.round(codeSize * 0.15))
  ctx.textAlign = 'left'
}

/**
 * The box label: QR on the left; the rescue, BOX and the number, where it's
 * kept and how many items to its right; the barcode and code across the
 * label; then the items inside, one per line — the item's code, then its name
 * ("DON-00001  Stuffed bunny"; OHRR's pick 2026-10-27). The lines shrink to
 * fit, then go in two columns, and only then end in "+ N more".
 */
async function renderBoxLabel(canvas: HTMLCanvasElement, item: LabelItem, box: BoxLabel, size: LabelSize, dpi: number): Promise<void> {
  const W = Math.round(size.wIn * dpi)
  const H = Math.round(size.hIn * dpi)
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  await ensureFonts(['800 40px "Nunito"', '900 80px "Nunito"', '600 40px "Open Sans"', '700 40px "Open Sans"'])
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'

  const m = Math.round(0.08 * dpi)
  const short = Math.min(W, H)
  let top = m

  // Top: QR, and the box's name beside it.
  const qrSide = Math.round(Math.min(short * 0.36, H * 0.3, 1.6 * dpi))
  const qr = await QRCode.toDataURL(tagUrl(item.code), { errorCorrectionLevel: 'M', margin: 0, width: 600 }).then(loadImage)
  if (qr) ctx.drawImage(qr, m, top, qrSide, qrSide)
  const tx = m + qrSide + m
  const tw = W - tx - m
  let y = top
  ctx.fillStyle = '#0f172a'
  const brand = fitBlock(ctx, 'OHIO HOUSE RABBIT RESCUE', tw, 1, Math.round(Math.max(0.08 * dpi, qrSide * 0.09)), (px) => `800 ${px}px "Nunito"`)
  ctx.fillText(brand.lines[0], tx, y)
  y += Math.round(brand.px * 1.3)
  const name = boxName(item.code).toUpperCase()
  let namePx = Math.round(qrSide * 0.42)
  ctx.font = `900 ${namePx}px "Nunito"`
  while (namePx > 14 && ctx.measureText(name).width > tw) {
    namePx -= 2
    ctx.font = `900 ${namePx}px "Nunito"`
  }
  ctx.fillText(name, tx, y)
  y += Math.round(namePx * 1.05)
  const infoPx = Math.round(Math.max(0.08 * dpi, qrSide * 0.1))
  ctx.font = `600 ${infoPx}px "Open Sans"`
  const count = `${box.items.length} item${box.items.length === 1 ? '' : 's'}`
  for (const line of [box.location ? box.location : null, count].filter(Boolean) as string[]) {
    if (y + infoPx > top + qrSide) break
    ctx.fillText(ellipsize(ctx, line, tw), tx, y)
    y += Math.round(infoPx * 1.3)
  }
  top += qrSide + m

  // The barcode across the label, the code under it.
  const barH = Math.round(Math.min(Math.max(0.3 * dpi, H * 0.07), 0.6 * dpi))
  const bar = barcodeImage(item.code, barH)
  const barW = Math.min(W - 2 * m, Math.round(bar.width * (barH / bar.height)))
  ctx.drawImage(bar, Math.round((W - barW) / 2), top, barW, barH)
  top += barH + Math.round(m / 3)
  const codePx = Math.round(Math.max(0.09 * dpi, infoPx))
  ctx.font = `900 ${codePx}px "Courier New", monospace`
  ctx.textAlign = 'center'
  ctx.fillText(item.code, W / 2, top)
  ctx.textAlign = 'left'
  top += Math.round(codePx * 1.2) + Math.round(m / 2)

  // A rule, then the items: code, then name.
  ctx.fillRect(m, top, W - 2 * m, Math.max(2, Math.round(dpi / 100)))
  top += m
  const bottom = H - m
  const room = bottom - top
  if (room < 0.12 * dpi) return
  const rows = box.items.map((it) => ({ code: it.code, title: it.title.trim() || 'Untitled' }))
  const maxPx = Math.round(Math.min(0.2 * dpi, short * 0.06))
  const minPx = Math.round(0.085 * dpi)
  if (rows.length === 0) {
    ctx.font = `600 ${maxPx}px "Open Sans"`
    ctx.fillStyle = '#0f172a'
    ctx.fillText(ellipsize(ctx, '(empty — scan items into this box)', W - 2 * m), m, top)
    return
  }
  const fits = (px: number, cols: number) => Math.floor(room / Math.round(px * 1.25)) * cols >= rows.length
  let px = maxPx
  let cols = 1
  while (px > minPx && !fits(px, 1)) px -= 1
  if (!fits(px, 1) && W >= 2.5 * dpi) {
    cols = 2
    px = maxPx
    while (px > minPx && !fits(px, 2)) px -= 1
  }
  const lineH = Math.round(px * 1.25)
  const perCol = Math.max(1, Math.floor(room / lineH))
  const capacity = perCol * cols
  const shown = rows.length > capacity ? rows.slice(0, capacity - 1) : rows
  const more = rows.length - shown.length
  const gap = m
  const colW = Math.floor((W - 2 * m - gap * (cols - 1)) / cols)
  ctx.fillStyle = '#0f172a'
  // The names line up after the widest code.
  const codeFont = `900 ${px}px "Courier New", monospace`
  ctx.font = codeFont
  const codeW = Math.min(Math.round(colW * 0.6), Math.max(...shown.map((r) => ctx.measureText(r.code).width)))
  const nameX = Math.round(codeW + px * 0.6)
  shown.forEach((r, i) => {
    const x = m + Math.floor(i / perCol) * (colW + gap)
    const ly = top + (i % perCol) * lineH
    ctx.font = codeFont
    ctx.fillText(ellipsize(ctx, r.code, codeW), x, ly)
    ctx.font = `600 ${px}px "Open Sans"`
    ctx.fillText(ellipsize(ctx, r.title, colW - nameX), x + nameX, ly)
  })
  if (more > 0) {
    const i = shown.length
    ctx.font = `800 ${px}px "Nunito"`
    const line = cols === 1 ? `+ ${more} more — scan for the full list` : `+ ${more} more (scan the box)`
    ctx.fillText(ellipsize(ctx, line, colW), m + Math.floor(i / perCol) * (colW + gap), top + (i % perCol) * lineH)
  }
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
  // Website: copies of one label (the same code and words) are painted once.
  const painted = new Map<string, string>()
  for (let i = 0; i < items.length; i++) {
    if (i > 0) doc.addPage([size.wIn, size.hIn], size.wIn >= size.hIn ? 'landscape' : 'portrait')
    const key = JSON.stringify(items[i])
    const png = painted.get(key) ?? (await labelDataUrl(items[i], size, 203))
    painted.set(key, png)
    doc.addImage(png, 'PNG', 0, 0, size.wIn, size.hIn)
  }
  return doc.output('blob')
}
