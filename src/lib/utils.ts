import clsx, { type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function uid() {
  return crypto.randomUUID()
}

export function nowIso() {
  return new Date().toISOString()
}

export function todayIso() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

/** Simulated network latency for mock API calls. */
export function latency() {
  return sleep(120 + Math.random() * 240)
}

export function ageFrom(birth: string) {
  const b = new Date(birth)
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age
}

export function initials(fullname: string) {
  return fullname
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const longDateFmt = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

export function formatTime(iso: string) {
  return timeFmt.format(new Date(iso))
}

export function formatDate(isoDate: string) {
  return dateFmt.format(new Date(isoDate))
}

export function formatLongDate(d: Date) {
  const s = longDateFmt.format(d)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function shortRequestId() {
  return `req_${Math.random().toString(36).slice(2, 10)}`
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} o`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`
  return `${(n / 1024 / 1024).toFixed(1)} Mo`
}
