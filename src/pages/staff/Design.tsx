// Staff → Web page design: how the app AND the website look, from one place.
//
// The desktop mirror of the app's StaffDesign: the same `app_settings` rows (`design_site`,
// `design_history`), so a look published here is the look in the app and on the website, and the
// other way round. Colors, a soft picture behind the pages, a picture behind the home welcome band,
// and which sections each home page shows and in what order.
//
// While someone edits, the new look is tried on this screen only. Nothing changes for visitors
// until they press Publish, and every published look is kept so it can be put back.
// For Founders, Developers and anyone given the "Web page admin" task; the database checks the same
// thing (update 54).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { errMessage } from '../../lib/supabase'
import { useStaff, Spinner } from '../../lib/staff'
import { useCanDesign } from '../../lib/designAccess'
import { fetchSettings, setSetting, type Json } from '../../lib/settings'
import { uploadSiteImage } from '../../lib/images'
import { Card } from '../../components/ui'
import { Icon } from '../../components/icons'
import { StaffTitle } from '../../components/StaffTitle'
import {
  DEFAULT_BLUE,
  DEFAULT_DESIGN,
  DEFAULT_ORANGE,
  DESIGN_HISTORY_KEY,
  DESIGN_HISTORY_MAX,
  DESIGN_KEY,
  HOME_SECTIONS,
  colorProblem,
  getPublishedDesign,
  parseDesign,
  previewDesign,
  resolveHome,
  setPublishedDesign,
  type SectionSetting,
  type SiteDesign,
  type Surface,
} from '../../lib/design'

interface Ctx {
  orgId: string
  userId: string
}

interface HistoryItem {
  at: string
  label: string
  design: SiteDesign
}

function parseHistory(v: Json | undefined): HistoryItem[] {
  const items = v && typeof v === 'object' && !Array.isArray(v) ? v.items : null
  if (!Array.isArray(items)) return []
  const out: HistoryItem[] = []
  for (const it of items) {
    if (!it || typeof it !== 'object' || Array.isArray(it)) continue
    if (typeof it.at !== 'string' || typeof it.label !== 'string') continue
    out.push({ at: it.at, label: it.label.slice(0, 120), design: parseDesign(it.design) })
  }
  return out.slice(0, DESIGN_HISTORY_MAX)
}

const sameDesign = (a: SiteDesign, b: SiteDesign) => JSON.stringify(a) === JSON.stringify(b)

/** Save a new look for everyone, keeping the one it replaces so it can be put back. */
async function publish(next: SiteDesign, label: string, ctx: Ctx): Promise<void> {
  const rows = await fetchSettings(ctx.orgId)
  const before = rows[DESIGN_KEY] == null ? DEFAULT_DESIGN : parseDesign(rows[DESIGN_KEY])
  const clean = parseDesign(next)
  if (!sameDesign(before, clean)) {
    const history: HistoryItem[] = [
      { at: new Date().toISOString(), label, design: before },
      ...parseHistory(rows[DESIGN_HISTORY_KEY]),
    ].slice(0, DESIGN_HISTORY_MAX)
    await setSetting(DESIGN_HISTORY_KEY, { items: history } as unknown as Json, ctx)
  }
  await setSetting(DESIGN_KEY, clean as unknown as Json, ctx)
  setPublishedDesign(clean)
}

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

/** The database's refusal, in plain words. */
function saveError(e: unknown): string {
  const m = errMessage(e)
  if (/row-level security|violates row|permission denied|not allowed/i.test(m)) {
    return `The database didn’t save that: you need the “Web page admin” task (or to be a Founder or Developer). (${m})`
  }
  return m
}

/* ------------------------------------------------------------------ */

export default function Design() {
  const { user, membership } = useStaff()
  const { can } = useCanDesign()

  if (!membership || !user || !can) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-2xl font-black text-ink">Web page design</h1>
        <p className="max-w-2xl text-base text-slate-700">
          This is for the people who look after how the app and website look. Ask a Founder to give you the “Web page admin” task if you
          should have it.
        </p>
      </div>
    )
  }
  return <Editor ctx={{ orgId: membership.orgId, userId: user.id }} />
}

