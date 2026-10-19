'use client'

import { usePlanner } from '@/lib/store'
import { dayNutrition, formatNumber, goalsInGrams } from '@/lib/nutrition'
import type { DayPlan } from '@/lib/types'
import { Bar } from '@/components/shared'
import { Card } from '@/components/ui/card'

export function DailySummary({ plan }: { plan: DayPlan }) {
  const { goals } = usePlanner()
  const total = dayNutrition(plan)
  const target = goalsInGrams(goals)
  const remaining = target.kcal - total.kcal

  const macros = [
    { key: 'protein', label: 'Białko', value: total.protein, goal: target.protein, color: 'bg-protein' },
    { key: 'carbs', label: 'Węglowodany', value: total.carbs, goal: target.carbs, color: 'bg-carbs' },
    { key: 'fat', label: 'Tłuszcze', value: total.fat, goal: target.fat, color: 'bg-fat' },
  ] as const

  return (
    <Card className="grid gap-6 p-5 sm:p-6 md:grid-cols-[1.1fr_2fr]">
      <div className="flex flex-col justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Kalorie</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">
            {formatNumber(total.kcal)}
            <span className="ml-1.5 text-base font-normal text-muted-foreground">
              / {formatNumber(target.kcal)} kcal
            </span>
          </p>
        </div>
        <div className="space-y-2">
          <Bar value={total.kcal} max={target.kcal} colorClass="bg-kcal" label="Kalorie względem celu" />
          <p className="text-sm text-muted-foreground tabular-nums">
            {remaining >= 0 ? (
              <>
                Pozostało <span className="font-medium text-foreground">{formatNumber(remaining)} kcal</span>
              </>
            ) : (
              <>
                Przekroczono o{' '}
                <span className="font-medium text-destructive">{formatNumber(-remaining)} kcal</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {macros.map((m) => (
          <div key={m.key} className="rounded-xl bg-muted/60 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className={`size-2 rounded-full ${m.color}`} aria-hidden="true" />
              {m.label}
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {formatNumber(m.value)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">/ {formatNumber(m.goal)} g</span>
            </p>
            <div className="mt-3">
              <Bar value={m.value} max={m.goal} colorClass={m.color} label={`${m.label} względem celu`} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
