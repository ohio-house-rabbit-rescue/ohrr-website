// Published topics for the public site: the shared `care_topics` table when the
// backend is configured and has rows, otherwise the code seed — silently, so
// the feature works in every build. Same rules as the OHRR app's
// features/bunnyhelp/useTopics.ts, so both surfaces show the same topics.
import { useEffect, useState } from 'react'
import { supabase, isConfigured } from '../supabase'
import { sampleCareArticles } from '../../data/careArticles'
import { seedAsTopics } from './seedTopics'
import { isCategory, isUrgency, type CareTopic } from './types'

export type TopicSource = 'live' | 'seed'

interface TopicsState {
  topics: CareTopic[]
  source: TopicSource
  loading: boolean
}

// One fetch per page load, shared across the search box, browse and topic pages.
let cache: { topics: CareTopic[]; source: TopicSource } | null = null
let pending: Promise<{ topics: CareTopic[]; source: TopicSource }> | null = null

function fromRow(r: Record<string, unknown>, i: number): CareTopic | null {
  if (typeof r.slug !== 'string' || typeof r.title !== 'string') return null
  if (!isCategory(r.category) || !isUrgency(r.urgency)) return null
  return {
    id: String(r.id ?? `live:${r.slug}`),
    slug: r.slug,
    title: r.title,
    aliases: Array.isArray(r.aliases) ? r.aliases.filter((a): a is string => typeof a === 'string') : [],
    category: r.category,
    urgency: r.urgency,
    summary: typeof r.summary === 'string' ? r.summary : '',
    what_to_do: typeof r.what_to_do === 'string' ? r.what_to_do : '',
    article_slug: typeof r.article_slug === 'string' && r.article_slug ? r.article_slug : null,
    show_vets: Boolean(r.show_vets),
    hopshop_note: typeof r.hopshop_note === 'string' && r.hopshop_note ? r.hopshop_note : null,
    reviewed_by: typeof r.reviewed_by === 'string' && r.reviewed_by ? r.reviewed_by : null,
    reviewed_at: typeof r.reviewed_at === 'string' && r.reviewed_at ? r.reviewed_at : null,
    is_published: r.is_published !== false,
    sort_order: typeof r.sort_order === 'number' ? r.sort_order : i,
  }
}

async function fetchTopics(): Promise<{ topics: CareTopic[]; source: TopicSource }> {
  const seed = { topics: seedAsTopics(), source: 'seed' as const }
  if (!isConfigured) return seed
  try {
    const { data, error } = await supabase
      .from('care_topics')
      .select('*')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error || !data || data.length === 0) return seed
    const topics = (data as unknown[])
      .map((r, i) => fromRow(r as Record<string, unknown>, i))
      .filter((t): t is CareTopic => t !== null)
    return topics.length > 0 ? { topics, source: 'live' } : seed
  } catch {
    return seed
  }
}

export function loadTopics(): Promise<{ topics: CareTopic[]; source: TopicSource }> {
  if (cache) return Promise.resolve(cache)
  if (!pending) {
    pending = fetchTopics().then((r) => {
      cache = r
      return r
    })
  }
  return pending
}

/** Published topics (seed until the live list arrives — never empty). */
export function useCareTopics(): TopicsState {
  const [state, setState] = useState<TopicsState>(() =>
    cache ? { ...cache, loading: false } : { topics: seedAsTopics(), source: 'seed', loading: true },
  )
  useEffect(() => {
    if (cache) return
    let active = true
    loadTopics().then((r) => {
      if (active) setState({ ...r, loading: false })
    })
    return () => {
      active = false
    }
  }, [])
  return state
}

/* ------------------------------------------------ Learn article links */

// The seed's `article_slug` values are the app's bundled Learn slugs. This site's
// built-in care articles use the live site's titles as slugs, so map the app's
// names onto the matching article here. A live `care_articles` row with the exact
// slug always wins (checked first in learnHref).
const APP_SLUG_TO_SITE: Record<string, string> = {
  diet: 'bunny-diet',
  housing: 'bunny-living-space',
  'foods-to-avoid': 'foods-to-avoid',
  litter: 'litter-box-training',
  bonding: 'bonding-bunnies',
  stray: 'tips-for-catching-a-stray',
}

const BUNDLED_LEARN_SLUGS: readonly string[] = sampleCareArticles.map((a) => a.slug)

/**
 * Which Learn article slugs resolve on this site: the built-in guides plus any
 * published live articles. Used so "Read OHRR's care article" only links
 * on-site when the slug actually exists (otherwise the live resources page).
 */
let learnCache: Set<string> | null = null

export function useLearnSlugs(): Set<string> {
  const [slugs, setSlugs] = useState<Set<string>>(() => learnCache ?? new Set(BUNDLED_LEARN_SLUGS))
  useEffect(() => {
    if (learnCache || !isConfigured) return
    let active = true
    supabase
      .from('care_articles')
      .select('slug')
      .eq('is_published', true)
      .then(({ data }) => {
        const next = new Set(BUNDLED_LEARN_SLUGS)
        for (const row of (data ?? []) as { slug?: string | null }[]) if (row.slug) next.add(row.slug)
        learnCache = next
        if (active) setSlugs(next)
      })
    return () => {
      active = false
    }
  }, [])
  return slugs
}

/** The on-site /learn/<slug> link for a topic's article_slug, or null when there is none. */
export function learnHref(articleSlug: string | null, slugs: Set<string>): string | null {
  if (!articleSlug) return null
  if (slugs.has(articleSlug)) return `/learn/${articleSlug}`
  const mapped = APP_SLUG_TO_SITE[articleSlug]
  if (mapped && slugs.has(mapped)) return `/learn/${mapped}`
  return null
}
