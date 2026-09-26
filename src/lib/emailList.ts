// OHRR's email list (update 31, table `mailing_list`): who wants emails and
// about what. OHRR (2026-09-26): "The website would just be a standard email
// form." So the website's "Get emails from OHRR" form adds people without an
// account, the link in every email (/emails/<token>) changes what they get or
// stops it, and staff with "supporters.view" see and download the list under
// Staff → Supporters. The app uses the same interests and wording.
//
// Until update 31 has been run the form falls back to the Inbox, as it always
// did (a 'mailing-list' request); the update copies those sign-ups across.
import { supabase, isSupabaseConfigured } from './supabase'
import { submitRequest } from './requests'

/** What people can ask to hear about — the same labels everywhere. */
export const INTERESTS = [
  { key: 'volunteer', label: 'Volunteer opportunities' },
  { key: 'events', label: 'Events' },
  { key: 'bunfest', label: 'Midwest BunFest' },
  { key: 'adoptions', label: 'Rabbits up for adoption' },
  { key: 'hopshop', label: 'Hop Shop news' },
  { key: 'newsletter', label: 'OHRR news' },
] as const
export type Interest = (typeof INTERESTS)[number]['key']

export function isInterest(v: unknown): v is Interest {
  return INTERESTS.some((i) => i.key === v)
}
export function interestLabel(k: string): string {
  return INTERESTS.find((i) => i.key === k)?.label ?? k
}
/** Known interests only, once each, in the list's order ("volunteer,events" or an array). */
export function cleanInterests(v: unknown): Interest[] {
  const list = typeof v === 'string' ? v.split(',') : Array.isArray(v) ? v : []
  const want = new Set(list.map((x) => String(x).trim().toLowerCase()))
  return INTERESTS.map((i) => i.key).filter((k) => want.has(k))
}

/** Next to the tick boxes, wherever someone picks what they get. */
export const CONSENT_LINE = 'OHRR will email you about what you tick. Every email has a link to change this or stop.'

/** The link in every email that lets someone change what they get or stop. */
export const emailChoicesLink = (token: string) => `https://ohrr-website.pages.dev/emails/${token}`

/** The function isn't in the database: update 31 hasn't been run. */
export function isMissingFunction(e: unknown): boolean {
  const o = e as { code?: string; message?: string } | null
  return o?.code === 'PGRST202' || /could not find the function/i.test(o?.message ?? '')
}
/** The table isn't in the database: update 31 hasn't been run. */
export function isMissingTable(e: unknown): boolean {
  const o = e as { code?: string; message?: string } | null
  return o?.code === 'PGRST205' || o?.code === '42P01' || /schema cache|does not exist/i.test(o?.message ?? '')
}

/**
 * The website form. It only ever adds interests (anyone can type any address)
 * and says nothing about whether the address was on the list already.
 * Returns where it landed: the email list, or the Inbox before update 31.
 */
export async function joinMailingList(f: { name: string; email: string; interests: Interest[]; 'bot-field'?: string }): Promise<'list' | 'inbox'> {
  if (f['bot-field']) return 'list' // honeypot: pretend, store nothing
  if (!isSupabaseConfigured) throw new Error('This site isn’t connected to OHRR yet.')
  const { error } = await supabase.rpc('join_mailing_list', {
    p_name: f.name.trim() || null,
    p_email: f.email.trim(),
    p_interests: f.interests,
    p_source: 'website',
  })
  if (!error) return 'list'
  if (!isMissingFunction(error)) throw new Error(error.message || 'Could not sign you up right now.')
  await submitRequest('mailing-list', {
    name: f.name.trim(),
    email: f.email.trim(),
    interests: f.interests.map(interestLabel).join(', '),
  })
  return 'inbox'
}

export interface EmailChoices {
  /** Half hidden: "jo•••@example.com". */
  email: string
  interests: Interest[]
  subscribed: boolean
}

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * What an email link's owner gets. null when the link isn't one OHRR knows —
 * mistyped, replaced, or the list isn't switched on yet. Throws on anything
 * else (no connection), so the page can offer to try again.
 */
export async function emailChoicesByToken(token: string): Promise<EmailChoices | null> {
  if (!TOKEN_RE.test(token) || !isSupabaseConfigured) return null
  const { data, error } = await supabase.rpc('email_prefs_by_token', { p_token: token })
  if (error) {
    if (isMissingFunction(error) || error.code === '22P02') return null
    throw new Error(error.message || 'Could not load your choices right now.')
  }
  const d = data as { email?: unknown; interests?: unknown; subscribed?: unknown } | null
  if (!d || typeof d.email !== 'string') return null
  return { email: d.email, interests: cleanInterests(d.interests), subscribed: d.subscribed !== false }
}

/** Save what they get; `subscribed` false stops every email (their ticks are kept for an undo). */
export async function setEmailChoicesByToken(token: string, interests: Interest[], subscribed: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_email_prefs_by_token', { p_token: token, p_interests: interests, p_subscribed: subscribed })
  if (error) throw new Error(error.message || 'Could not save that right now.')
}
