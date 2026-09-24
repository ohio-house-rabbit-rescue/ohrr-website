// Every public form on the website sends its answers here — the same
// `requests` table and staff Inbox the app uses (app repo:
// supabase/migrations/20260921100000_requests.sql). No sign-in needed.
import { supabase, isSupabaseConfigured } from './supabase'

export type RequestKind =
  | 'contact'
  | 'mailing-list'
  | 'adoption-application'
  | 'surrender-intake'
  | 'volunteer-signup'
  | 'appointment-request'
  | 'happy-tail'
  | 'supporter'
  | 'foster-application'
  | 'found-rabbit'

export interface RequestFields {
  name?: string
  email?: string
  phone?: string
  [field: string]: string | undefined
}

function summarize(kind: RequestKind, f: RequestFields): string {
  const pick = (...keys: string[]) => keys.map((k) => f[k]).filter(Boolean).join(' · ')
  switch (kind) {
    case 'mailing-list':
      return 'Join the mailing list'
    case 'supporter':
      return 'Become a supporter'
    case 'foster-application':
      return pick('situation', 'length') || 'Foster interest'
    case 'adoption-application':
      return pick('rabbit') || 'Adoption application'
    case 'surrender-intake':
      return pick('type', 'bunnyName') || 'Surrender intake'
    case 'volunteer-signup':
      return pick('role') || 'Volunteer'
    case 'appointment-request':
      return pick('reason', 'date', 'times') || 'Appointment'
    case 'happy-tail':
      return pick('bunny') || 'Happy Tail'
    case 'found-rabbit':
      return pick('where', 'condition') || 'Found rabbit'
    default:
      return pick('subject') || 'Message'
  }
}

/** Sends a form; throws with a friendly message if it couldn't be stored. */
export async function submitRequest(kind: RequestKind, fields: RequestFields): Promise<void> {
  if (fields['bot-field']) return // honeypot: pretend, store nothing
  if (!isSupabaseConfigured) throw new Error('This site isn’t connected to OHRR yet.')
  const { name, email, phone, ...rest } = fields
  delete rest['bot-field']
  const payload: Record<string, string> = {}
  for (const [k, v] of Object.entries(rest)) if (v != null && String(v).trim() !== '') payload[k] = String(v)
  const { error } = await supabase.rpc('submit_request', {
    p_kind: kind,
    p_name: name ?? null,
    p_email: email ?? null,
    p_phone: phone ?? null,
    p_subject: summarize(kind, fields),
    p_payload: payload,
    p_source: 'website',
  })
  if (error) throw new Error(error.message || 'Could not send that right now.')
}
