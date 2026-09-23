// OHRR's details as the volunteer messages and letters need them (the
// website's copy of the app's orgBits.ts).
import { useOrgProfile } from '../orgProfile'
import { OHRR } from '../constants'
import type { OrgBits } from './calls'

export function useOrgBits(): OrgBits & { ein: string } {
  const p = useOrgProfile()
  return {
    name: OHRR.name,
    short: 'OHRR',
    phone: p.phone,
    email: p.email,
    address: p.address,
    signerName: p.letter_signer_name,
    signerTitle: p.letter_signer_title,
    ein: p.ein,
  }
}
