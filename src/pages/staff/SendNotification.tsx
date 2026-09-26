// Staff → Send a notification (update 32): a phone notification to everyone
// who asked for a topic in the app (web push; the website itself has none).
// For staff with "notifications.send" (founders and developers already have
// it). The ohrr-jobs Edge Function does the sending; new volunteer calls,
// events and rabbits send their own. Desktop mirror of the app's screen.
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { errMessage, supabase } from '../../lib/supabase'
import { btn, Card } from '../../components/ui'
import { isMissingFunction } from '../../lib/emailList'

/** What people can ask to be notified about, in the app's words. */
const TOPICS = [
  { key: 'volunteer', label: 'Volunteer opportunities', link: '/volunteer' },
  { key: 'events', label: 'Events', link: '/events' },
  { key: 'adoptions', label: 'New rabbits up for adoption', link: '/adopt' },
  { key: 'bunfest', label: 'Midwest BunFest', link: '/bunfest' },
  { key: 'news', label: 'News from OHRR', link: '/' },
] as const
type Topic = (typeof TOPICS)[number]['key']
const topicLabel = (k: string) => TOPICS.find((t) => t.key === k)?.label ?? k

/** Where tapping the notification opens the app. */
const LINKS = [
  { value: '/volunteer', label: 'Volunteer page' },
  { value: '/events', label: 'Events' },
  { value: '/adopt', label: 'Adopt' },
  { value: '/bunfest', label: 'BunFest' },
  { value: '/', label: 'Home' },
  { value: 'custom', label: 'Somewhere else…' },
]

type Counts = Record<Topic, number> & { phones: number; ready: boolean }

interface Sent {
  id: string
  topic: string
  title: string
  created_at: string
  created_by: string | null
  sent_at: string | null
  sent_count: number | null
}

/** "Sep 26, 7:15 AM". */
const usDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const phones = (n: number) => `${n} ${n === 1 ? 'phone' : 'phones'}`

