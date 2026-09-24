// The newest published Happy Tail, for the home page: photo, name, the one-line
// summary and a link to the full story. Renders nothing until OHRR has
// published one (no samples here — the home page shows only real stories).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Section, btn } from './ui'
import { BunnyPhoto } from './tailbits'
import { fetchLatestTail, type Tail } from '../lib/tails'

export function LatestTail() {
  const [tail, setTail] = useState<Tail | null>(null)
  useEffect(() => {
    let active = true
    fetchLatestTail()
      .then((t) => {
        if (active) setTail(t)
      })
      .catch(() => {
        /* the home page simply shows nothing here */
      })
    return () => {
      active = false
    }
  }, [])

  if (!tail) return null
  const meta = [tail.family && `With the ${tail.family} family`, tail.since].filter(Boolean).join(' · ')

  return (
    <Section className="!py-10 md:!py-14">
      <div className="grid gap-6 overflow-hidden rounded-3xl bg-brand-blue-50 p-6 sm:p-8 md:grid-cols-5 md:items-center">
        <div className="md:col-span-2">
          <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
            <BunnyPhoto name={tail.bunny} photo={tail.photo} />
          </div>
        </div>
        <div className="md:col-span-3">
          <p className="text-sm font-extrabold uppercase tracking-wider text-brand-orange">Happy Tails</p>
          <h2 className="mt-1 font-display text-2xl font-black text-ink sm:text-3xl">{tail.bunny}</h2>
          {meta && <p className="mt-1 text-sm font-semibold text-slate-600">{meta}</p>}
          <p className="mt-3 text-base leading-relaxed text-slate-700">{tail.summary}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to={`/tails/${tail.id}`} className={btn.blue}>
              Read {tail.bunny}’s story
            </Link>
            <Link to="/tails" className={btn.outline}>
              All Happy Tails
            </Link>
          </div>
        </div>
      </div>
    </Section>
  )
}

export default LatestTail
