import { Link } from 'react-router-dom'
import { useStaff } from '../../lib/staff'
import { ExpiringSponsorsNotice } from './ManageSponsors'

export default function StaffDashboard() {
  const { user, membership, can } = useStaff()
  const isAdmin = membership?.role === 'owner' || membership?.role === 'admin'

  const tiles = [
    can('inbox.manage') && {
      to: '/staff/inbox',
      h: 'Inbox',
      p: 'Appointments, sign-ups, surrender intakes, Happy Tails and messages from the website and the app.',
    },
    can('bookings.manage') && {
      to: '/staff/bookings',
      h: 'Bookings',
      p: 'Volunteer shifts and appointments: who’s coming, make times, set up what can be booked.',
    },
    (can('announcements.post') || can('social.publish')) && {
      to: '/staff/posts',
      h: 'Posts & Share kit',
      p: 'Ready-made social posts from rabbits, events and education messages; a queue one person releases.',
    },
    can('announcements.post') && {
      to: '/staff/impact',
      h: 'Impact numbers',
      p: 'The year in numbers for donors and sponsors — published at /impact.',
    },
    can('announcements.post') && {
      to: '/staff/flyers',
      h: 'Flyers',
      p: 'Printable posters with a QR code for the Hop Shop, vets, pet stores, libraries and campus boards.',
    },
    can('announcements.post') && {
      to: '/staff/outreach',
      h: 'Outreach letters',
      p: 'Ready-to-send emails to campus offices, vet clinics, pet stores, schools, apartments and local media.',
    },
    can('announcements.post') && {
      to: '/staff/announcements',
      h: 'Announcements',
      p: 'Post notices that show on the website home and the app.',
    },
    can('announcements.post') && {
      to: '/staff/homepage',
      h: 'Homepage features',
      p: "Hero slides and featured cards on the home page. Also drives the app's home screen.",
    },
    (can('adoptions.listings.create') ||
      can('adoptions.listings.edit') ||
      can('adoptions.status.change')) && {
      to: '/staff/rabbits',
      h: 'Adoptable rabbits',
      p: 'Add rabbits with photos and set their adoption status.',
    },
    (can('volunteers.shifts.manage') || can('bookings.manage')) && {
      to: '/staff/calls',
      h: 'Volunteer calls',
      p: 'Put out a need, share it everywhere, check people in on the day, thank them — and write their hours letters.',
    },
    can('volunteers.shifts.manage') && {
      to: '/staff/volunteer',
      h: 'Volunteer opportunities',
      p: 'Post socialization shifts, transport runs, and event help.',
    },
    can('content.education.edit') && {
      to: '/staff/care',
      h: 'Care guides & pages',
      p: 'Rabbit Care articles in Learn, plus the Give / Adopt / About pages.',
    },
    can('content.education.edit') && {
      to: '/staff/bunny-help',
      h: 'Bunny Help topics',
      p: 'What the “My bunny is…” search answers with — on the website and in the app.',
    },
    can('events.bunfest.manage') && {
      to: '/staff/events',
      h: 'Events',
      p: 'Midwest BunFest and OHRR hoppenings — shown on the Events page here and in the app.',
    },
    can('events.bunfest.manage') && {
      to: '/staff/sponsors',
      h: 'Sponsors & partners',
      p: 'Partner roster, perks and “Presented by” placements — on the website and in the app.',
    },
    (can('volunteers.shifts.manage') || can('bookings.manage')) && {
      to: '/staff/volunteers',
      h: 'Volunteers',
      p: 'Who volunteers and the hours they’ve given — each person’s private hours link and QR, confirm logged hours, export the roster.',
    },
    can('events.bunfest.manage') && {
      to: '/staff/auction',
      h: 'Silent auction',
      p: 'The BunFest auction catalogue: items with photos, sessions, won or available, publish — and the auction setup.',
    },
    can('content.education.edit') && {
      to: '/staff/vets',
      h: 'Vets',
      p: 'The rabbit-savvy vet list, emergency and low-cost badges, and which practices give the RHDV2 vaccine.',
    },
    (can('events.bunfest.manage') || can('hopshop.products.create') || can('hopshop.products.edit') || can('hopshop.inventory.update')) && {
      to: '/staff/items',
      h: 'Scanned items & tags',
      p: 'Silent Auction, raffle prizes and Hop Shop stock scanned in the app. Print tag sheets here.',
    },
    (can('hopshop.products.create') || can('hopshop.products.edit') || can('hopshop.inventory.update') || can('hopshop.orders.view')) && {
      to: '/staff/hopshop',
      h: 'Hop Shop',
      p: 'Stock cards with photos, codes and prices; the reorder list by supplier; the supplier and vendor list.',
    },
    can('events.bunfest.manage') && {
      to: '/staff/bunfest',
      h: 'BunFest content',
      p: 'The education schedule, vendor booths and the rescue-partner directory shown in the app.',
    },
    (can('content.education.edit') || can('inbox.manage')) && {
      to: '/staff/tails',
      h: 'Happy Tails',
      p: 'Adoption stories: publish one from the Inbox, then edit, reorder or hide it here.',
    },
    can('events.bunfest.manage') && {
      to: '/staff/raffle-tickets',
      h: 'Raffle tickets',
      p: 'The raffle table: reservations from the app, mark paid, sell at the table, draw winners.',
    },
    (can('staff.invite') || can('staff.permissions.manage')) && {
      to: '/staff/team',
      h: 'Team',
      p: 'Invite staff and choose what each person can do.',
    },
    can('settings.manage') && {
      to: '/staff/details',
      h: 'OHRR details',
      p: 'Hours, a holiday notice, the email and address, and who signs volunteer-hours letters.',
    },
    can('settings.manage') && {
      to: '/staff/features',
      h: 'Features',
      p: 'Turn parts of the app on and off for everyone — the BunFest section, raffle tickets, volunteer self-logged hours.',
    },
    can('audit.view') && {
      to: '/staff/activity',
      h: 'Activity',
      p: 'A record of staff and permission changes — who did what, and when.',
    },
  ].filter(Boolean) as { to: string; h: string; p: string }[]

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="font-display text-2xl font-black text-ink">Staff dashboard</h1>
        <span className="rounded-full bg-brand-blue-50 px-2.5 py-0.5 text-xs font-bold text-brand-blue">
          {membership ? membership.role[0].toUpperCase() + membership.role.slice(1) : ''}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Signed in as <strong>{user?.email}</strong>
      </p>

      {can('events.bunfest.manage') && membership?.orgId && (
        <ExpiringSponsorsNotice orgId={membership.orgId} className="mt-5" />
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {tiles.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <h2 className="font-display text-lg font-extrabold text-brand-blue">{t.h}</h2>
            <p className="mt-1.5 text-sm text-slate-600">{t.p}</p>
          </Link>
        ))}
        {tiles.length === 0 && (
          <p className="text-sm text-slate-600">
            No tools have been turned on for your account yet. An owner can grant access.
          </p>
        )}
      </div>

      <p className="mt-8 rounded-2xl bg-brand-blue-50 px-4 py-3 text-sm text-slate-600">
        Anything you change here updates <strong>both this website and the OHRR app</strong> — they
        share the same live data.{isAdmin ? ' As an owner/admin you have every tool above.' : ''}
      </p>
    </div>
  )
}
