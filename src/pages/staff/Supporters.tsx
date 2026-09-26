// Staff → Supporters: OHRR's email list (update 31, table `mailing_list`) —
// everyone who asked for emails on the website form or in the app, and what
// about. For staff with "supporters.view" (founders and developers already have
// it). Copy the addresses for a BCC, or download a spreadsheet with each
// person's own unsubscribe link for an email service. Nothing is sent from here.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { errMessage, supabase } from '../../lib/supabase'
import { btn, Card } from '../../components/ui'
import { toCsv, exportCsv } from '../../lib/exportFile'
import { INTERESTS, cleanInterests, emailChoicesLink, interestLabel, isMissingTable, type Interest } from '../../lib/emailList'

interface Row {
  id: string
  email: string
  name: string | null
  interests: Interest[]
  source: string | null
  created_at: string
  unsubscribed_at: string | null
  unsubscribe_token: string
}

const SOURCE_LABEL: Record<string, string> = {
  website: 'Website form',
  app: 'App',
  account: 'App account',
  inbox: 'Earlier sign-up',
}
const sourceLabel = (s: string | null) => (s ? (SOURCE_LABEL[s] ?? s) : '')
/** "Oct 3, 2026". */
const usDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export default function Supporters() {
  const { membership, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  const [rows, setRows] = useState<Row[] | null>(null)
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [interest, setInterest] = useState<Interest | 'all'>('all')
  const [showLeft, setShowLeft] = useState(false)

  const load = useCallback(async () => {
    // A page at a time: the server hands back at most 1,000 rows per ask.
    const all: Row[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from('mailing_list')
        .select('id, email, name, interests, source, created_at, unsubscribed_at, unsubscribe_token')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .range(from, from + 999)
      if (error) {
        // Only a missing table means update 31 hasn't run; a permission error is shown as it is.
        if (isMissingTable(error)) {
          setMissing(true)
          setRows([])
        } else setError(errMessage(error))
        return
      }
      const page = (data ?? []) as Row[]
      all.push(...page.map((r) => ({ ...r, interests: cleanInterests(r.interests) })))
      if (page.length < 1000) break
    }
    setRows(all)
  }, [orgId])
  useEffect(() => {
    if (orgId) void load()
  }, [orgId, load])

  const subscribed = useMemo(() => (rows ?? []).filter((r) => !r.unsubscribed_at), [rows])
  const counts = useMemo(() => {
    const c = new Map<Interest, number>()
    for (const r of subscribed) for (const i of r.interests) c.set(i, (c.get(i) ?? 0) + 1)
    return c
  }, [subscribed])
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (rows ?? []).filter(
      (r) =>
        (showLeft || !r.unsubscribed_at) &&
        (interest === 'all' || r.interests.includes(interest)) &&
        (!needle || r.email.toLowerCase().includes(needle) || (r.name ?? '').toLowerCase().includes(needle)),
    )
  }, [rows, q, interest, showLeft])
  const shownEmails = shown.filter((r) => !r.unsubscribed_at).map((r) => r.email)

  if (!can('supporters.view')) return <p className="text-slate-600">You don’t have access to the supporter email list.</p>

  const copy = async (text: string, done: string) => {
    setMsg(null)
    try {
      await navigator.clipboard.writeText(text)
      setMsg(done)
    } catch {
      // No clipboard (an older browser, or not allowed): show it to copy by hand.
      window.prompt('Copy this:', text)
    }
  }
  const copyEmails = () =>
    void copy(shownEmails.join(', '), `Copied ${shownEmails.length} ${shownEmails.length === 1 ? 'address' : 'addresses'}. Paste them into BCC.`)
  const download = () => {
    const csv = toCsv(
      ['Name', 'Email', 'Interests', 'Source', 'Joined', 'Unsubscribed', 'Unsubscribe link'],
      shown.map((r) => [
        r.name ?? '',
        r.email,
        r.interests.map(interestLabel).join(', '),
        sourceLabel(r.source),
        usDate(r.created_at),
        r.unsubscribed_at ? usDate(r.unsubscribed_at) : '',
        emailChoicesLink(r.unsubscribe_token),
      ]),
    )
    exportCsv(`ohrr-supporters-${interest}-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  const pill = (on: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-bold ${on ? 'bg-brand-blue text-white' : 'border border-slate-200 bg-white text-slate-600'}`

  return (
    <div>
      <h1 className="font-display text-2xl font-black text-ink">Supporters</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-600">
        Everyone who asked for OHRR’s emails, on the website’s{' '}
        <Link to="/mailing-list" className="font-semibold text-brand-blue underline underline-offset-2">
          Get emails from OHRR
        </Link>{' '}
        form or in the app, and what they want to hear about.
      </p>

      {missing && (
        <Card className="mt-5 border-amber-200 bg-amber-50">
          <p className="text-sm text-slate-700">
            The email list switches on with <strong>update 31</strong> (RUN-THIS-IN-SUPABASE.sql in the Drive). Until then,
            mailing-list sign-ups are in the{' '}
            <Link to="/staff/inbox" className="font-semibold text-brand-blue underline underline-offset-2">
              Inbox
            </Link>
            .
          </p>
        </Card>
      )}

      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
      {rows === null && !error && <Spinner />}
      {rows && !missing && (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label="Show people who want">
            <button type="button" onClick={() => setInterest('all')} className={pill(interest === 'all')}>
              Everyone ({subscribed.length})
            </button>
            {INTERESTS.map((i) => (
              <button key={i.key} type="button" onClick={() => setInterest(i.key)} className={pill(interest === i.key)}>
                {i.label} ({counts.get(i.key) ?? 0})
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              className={`${staffInput} !mt-0 max-w-xs`}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search names and emails"
              aria-label="Search names and emails"
            />
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-brand-blue" checked={showLeft} onChange={(e) => setShowLeft(e.target.checked)} />
              Show people who unsubscribed
            </label>
            <span className="flex flex-wrap gap-2 sm:ml-auto">
              <button type="button" onClick={copyEmails} disabled={shownEmails.length === 0} className={`${btn.blue} disabled:opacity-50`}>
                Copy emails ({shownEmails.length})
              </button>
              <button type="button" onClick={download} disabled={shown.length === 0} className={`${btn.outline} disabled:opacity-50`}>
                Download spreadsheet
              </button>
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            When you send an email to this list, include each person’s own unsubscribe link, or at least the sign-up page address.
          </p>

          {msg && <p className="mt-4 text-sm font-semibold text-green-700">{msg}</p>}

          {shown.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              {rows.length === 0 ? 'Nobody has signed up yet.' : 'Nobody matches.'}
            </p>
          ) : (
            <Card className="mt-4 !p-0">
              <ul className="divide-y divide-slate-100">
                {shown.map((r) => {
                  const left = Boolean(r.unsubscribed_at)
                  return (
                    <li key={r.id} className={`flex flex-wrap items-start gap-x-4 gap-y-1.5 px-5 py-3 ${left ? 'text-slate-400' : ''}`}>
                      <div className="min-w-0 flex-1 basis-60">
                        <p className={`font-semibold ${left ? 'text-slate-500' : 'text-ink'}`}>{r.name || 'No name'}</p>
                        <p className={`break-all text-sm ${left ? 'text-slate-400' : 'text-slate-700'}`}>{r.email}</p>
                      </div>
                      <div className="flex min-w-0 flex-1 basis-60 flex-wrap gap-1.5">
                        {left && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">Unsubscribed {usDate(r.unsubscribed_at!)}</span>}
                        {r.interests.map((i) => (
                          <span
                            key={i}
                            className={`rounded-full px-2 py-0.5 text-xs font-bold ${left ? 'bg-slate-50 text-slate-400' : 'bg-brand-blue-50 text-brand-blue'}`}
                          >
                            {interestLabel(i)}
                          </span>
                        ))}
                      </div>
                      <div className={`text-right text-xs ${left ? 'text-slate-400' : 'text-slate-500'}`}>
                        <p>{[sourceLabel(r.source), `Joined ${usDate(r.created_at)}`].filter(Boolean).join(' · ')}</p>
                        <button
                          type="button"
                          className="mt-0.5 font-bold text-brand-blue"
                          onClick={() => void copy(emailChoicesLink(r.unsubscribe_token), `Copied the unsubscribe link for ${r.email}.`)}
                        >
                          Copy their unsubscribe link
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
