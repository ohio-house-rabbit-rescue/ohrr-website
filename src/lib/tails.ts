// Happy Tails — published adoption stories (website mirror of the app's
// src/features/tails/api.ts). Stories arrive through the Inbox; publishing one
// writes a `happy_tails` row the app's Happy Tails page reads.
import { useEffect, useState } from 'react'
import { supabase, isConfigured } from './supabase'
import type { Source } from './data'
import { sampleTails } from '../data/tails'

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

/* ---------------------------------------------------------------- public */
// The public Happy Tails pages and the home-page teaser. Same query and order
// as the app's useHappyTails (features/tails/api.ts): published rows, staff
// order first, newest next; the bundled samples until OHRR publishes one.

export interface TimelineEntry {
  date: string
  status?: TailStatus
  text: string
}

export interface Tail {
  id: string
  bunny: string
  family?: string
  status: TailStatus
  photo?: string
  since?: string
  summary: string
  bonded?: boolean
  timeline: TimelineEntry[]
}

export function rowToTail(r: TailRow): Tail {
  return {
    id: r.id,
    bunny: r.bunny,
    family: r.family ?? undefined,
    status: r.status,
    photo: r.photo_url ?? undefined,
    since: r.since ?? undefined,
    summary: r.summary,
    // One entry, so the detail page's timeline still reads naturally.
    timeline: r.story ? [{ date: r.since ?? '', status: r.status, text: r.story }] : [],
  }
}

function publishedQuery() {
  return supabase
    .from('happy_tails')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: false })
    .order('created_at', { ascending: false })
}

export interface TailsResult {
  items: Tail[]
  source: Source
  loading: boolean
}

/** Published stories, falling back to the clearly-labelled samples. */
export function useHappyTails(): TailsResult {
  const [state, setState] = useState<TailsResult>(() =>
    isConfigured ? { items: [], source: 'sample', loading: true } : { items: sampleTails, source: 'sample', loading: false },
  )
  useEffect(() => {
    if (!isConfigured) return
    let active = true
    publishedQuery().then(({ data, error }) => {
      if (!active) return
      const rows = (data ?? []) as TailRow[]
      if (error || rows.length === 0) setState({ items: sampleTails, source: 'sample', loading: false })
      else setState({ items: rows.map(rowToTail), source: 'live', loading: false })
    })
    return () => {
      active = false
    }
  }, [])
  return state
}

/** The newest published story, or null when OHRR hasn't published one (no samples). */
export async function fetchLatestTail(): Promise<Tail | null> {
  if (!isConfigured) return null
  const { data, error } = await supabase
    .from('happy_tails')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error || !data || data.length === 0) return null
  return rowToTail(data[0] as TailRow)
}
