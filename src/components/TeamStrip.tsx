// The row under the site's header on the public side. It is for the team only: a visitor never sees it, with
// one exception, the way back to the visitors' tour ("Back to Look around"), which is for everyone.
// It shows in a browser a team member has signed in on (lib/teamDevice), signed in or not: the public side
// knows nothing about who is signed in here, and /staff asks for the sign-in itself when it is needed.
//
//   a guide step opened this page   "Back to Level 1: Look around" (GuideReturnBar)
//   otherwise                       this is the public side, and the way to Staff
import { Link, useLocation } from 'react-router-dom'
import { isTeamDevice } from '../lib/teamDevice'
import { readReturn } from '../features/guide/guideReturn'
import GuideReturnBar from '../features/guide/GuideReturnBar'
import { TOUR_PATH } from '../features/guide/walkthrough'
import { Icon } from './icons'

export default function TeamStrip() {
  const { pathname } = useLocation()
  const back = readReturn()
  // The visitors' tour is for everyone: its way back shows whoever is looking.
  const team = isTeamDevice()
  if (back && (team || back.to === TOUR_PATH) && !pathname.startsWith('/welcome')) {
    return (
      <div className="bg-brand-orange-50">
        <div className="mx-auto max-w-6xl sm:px-3">
          <GuideReturnBar />
        </div>
      </div>
    )
  }
  if (!team) return null
  return (
    <div className="bg-brand-blue-dark text-white">
      <Link to="/staff" className="mx-auto flex min-h-11 max-w-6xl items-center justify-between gap-3 px-4 text-base font-bold sm:px-5">
        <span className="min-w-0 truncate text-white/85">
          Public side<span className="hidden sm:inline">: what everyone sees</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1">
          Staff <Icon name="chevron" size={16} />
        </span>
      </Link>
    </div>
  )
}
