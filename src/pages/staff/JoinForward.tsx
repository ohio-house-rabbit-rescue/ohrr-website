// /staff/join on the website. Invitations are finished in the OHRR app (its /staff/join makes the account and
// puts the person on the team), so an invite link that somehow points here is sent on to the app with its code.
// The same email and password then work on this website too.
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { APP_URL } from '../../lib/constants'
import { btn } from '../../components/ui'

export default function JoinForward() {
  const [params] = useSearchParams()
  const code = params.get('code')?.trim() ?? ''
  const to = `${APP_URL}/staff/join${code ? `?code=${encodeURIComponent(code)}` : ''}`
  useEffect(() => {
    window.location.replace(to)
  }, [to])
  return (
    <div className="mx-auto max-w-md px-5 py-16 text-center">
      <h1 className="font-display text-2xl font-black text-ink">Taking you to the OHRR app</h1>
      <p className="mt-2 text-base text-slate-700">Your invitation is finished there. If nothing happens, tap the button.</p>
      <a href={to} className={`${btn.orange} mt-5`}>
        Open my invitation
      </a>
    </div>
  )
}
