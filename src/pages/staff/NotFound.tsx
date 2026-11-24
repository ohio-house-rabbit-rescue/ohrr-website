// A staff address that isn't a page (a typo, an old bookmark). It used to show the
// dashboard without a word, so a person couldn't tell the address was wrong
// (staff audit 2026-11-24).
import { Link } from 'react-router-dom'
import { btn } from '../../components/ui'
import { StaffTitle } from '../../components/StaffTitle'

export default function StaffNotFound() {
  return (
    <div>
      <StaffTitle title="Page not found" />
      <p className="mt-3 max-w-prose text-base text-slate-700">
        There is no staff page at this address. It may have been typed wrong, or it is an old link. Every staff page is on the staff home.
      </p>
      <Link to="/staff" className={`${btn.blue} mt-5`}>
        Back to the staff home
      </Link>
    </div>
  )
}
