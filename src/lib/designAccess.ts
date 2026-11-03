// Who may open the design screens: Founders and Developers, and staff who were given
// the "Web page admin" task (site.design). Board and the other owner/admin roles hold
// every task implicitly, so they are NOT counted unless they are a Founder or Developer:
// the database makes the same call (can_edit_design, update 54). The website's copy of
// the app's src/lib/designAccess.ts.
import { useStaff, canSwitchFeatures } from './staff'
import { DESIGN_CAPABILITY } from './design'

export function useCanDesign(): { ready: boolean; can: boolean } {
  const { membership, capabilities, loading } = useStaff()
  if (!membership) return { ready: !loading, can: false }
  const granted = membership.role === 'staff' && capabilities.has(DESIGN_CAPABILITY)
  return { ready: true, can: canSwitchFeatures(membership) || granted }
}
