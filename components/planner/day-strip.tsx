'use client'

import { cn } from '@/lib/utils'
import { usePlanner } from '@/lib/store'
import { SHORT_DAY_NAMES, toDateKey, weekDays } from '@/lib/date'
import { dayNutrition, formatNumber } from '@/lib/nutrition'

export function DayStrip({
  weekStart,
  selectedKey,
  onSelect,
}: {
  weekStart: Date
  selectedKey: string
  onSelect: (date: Date) => void
}) {
  const { plans, goals } = usePlanner()
  const todayKey = toDateKey(new Date())

  return (
    <div role="tablist" aria-label="Dni tygodnia" className="grid grid-cols-7 gap-1.5 sm:gap-2">
      {weekDays(weekStart).map((date, i) => {
        const key = toDateKey(date)
        const kcal = dayNutrition(plans[key]).kcal
        const pct = Math.min((kcal / goals.kcal) * 100, 100)
        const selected = key === selectedKey
        const isToday = key === todayKey

        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(date)}
            suppressHydrationWarning
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-center transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:py-3',
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-card hover:border-primary/40 hover:bg-accent',
            )}
          >
            <span className={cn('text-xs font-medium', selected ? 'opacity-90' : 'text-muted-foreground')}>
              {SHORT_DAY_NAMES[i]}
            </span>
            <span className="text-lg font-semibold leading-none tabular-nums sm:text-xl">{date.getDate()}</span>
            <span
              className={cn(
                'hidden text-[11px] tabular-nums sm:block',
                selected ? 'opacity-90' : 'text-muted-foreground',
              )}
            >
              {kcal > 0 ? `${formatNumber(kcal)} kcal` : '—'}
            </span>
            <span
              className={cn('mt-0.5 h-1 w-8 overflow-hidden rounded-full', selected ? 'bg-primary-foreground/25' : 'bg-muted')}
              aria-hidden="true"
            >
              <span
                className={cn('block h-full rounded-full', selected ? 'bg-primary-foreground' : 'bg-primary')}
                style={{ width: `${pct}%` }}
              />
            </span>
            {isToday && <span className="sr-only">(dzisiaj)</span>}
            {isToday && (
              <span
                className={cn('size-1 rounded-full', selected ? 'bg-primary-foreground' : 'bg-kcal')}
                aria-hidden="true"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