function Editor({ ctx }: { ctx: Ctx }) {
  const [published, setPublished] = useState<SiteDesign>(() => getPublishedDesign())
  const [draft, setDraft] = useState<SiteDesign>(() => getPublishedDesign())
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[] | null>(null)

  const problem = useMemo(() => colorProblem(draft.blue, draft.orange), [draft.blue, draft.orange])
  const dirty = !sameDesign(draft, published)

  // Try the draft on this screen as it changes (a color pair that fails the check is never tried);
  // whatever was being tried goes back to the published look when this page is left.
  useEffect(() => {
    previewDesign(problem ? null : draft)
  }, [draft, problem])
  useEffect(() => () => previewDesign(null), [])

  const loadHistory = useCallback(async () => {
    try {
      const rows = await fetchSettings(ctx.orgId)
      setHistory(parseHistory(rows[DESIGN_HISTORY_KEY]))
    } catch (e) {
      setHistory([])
      setError(saveError(e))
    }
  }, [ctx.orgId])
  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const run = async (next: SiteDesign, label: string, success: string) => {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      await publish(next, label, ctx)
      const now = getPublishedDesign()
      setPublished(now)
      setDraft(now)
      setNote(success)
      await loadHistory()
    } catch (e) {
      setError(saveError(e))
    } finally {
      setBusy(false)
    }
  }

  // What changed, for the "Earlier looks" list.
  const changeLabel = () => {
    const parts: string[] = []
    if (draft.blue !== published.blue || draft.orange !== published.orange) parts.push('Colors')
    if (JSON.stringify([draft.pageImage, draft.bandImage]) !== JSON.stringify([published.pageImage, published.bandImage])) parts.push('Pictures')
    if (JSON.stringify(draft.home) !== JSON.stringify(published.home)) parts.push('Home page sections')
    return parts.join(', ') || 'Design'
  }

  return (
    <div className="space-y-6">
      <StaffTitle title="Web page design">
        <p className="max-w-2xl">
          Change how OHRR looks, once, for the app and the website together. Nothing changes for visitors until you press Publish, and
          the look it replaces is kept under “Earlier looks” so you can put it back.
        </p>
        <p className="max-w-2xl">
          Everything is chosen from safe settings: the colors must keep the words readable, pictures sit under a soft veil, and the
          sections people rely on stay put. This screen shows your changes as you make them.
        </p>
      </StaffTitle>

      {note && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-base font-semibold text-emerald-800">
          {note}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-base font-semibold text-red-700">
          {error}
        </p>
      )}

      <ColorsCard draft={draft} setDraft={setDraft} problem={problem} />
      <PicturesCard ctx={ctx} draft={draft} setDraft={setDraft} setUploading={setUploading} />
      <HomeCard draft={draft} setDraft={setDraft} />

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <button
          type="button"
          disabled={!dirty || Boolean(problem) || busy || uploading}
          onClick={() => void run(draft, changeLabel(), 'Published. The app and the website now use this look.')}
          className="inline-flex min-h-12 items-center rounded-full bg-brand-blue px-6 text-base font-bold text-white disabled:opacity-50"
        >
          {busy ? 'Publishing…' : uploading ? 'Uploading…' : 'Publish for the app and the website'}
        </button>
        <button
          type="button"
          disabled={!dirty || busy}
          onClick={() => {
            setDraft(published)
            setError(null)
          }}
          className="inline-flex min-h-12 items-center rounded-full border-2 border-slate-200 bg-white px-5 text-base font-bold text-slate-700 disabled:opacity-50"
        >
          Discard my changes
        </button>
        <span className="text-sm text-slate-600">{dirty ? 'You have changes that are not published yet.' : 'This is the published look.'}</span>
      </div>

      <HistoryCard
        items={history}
        busy={busy}
        onPutBack={(d) => {
          if (window.confirm('Put this look back for the app and the website?')) void run(d, 'Put an earlier look back', 'Put back. The app and the website look like that again.')
        }}
        onStandard={() => {
          if (window.confirm('Go back to the standard OHRR look for the app and the website? Your colors, pictures and home order are replaced (and kept under Earlier looks).')) {
            void run(DEFAULT_DESIGN, 'Standard look', 'The standard OHRR look is back on the app and the website.')
          }
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */

type SetDraft = React.Dispatch<React.SetStateAction<SiteDesign>>

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="color"
        aria-label={`${label} color picker`}
        value={value}
        onChange={(e) => onChange(e.target.value.toLowerCase())}
        className="h-14 w-20 cursor-pointer rounded-xl border-2 border-slate-200 bg-white p-1"
      />
      <input
        aria-label={`${label} color code`}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          if (/^#[0-9a-f]{6}$/i.test(e.target.value)) onChange(e.target.value.toLowerCase())
        }}
        maxLength={7}
        spellCheck={false}
        className="min-h-12 w-32 rounded-xl border-2 border-slate-200 bg-white px-3 font-mono text-base"
      />
    </div>
  )
}

