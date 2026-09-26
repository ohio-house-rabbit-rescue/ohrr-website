import { IconTile, btn, ext } from './ui'
import type { WishListItem } from '../lib/wishList'

/**
 * Items from OHRR's Amazon wish list (update 32), "Most needed" first. Each
 * button opens that item on Amazon itself — on a phone the Amazon app picks up
 * amazon.com links by itself. Renders nothing when there are no items, so the
 * page looks as it did before. `limit` shows only the first few (the whole list
 * is on the Give page and behind the "Open the Amazon Wish List" button).
 */
export default function WishListItems({ items, limit, className = '' }: { items: WishListItem[]; limit?: number; className?: string }) {
  const shown = limit ? items.slice(0, limit) : items
  if (shown.length === 0) return null
  return (
    <ul className={`divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white ${className}`}>
      {shown.map((i) => (
        <li key={i.id} className="flex items-start gap-3 p-4">
          <IconTile name="gift" />
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-display text-base font-extrabold text-ink">
                {i.name}
                {i.most_needed && (
                  <span className="ml-2 inline-block rounded-full bg-brand-orange-50 px-2 py-0.5 align-middle font-sans text-xs font-bold text-brand-orange-ink">
                    Most needed
                  </span>
                )}
              </p>
              {i.note && <p className="mt-0.5 text-sm text-slate-700">{i.note}</p>}
            </div>
            <a href={i.amazon_url} {...ext} aria-label={`Buy ${i.name} on Amazon`} className={`${btn.outline} shrink-0 self-start sm:self-center`}>
              Buy on Amazon
            </a>
          </div>
        </li>
      ))}
    </ul>
  )
}
