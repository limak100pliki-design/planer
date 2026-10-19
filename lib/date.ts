import type { DateKey } from './types'

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  next.setDate(next.getDate() + days)
  return next
}

export function startOfWeek(date: Date): Date {
  const mondayOffset = (date.getDay() + 6) % 7
  return addDays(date, -mondayOffset)
}

export function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export function eachDateKey(from: DateKey, to: DateKey): DateKey[] {
  const start = fromDateKey(from)
  const end = fromDateKey(to)
  if (start > end) return []
  const keys: DateKey[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) keys.push(toDateKey(d))
  return keys
}

export const SHORT_DAY_NAMES = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']

const longDate = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const dayMonth = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short' })
const dayMonthYear = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function formatLongDate(date: Date): string {
  const text = longDate.format(date)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function formatShortDate(date: Date): string {
  return dayMonth.format(date)
}

export function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6)
  return `${dayMonth.format(weekStart)} – ${dayMonthYear.format(end)}`
}
