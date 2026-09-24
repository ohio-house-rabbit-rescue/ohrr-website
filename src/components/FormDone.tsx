import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card, btn } from './ui'

// The "it's sent" card a public form ends on — the same look as the forms in
// pages/Forms.tsx: OHRR mark, a thank-you, what happens next, one big button.
export default function FormDone({ title, children, to, label }: { title: string; children: ReactNode; to: string; label: string }) {
  return (
    <Card className="space-y-3 text-center">
      <img
        src="/img/ohrr-mark.png"
        alt=""
        className="mx-auto h-14 w-14 object-contain"
        onError={(e) => (e.currentTarget.style.display = 'none')}
      />
      <p className="font-display text-xl font-black text-ink">{title}</p>
      <div className="text-base leading-relaxed text-slate-600">{children}</div>
      <Link to={to} className={`${btn.blue} mx-auto`}>
        {label}
      </Link>
    </Card>
  )
}
