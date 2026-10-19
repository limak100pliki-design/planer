'use client'

import { useMemo, useState } from 'react'
import { usePlanner } from '@/lib/store'
import { addDays, formatLongDate, startOfWeek, toDateKey } from '@/lib/date'
import { emptyDayPlan, MEAL_SLOTS } from '@/lib/nutrition'
import { SectionHeader } from '@/components/shared'
import { WeekSelector } from './week-selector'
import { DayStrip } from './day-strip'
import { DailySummary } from './daily-summary'
import { MealSlotCard } from './meal-slot-card'

export function MealPlanner() {
  const { plans } = usePlanner()
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate])

  const dateKey = toDateKey(selectedDate)
  const plan = plans[dateKey] ?? emptyDayPlan(dateKey)

  return (
    <div>
      <SectionHeader
        title="Planer Posiłków"
        description="Zaplanuj cztery posiłki dziennie i dopasuj gramaturę składników do swoich celów."
        actions={
          <WeekSelector
            weekStart={weekStart}
            onPrev={() => setSelectedDate((d) => addDays(d, -7))}
            onNext={() => setSelectedDate((d) => addDays(d, 7))}
            onToday={() => setSelectedDate(new Date())}
          />
        }
      />

      <DayStrip weekStart={weekStart} selectedKey={dateKey} onSelect={setSelectedDate} />

      <h2 suppressHydrationWarning className="mt-8 mb-4 text-lg font-semibold tracking-tight">
        {formatLongDate(selectedDate)}
      </h2>

      <DailySummary plan={plan} />

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {MEAL_SLOTS.map(({ key, label }) => (
          <MealSlotCard key={key} date={dateKey} slot={key} label={label} meals={plan.meals[key]} />
        ))}
      </div>
    </div>
  )
}
