import type { VolunteerOpp } from './types'

/** The kinds of opportunity staff can post — the same list as the app. */
export const OPP_CATEGORIES = [
  { value: 'socialization', label: 'Bunny Socialization shifts' },
  { value: 'buncare', label: 'Buncare shifts' },
  { value: 'vet-transport', label: 'Vet delivery & pick-up runs' },
  { value: 'field-rescue', label: 'Field rescue needs' },
  { value: 'events', label: 'Events & fundraising' },
] as const

export function categoryLabel(value: string): string {
  return OPP_CATEGORIES.find((c) => c.value === value)?.label ?? value
}

// How an opportunity is limited: not at all, by how many PEOPLE are needed, or
// by how many HOURS have to be covered — the sponsor's 2026-09-22 ask. Copy
// of the app's src/lib/volunteerOpps.ts so both surfaces say the same thing.
export const LIMIT_KINDS = [
  { value: 'none', label: 'No limit' },
  { value: 'people', label: 'A number of people' },
  { value: 'hours', label: 'A number of hours' },
] as const

/** What's left — the line the public page shows. Null when there is no limit. */
export function remainingLabel(o: VolunteerOpp): string | null {
  if (o.limit_kind === 'people' && o.limit_people) {
    const left = Math.max(0, o.limit_people - (o.filled_people ?? 0))
    return left === 0 ? 'Full' : `${left} of ${o.limit_people} ${left === 1 ? 'spot' : 'spots'} left`
  }
  if (o.limit_kind === 'hours' && o.limit_hours) {
    const left = Math.max(0, Number(o.limit_hours) - Number(o.filled_hours ?? 0))
    return left === 0 ? 'Covered' : `${left % 1 === 0 ? left : left.toFixed(1)} of ${o.limit_hours} hours still needed`
  }
  return null
}

/** True when nothing more is needed — the card says so and stops asking. */
export function isFull(o: VolunteerOpp): boolean {
  if (o.limit_kind === 'people' && o.limit_people) return (o.filled_people ?? 0) >= o.limit_people
  if (o.limit_kind === 'hours' && o.limit_hours) return Number(o.filled_hours ?? 0) >= Number(o.limit_hours)
  return false
}
