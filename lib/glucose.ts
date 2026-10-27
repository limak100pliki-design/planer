import type { GlucoseContext, GlucoseEntry, MealSlot } from './types'
import { addDays, toDateKey } from './date'

export type GlucoseStatus = 'hipo' | 'norma' | 'podwyzszony' | 'wysoki'

export interface GlucoseClassification {
  status: GlucoseStatus
  label: string
  shortLabel: string
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'
  colorClass: string
  bgClass: string
  borderClass: string
  description: string
}

export const GLUCOSE_CONTEXT_LABELS: Record<GlucoseContext, { label: string; short: string; defaultSlot?: MealSlot }> = {
  na_czczo: { label: 'Na czczo (po przebudzeniu)', short: 'Na czczo' },
  przed_posilkiem: { label: 'Przed posiłkiem', short: 'Przed posiłkiem' },
  po_posilku: { label: 'Po posiłku (1-2h)', short: 'Po posiłku' },
  przed_snem: { label: 'Przed snem', short: 'Przed snem' },
  noc: { label: 'W nocy', short: 'W nocy' },
  po_wysilku: { label: 'Po wysiłku fizycznym', short: 'Po treningu' },
  inna: { label: 'Inna pora / przygodny', short: 'Przygodny' },
}

/**
  * Medical classification based on Polish Diabetes Association (PTD) guidelines:
  * - Fasting norm: 70 - 99 mg/dL (prediabetes: 100-125, diabetes: >= 126)
  * - Post-meal norm: < 140 mg/dL (impaired tolerance: 140-199, diabetes: >= 200)
  * - Hypoglycemia: < 70 mg/dL
  */
export function classifyGlucose(valueMgDl: number, context: GlucoseContext): GlucoseClassification {
  if (valueMgDl < 70) {
    return {
      status: 'hipo',
      label: 'Hipoglikemia (za niski)',
      shortLabel: 'Niski (<70)',
      badgeVariant: 'destructive',
      colorClass: 'text-sky-600 dark:text-sky-400',
      bgClass: 'bg-sky-50 dark:bg-sky-950/40',
      borderClass: 'border-sky-300 dark:border-sky-800',
      description: 'Poziom poniżej 70 mg/dL wymaga przyjęcia 15g węglowodanów prostych (np. sok).',
    }
  }

  const isPostMeal = context === 'po_posilku'

  if (isPostMeal) {
    if (valueMgDl <= 140) {
      return {
        status: 'norma',
        label: 'W normie poposiłkowej',
        shortLabel: 'W normie',
        badgeVariant: 'default',
        colorClass: 'text-emerald-600 dark:text-emerald-400',
        bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
        borderClass: 'border-emerald-300 dark:border-emerald-800',
        description: 'Prawidłowy poziom po posiłku (< 140 mg/dL).',
      }
    }
    if (valueMgDl <= 199) {
      return {
        status: 'podwyzszony',
        label: 'Podwyższony po posiłku',
        shortLabel: 'Podwyższony',
        badgeVariant: 'secondary',
        colorClass: 'text-amber-600 dark:text-amber-400',
        bgClass: 'bg-amber-50 dark:bg-amber-950/40',
        borderClass: 'border-amber-300 dark:border-amber-800',
        description: 'Lekko podwyższona glikemia poposiłkowa (140–199 mg/dL).',
      }
    }
    return {
      status: 'wysoki',
      label: 'Hiperglikemia poposiłkowa',
      shortLabel: 'Wysoki (≥200)',
      badgeVariant: 'destructive',
      colorClass: 'text-rose-600 dark:text-rose-400',
      bgClass: 'bg-rose-50 dark:bg-rose-950/40',
      borderClass: 'border-rose-300 dark:border-rose-800',
      description: 'Wysoki poziom cukru po posiłku (≥ 200 mg/dL).',
    }
  }

  // Fasting / bedtime / pre-meal
  if (valueMgDl <= 99) {
    return {
      status: 'norma',
      label: 'Prawidłowa glikemia',
      shortLabel: 'W normie',
      badgeVariant: 'default',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
      borderClass: 'border-emerald-300 dark:border-emerald-800',
      description: 'Prawidłowy poziom glukozy (70–99 mg/dL).',
    }
  }

  if (valueMgDl <= 125) {
    return {
      status: 'podwyzszony',
      label: 'Nieprawidłowa glikemia',
      shortLabel: 'Podwyższony',
      badgeVariant: 'secondary',
      colorClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-50 dark:bg-amber-950/40',
      borderClass: 'border-amber-300 dark:border-amber-800',
      description: 'Glikemia na czczo w przedziale stanu przedcukrzycowego (100–125 mg/dL).',
    }
  }

  return {
    status: 'wysoki',
    label: 'Hiperglikemia na czczo',
    shortLabel: 'Wysoki (≥126)',
    badgeVariant: 'destructive',
    colorClass: 'text-rose-600 dark:text-rose-400',
    bgClass: 'bg-rose-50 dark:bg-rose-950/40',
    borderClass: 'border-rose-300 dark:border-rose-800',
    description: 'Poziom na czczo wskazujący na hiperglikemię (≥ 126 mg/dL).',
  }
}

