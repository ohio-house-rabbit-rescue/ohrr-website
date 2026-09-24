// Staff → Posts: the Share kit and the Post queue, desktop edition. Same
// tables and card painter as the app. Drafting is comfortable here (typing,
// uploading); releasing usually happens on the phone where Instagram lives —
// but "Save image + copy caption" works from a computer too. Since update 26 a
// post needs a second person: the writer sends it for approval, someone else
// with "Approve social posts" approves it or sends it back with a note.
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useStaff, staffInput, Spinner } from '../../lib/staff'
import { errMessage } from '../../lib/supabase'
import { useRabbits, useEvents } from '../../lib/data'
import { btn, Card } from '../../components/ui'
import { Icon } from '../../components/icons'
import { EDUCATION_CARDS, HASHTAGS, customPost, educationPost, eventPost, rabbitPost, suggestedEducation, type CardFormat, type CardPost } from '../../lib/share/templates'
import { canvasToBlob, renderCard } from '../../lib/share/render'
import { canShareFiles, copyText, savePng, sharePng } from '../../lib/share/share'
import {
  APPROVE_CAP,
  PLATFORMS,
  STATUS_LABEL,
  countPostsToApprove,
  createPost,
  deletePost,
  fetchImageBlob,
  isReady,
  listPosts,
  loadStaffNames,
  setPostStatus,
  shortDate,
  updatePost,
  uploadPostPhoto,
  uploadPostPng,
  whenLabel,
  type Platform,
  type PostDraft,
  type PostStatus,
  type SocialPost,
} from '../../lib/share/queue'

type View = 'queue' | 'kit' | 'new' | { edit: string } | { compose: CardPost }

