// Items from OHRR's Amazon wish list (update 32, table `wish_list_items`).
// Amazon won't let a program read the list, so staff paste each item's own
// Amazon link in Staff → Wish list items. The public pages show them beside the
// "Open the Amazon Wish List" button, which stays: every link opens Amazon
// itself (the rescue gets residuals from the visit). No photos — Amazon's
// images can't be used — so each item carries the gift line icon.
// Until update 32 has been run (or while there are no items) nothing extra shows.
import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'

export interface WishListItem {
  id: string
  name: string
  amazon_url: string
  note: string | null
  most_needed: boolean
  sort_order: number
  is_published: boolean
}

export const WISH_LIST_COLUMNS = 'id, name, amazon_url, note, most_needed, sort_order, is_published'

/** "Most needed" first, then the order staff set. */
export function sortWishList(list: WishListItem[]): WishListItem[] {
  return [...list].sort((a, b) => Number(b.most_needed) - Number(a.most_needed) || a.sort_order - b.sort_order)
}

/** The same rule as the database: https on amazon.com, a.co or amzn.to. */
export function isAmazonUrl(url: string): boolean {
  return /^https:\/\/([a-z0-9-]+\.)*(amazon\.com|a\.co|amzn\.to)\//i.test(url.trim())
}

/**
 * The link out of whatever was pasted: Amazon's Share sometimes copies a line
 * of text around it ("Check out this item on Amazon https://a.co/d/…").
 */
export function cleanAmazonUrl(pasted: string): string {
  const t = pasted.trim()
  return /https:\/\/\S+/i.exec(t)?.[0] ?? t
}

/** The published items, in order; [] before update 32 or when there are none. */
export function useWishListItems(): WishListItem[] {
  const [items, setItems] = useState<WishListItem[]>([])
  useEffect(() => {
    if (!isSupabaseConfigured) return
    let alive = true
    supabase
      .from('wish_list_items')
      .select(WISH_LIST_COLUMNS)
      .eq('is_published', true)
      .then(({ data, error }) => {
        if (alive && !error && data) setItems(sortWishList(data as WishListItem[]))
      })
    return () => {
      alive = false
    }
  }, [])
  return items
}
