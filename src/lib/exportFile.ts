// CSV exports from the staff screens (mirror of the app's src/lib/exportFile.ts,
// without the native share sheet — a browser downloads).

/** Quote a CSV cell the way spreadsheets expect. */
function cell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  // The BOM makes Excel open UTF-8 correctly (names with accents, en dashes).
  return '\uFEFF' + [headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')
}

export function exportCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** A mailto: that BCCs everyone — the polite way to reach a whole shift. */
export function bccMailto(emails: string[], subject: string, body = ''): string {
  const list = [...new Set(emails.filter(Boolean))].join(',')
  const params = new URLSearchParams()
  params.set('bcc', list)
  params.set('subject', subject)
  if (body) params.set('body', body)
  return `mailto:?${params.toString()}`
}