export default function Posts() {
  const { membership, user, can } = useStaff()
  const orgId = membership?.orgId ?? ''
  const userId = user?.id ?? ''
  const canDraft = can('announcements.post')
  const canPublish = can('social.publish')
  const canApprove = can(APPROVE_CAP)
  const [view, setView] = useState<View>('queue')
  const [posts, setPosts] = useState<SocialPost[] | null>(null)
  const [names, setNames] = useState<Map<string, string>>(() => new Map())
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setPosts(await listPosts(orgId))
    } catch (e) {
      setError(errMessage(e))
    }
  }, [orgId])
  useEffect(() => {
    if (orgId) void load()
  }, [orgId, load])
  // Who approved a post — nice to have; the queue works without it.
  useEffect(() => {
    if (!orgId) return
    let alive = true
    void loadStaffNames(orgId).then((m) => {
      if (alive) setNames(m)
    })
    return () => {
      alive = false
    }
  }, [orgId])

  if (!canDraft && !canPublish && !canApprove) return <p className="text-slate-600">You don’t have access to posts.</p>

  const editing = typeof view === 'object' && 'edit' in view ? (posts ?? []).find((p) => p.id === view.edit) ?? null : null

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-ink">Posts</h1>
          <p className="mt-1 text-sm text-slate-600">
            Build posts here and send them for approval. Someone other than the writer approves them, then {canPublish ? 'you release them' : 'the person with posting rights releases them'} — usually from the phone, where Instagram, Facebook and TikTok are.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void load()
              setView('queue')
            }}
            className={view === 'queue' ? btn.blue : btn.outline}
          >
            Queue
          </button>
          {canDraft && (
            <>
              <button type="button" onClick={() => setView('kit')} className={view === 'kit' || (typeof view === 'object' && 'compose' in view) ? btn.blue : btn.outline}>
                Share kit
              </button>
              <button type="button" onClick={() => setView('new')} className={btn.orange}>
                <Icon name="plus" size={16} /> New post
              </button>
            </>
          )}
        </div>
      </div>
      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}

      <div className="mt-6">
        {view === 'queue' && <Queue posts={posts} me={userId} names={names} canDraft={canDraft} canPublish={canPublish} canApprove={canApprove} onChanged={load} onEdit={(id) => setView({ edit: id })} />}
        {view === 'kit' && <Kit onPick={(p) => setView({ compose: p })} />}
        {typeof view === 'object' && 'compose' in view && (
          <Composer
            post={view.compose}
            orgId={orgId}
            userId={userId}
            onBack={() => setView('kit')}
            onQueued={async (warning) => {
              await load()
              setView('queue')
              setError(warning ?? null)
            }}
          />
        )}
        {(view === 'new' || editing) && (
          <Editor
            key={editing?.id ?? 'new'}
            orgId={orgId}
            userId={userId}
            initial={editing}
            onDone={async () => {
              await load()
              setView('queue')
            }}
            onCancel={() => {
              void load()
              setView('queue')
            }}
          />
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- queue */

/** Resolves to the error text, or null when it worked (the list has reloaded). */
type OnStatus = (p: SocialPost, s: PostStatus, opts?: { postedTo?: Platform[]; note?: string }) => Promise<string | null>

function Queue({
  posts,
  me,
  names,
  canDraft,
  canPublish,
  canApprove,
  onChanged,
  onEdit,
}: {
  posts: SocialPost[] | null
  me: string
  names: Map<string, string>
  canDraft: boolean
  canPublish: boolean
  canApprove: boolean
  onChanged: () => Promise<void>
  onEdit: (id: string) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const groups = useMemo(() => {
    const all = posts ?? []
    return {
      // Other people's posts first: those are the ones an approver can act on.
      waiting: all.filter((p) => p.status === 'submitted').sort((a, b) => Number(a.created_by === me) - Number(b.created_by === me)),
      ready: all.filter((p) => isReady(p)),
      scheduled: all.filter((p) => p.status === 'approved' && !isReady(p)),
      drafts: all.filter((p) => p.status === 'draft'),
      posted: all.filter((p) => p.status === 'posted').slice(0, 30),
    }
  }, [posts, me])
  const act: OnStatus = async (p, status, opts) => {
    setError(null)
    try {
      await setPostStatus(p.id, status, opts?.postedTo, opts?.note)
      await onChanged()
      return null
    } catch (e) {
      return errMessage(e)
    }
  }
  const remove = async (p: SocialPost) => {
    if (!window.confirm(`Delete “${p.title}”?`)) return
    try {
      await deletePost(p.id)
      await onChanged()
    } catch (e) {
      setError(errMessage(e))
    }
  }
  if (posts === null) return <Spinner />
  // Approvers see what's waiting for them first.
  const waiting: [string, SocialPost[], string] = ['Waiting for approval', groups.waiting, 'Nothing is waiting for approval.']
  const sections: [string, SocialPost[], string][] = [
    ...(canApprove ? [waiting] : []),
    ['Ready to post', groups.ready, 'Nothing is ready right now.'],
    ['Scheduled', groups.scheduled, 'No posts waiting for a date.'],
    ...(canApprove ? [] : [waiting]),
    ['Drafts', groups.drafts, 'No drafts yet.'],
    ['Posted', groups.posted, 'Nothing posted yet.'],
  ]
  return (
    <div className="space-y-8">
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      {sections.map(([title, list, empty]) => (
        <section key={title}>
          <h2 className="font-display text-lg font-extrabold text-ink">
            {title} <span className="text-sm font-bold text-slate-400">{list.length}</span>
          </h2>
          {list.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">{empty}</p>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {list.map((p) => (
                <PostCard key={p.id} post={p} me={me} names={names} canDraft={canDraft} canPublish={canPublish} canApprove={canApprove} onStatus={act} onDelete={remove} onEdit={() => onEdit(p.id)} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}

function PostCard({
  post,
  me,
  names,
  canDraft,
  canPublish,
  canApprove,
  onStatus,
  onDelete,
  onEdit,
}: {
  post: SocialPost
  me: string
  names: Map<string, string>
  canDraft: boolean
  canPublish: boolean
  canApprove: boolean
  onStatus: OnStatus
  onDelete: (p: SocialPost) => Promise<void>
  onEdit: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [postedTo, setPostedTo] = useState<Platform[]>(post.platforms)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sendingBack, setSendingBack] = useState(false)
  const [note, setNote] = useState('')

  const mine = Boolean(me) && post.created_by === me
  const who = (id: string | null | undefined) => (!id ? null : id === me ? 'you' : (names.get(id) ?? null))
  const sentBack = post.status === 'draft' && Boolean(post.review_note)
  const approver = who(post.approved_by)
  const sender = who(post.submitted_by)

  const run = async (status: PostStatus, opts?: { postedTo?: Platform[]; note?: string }) => {
    setBusy(true)
    setMsg(null)
    const err = await onStatus(post, status, opts)
    setBusy(false)
    if (err) setMsg(err)
    else {
      setSendingBack(false)
      setNote('')
      setConfirming(false)
    }
  }
  const release = async () => {
    setMsg(null)
    try {
      if (post.image_url) {
        const blob = await fetchImageBlob(post.image_url)
        const out = await sharePng(blob, `ohrr-post-${post.id.slice(0, 8)}.png`, post.caption)
        setMsg(out === 'shared' ? 'Sent to the share sheet.' : 'Image downloaded and caption copied — open the platform, add the picture, paste the caption.')
      } else {
        await copyText(post.caption)
        setMsg('Caption copied.')
      }
      setConfirming(true)
    } catch (e) {
      setMsg(errMessage(e))
    }
  }
  return (
    <Card className={`flex flex-col ${isReady(post) ? 'border-brand-orange/40' : ''}`}>
      <div className="flex gap-3">
        {post.image_url ? <img src={post.image_url} alt={post.image_alt ?? ''} className="h-24 w-24 shrink-0 rounded-xl object-cover" /> : <span className="inline-flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-brand-blue-50 text-brand-blue"><Icon name="mail" size={28} /></span>}
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-extrabold text-ink">{post.title}</p>
          <p className="text-xs text-slate-500">
            <span className={`font-bold ${post.status === 'approved' ? 'text-brand-blue' : 'text-ink'}`}>{sentBack ? 'Sent back' : (STATUS_LABEL[post.status] ?? post.status)}</span> ·{' '}
            {post.status === 'posted' ? `${shortDate(post.posted_at)}${post.posted_to?.length ? ` · ${post.posted_to.join(', ')}` : ''}` : whenLabel(post)} · {post.platforms.join(', ')}
          </p>
          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-slate-700">{post.caption}</p>
          {post.notes && <p className="mt-1 text-xs text-slate-500">Note: {post.notes}</p>}
          {post.status === 'submitted' && post.submitted_at && (
            <p className="mt-1 text-xs text-slate-500">
              Sent for approval {shortDate(post.submitted_at)}
              {sender ? ` by ${sender}` : ''}
            </p>
          )}
          {(post.status === 'approved' || post.status === 'posted') && post.approved_at && (
            <p className="mt-1 text-xs font-semibold text-slate-600">
              Approved {shortDate(post.approved_at)}
              {approver ? ` by ${approver}` : ''}
            </p>
          )}
        </div>
      </div>
      {sentBack && (
        <div className="mt-3 rounded-xl border border-brand-orange/40 bg-brand-orange-50 px-3 py-2">
          <p className="text-xs font-bold text-ink">Sent back for changes</p>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{post.review_note}</p>
        </div>
      )}
      {post.status === 'submitted' &&
        (canApprove && !mine ? (
          <div className="mt-3 space-y-2 rounded-2xl bg-brand-blue-50/60 p-3">
            {!sendingBack ? (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => void run('approved')} disabled={busy} className={`${btn.blue} disabled:opacity-60`}>
                  <Icon name="check" size={16} /> Approve
                </button>
                <button type="button" onClick={() => setSendingBack(true)} disabled={busy} className={`${btn.outline} disabled:opacity-60`}>
                  Send back
                </button>
              </div>
            ) : (
              <>
                <label className="block text-sm font-semibold text-slate-700">
                  What should change? The writer sees this.
                  <textarea className={staffInput} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Use the other photo · spell her name the same both times" />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void run('draft', { note })} disabled={busy || !note.trim()} className={`${btn.orange} disabled:opacity-60`}>
                    Send back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSendingBack(false)
                      setNote('')
                    }}
                    className={btn.outline}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">{mine ? 'Waiting for someone else to approve' : 'Waiting for approval'}</p>
        ))}
      {msg && <p className="mt-2 text-xs font-semibold text-slate-600">{msg}</p>}
      {confirming && post.status === 'approved' && canPublish && (
        <div className="mt-3 space-y-2 rounded-2xl bg-brand-orange-50/60 p-3">
          <p className="text-sm font-bold text-ink">Posted it? Where?</p>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORMS.map((pl) => (
              <button key={pl.value} type="button" onClick={() => setPostedTo((t) => (t.includes(pl.value) ? t.filter((x) => x !== pl.value) : [...t, pl.value]))} className={`rounded-full px-3 py-1.5 text-xs font-bold ${postedTo.includes(pl.value) ? 'bg-brand-blue text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>
                {pl.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => void run('posted', { postedTo })} disabled={busy} className={`${btn.blue} disabled:opacity-60`}>
            Mark as posted
          </button>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {post.status === 'approved' && canPublish && (
          <button type="button" onClick={() => void release()} className={btn.orange}>
            {canShareFiles() ? 'Share now' : 'Save image + copy caption'}
          </button>
        )}
        {post.status === 'draft' && canDraft && (
          <button type="button" onClick={() => void run('submitted')} disabled={busy} className={`${btn.orange} disabled:opacity-60`}>
            Send for approval
          </button>
        )}
        {(post.status === 'approved' || (post.status === 'submitted' && mine)) && canDraft && (
          <button type="button" onClick={() => void run('draft')} disabled={busy} className={`${btn.outline} disabled:opacity-60`}>
            Back to draft
          </button>
        )}
        {post.status !== 'posted' && (canDraft || canApprove) && (
          <button type="button" onClick={onEdit} className={btn.outline}>
            Edit
          </button>
        )}
        {post.image_url && (
          <button type="button" onClick={() => fetchImageBlob(post.image_url!).then((b) => savePng(b, `ohrr-post-${post.id.slice(0, 8)}.png`))} className={btn.outline}>
            Save image
          </button>
        )}
        <button type="button" onClick={() => copyText(post.caption).then(() => setMsg('Caption copied.'))} className={btn.outline}>
          Copy caption
        </button>
        {post.status === 'posted' && canDraft && (
          <button type="button" onClick={() => void run('draft')} disabled={busy} className={`${btn.outline} disabled:opacity-60`}>
            Post again
          </button>
        )}
        {canDraft && (
          <button type="button" onClick={() => void onDelete(post)} className="text-sm font-bold text-red-600">
            Delete
          </button>
        )}
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------- share kit */

function Kit({ onPick }: { onPick: (p: CardPost) => void }) {
  const { rabbits, source } = useRabbits(60)
  const { events } = useEvents()
  const [custom, setCustom] = useState({ headline: '', subline: '' })
  const seasonal = useMemo(() => suggestedEducation(), [])
  const upcoming = useMemo(() => (events ?? []).filter((e) => new Date(e.endsAt ?? e.startsAt).getTime() > Date.now()).slice(0, 8), [events])
  const row = (p: CardPost) => (
    <button key={p.id} type="button" onClick={() => onPick(p)} className="flex w-full items-center gap-3 rounded-2xl border border-black/5 bg-white p-3 text-left shadow-sm transition hover:border-slate-300">
      {p.card.photo ? <img src={p.card.photo} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" /> : <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-blue-50 text-brand-blue"><Icon name={p.card.kind === 'event' ? 'calendar' : p.card.kind === 'education' ? 'book' : 'sparkles'} size={20} /></span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[15px] font-extrabold text-ink">{p.label}</span>
        <span className="block truncate text-xs text-slate-500">{p.when ?? p.card.kicker}</span>
      </span>
      <Icon name="chevron" size={16} className="text-slate-300" />
    </button>
  )
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <section className="space-y-2">
        <h2 className="font-display text-lg font-extrabold text-ink">Messages</h2>
        <p className="text-xs text-slate-500">Education posts for the audiences OHRR most needs; this month’s first.</p>
        {seasonal.map((c) => row(educationPost(c)))}
        {EDUCATION_CARDS.length === 0 && <p className="text-sm text-slate-500">None.</p>}
      </section>
      <section className="space-y-2">
        <h2 className="font-display text-lg font-extrabold text-ink">Rabbits</h2>
        {source === 'sample' && <p className="text-xs text-slate-500">Sample listings until OHRR adds real rabbits.</p>}
        {rabbits === null ? <Spinner /> : rabbits.map((r) => row(rabbitPost({ ...r, description: r.description ?? undefined, age: r.age ?? undefined, sex: r.sex ?? undefined, breed: r.breed ?? undefined })))}
      </section>
      <section className="space-y-2">
        <h2 className="font-display text-lg font-extrabold text-ink">Events</h2>
        {upcoming.length === 0 && <p className="text-sm text-slate-500">No upcoming events.</p>}
        {upcoming.map((e) => row(eventPost({ ...e, venue: e.venue ?? undefined, city: e.city ?? undefined, summary: e.summary ?? undefined })))}
        <h2 className="pt-4 font-display text-lg font-extrabold text-ink">Custom</h2>
        <Card className="space-y-2">
          <input className={staffInput} value={custom.headline} onChange={(e) => setCustom({ ...custom, headline: e.target.value })} placeholder="Big line" maxLength={80} />
          <textarea className={staffInput} rows={2} value={custom.subline} onChange={(e) => setCustom({ ...custom, subline: e.target.value })} placeholder="Small line (optional)" maxLength={160} />
          <button type="button" disabled={!custom.headline.trim()} onClick={() => onPick(customPost(custom.headline.trim(), custom.subline.trim()))} className={`${btn.orange} disabled:opacity-60`}>
            Make the card
          </button>
        </Card>
      </section>
    </div>
  )
}

function Composer({ post, orgId, userId, onBack, onQueued }: { post: CardPost; orgId: string; userId: string; onBack: () => void; onQueued: (warning?: string) => Promise<void> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [format, setFormat] = useState<CardFormat>('square')
  const [caption, setCaption] = useState(post.caption)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    setBusy(true)
    renderCard(c, post.card, format, { logoUrl: '/img/ohrr-mark.png' })
      .catch((e) => setMsg(errMessage(e)))
      .finally(() => setBusy(false))
  }, [post, format])
  const filename = `ohrr-${post.id.replace(/[^a-z0-9]+/gi, '-')}-${format}.png`
  // Into the post queue as a draft, or straight on to "Waiting for approval".
  const queue = async (send: boolean) => {
    const c = canvasRef.current
    if (!c) return
    setBusy(true)
    let created: SocialPost
    try {
      const url = await uploadPostPng(await canvasToBlob(c), orgId)
      created = await createPost(orgId, userId, { title: post.label, caption, image_url: url, image_alt: post.card.headline, platforms: format === 'story' ? ['instagram'] : ['instagram', 'facebook'], scheduled_for: null, source: `kit:${post.id}` })
    } catch (e) {
      setMsg(errMessage(e))
      setBusy(false)
      return
    }
    let warning: string | undefined
    if (send) {
      try {
        await setPostStatus(created.id, 'submitted')
      } catch (e) {
        // Saved either way; say why it's still a draft.
        warning = `“${created.title}” is saved as a draft, but not sent for approval: ${errMessage(e)}`
      }
    }
    await onQueued(warning)
  }
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,420px)_1fr]">
      <div>
        <button type="button" onClick={onBack} className="text-sm font-bold text-brand-blue">
          ← Share kit
        </button>
        <div className="mt-3 flex gap-2">
          {(['square', 'story'] as CardFormat[]).map((f) => (
            <button key={f} type="button" onClick={() => setFormat(f)} className={format === f ? btn.blue : btn.outline}>
              {f === 'square' ? 'Post (square)' : 'Story (tall)'}
            </button>
          ))}
        </div>
        <div className={`mt-3 overflow-hidden rounded-2xl bg-slate-100 shadow ${format === 'story' ? 'max-w-[260px]' : 'max-w-[420px]'}`}>
          <canvas ref={canvasRef} className="block h-auto w-full" />
        </div>
      </div>
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-slate-700">
          Caption
          <textarea className={staffInput} rows={9} value={caption} onChange={(e) => setCaption(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void queue(false)} disabled={busy} className={`${btn.outline} disabled:opacity-60`}>
            Save draft
          </button>
          <button type="button" onClick={() => void queue(true)} disabled={busy} className={`${btn.orange} disabled:opacity-60`}>
            Send for approval
          </button>
          <button type="button" onClick={() => canvasRef.current && canvasToBlob(canvasRef.current).then((b) => savePng(b, filename))} disabled={busy} className={btn.outline}>
            Save image
          </button>
          <button type="button" onClick={() => copyText(caption).then(() => setMsg('Caption copied.'))} className={btn.outline}>
            Copy caption
          </button>
        </div>
        {msg && <p className="text-sm font-semibold text-slate-600">{msg}</p>}
        <p className="text-xs text-slate-500">Either way it goes into the post queue. Someone other than you approves it before it’s posted.</p>
        <p className="text-xs text-slate-500">The phone app has a one-tap Share button for these; from a computer, save the image and paste the caption into the platform.</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- editor */

// Change these on an approved post and the database sends it back for approval.
const wordsKey = (d: Pick<PostDraft, 'title' | 'caption' | 'image_url' | 'platforms'>) => JSON.stringify([d.title.trim(), d.caption, d.image_url, d.platforms])

function Editor({ orgId, userId, initial, onDone, onCancel }: { orgId: string; userId: string; initial: SocialPost | null; onDone: () => Promise<void>; onCancel: () => void }) {
  const [d, setD] = useState<PostDraft>(
    initial
      ? { title: initial.title, caption: initial.caption, image_url: initial.image_url, image_alt: initial.image_alt, platforms: initial.platforms, scheduled_for: initial.scheduled_for, notes: initial.notes ?? '' }
      : { title: '', caption: '', image_url: null, platforms: ['instagram', 'facebook'], scheduled_for: null, notes: '' },
  )
  // The stored post — set once a new one is saved, so saving again updates it.
  const [saved, setSaved] = useState<SocialPost | null>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    try {
      setD((x) => ({ ...x, image_url: null }))
      const url = await uploadPostPhoto(f, orgId)
      setD((x) => ({ ...x, image_url: url }))
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setBusy(false)
    }
  }
  // 'keep' leaves the status alone. (An approved post whose words change goes
  // back for approval by itself: the database does that.)
  const save = async (target: 'draft' | 'submitted' | 'keep') => {
    if (!d.title.trim()) return setError('Give the post a short name.')
    if (!d.caption.trim() && !d.image_url) return setError('Add some words or a picture.')
    setBusy(true)
    setError(null)
    let current = saved
    try {
      if (current) await updatePost(current.id, d)
      else {
        current = await createPost(orgId, userId, d)
        setSaved(current)
      }
    } catch (e) {
      setError(errMessage(e))
      setBusy(false)
      return
    }
    if (target !== 'keep' && target !== current.status) {
      try {
        await setPostStatus(current.id, target)
      } catch (e) {
        // The words are safe; only the status didn't change. Stay here and say why.
        setSaved({ ...current, title: d.title.trim(), caption: d.caption, image_url: d.image_url, platforms: d.platforms })
        setError(`Saved, but ${target === 'submitted' ? 'not sent for approval' : 'not moved to drafts'}: ${errMessage(e)}`)
        setBusy(false)
        return
      }
    }
    await onDone()
  }

  const status = saved?.status ?? null
  const isDraft = status === null || status === 'draft' || status === 'archived'
  const mine = saved?.created_by === userId
  const wordsChanged = saved !== null && wordsKey(d) !== wordsKey(saved)

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        void save(isDraft ? 'draft' : 'keep')
      }}
      className="grid gap-6 md:grid-cols-2"
    >
      <div className="space-y-2 md:col-span-2">
        <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${status === 'submitted' ? 'bg-brand-orange-50 text-ink' : status === 'approved' ? 'bg-brand-blue-50 text-brand-blue' : 'bg-slate-100 text-slate-600'}`}>
            {status ? STATUS_LABEL[status] : 'Draft · not saved yet'}
          </span>
          {status === 'submitted' && <span>{mine ? 'Waiting for someone else to approve it.' : 'Waiting for approval.'} Saving changes keeps it in line.</span>}
          {status === 'approved' && <span>Approved {shortDate(saved?.approved_at)}. Changing the words, the picture, the short name or where it goes sends it back for approval.</span>}
        </p>
        {status === 'draft' && saved?.review_note && (
          <div className="rounded-2xl border border-brand-orange/40 bg-brand-orange-50 px-4 py-3">
            <p className="text-sm font-bold text-ink">Sent back for changes</p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{saved.review_note}</p>
            <p className="mt-1 text-xs text-slate-500">Make the changes, then send it for approval again.</p>
          </div>
        )}
      </div>
      <Card className="space-y-3">
        <p className="text-sm font-semibold text-slate-700">Picture</p>
        {d.image_url ? <img src={d.image_url} alt="" className="w-full rounded-xl" /> : <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400"><Icon name="camera" size={36} /></div>}
        <div className="flex gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className={btn.blue}>
            Choose a picture
          </button>
          {d.image_url && (
            <button type="button" onClick={() => setD((x) => ({ ...x, image_url: null }))} className="text-sm font-bold text-red-600">
              Remove
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        <p className="text-xs text-slate-500">Or make a designed card in the Share kit and send it for approval from there.</p>
      </Card>
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-slate-700">
          Short name (for the queue)
          <input className={staffInput} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} maxLength={80} required />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Caption
          <textarea className={staffInput} rows={7} value={d.caption} onChange={(e) => setD({ ...d, caption: e.target.value })} />
        </label>
        {!d.caption.includes('#') && (
          <button type="button" onClick={() => setD({ ...d, caption: `${d.caption.trimEnd()}\n\n${HASHTAGS}` })} className="text-sm font-bold text-brand-blue">
            + Add OHRR’s hashtags
          </button>
        )}
        <div>
          <p className="text-sm font-semibold text-slate-700">Where it should go</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {PLATFORMS.map((pl) => (
              <button key={pl.value} type="button" onClick={() => setD((x) => ({ ...x, platforms: x.platforms.includes(pl.value) ? x.platforms.filter((y) => y !== pl.value) : [...x.platforms, pl.value] }))} className={`rounded-full px-4 py-1.5 text-sm font-bold ${d.platforms.includes(pl.value) ? 'bg-brand-blue text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>
                {pl.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">
            Post on (optional)
            <input type="date" className={staffInput} value={d.scheduled_for ?? ''} onChange={(e) => setD({ ...d, scheduled_for: e.target.value || null })} />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Note for the poster
            <input className={staffInput} value={d.notes ?? ''} onChange={(e) => setD({ ...d, notes: e.target.value })} />
          </label>
        </div>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <div className="flex flex-wrap gap-2">
          {isDraft ? (
            <>
              <button type="submit" disabled={busy} className={`${btn.outline} disabled:opacity-60`}>
                Save draft
              </button>
              <button type="button" onClick={() => void save('submitted')} disabled={busy} className={`${btn.orange} disabled:opacity-60`}>
                Send for approval
              </button>
            </>
          ) : (
            <>
              {status === 'submitted' && mine && (
                <button type="button" onClick={() => void save('draft')} disabled={busy} className={`${btn.outline} disabled:opacity-60`}>
                  Save as draft
                </button>
              )}
              <button type="submit" disabled={busy} className={`${btn.orange} disabled:opacity-60`}>
                {status === 'approved' && wordsChanged ? 'Save and send for approval' : 'Save changes'}
              </button>
            </>
          )}
          <button type="button" onClick={onCancel} className="text-sm font-bold text-slate-500">
            Cancel
          </button>
        </div>
      </div>
    </form>
  )
}

/* ------------------------------------------------------------- dashboard notice */

/**
 * "3 posts waiting for your approval" for the staff dashboard. Shows only to
 * people with "Approve social posts", only when someone else's post is waiting,
 * and not at all before update 26 is in the database.
 */
export function PostsToApproveNotice({ className = '' }: { className?: string }) {
  const { membership, can } = useStaff()
  const orgId = membership && can(APPROVE_CAP) ? membership.orgId : null
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!orgId) return
    let alive = true
    void countPostsToApprove(orgId).then((c) => {
      if (alive) setN(c)
    })
    return () => {
      alive = false
    }
  }, [orgId])
  if (!orgId || n <= 0) return null
  return (
    <Link to="/staff/posts" className={`flex items-center gap-3 rounded-2xl border border-brand-orange/40 bg-brand-orange-50 px-4 py-3 shadow-sm transition hover:border-brand-orange ${className}`}>
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-orange text-ink">
        <Icon name="check" size={20} />
      </span>
      <span className="min-w-0 flex-1 font-display text-base font-extrabold text-ink">
        {n === 1 ? '1 post' : `${n} posts`} waiting for your approval
      </span>
      <Icon name="chevron" size={18} className="shrink-0 text-slate-400" />
    </Link>
  )
}
