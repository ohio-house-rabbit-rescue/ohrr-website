// OHRR's free bunny matchmaking ("bunny dates"): bring your rabbit to the
// Adoption Center to meet up to three adoptable rabbits. It is an ordinary
// booking type ("Bonding session", slug bonding-session) that staff keep in
// Staff → Bookings — its wording, what to know before coming, the questions on
// the form and its times. The wording below stands in until it loads.
import { useEffect, useState } from 'react'
import { isSupabaseConfigured } from './supabase'
import { getBookingType, openSlots, type BookingType, type OpenSlot } from './bookings'

export const BONDING_SLUG = 'bonding-session'
export const BONDING_PAGE = '/adopt/bonding'
export const BONDING_NAME = 'Bunny bonding'
export const BONDING_BLURB =
  'Want a friend for your rabbit? Bring your bunny to the Adoption Center for a “bunny date” with up to three of our adoptable rabbits.'

// From OHRR's post "Bunny Dates at OHRR" (the same steps as the app's
// src/data/ohrr.ts bunnyDateSteps).
export const BUNNY_DATE_STEPS = [
  'Check the adoptable rabbits first. If a rabbit you’d like your bunny to meet is in a foster home, let us know ahead of time so we can bring them to the Center.',
  'Plan on being at the Center for about 1–2 hours.',
  'We set up an x-pen for your bunny, then ask you to pick 3 rabbits you would like your bunny to meet — even if you have your heart set on one. Sometimes the rabbit you pick isn’t the one your rabbit would pick.',
  'Our bonding expert gets in the pen with the two rabbits to observe and prevent injury; you watch from right outside. Nothing else is in the pen that the rabbits could fight over — not even litter boxes.',
  'Afterwards we talk through how each date went, coach you on continuing the bonding process at home (and lend you an x-pen if you need one), and our bonding expert keeps supporting you by email — and with in-home bonding visits if needed.',
]

export interface Bonding {
  loading: boolean
  /** The published booking type, or null if it isn't open to the public. */
  type: BookingType | null
  /** Open times in the next ~3 months, soonest first. */
  slots: OpenSlot[]
  name: string
  blurb: string
}

export function useBonding(): Bonding {
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
        const type = await getBookingType(BONDING_SLUG)
        const slots = type ? (await openSlots(BONDING_SLUG, 90)).filter((s) => s.taken < s.capacity) : []
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
    name: state.type?.name || BONDING_NAME,
    blurb: state.type?.description || BONDING_BLURB,
  }
}
