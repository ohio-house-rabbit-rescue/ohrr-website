// The monthly donations report (update 40): everything received in one month
// — how many things and pieces, from how many donors, what it was worth —
// then where it all is now and who gave it. Prints on one or two pages, and
// downloads as a spreadsheet. ?month=YYYY-MM picks the month.
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { errMessage } from '../../lib/supabase'
import { useStaff, Spinner } from '../../lib/staff'
import { btn } from '../../components/ui'
import { Icon } from '../../components/icons'
import { exportCsv } from '../../lib/exportFile'
import { NEEDS_40, donationsReceived, isNeeds40, money, usDate, type DonationLine } from '../../lib/items'
import {
  NOT_NAMED,
  byDonor,
  byPlace,
  isMonth,
  lineCode,
  lineDonor,
  monthLabel,
  monthRange,
  reportCsv,
  reportTotals,
  shiftMonth,
  thisMonth,
  whereNow,
  type ReportRow,
} from '../../lib/donations'

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm print-break-inside-avoid">
      <p className="text-sm font-bold uppercase tracking-wide text-slate-600">{label}</p>
      <p className="mt-1 font-display text-3xl font-black text-ink">{value}</p>
      {sub && <p className="text-sm text-slate-600">{sub}</p>}
    </div>
  )
}

