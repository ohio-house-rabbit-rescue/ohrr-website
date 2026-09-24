import { Link } from 'react-router-dom'
import { useAnnouncements } from '../lib/data'
import { PageHero, Section, btn, ext, Card, LiveNote, NewsImage } from '../components/ui'
import { formatShortDate } from '../lib/format'
import { MAILING_LIST, LIVE_SITE, OHRR } from '../lib/constants'

export default function News() {
  const { items, source } = useAnnouncements(0)

  return (
    <>
      <PageHero title="News" subtitle="Announcements, fundraisers and updates from Ohio House Rabbit Rescue." />
      <Section>
        <div className="grid gap-10 md:grid-cols-3">
          <div className="md:col-span-2">
            <LiveNote source={source} />
            {items === null ? (
              <p className="mt-6 text-sm text-slate-500">Loading…</p>
            ) : items.length === 0 ? (
              <p className="mt-6 text-slate-600">No news right now — check back soon.</p>
            ) : (
              <div className="mt-5 space-y-4">
                {items.map((a) => (
                  <Card key={a.id}>
                    <div className={a.imageUrl ? 'flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5' : ''}>
                      {a.imageUrl && (
                        <NewsImage
                          src={a.imageUrl}
                          alt={a.title}
                          fit={a.imageFit}
                          href={a.url}
                          className="w-full shrink-0 sm:w-56 md:w-64"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        {a.createdAt && (
                          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                            {formatShortDate(a.createdAt)}
                          </p>
                        )}
                        <h2 className="mt-1 font-display text-lg font-extrabold text-ink">{a.title}</h2>
                        <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-600">{a.body}</p>
                        {a.url && (
                          <a href={a.url} {...ext} className="mt-2 inline-block text-sm font-bold text-brand-orange">
                            Read more →
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl bg-brand-blue-50 p-6 text-center">
              <h2 className="font-display text-lg font-extrabold text-brand-blue">Join the OHRR mailing list</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                We only send the important stuff: updates, fundraisers, opportunities, Midwest BunFest
                information, and ways you can help rescue rabbits when it matters most.
              </p>
              <Link to={MAILING_LIST} className={`${btn.blue} mt-4`}>
                Join the mailing list
              </Link>
            </div>
            <Card>
              <h3 className="font-display text-base font-extrabold text-brand-blue">Follow OHRR</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                <li>
                  <a href={OHRR.facebook} {...ext} className="font-semibold text-brand-blue">
                    Facebook
                  </a>
                </li>
                <li>
                  <a href={OHRR.instagram} {...ext} className="font-semibold text-brand-blue">
                    Instagram
                  </a>
                </li>
                <li>
                  <a href={LIVE_SITE} {...ext} className="font-semibold text-brand-blue">
                    ohiohouserabbitrescue.org
                  </a>
                </li>
              </ul>
            </Card>
          </aside>
        </div>
      </Section>
    </>
  )
}
