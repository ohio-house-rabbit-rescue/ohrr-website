// OHRR's mobile vet clinic: a rabbit-savvy vet at the Adoption Center on
// select days, by appointment. The clinic is an ordinary booking type
// ("Mobile vet clinic", slug vet-clinic) that staff keep in Staff → Bookings:
// its wording, its days and times, and whether people can book it yet. Until
// it's published the public can't read it, so the wording below (the same as
// the app's Bunny Services screen) stands in and the pages offer to tell
// people when dates are set.
import { useEffect, useState } from 'react'
import { isSupabaseConfigured } from './supabase'
import { getBookingType, openSlots, type BookingType, type OpenSlot } from './bookings'

export const MOBILE_VET_SLUG = 'vet-clinic'
export const MOBILE_VET_NAME = 'Mobile vet clinic'
export const MOBILE_VET_BLURB =
  'A rabbit-savvy vet visits OHRR on select weekends for nail trims, wellness checks and microchipping — by appointment.'

export interface MobileVet {
  loading: boolean
  /** The published booking type, or null while OHRR hasn't set dates. */
  type: BookingType | null
  /** Open times in the next ~3 months, soonest first. */
  slots: OpenSlot[]
  name: string
  blurb: string
}

export function useMobileVet(): MobileVet {
  const [state, setState] = useState<{ loading: boolean; type: BookingType | null; slots: OpenSlot[] }>({
    loading: isSupabaseConfigured,
    type: null,
    slots: [],
  })
  useEffect(() => {
    if (!isSupabaseConfigured) return
    let alive = true
    ;(async () => {
      try {
        const type = await getBookingType(MOBILE_VET_SLUG)
        const slots = type ? (await openSlots(MOBILE_VET_SLUG, 90)).filter((s) => s.taken < s.capacity) : []
        if (alive) setState({ loading: false, type, slots })
      } catch {
        if (alive) setState({ loading: false, type: null, slots: [] })
      }
    })()
    return () => {
      alive = false
    }
  }, [])
  return {
    ...state,
    name: state.type?.name || MOBILE_VET_NAME,
    blurb: state.type?.description || MOBILE_VET_BLURB,
  }
}
