// Happy Tails — published adoption stories (website mirror of the app's
// src/features/tails/api.ts). Stories arrive through the Inbox; publishing one
// writes a `happy_tails` row the app's Happy Tails page reads.
import { supabase } from './supabase'

export type TailStatus = 'looking' | 'just-adopted' | 'settling-in' | 'going-strong' | 'forever-loved'

export const TAIL_STATUS_LABEL: Record<TailStatus, string> = {
  looking: 'Looking for a home',
  'just-adopted': 'Just adopted',
  'settling-in': 'Settling in',
  'going-strong': 'Going strong',
  'forever-loved': 'Forever loved',
}

export interface TailRow {
  id: string
  org_id: string
  bunny: string
  family: string | null
  status: TailStatus
  since: string | null
  summary: string
  story: string | null
  photo_url: string | null
  is_published: boolean
  sort_order: number
  request_id: string | null
  created_at: string
}
export type TailInput = Omit<Partial<TailRow>, 'org_id' | 'bunny' | 'summary'> & {
  org_id: string
  bunny: string
  summary: string
}

export async function listTails(orgId: string): Promise<TailRow[]> {
  const { data, error } = await supabase
    .from('happy_tails')
    .select('*')
    .eq('org_id', orgId)
    .order('sort_order', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as TailRow[]
}

export async function saveTail(t: TailInput): Promise<TailRow> {
  const { data, error } = await supabase.from('happy_tails').upsert(t, { onConflict: 'id' }).select('*').single()
  if (error) throw error
  return data as TailRow
}

export async function deleteTail(id: string): Promise<void> {
  const { error } = await supabase.from('happy_tails').delete().eq('id', id)
  if (error) throw error
}

export interface PublishInput {
  requestId: string
  bunny: string
  summary: string
  family?: string
  status?: TailStatus
  since?: string
  story?: string
  photoUrl?: string
}

/** Inbox → Happy Tails. Marks the request done and returns the new story's id. */
export async function publishHappyTail(i: PublishInput): Promise<string> {
  const { data, error } = await supabase.rpc('publish_happy_tail', {
    p_request_id: i.requestId,
    p_bunny: i.bunny,
    p_summary: i.summary,
    p_family: i.family ?? null,
    p_status: i.status ?? 'going-strong',
    p_since: i.since ?? null,
    p_story: i.story ?? null,
    p_photo_url: i.photoUrl ?? null,
  })
  if (error) throw error
  return data as string
}
