// Staff → Outreach: six ready-to-send emails (campus, vets, pet stores,
// schools, apartments, local media). Desktop edition of the app's page —
// same letters, same tagged links.
import { useEffect, useMemo, useState } from 'react'
import { useStaff, staffInput } from '../../lib/staff'
import { btn, Card } from '../../components/ui'
import { OUTREACH, fillLetter, mailtoFor, type OutreachLetter } from '../../lib/share/outreach'
import { copyText } from '../../lib/share/share'

const SENDER_KEY = 'ohrr.outreach.sender'

export default function Outreach() {
  const { can } = useStaff()
  const [pick, setPick] = useState<OutreachLetter>(OUTREACH[0])
  const [sender, setSender] = useState('')
  const [org, setOrg] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    try {
      setSender(localStorage.getItem(SENDER_KEY) ?? '')
    } catch {
      /* private mode */
    }
  }, [])
  useEffect(() => {
    try {
      if (sender) localStorage.setItem(SENDER_KEY, sender)
    } catch {
      /* ignore */
    }
  }, [sender])

  const filled = useMemo(() => fillLetter(pick, sender, org), [pick, sender, org])

  if (!can('announcements.post')) return <p className="text-slate-600">You don’t have access to outreach letters.</p>

  const copy = async () => {
    setStatus((await copyText(`Subject: ${filled.subject}\n\n${filled.body}`)) ? 'Copied — paste it into any email.' : 'Could not copy. Select the text and copy it.')
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-black text-ink">Outreach letters</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Ready-to-send emails that put OHRR in front of the people it is missing. Pick who you are writing to, add your name, open it in your mail program. Pair the campus, vet and store letters with a printed flyer.
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-2">
          {OUTREACH.map((l) => (
            <button key={l.id} type="button" onClick={() => { setPick(l); setStatus(null) }} className={`block w-full rounded-2xl border-2 p-4 text-left ${pick.id === l.id ? 'border-brand-orange bg-white shadow-md' : 'border-black/5 bg-white'}`}>
              <span className="block font-display text-base font-extrabold text-ink">{l.audience}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{l.when}</span>
            </button>
          ))}
        </div>
        <div className="space-y-4 lg:col-span-2">
          <Card className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              Your name (signs the letter)
              <input className={staffInput} value={sender} onChange={(e) => setSender(e.target.value)} placeholder="Bev" autoComplete="name" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Who is it for? (optional)
              <input className={staffInput} value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Ohio State Pre-Vet Club" />
            </label>
          </Card>
          <div className="flex flex-wrap gap-2">
            <a href={mailtoFor(filled.subject, filled.body)} className={btn.orange}>
              Open in Mail
            </a>
            <button type="button" onClick={() => void copy()} className={btn.outline}>
              Copy the letter
            </button>
          </div>
          {status && <p className="text-sm font-semibold text-green-700">{status}</p>}
          <Card>
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Subject</p>
            <p className="mt-0.5 font-semibold text-ink">{filled.subject}</p>
            <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-slate-400">Letter</p>
            <pre className="mt-1 whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">{filled.body}</pre>
          </Card>
        </div>
      </div>
    </div>
  )
}
