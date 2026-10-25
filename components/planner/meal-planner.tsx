'use client'

import { useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { usePlanner } from '@/lib/store'
import { addDays, formatLongDate, startOfWeek, toDateKey } from '@/lib/date'
import { emptyDayPlan, MEAL_SLOTS } from '@/lib/nutrition'
import { cn } from '@/lib/utils'
import { SectionHeader } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { WeekSelector } from './week-selector'
import { DayStrip } from './day-strip'
import { DailySummary } from './daily-summary'
import { MealSlotCard } from './meal-slot-card'
import { SharePlanDialog } from './share-plan-dialog'

export function MealPlanner() {
  const { plans, sharedPlanInfo, initDayPlan } = usePlanner()
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate])

  const dateKey = toDateKey(selectedDate)
  const plan = plans[dateKey] ?? emptyDayPlan(dateKey)

  // Auto-initialize new day with timestamp so cross-device sync on 2 phones never collides
  useEffect(() => {
    if (!plans[dateKey]) {
      initDayPlan(dateKey)
    }
  }, [dateKey, plans, initDayPlan])

  return (
    <div>
      <SectionHeader
        title="Planer Posiłków"
        description="Zaplanuj cztery posiłki dziennie i dopasuj gramaturę składników do swoich celów."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShareModalOpen(true)}
              className={cn(
                'h-9 gap-1.5 text-xs font-medium shadow-2xs',
                sharedPlanInfo?.isShared && 'border-primary/40 bg-primary/10 text-primary font-semibold',
              )}
            >
              <Users className="size-3.5 text-primary" />
              <span>
                {sharedPlanInfo?.isShared
                  ? `Wspólny plan (${sharedPlanInfo.membersCount} konta)`
                  : 'Wspólny plan (Połącz konta)'}
              </span>
            </Button>
            <WeekSelector
              weekStart={weekStart}
              onPrev={() => setSelectedDate((d) => addDays(d, -7))}
              onNext={() => setSelectedDate((d) => addDays(d, 7))}
              onToday={() => setSelectedDate(new Date())}
            />
          </div>
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

      <SharePlanDialog open={shareModalOpen} onOpenChange={setShareModalOpen} />
    </div>
  )
}
