// Bookings on the website — the same tables and functions as the app
// (app repo: supabase/migrations/20260921110000_bookings.sql).
import { supabase } from './supabase'

export type BookingKind = 'shift' | 'appointment'
export type BookingStatus = 'requested' | 'confirmed' | 'cancelled' | 'checked_in' | 'no_show'

export interface BookingType {
  id: string
  org_id: string
  slug: string
  name: string
  kind: BookingKind
  description: string | null
  requirements: string | null
  location: string | null
  duration_min: number
  capacity: number
  max_party: number
  min_lead_hours: number
  max_per_month: number | null
  confirm_mode: 'auto' | 'staff'
  ask_reason: string | null
  attest_text: string | null
  is_published: boolean
  sort_order: number
}
export interface OpenSlot {
  slot_id: string
  starts_at: string
  ends_at: string
  capacity: number
  taken: number
  note: string | null
}
export interface BookingReceipt {
  booking_id: string
  status: BookingStatus
  cancel_token?: string
  name?: string
  type_name: string
  kind: BookingKind
  location: string | null
  starts_at: string
  ends_at: string
  party_size: number
}
export interface RosterRow {
  booking_id: string
  status: BookingStatus
  name: string
  email: string
  phone: string | null
  party_size: number
  answer: string | null
  notes: string | null
  attested: boolean
  created_at: string
  slot_id: string
  starts_at: string
  ends_at: string
  capacity: number
  type_id: string
  type_name: string
  type_slug: string
  kind: BookingKind
  confirm_mode: 'auto' | 'staff'
}
export interface SlotRow {
  id: string
  type_id: string
  starts_at: string
  ends_at: string
  capacity: number
  note: string | null
  is_open: boolean
}

export const OHRR_TZ = 'America/New_York'
export const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: OHRR_TZ })
export const fmtDayShort = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: OHRR_TZ })
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: OHRR_TZ })
export const fmtRange = (a: string, b: string) => `${fmtTime(a)} – ${fmtTime(b)}`
export const dayKey = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: OHRR_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
export const durationLabel = (min: number) => (min % 60 === 0 ? `${min / 60} hour${min === 60 ? '' : 's'}` : min > 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} minutes`)
export const statusLabel = (s: BookingStatus) =>
  ({ requested: 'Waiting for OHRR to confirm', confirmed: 'Confirmed', cancelled: 'Cancelled', checked_in: 'Checked in', no_show: 'No show' })[s]

export async function getBookingType(slug: string): Promise<BookingType | null> {
  const { data, error } = await supabase.from('booking_types').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  return (data as BookingType | null) ?? null
}
export async function listBookingTypes(orgId: string): Promise<BookingType[]> {
  const { data, error } = await supabase.from('booking_types').select('*').eq('org_id', orgId).order('sort_order')
  if (error) throw error
  return (data ?? []) as BookingType[]
}
export async function openSlots(slug: string, days = 60): Promise<OpenSlot[]> {
  const { data, error } = await supabase.rpc('booking_slots_open', {
    p_slug: slug,
    p_from: new Date().toISOString(),
    p_to: new Date(Date.now() + days * 86_400_000).toISOString(),
  })
  if (error) throw error
  return (data ?? []) as OpenSlot[]
}
export async function bookSlot(i: { slotId: string; name: string; email: string; phone: string; party: number; answer?: string; notes?: string; attested: boolean }): Promise<BookingReceipt> {
  const { data, error } = await supabase.rpc('book_slot', {
    p_slot_id: i.slotId,
    p_name: i.name,
    p_email: i.email,
    p_phone: i.phone,
    p_party: i.party,
    p_answer: i.answer ?? null,
    p_notes: i.notes ?? null,
    p_attested: i.attested,
    p_source: 'website',
  })
  if (error) throw error
  return data as BookingReceipt
}
export async function bookingByToken(token: string): Promise<BookingReceipt | null> {
  const { data, error } = await supabase.rpc('booking_by_token', { p_token: token })
  if (error) throw error
  return (data as BookingReceipt | null) ?? null
}
export async function cancelBooking(token: string): Promise<BookingReceipt | null> {
  const { data, error } = await supabase.rpc('cancel_booking', { p_token: token })
  if (error) throw error
  return (data as BookingReceipt | null) ?? null
}

/* staff */
export async function saveBookingType(t: Partial<BookingType> & { org_id: string; slug: string; name: string }): Promise<void> {
  const { error } = await supabase.from('booking_types').upsert(t, { onConflict: 'org_id,slug' })
  if (error) throw error
}
export async function generateSlots(i: { typeId: string; from: string; to: string; weekdays: number[]; start: string; end: string; capacity: number | null; note: string | null }): Promise<number> {
  const { data, error } = await supabase.rpc('generate_booking_slots', {
    p_type_id: i.typeId,
    p_from: i.from,
    p_to: i.to,
    p_weekdays: i.weekdays,
    p_start: i.start,
    p_end: i.end,
    p_capacity: i.capacity,
    p_note: i.note,
  })
  if (error) throw error
  return (data as number) ?? 0
}
export async function roster(orgId: string, from: Date, to: Date): Promise<RosterRow[]> {
  const { data, error } = await supabase.rpc('booking_roster', { p_org: orgId, p_from: from.toISOString(), p_to: to.toISOString() })
  if (error) throw error
  return (data ?? []) as RosterRow[]
}
export async function setBookingStatus(id: string, status: BookingStatus): Promise<void> {
  const { error } = await supabase.rpc('set_booking_status', { p_id: id, p_status: status })
  if (error) throw error
}
export async function listSlots(typeId: string, from: Date, to: Date): Promise<SlotRow[]> {
  const { data, error } = await supabase
    .from('booking_slots')
    .select('id,type_id,starts_at,ends_at,capacity,note,is_open')
    .eq('type_id', typeId)
    .gte('starts_at', from.toISOString())
    .lt('starts_at', to.toISOString())
    .order('starts_at')
  if (error) throw error
  return (data ?? []) as SlotRow[]
}
export async function setSlotOpen(id: string, open: boolean): Promise<void> {
  const { error } = await supabase.from('booking_slots').update({ is_open: open }).eq('id', id)
  if (error) throw error
}
export async function deleteSlot(id: string): Promise<void> {
  const { error } = await supabase.from('booking_slots').delete().eq('id', id)
  if (error) throw error
}

/* calendar */
const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, '')
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
export function downloadBookingIcs(b: BookingReceipt) {
  const title = `${b.type_name} — OHRR`
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ohio House Rabbit Rescue//OHRR website//EN',
    'BEGIN:VEVENT',
    `UID:${b.booking_id}@ohrr`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(b.starts_at)}`,
    `DTEND:${stamp(b.ends_at)}`,
    `SUMMARY:${esc(title)}`,
    b.location ? `LOCATION:${esc(b.location)}` : '',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(title)} in 1 hour`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'ohrr-booking.ics'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function googleCalendarUrl(b: BookingReceipt): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${b.type_name} — OHRR`,
    dates: `${stamp(b.starts_at)}/${stamp(b.ends_at)}`,
    details: `${b.kind === 'shift' ? 'Volunteer shift' : 'Appointment'} at Ohio House Rabbit Rescue.`,
    location: b.location ?? '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
