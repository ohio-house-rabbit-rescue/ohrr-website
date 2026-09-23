// Opening hours, phone, address and a holiday notice, from the one
// `app_settings` row (`org_profile`) staff edit on a phone under
// Staff → Settings → OHRR details. Mirrors the app's src/lib/orgProfile.ts.
//
// Anything blank falls back to the value bundled in constants.ts, so an empty
// row changes nothing and a missing table (before the migration) is harmless.
import { useEffect, useState } from 'react'
import { supabase, isConfigured } from './supabase'
import { OHRR } from './constants'

export interface OrgProfile {
  hours: string
  hours_short: string
  hopshop_hours: string
  notice: string
  phone: string
  email: string
  address: string
  /** Who signs volunteer-hours letters. Blank until staff set it in the app. */
  letter_signer_name: string
  letter_signer_title: string
  ein: string
}

const FALLBACK: OrgProfile = {
  hours: OHRR.hours,
  hours_short: OHRR.hours,
  hopshop_hours: OHRR.hours,
  notice: '',
  phone: OHRR.phone,
  email: OHRR.email,
  address: `${OHRR.address}`,
  letter_signer_name: '',
  letter_signer_title: '',
  ein: '',
}

export function useOrgProfile(): OrgProfile {
  const [p, setP] = useState<OrgProfile>(FALLBACK)
  useEffect(() => {
    if (!isConfigured) return
    let active = true
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'org_profile')
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active || error || !data?.value) return
        const v = data.value as Partial<OrgProfile>
        const pick = (k: keyof OrgProfile) => {
          const s = typeof v[k] === 'string' ? (v[k] as string).trim() : ''
          return s || FALLBACK[k]
        }
        setP({
          hours: pick('hours'),
          hours_short: pick('hours_short'),
          hopshop_hours: pick('hopshop_hours'),
          notice: typeof v.notice === 'string' ? v.notice.trim() : '',
          phone: pick('phone'),
          email: pick('email'),
          address: pick('address'),
          letter_signer_name: pick('letter_signer_name'),
          letter_signer_title: pick('letter_signer_title'),
          ein: pick('ein'),
        })
      })
    return () => {
      active = false
    }
  }, [])
  return p
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