export default function SendNotification() {
  const { membership, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  const [counts, setCounts] = useState<Counts | null>(null)
  const [missing, setMissing] = useState(false)
  const [history, setHistory] = useState<Sent[]>([])
  const [topic, setTopic] = useState<Topic>('volunteer')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [link, setLink] = useState('/volunteer')
  const [linkTouched, setLinkTouched] = useState(false)
  const [custom, setCustom] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const load = useCallback(async () => {
    const c = await supabase.rpc('push_counts', { p_org: orgId })
    if (c.error) {
      if (isMissingFunction(c.error)) setMissing(true)
      else setError(errMessage(c.error))
      return
    }
    // null: the database doesn't give this person the task.
    if (c.data == null) {
      setError('Sending notifications needs the “Send phone notifications” task.')
      return
    }
    const raw = c.data as Record<string, unknown>
    const n = (k: string) => Number(raw[k] ?? 0) || 0
    setCounts({
      phones: n('phones'),
      volunteer: n('volunteer'),
      events: n('events'),
      adoptions: n('adoptions'),
      bunfest: n('bunfest'),
      news: n('news'),
      ready: raw.ready === true,
    })
    const h = await supabase
      .from('push_messages')
      .select('id, topic, title, created_at, created_by, sent_at, sent_count')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (!h.error) setHistory((h.data ?? []) as Sent[])
  }, [orgId])
  useEffect(() => {
    if (orgId) void load()
    return () => window.clearTimeout(timer.current)
  }, [orgId, load])

  if (!can('notifications.send')) return <p className="text-slate-600">You don’t have access to send notifications.</p>

  const url = link === 'custom' ? custom.trim() : link
  const badUrl = link === 'custom' && url !== '' && !/^(\/|https:\/\/)/.test(url)
  const count = counts ? counts[topic] : 0

  const pickTopic = (t: Topic) => {
    setTopic(t)
    // The link follows the topic until someone picks one themselves.
    if (!linkTouched) setLink(TOPICS.find((x) => x.key === t)!.link)
  }

  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || badUrl || (link === 'custom' && !url)) return
    if (!window.confirm(`Send to ${phones(count)}?`)) return
    setBusy(true)
    setError(null)
    setMsg(null)
    const { error } = await supabase.rpc('send_notification', {
      p_org: orgId,
      p_topic: topic,
      p_title: title.trim(),
      p_body: body.trim() || null,
      p_url: url || null,
    })
    setBusy(false)
    if (error) {
      setError(errMessage(error))
      return
    }
    setTitle('')
    setBody('')
    setMsg(`Sending to ${phones(count)}.`)
    await load()
    // The function sends it in the background; look again for the count.
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void load(), 8000)
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-black text-ink">Send a notification</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-600">
        A notification on the phones of people who asked for it in the OHRR app. New volunteer calls, events and rabbits send
        a notification by themselves.
      </p>

      {missing && (
        <Card className="mt-5 border-amber-200 bg-amber-50">
          <p className="text-sm text-slate-700">
            Phone notifications switch on with <strong>update 32</strong> (RUN-THIS-IN-SUPABASE.sql in the Drive).
          </p>
        </Card>
      )}
      {counts && !counts.ready && (
        <Card className="mt-5 border-amber-200 bg-amber-50">
          <p className="text-sm text-slate-700">Notifications switch on once the ohrr-jobs function has been set up in Supabase.</p>
        </Card>
      )}

      {counts === null && error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
      {counts === null && !missing && !error && <Spinner />}
      {counts && (
        <div className="mt-6 grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <form onSubmit={send}>
            <Card className="space-y-4">
              <fieldset>
                <legend className="text-sm font-semibold text-slate-700">Who it’s for</legend>
                <div className="mt-1 space-y-0.5">
                  {TOPICS.map((t) => (
                    <label key={t.key} className="flex min-h-11 items-center gap-2.5 text-sm font-semibold text-slate-700">
                      <input
                        type="radio"
                        name="topic"
                        className="h-5 w-5 border-slate-300 text-brand-blue"
                        checked={topic === t.key}
                        onChange={() => pickTopic(t.key)}
                      />
                      {t.label}
                      <span className="font-normal text-slate-500">· {phones(counts[t.key])}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="block text-sm font-semibold text-slate-700">
                Title
                <input className={staffInput} required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
                <span className="mt-0.5 block text-right text-xs font-normal text-slate-500">{title.length}/120</span>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Message
                <textarea className={staffInput} rows={3} maxLength={400} value={body} onChange={(e) => setBody(e.target.value)} />
                <span className="mt-0.5 block text-right text-xs font-normal text-slate-500">{body.length}/400</span>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Opens
                <select
                  className={staffInput}
                  value={link}
                  onChange={(e) => {
                    setLink(e.target.value)
                    setLinkTouched(true)
                  }}
                >
                  {LINKS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>
              {link === 'custom' && (
                <label className="block text-sm font-semibold text-slate-700">
                  Link
                  <span className="block text-xs font-normal text-slate-500">A page in the app (starting with /) or a web address starting with https://</span>
                  <input
                    className={staffInput}
                    required
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={custom}
                    placeholder="/volunteer/call/…"
                    aria-invalid={badUrl}
                    onChange={(e) => setCustom(e.target.value)}
                  />
                  {badUrl && <span className="mt-1 block text-sm font-semibold text-red-600">The link should start with / or https://</span>}
                </label>
              )}
              {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
              {msg && <p className="text-sm font-semibold text-green-700">{msg}</p>}
              <button
                type="submit"
                disabled={busy || !counts.ready || count === 0 || !title.trim() || badUrl || (link === 'custom' && !url)}
                className={`${btn.orange} w-full disabled:opacity-60`}
              >
                {busy ? 'Sending…' : `Send to ${phones(count)}`}
              </button>
              {counts.ready && count === 0 && (
                <p className="text-sm text-slate-600">Nobody has asked for {topicLabel(topic).toLowerCase()} notifications yet.</p>
              )}
            </Card>
          </form>

          {/* How it will look on a phone's lock screen */}
          <div className="self-start">
            <p className="text-sm font-semibold text-slate-700">How it will look</p>
            <div className="mt-2 rounded-2xl bg-slate-100 p-3 shadow-inner">
              <div className="flex gap-3 rounded-xl bg-white/90 p-3 shadow-sm">
                <img src="/img/ohrr-mark.png" alt="" className="h-9 w-9 shrink-0 rounded-lg object-contain" />
                <div className="min-w-0 flex-1">
                  <p className="flex justify-between gap-2 text-xs text-slate-500">
                    <span className="font-semibold uppercase tracking-wide">OHRR</span>
                    <span>now</span>
                  </p>
                  <p className="mt-0.5 break-words text-sm font-bold text-ink">{title.trim() || 'Your title'}</p>
                  {body.trim() && <p className="mt-0.5 line-clamp-4 break-words text-sm text-slate-700">{body.trim()}</p>}
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Phones show it their own way; long messages are cut short.</p>
          </div>
        </div>
      )}

      {counts && (
        <section className="mt-10 max-w-5xl">
          <h2 className="font-display text-lg font-extrabold text-ink">Sent lately</h2>
          {history.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">Nothing sent yet.</p>
          ) : (
            <Card className="mt-3 !p-0">
              <ul className="divide-y divide-slate-100">
                {history.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-5 py-3">
                    <div className="min-w-0 flex-1 basis-60">
                      <p className="font-semibold text-ink">{m.title}</p>
                      <p className="text-sm text-slate-600">
                        {topicLabel(m.topic)}
                        {!m.created_by && ' · sent by itself'}
                      </p>
                    </div>
                    <div className="text-right text-sm text-slate-600">
                      <p>{usDateTime(m.created_at)}</p>
                      <p className={m.sent_at ? '' : 'font-semibold text-slate-500'}>{m.sent_at ? `sent to ${phones(m.sent_count ?? 0)}` : 'sending…'}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      )}
    </div>
  )
}