function ColorsCard({ draft, setDraft, problem }: { draft: SiteDesign; setDraft: SetDraft; problem: string | null }) {
  const isStandard = draft.blue === DEFAULT_BLUE && draft.orange === DEFAULT_ORANGE
  const set = (k: 'blue' | 'orange', v: string) => setDraft((d) => ({ ...d, [k]: v }))
  return (
    <section className="space-y-2.5" aria-labelledby="design-colors">
      <p id="design-colors" className="px-1 text-sm font-extrabold uppercase tracking-wider text-slate-600">
        Colors
      </p>
      <Card className="space-y-5">
        <div className="space-y-2">
          <h2 className="font-display text-lg font-extrabold text-ink">Blue</h2>
          <p className="text-sm text-slate-600">Buttons, links and the welcome band. White words sit on it, so it has to be a strong blue.</p>
          <ColorField label="Blue" value={draft.blue} onChange={(v) => set('blue', v)} />
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-lg font-extrabold text-ink">Orange</h2>
          <p className="text-sm text-slate-600">The highlight: Volunteer, Donate and call-outs. Dark words sit on it.</p>
          <ColorField label="Orange" value={draft.orange} onChange={(v) => set('orange', v)} />
        </div>
        {problem && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {problem}
          </p>
        )}
        <button
          type="button"
          disabled={isStandard}
          onClick={() => setDraft((d) => ({ ...d, blue: DEFAULT_BLUE, orange: DEFAULT_ORANGE }))}
          className="inline-flex min-h-11 items-center rounded-full border-2 border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 disabled:opacity-50"
        >
          Use the standard colors
        </button>
      </Card>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function PictureSlot({
  ctx,
  title,
  hint,
  slot,
  draft,
  setDraft,
  setUploading,
}: {
  ctx: Ctx
  title: string
  hint: string
  slot: 'pageImage' | 'bandImage'
  draft: SiteDesign
  setDraft: SetDraft
  setUploading: (b: boolean) => void
}) {
  const img = draft[slot]
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const patch = (p: Partial<typeof img>) => setDraft((d) => ({ ...d, [slot]: { ...d[slot], ...p } }))
  const onFiles = async (files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    setBusy(true)
    setUploading(true)
    setErr(null)
    try {
      patch({ url: await uploadSiteImage(f, ctx.userId, 1600) })
    } catch (e) {
      setErr(saveError(e))
    } finally {
      setBusy(false)
      setUploading(false)
    }
  }
  return (
    <div className="space-y-2">
      <h2 className="font-display text-lg font-extrabold text-ink">{title}</h2>
      <p className="text-sm text-slate-600">{hint}</p>
      {img.url && (
        <div className="relative inline-block">
          <img src={img.url} alt="" className="h-24 w-40 rounded-xl object-cover ring-1 ring-slate-200" />
          <button
            type="button"
            onClick={() => patch({ url: null })}
            aria-label={`Remove the ${title.toLowerCase()}`}
            className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs text-white"
          >
            ×
          </button>
        </div>
      )}
      <div>
        <label className={`inline-block cursor-pointer rounded-full border-2 border-slate-200 px-4 py-2 text-sm font-bold text-brand-blue hover:bg-slate-50 ${busy ? 'opacity-60' : ''}`}>
          {busy ? 'Uploading…' : img.url ? 'Replace the picture' : 'Add a picture'}
          <input type="file" accept="image/*" disabled={busy} className="hidden" onChange={(e) => void onFiles(e.target.files)} />
        </label>
      </div>
      {err && <p className="text-sm font-semibold text-red-600">{err}</p>}
      {img.url && (
        <label className="block max-w-md text-sm font-semibold text-slate-700">
          How soft: {img.veil} %
          <input
            type="range"
            min={0}
            max={90}
            step={5}
            value={img.veil}
            onChange={(e) => patch({ veil: Number(e.target.value) })}
            className="mt-2 block w-full"
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">More softness lets the page’s own words stand out. A busy picture needs more.</span>
        </label>
      )}
    </div>
  )
}

function PicturesCard({ ctx, draft, setDraft, setUploading }: { ctx: Ctx; draft: SiteDesign; setDraft: SetDraft; setUploading: (b: boolean) => void }) {
  return (
    <section className="space-y-2.5" aria-labelledby="design-pictures">
      <p id="design-pictures" className="px-1 text-sm font-extrabold uppercase tracking-wider text-slate-600">
        Background pictures
      </p>
      <Card className="space-y-6">
        <p className="text-sm text-slate-600">Both are optional. A light, simple picture works best; the pages’ words are always kept readable.</p>
        <PictureSlot
          ctx={ctx}
          title="Page picture"
          hint="Shows faintly behind every public page of the app and the website."
          slot="pageImage"
          draft={draft}
          setDraft={setDraft}
          setUploading={setUploading}
        />
        <PictureSlot
          ctx={ctx}
          title="Welcome band picture"
          hint="The band at the top of the home page. Leave it empty for the plain band."
          slot="bandImage"
          draft={draft}
          setDraft={setDraft}
          setUploading={setUploading}
        />
      </Card>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function HomeCard({ draft, setDraft }: { draft: SiteDesign; setDraft: SetDraft }) {
  const [surface, setSurface] = useState<Surface>('web')
  const rows = resolveHome(surface, draft)
  const info = HOME_SECTIONS[surface]

  const update = (next: SectionSetting[]) => setDraft((d) => ({ ...d, home: { ...d.home, [surface]: next } }))
  const toggle = (id: string) => update(rows.map((r) => (r.id === id ? { ...r, on: !r.on } : r)))
  const move = (i: number, by: -1 | 1) => {
    const j = i + by
    if (j < 0 || j >= rows.length) return
    const next = rows.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    update(next)
  }

  return (
    <section className="space-y-2.5" aria-labelledby="design-home">
      <p id="design-home" className="px-1 text-sm font-extrabold uppercase tracking-wider text-slate-600">
        Home page sections
      </p>
      <Card className="space-y-4">
        <p className="text-sm text-slate-600">
          The welcome band at the top is always there. The website and the app share some sections and each has some of its own, so each has
          its own list.
        </p>
        <div className="flex max-w-md gap-2" role="group" aria-label="Which home page">
          {(['web', 'app'] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={surface === s}
              onClick={() => setSurface(s)}
              className={`min-h-12 flex-1 rounded-2xl border-2 px-4 text-base font-bold ${
                surface === s ? 'border-brand-blue bg-brand-blue text-white' : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              {s === 'web' ? 'The website' : 'The app'}
            </button>
          ))}
        </div>
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
          {rows.map((r, i) => {
            const meta = info.find((x) => x.id === r.id)
            return (
              <li key={r.id} className="flex items-center gap-2 px-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className={`block text-base font-bold ${r.on ? 'text-ink' : 'text-slate-400 line-through'}`}>{meta?.label ?? r.id}</span>
                  <span className="block text-sm text-slate-500">{meta?.hint}</span>
                </span>
                <button
                  type="button"
                  aria-label={`Move ${meta?.label} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-slate-200 text-slate-700 disabled:opacity-30"
                >
                  <Icon name="chevron" size={16} className="-rotate-90" />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${meta?.label} down`}
                  disabled={i === rows.length - 1}
                  onClick={() => move(i, 1)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-slate-200 text-slate-700 disabled:opacity-30"
                >
                  <Icon name="chevron" size={16} className="rotate-90" />
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={r.on}
                  aria-label={`Show ${meta?.label}`}
                  onClick={() => toggle(r.id)}
                  className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition ${r.on ? 'bg-brand-blue' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform ${r.on ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </li>
            )
          })}
        </ul>
      </Card>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function HistoryCard({
  items,
  busy,
  onPutBack,
  onStandard,
}: {
  items: HistoryItem[] | null
  busy: boolean
  onPutBack: (d: SiteDesign) => void
  onStandard: () => void
}) {
  return (
    <section className="space-y-2.5" aria-labelledby="design-history">
      <p id="design-history" className="px-1 text-sm font-extrabold uppercase tracking-wider text-slate-600">
        Earlier looks
      </p>
      {items == null ? (
        <Spinner label="Loading earlier looks…" />
      ) : (
        <Card className="space-y-3">
          <p className="text-sm text-slate-600">
            Each time you publish, the look it replaces is kept here (the last {DESIGN_HISTORY_MAX}). Putting one back keeps the current one here
            too, so nothing is lost.
          </p>
          {items.length === 0 && <p className="text-base text-slate-600">Nothing has been replaced yet.</p>}
          <ul className="divide-y divide-slate-100">
            {items.map((h, i) => (
              <li key={h.at + i} className="flex flex-wrap items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold text-ink">Before “{h.label}”</span>
                  <span className="block text-sm text-slate-500">replaced {when(h.at)}</span>
                  <span className="mt-1 flex items-center gap-1.5" aria-hidden="true">
                    <span className="inline-block h-5 w-5 rounded-full border border-black/10" style={{ background: h.design.blue }} />
                    <span className="inline-block h-5 w-5 rounded-full border border-black/10" style={{ background: h.design.orange }} />
                  </span>
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onPutBack(h.design)}
                  className="inline-flex min-h-11 items-center rounded-full border-2 border-slate-200 bg-white px-4 text-sm font-bold text-brand-blue disabled:opacity-50"
                >
                  Put this one back
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-100 pt-3">
            <button
              type="button"
              disabled={busy}
              onClick={onStandard}
              className="inline-flex min-h-12 items-center rounded-2xl border-2 border-red-200 bg-white px-5 text-base font-bold text-red-700 disabled:opacity-50"
            >
              Go back to the standard OHRR look
            </button>
          </div>
        </Card>
      )}
    </section>
  )
}
