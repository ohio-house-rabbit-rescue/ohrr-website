// Staff → Flyers: letter-size posters with a QR code, for the Hop Shop
// counter, partner vets, pet stores, libraries and campus boards. Pick one,
// print. Every flyer points at a UTM-tagged page so Cloudflare analytics can
// show which doors people actually come through.
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { btn, Card } from '../../components/ui'
import { OHRR } from '../../lib/constants'
import { utm } from '../../lib/share/templates'

interface Flyer {
  id: string
  audience: string
  kicker: string
  headline: string
  lines: string[]
  cta: string
  path: string
  campaign: string
  accent: 'blue' | 'orange'
}

const FLYERS: Flyer[] = [
  {
    id: 'app',
    audience: 'Rabbit owners — Hop Shop counter, vet clinics',
    kicker: 'FOR RABBIT OWNERS',
    headline: 'Rabbit questions? OHRR in your pocket.',
    lines: ['“My bunny is…” answers from OHRR, day or night', 'Reminders for nails, hay and RHDV2 boosters — on your phone', 'Rabbit-savvy vets around Central Ohio', 'Nail-trim clinics and bonding dates, booked online'],
    cta: 'Scan to open',
    path: '/app',
    campaign: 'flyer-owners',
    accent: 'blue',
  },
  {
    id: 'volunteer',
    audience: 'Students & young adults — campus boards, coffee shops',
    kicker: 'AN HOUR A MONTH, OR A FEW WEEKS',
    headline: 'Sit with the bunnies. Or foster one.',
    lines: ['Bunny socialization: one-hour shifts, booked online, from age 6', 'Foster: a few weeks with a rabbit in your home, OHRR behind you', 'Good with Instagram or TikTok? OHRR needs you too', 'No experience needed'],
    cta: 'Scan to sign up',
    path: '/volunteer',
    campaign: 'flyer-volunteer',
    accent: 'orange',
  },
  {
    id: 'easter',
    audience: 'Families — pet stores, libraries, schools (February–April)',
    kicker: 'BEFORE YOU BUY A BUNNY',
    headline: 'A rabbit is a 10-year pet.',
    lines: ['Indoors, spayed or neutered, a vet who knows rabbits, a 4′ × 4′ space', 'Prey animals: fragile, easily scared — adults own the care', 'Every spring, rescues fill with bunnies bought in March', 'Thinking about it? Read “Is a rabbit right for us?” first'],
    cta: 'Scan to read',
    path: '/info/is-a-rabbit-right-for-us',
    campaign: 'flyer-easter',
    accent: 'orange',
  },
  {
    id: 'adopt',
    audience: 'Everyone — community boards',
    kicker: 'ADOPTIONS BY APPOINTMENT',
    headline: 'Meet the rabbits waiting for a home.',
    lines: ['Spayed or neutered and vaccinated before adoption', 'Bonded pairs, seniors and shy rabbits who need a patient family', 'Saturdays and Sundays at the Adoption Center, Columbus', 'Already have a bunny? We host bonding dates'],
    cta: 'Scan to see who is waiting',
    path: '/adopt',
    campaign: 'flyer-adopt',
    accent: 'blue',
  },
]

export default function Flyers() {
  const [pick, setPick] = useState<Flyer>(FLYERS[0])
  const [qr, setQr] = useState<string>('')
  useEffect(() => {
    QRCode.toDataURL(utm(pick.path, pick.campaign), { errorCorrectionLevel: 'M', margin: 1, width: 600 }).then(setQr)
  }, [pick])
  const accent = pick.accent === 'orange' ? '#eb891c' : '#0669ac'

  return (
    <>
      <div className="print:hidden">
        <h1 className="font-display text-2xl font-black text-ink">Flyers</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Letter-size posters with a QR code. Pick one, print it (or save as PDF), pin it where the audience is. Each flyer has its own link so the analytics show which ones work.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FLYERS.map((f) => (
            <button key={f.id} type="button" onClick={() => setPick(f)} className={`rounded-2xl border-2 p-4 text-left ${pick.id === f.id ? 'border-brand-orange bg-white shadow-md' : 'border-black/5 bg-white'}`}>
              <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">{f.audience}</span>
              <span className="mt-1 block font-display text-base font-extrabold text-ink">{f.headline}</span>
            </button>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => window.print()} className={btn.orange} disabled={!qr}>
            Print this flyer
          </button>
          <span className="self-center text-xs text-slate-500">Prints on one US-Letter page. Colour or black-and-white both work.</span>
        </div>
        <Card className="mt-6 max-w-xl">
          <FlyerSheet f={pick} qr={qr} accent={accent} preview />
        </Card>
      </div>
      <div className="hidden print:block">
        <FlyerSheet f={pick} qr={qr} accent={accent} />
      </div>
      <style>{`
        @media print {
          @page { size: letter; margin: 0.6in; }
          header, nav, footer { display: none !important; }
          main, [class*="max-w-"] { max-width: none !important; padding: 0 !important; margin: 0 !important; }
          .flyer { width: 100%; height: 9.8in; }
        }
      `}</style>
    </>
  )
}

function FlyerSheet({ f, qr, accent, preview = false }: { f: Flyer; qr: string; accent: string; preview?: boolean }) {
  return (
    <div className={`flyer flex flex-col justify-between rounded-2xl bg-white ${preview ? 'aspect-[8.5/11] p-6' : 'p-2'}`} style={{ border: `6px solid ${accent}` }}>
      <div>
        <div className="flex items-center gap-3">
          <img src="/img/ohrr-mark.png" alt="" className={preview ? 'h-10 w-10' : 'h-16 w-16'} />
          <span className={`font-display font-extrabold text-brand-blue ${preview ? 'text-sm' : 'text-2xl'}`}>Ohio House Rabbit Rescue</span>
        </div>
        <p className={`mt-6 inline-block rounded-full px-3 py-1 font-display font-extrabold text-white ${preview ? 'text-[10px]' : 'text-base'}`} style={{ background: accent }}>
          {f.kicker}
        </p>
        <h2 className={`mt-3 font-display font-black leading-tight text-ink ${preview ? 'text-2xl' : 'text-5xl'}`}>{f.headline}</h2>
        <ul className={`mt-4 space-y-2 ${preview ? 'text-sm' : 'text-2xl'} text-slate-700`}>
          {f.lines.map((l) => (
            <li key={l} className="flex gap-2">
              <span style={{ color: accent }}>●</span>
              <span>{l}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-end justify-between gap-4">
        <div className={preview ? 'text-xs' : 'text-xl'}>
          <p className="font-display font-extrabold text-ink">{f.cta}</p>
          <p className="text-slate-600">ohrr-website.pages.dev{f.path === '/' ? '' : f.path}</p>
          <p className="mt-2 text-slate-500">
            {OHRR.address} · {OHRR.phone}
          </p>
        </div>
        {qr && <img src={qr} alt="QR code" className={preview ? 'h-24 w-24' : 'h-56 w-56'} />}
      </div>
    </div>
  )
}