/**
 * Converts mg/dL to mmol/L: 1 mmol/L = 18.0182 mg/dL
 */
export function mgDlToMmol(mgDl: number): number {
  return Math.round((mgDl / 18.0182) * 10) / 10
}

/**
 * Converts mmol/L to mg/dL
 */
export function mmolToMgDl(mmol: number): number {
  return Math.round(mmol * 18.0182)
}

/**
 * Calculates estimated HbA1c based on ADAG formula: HbA1c (%) = (averageMgDl + 46.7) / 28.7
 */
export function estimateHbA1c(averageMgDl: number): number {
  if (averageMgDl <= 0) return 0
  return Math.round(((averageMgDl + 46.7) / 28.7) * 10) / 10
}

/**
 * Generates realistic dummy glucose logs for demo mode (past 7 days)
 */
export function generateDummyGlucoseLogs(referenceDate: Date = new Date()): GlucoseEntry[] {
  const entries: GlucoseEntry[] = []

  const templates: Array<{
    dayOffset: number
    time: string
    value: number
    context: GlucoseContext
    note?: string
    mealSlot?: MealSlot
  }> = [
    // Today
    { dayOffset: 0, time: '07:15', value: 92, context: 'na_czczo', note: 'Po przespanej nocy' },
    { dayOffset: 0, time: '09:45', value: 124, context: 'po_posilku', note: 'Po owsiance z borówkami', mealSlot: 'sniadanie' },
    { dayOffset: 0, time: '14:30', value: 118, context: 'po_posilku', note: 'Po kurczaku z ryżem', mealSlot: 'obiad' },
    { dayOffset: 0, time: '21:40', value: 104, context: 'przed_snem' },

    // Yesterday
    { dayOffset: -1, time: '07:20', value: 96, context: 'na_czczo' },
    { dayOffset: -1, time: '10:00', value: 132, context: 'po_posilku', note: 'Po omlecie warzywnym', mealSlot: 'sniadanie' },
    { dayOffset: -1, time: '15:15', value: 142, context: 'po_posilku', note: 'Obiad w restauracji', mealSlot: 'obiad' },
    { dayOffset: -1, time: '18:30', value: 88, context: 'po_wysilku', note: 'Po 40 min spaceru' },
    { dayOffset: -1, time: '22:00', value: 98, context: 'przed_snem' },

    // 2 days ago
    { dayOffset: -2, time: '07:05', value: 89, context: 'na_czczo' },
    { dayOffset: -2, time: '09:30', value: 115, context: 'po_posilku', mealSlot: 'sniadanie' },
    { dayOffset: -2, time: '14:20', value: 121, context: 'po_posilku', mealSlot: 'obiad' },
    { dayOffset: -2, time: '20:45', value: 110, context: 'po_posilku', mealSlot: 'kolacja' },

    // 3 days ago
    { dayOffset: -3, time: '07:30', value: 102, context: 'na_czczo', note: 'Krótszy sen' },
    { dayOffset: -3, time: '10:15', value: 128, context: 'po_posilku', mealSlot: 'sniadanie' },
    { dayOffset: -3, time: '14:50', value: 135, context: 'po_posilku', mealSlot: 'obiad' },
    { dayOffset: -3, time: '21:30', value: 99, context: 'przed_snem' },

    // 4 days ago
    { dayOffset: -4, time: '07:10', value: 91, context: 'na_czczo' },
    { dayOffset: -4, time: '10:00', value: 119, context: 'po_posilku', mealSlot: 'sniadanie' },
    { dayOffset: -4, time: '14:30', value: 122, context: 'po_posilku', mealSlot: 'obiad' },

    // 5 days ago
    { dayOffset: -5, time: '07:25', value: 94, context: 'na_czczo' },
    { dayOffset: -5, time: '14:15', value: 116, context: 'po_posilku', mealSlot: 'obiad' },
    { dayOffset: -5, time: '21:50', value: 101, context: 'przed_snem' },

    // 6 days ago
    { dayOffset: -6, time: '07:40', value: 88, context: 'na_czczo' },
    { dayOffset: -6, time: '10:10', value: 126, context: 'po_posilku', mealSlot: 'sniadanie' },
    { dayOffset: -6, time: '15:00', value: 129, context: 'po_posilku', mealSlot: 'obiad' },
    { dayOffset: -6, time: '22:15', value: 95, context: 'przed_snem' },
  ]

  let counter = 1
  for (const t of templates) {
    const d = addDays(referenceDate, t.dayOffset)
    const dateKey = toDateKey(d)
    const [hours, minutes] = t.time.split(':').map(Number)
    const ts = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hours, minutes).getTime()
    entries.push({
      id: `demo-glu-${counter++}`,
      date: dateKey,
      time: t.time,
      valueMgDl: t.value,
      context: t.context,
      note: t.note,
      mealSlot: t.mealSlot,
      timestamp: ts,
      updatedAt: ts,
    })
  }

  // Sort ascending by date and time
  return entries.sort((a, b) => a.timestamp - b.timestamp)
}
