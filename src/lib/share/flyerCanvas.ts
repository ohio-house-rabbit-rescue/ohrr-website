// A letter-size QR flyer painted on a canvas — the website's copy of the
// app's renderFlyer (ohrr-app/src/features/share/flyers.ts), used where a
// flyer is made from data rather than picked from Staff → Flyers (a volunteer
// call's flyer). The QR points at a UTM-tagged page, like every flyer.
import QRCode from 'qrcode'
import { OHRR } from '../constants'
import { BRAND_BLUE, BRAND_ORANGE } from './render'
import { LETTER_H, LETTER_W, loadImage, roundRect, wrap } from './canvas'
import { SHARE_SITE_SHORT, utm } from './templates'

export interface CanvasFlyer {
  kicker: string
  headline: string
  lines: string[]
  cta: string
  path: string
  campaign: string
  accent: 'blue' | 'orange'
}

export async function renderFlyer(canvas: HTMLCanvasElement, f: CanvasFlyer, logoUrl = '/img/ohrr-mark.png'): Promise<void> {
  canvas.width = LETTER_W
  canvas.height = LETTER_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not available')
  const display = 'Nunito'
  const body = 'Open Sans'
  try {
    await Promise.all([document.fonts.load(`900 120px "${display}"`), document.fonts.load(`800 48px "${display}"`), document.fonts.load(`600 44px "${body}"`)])
  } catch {
    /* system fonts */
  }
  const accent = f.accent === 'orange' ? BRAND_ORANGE : BRAND_BLUE
  const [logo, qr] = await Promise.all([
    loadImage(logoUrl),
    QRCode.toDataURL(utm(f.path, f.campaign, 'print'), { errorCorrectionLevel: 'M', margin: 1, width: 600 }).then(loadImage),
  ])

  // page + border
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, LETTER_W, LETTER_H)
  ctx.lineWidth = 28
  ctx.strokeStyle = accent
  roundRect(ctx, 14, 14, LETTER_W - 28, LETTER_H - 28, 48)
  ctx.stroke()

  const pad = 130
  const inner = LETTER_W - pad * 2
  let y = pad

  // masthead
  if (logo) ctx.drawImage(logo, pad, y, 120, 120)
  ctx.fillStyle = BRAND_BLUE
  ctx.font = `800 54px "${display}"`
  ctx.textBaseline = 'middle'
  ctx.fillText(OHRR.name, pad + 150, y + 60)
  ctx.textBaseline = 'alphabetic'
  y += 120 + 110

  // kicker pill
  ctx.font = `800 40px "${display}"`
  const kw = ctx.measureText(f.kicker).width + 80
  ctx.fillStyle = accent
  roundRect(ctx, pad, y, kw, 76, 38)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'middle'
  ctx.fillText(f.kicker, pad + 40, y + 40)
  ctx.textBaseline = 'alphabetic'
  y += 76 + 70

  // headline — largest size that fits in three lines
  ctx.fillStyle = '#0f172a'
  let size = 150
  let lines: string[] = []
  for (; size >= 90; size -= 6) {
    ctx.font = `900 ${size}px "${display}"`
    lines = wrap(ctx, f.headline, inner)
    if (lines.length <= 3) break
  }
  for (const l of lines) {
    y += size
    ctx.fillText(l, pad, y)
  }
  y += 90

  // bullet lines — shrink until they sit above the footer
  const footerTop = LETTER_H - pad - 520 - 40
  let bsize = 58
  let bullets: string[][] = []
  for (; bsize >= 38; bsize -= 4) {
    ctx.font = `600 ${bsize}px "${body}"`
    bullets = f.lines.map((l) => wrap(ctx, l, inner - 80))
    const needed = bullets.reduce((n, ws) => n + ws.length * (bsize + 14) + 44, 0)
    if (y + needed <= footerTop) break
  }
  ctx.font = `600 ${bsize}px "${body}"`
  for (const wrapped of bullets) {
    ctx.fillStyle = accent
    ctx.beginPath()
    ctx.arc(pad + 18, y + bsize * 0.62, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#334155'
    for (const w of wrapped) {
      y += bsize + 14
      ctx.fillText(w, pad + 80, y)
    }
    y += 44
  }

  // footer: CTA + address left, QR right
  const qrSize = 520
  const qrX = LETTER_W - pad - qrSize
  const qrY = LETTER_H - pad - qrSize
  if (qr) ctx.drawImage(qr, qrX, qrY, qrSize, qrSize)
  const textW = qrX - pad - 60
  let fy = qrY + 80
  ctx.fillStyle = '#0f172a'
  ctx.font = `800 68px "${display}"`
  for (const l of wrap(ctx, f.cta, textW)) {
    ctx.fillText(l, pad, fy)
    fy += 80
  }
  ctx.fillStyle = '#475569'
  fy += 10
  const url = `${SHARE_SITE_SHORT}${f.path === '/' ? '' : f.path}`
  let usize = 46
  for (; usize >= 30; usize -= 2) {
    ctx.font = `600 ${usize}px "${body}"`
    if (ctx.measureText(url).width <= textW) break
  }
  if (ctx.measureText(url).width > textW) {
    // still too long: break after the site name
    const cut = url.indexOf('/')
    ctx.fillText(url.slice(0, cut), pad, fy)
    fy += usize + 8
    ctx.fillText(url.slice(cut), pad, fy)
  } else ctx.fillText(url, pad, fy)
  fy += 90
  ctx.fillStyle = '#64748b'
  ctx.font = `500 40px "${body}"`
  ctx.fillText(OHRR.place, pad, fy)
  fy += 56
  ctx.fillText(OHRR.email, pad, fy)
}

/** Print a painted page straight from the browser — one letter-size sheet, no margins added. */
export function printPng(blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(frame)
  const doc = frame.contentDocument
  if (!doc) return
  doc.open()
  doc.write(
    `<!doctype html><title>Print</title><style>@page{size:letter;margin:0}html,body{margin:0}img{display:block;width:100%;height:auto}</style><img src="${url}" alt="">`,
  )
  doc.close()
  const img = doc.querySelector('img')
  const go = () => {
    frame.contentWindow?.focus()
    frame.contentWindow?.print()
    setTimeout(() => {
      frame.remove()
      URL.revokeObjectURL(url)
    }, 60_000)
  }
  if (img && !img.complete) img.onload = go
  else go()
}