function RowsTable({ caption, first, rows, linesLabel }: { caption: string; first: string; rows: ReportRow[]; linesLabel: string }) {
  return (
    <section className="mt-8 print-break-inside-avoid" aria-label={caption}>
      <h2 className="font-display text-xl font-extrabold text-ink">{caption}</h2>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full text-left text-base">
          <thead className="border-b border-slate-200 text-sm text-slate-600">
            <tr>
              <th scope="col" className="px-3 py-2 font-bold">
                {first}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-bold">
                {linesLabel}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-bold">
                Pieces
              </th>
              <th scope="col" className="px-3 py-2 text-right font-bold">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-slate-100 last:border-0">
                <th scope="row" className={`px-3 py-2 font-semibold ${r.label === NOT_NAMED ? 'italic text-slate-600' : 'text-ink'}`}>
                  {r.label}
                </th>
                <td className="px-3 py-2 text-right tabular-nums">{r.lines}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.pieces}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.value_cents ? money(r.value_cents) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function DonationsReport() {
  const { membership } = useStaff()
  const orgId = membership?.orgId ?? ''
  const [params, setParams] = useSearchParams()
  const asked = params.get('month')
  const month = isMonth(asked) ? asked : thisMonth()
  const [lines, setLines] = useState<DonationLine[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!orgId) return
    let alive = true
    setLines(null)
    setError(null)
    const { from, to } = monthRange(month)
    donationsReceived(orgId, from, to)
      .then((l) => alive && setLines(l))
      .catch((e) => {
        if (!alive) return
        if (isNeeds40(e)) setMissing(true)
        else setError(errMessage(e))
      })
    return () => {
      alive = false
    }
  }, [orgId, month])

  const totals = useMemo(() => (lines ? reportTotals(lines) : null), [lines])
  const places = useMemo(() => (lines ? byPlace(lines) : []), [lines])
  const donors = useMemo(() => (lines ? byDonor(lines) : []), [lines])

  const go = (m: string) => setParams(m === thisMonth() ? {} : { month: m })
  const latest = month >= thisMonth()
  const label = monthLabel(month)

  const download = () => {
    if (!lines) return
    exportCsv(`ohrr-donations-${month}.csv`, reportCsv(lines))
  }

  return (
    <div className="donations-report">
      <Link to="/staff/items" className="no-print inline-flex min-h-11 items-center gap-1 text-sm font-bold text-brand-blue">
        <Icon name="arrowLeft" size={16} /> Items
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-ink">Donations report</h1>
          <p className="mt-1 text-lg font-bold text-slate-700">{label}</p>
          <p className="no-print mt-1 max-w-2xl text-sm text-slate-600">
            Everything received in the month: how much, from whom, and where it is now. A lot split later counts once in the totals.
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <button type="button" onClick={() => window.print()} disabled={!lines} className={`${btn.orange} disabled:opacity-60`}>
            <Icon name="printer" size={16} /> Print
          </button>
          <button type="button" onClick={download} disabled={!lines || lines.length === 0} className={`${btn.outline} disabled:opacity-60`}>
            Download a spreadsheet (CSV)
          </button>
        </div>
      </div>

      <div className="no-print mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Month">
        <button type="button" onClick={() => go(shiftMonth(month, -1))} className={btn.outline}>
          <Icon name="chevron" size={16} className="rotate-180" /> {monthLabel(shiftMonth(month, -1))}
        </button>
        <button type="button" onClick={() => go(shiftMonth(month, 1))} disabled={latest} className={`${btn.outline} disabled:opacity-50`}>
          {monthLabel(shiftMonth(month, 1))} <Icon name="chevron" size={16} />
        </button>
        {month !== thisMonth() && (
          <button type="button" onClick={() => go(thisMonth())} className="min-h-11 px-2 text-sm font-bold text-brand-blue">
            This month
          </button>
        )}
      </div>

      {missing ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-base text-amber-900">
          <p className="font-bold">{NEEDS_40}</p>
          <p className="mt-1">The monthly report arrives with it.</p>
        </div>
      ) : error ? (
        <p className="mt-6 text-base font-semibold text-red-600">{error}</p>
      ) : !lines || !totals ? (
        <Spinner />
      ) : lines.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-base text-slate-500">Nothing was received in {label}.</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5" aria-label="Totals">
            <Stat label="Items" value={String(totals.items)} />
            <Stat label="Pieces" value={String(totals.pieces)} />
            <Stat label="Donors" value={String(totals.donors)} sub={totals.unnamed ? `and ${totals.unnamed} not named` : undefined} />
            <Stat label="Total value" value={money(totals.value_cents) || '$0'} />
            <Stat label="No value" value={String(totals.no_value)} sub={totals.no_value === 1 ? 'item had no value' : 'items had no value'} />
          </div>

          <RowsTable caption="By where it is now" first="Where it is now" rows={places} linesLabel="Lines" />
          <p className="mt-1 text-sm text-slate-600">A lot that was split shows each part where it is now, so it can count in more than one row.</p>
          <RowsTable caption="By donor" first="Donor" rows={donors} linesLabel="Items" />

          <section className="mt-8" aria-label="Everything received">
            <h2 className="font-display text-xl font-extrabold text-ink">Everything received</h2>
            <div className="mt-2 overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-600">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-bold">
                      Date
                    </th>
                    <th scope="col" className="px-3 py-2 font-bold">
                      Donor
                    </th>
                    <th scope="col" className="px-3 py-2 font-bold">
                      Item
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-bold">
                      How many
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-bold">
                      Value
                    </th>
                    <th scope="col" className="px-3 py-2 font-bold">
                      Where it is now
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id} className="border-b border-slate-100 align-top last:border-0">
                      <td className="whitespace-nowrap px-3 py-2">{usDate(l.received_on)}</td>
                      <td className="px-3 py-2">{lineDonor(l) || <span className="italic text-slate-600">{NOT_NAMED}</span>}</td>
                      <td className="px-3 py-2">
                        {l.title}
                        {l.size ? ` (${l.size})` : ''}
                        {lineCode(l) && <span className="block font-mono text-xs font-bold tracking-widest text-slate-500">{lineCode(l)}</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{l.quantity}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{l.value_total_cents != null ? money(l.value_total_cents) : '—'}</td>
                      <td className="px-3 py-2">{whereNow(l)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      <style>{`
        @media print {
          @page { size: letter; margin: 0.6in; }
          aside, .no-print { display: none !important; }
          [class*="max-w-7xl"] { max-width: none !important; padding: 0 !important; margin: 0 !important; gap: 0 !important; }
          [class*="bg-canvas"] { background: white !important; }
          main { padding: 0 !important; }
          .donations-report .overflow-x-auto { overflow: visible !important; }
        }
      `}</style>
    </div>
  )
}
