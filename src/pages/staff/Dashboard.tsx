// The staff dashboard, short (OHRR, 2026-10-01: "too many in the list and you
// have to scroll a long way … bin these into groups and simplify"): a Today
// row (Inbox, Bookings) and eight groups; each group opens a short list
// (/staff/g/:group, Group.tsx). The dashboard is the menu: the path bar's
// home goes straight here. The pages and who may open them live in
// lib/staffTiles.ts — the same list the laptop's sidebar reads. Same as the app.
import { Link } from 'react-router-dom'
import { useStaff, levelLabel } from '../../lib/staff'
import { useStaffTiles, groupLink } from '../../lib/staffTiles'
import { Icon } from '../../components/icons'
import { WaitingBadge } from '../../components/WaitingBadge'
import { AccountLinks } from '../../components/StaffShell'
import { ExpiringSponsorsNotice } from './ManageSponsors'
import { CertificatesNotice, PendingApplicationsNotice } from './Volunteers'
import { EasterCampaignNotice, PostsToApproveNotice } from './Posts'
import { CERTIFICATES_CAP } from '../../lib/volunteers/api'

export default function StaffDashboard() {
  // Hooks before any early return (a hook below one blanked the app's dashboard once).
  const { user, membership, level, can } = useStaff()
  const { today, groups, nothingYet, isAdminish } = useStaffTiles({ counts: true })

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h1 className="font-display text-2xl font-black text-ink">Staff dashboard</h1>
        <span className="rounded-full bg-brand-blue-50 px-2.5 py-0.5 text-xs font-bold text-brand-blue">
          {level ? levelLabel(level) : membership ? membership.role[0].toUpperCase() + membership.role.slice(1) : ''}
        </span>
      </div>
      <p className="mt-0.5 truncate text-sm text-slate-600">
        Signed in as{' '}
        <Link to="/staff/account" className="font-bold text-brand-blue underline-offset-2 hover:underline">
          {user?.email}
        </Link>
      </p>

      {can('events.bunfest.manage') && membership?.orgId && (
        <ExpiringSponsorsNotice orgId={membership.orgId} className="mt-4" />
      )}
      {(can('volunteers.shifts.manage') || can('bookings.manage')) && membership?.orgId && (
        <PendingApplicationsNotice orgId={membership.orgId} className="mt-4" />
      )}
      {can(CERTIFICATES_CAP) && membership?.orgId && <CertificatesNotice orgId={membership.orgId} className="mt-4" />}
      {can('social.approve') && <PostsToApproveNotice className="mt-4" />}
      {can('announcements.post') && <EasterCampaignNotice className="mt-4" />}

      {today.length > 0 && (
        <section aria-labelledby="today-h" className="mt-4">
          <h2 id="today-h" className="mb-1.5 text-sm font-bold leading-tight text-slate-600">
            Today
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {today.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm transition hover:border-brand-blue"
              >
                <Icon name={t.icon} size={22} accent="var(--color-brand-orange)" className="shrink-0 text-brand-blue-dark" />
                <span className="min-w-0 flex-1 truncate font-display text-base font-extrabold text-ink">{t.title}</span>
                <WaitingBadge n={t.badge ?? 0} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="groups-h" className="mt-4">
        <h2 id="groups-h" className="mb-1.5 text-sm font-bold leading-tight text-slate-600">
          {today.length > 0 ? 'Everything else' : 'Your tools'}
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {groups.map((g) => {
            const orange = g.key === 'volunteers'
            return (
              <Link
                key={g.key}
                to={groupLink(g)}
                className="relative flex min-h-11 flex-col rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition hover:border-brand-blue"
              >
                {/* The icon sits in the title's first line, so the eight fit on a phone's first screen. */}
                <span className="font-display text-base font-extrabold leading-tight text-ink">
                  <Icon
                    name={g.icon}
                    size={22}
                    accent={orange ? undefined : 'var(--color-brand-orange)'}
                    className={`mr-1.5 inline-block align-[-5px] ${orange ? 'text-brand-orange-ink' : 'text-brand-blue-dark'}`}
                  />
                  {g.title}
                </span>
                <span className="mt-1 text-xs leading-tight text-slate-600">{g.hint}</span>
                {/* On the corner, clear of the words */}
                <WaitingBadge n={g.badge} className="absolute -right-1.5 -top-1.5 shadow-sm" />
              </Link>
            )
          })}
        </div>
      </section>

      {nothingYet && (
        <p className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          No tools have been turned on for your account yet. Whoever brought you on can switch some on.
        </p>
      )}

      <p className="mt-8 rounded-2xl bg-brand-blue-50 px-4 py-3 text-sm text-slate-600">
        Anything you change here updates <strong>both this website and the OHRR app</strong> — they share the same live data.
        {isAdminish ? (level ? ' You hold every task, so you have every tool.' : ' As an owner/admin you have every tool.') : ''}
      </p>

      {/* Phone and tablet: the way back to the website, your account and signing out (a laptop has them up top) */}
      <div className="no-print mt-4 flex flex-wrap items-center gap-2 lg:hidden">
        <AccountLinks />
      </div>
    </div>
  )
}
