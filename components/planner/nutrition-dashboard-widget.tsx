'use client'

import { useState } from 'react'
import {
  Activity,
  Flame,
  Info,
  Layers,
  PieChart,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react'
import { usePlanner } from '@/lib/store'
import {
  calculateMacroDistribution,
  dayNutrition,
  formatNumber,
  getNutritionStatus,
  goalsInGrams,
  MEAL_SLOTS,
  slotNutrition,
} from '@/lib/nutrition'
import type { DayPlan, Nutrition } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface NutritionDashboardWidgetProps {
  plan: DayPlan
  className?: string
  onNavigateToGoals?: () => void
}

type TabView = 'overview' | 'meals' | 'analysis'

export function NutritionDashboardWidget({
  plan,
  className,
  onNavigateToGoals,
}: NutritionDashboardWidgetProps) {
  const { goals } = usePlanner()
  const [activeTab, setActiveTab] = useState<TabView>('overview')

  const total = dayNutrition(plan)
  const target = goalsInGrams(goals)
  const status = getNutritionStatus(total.kcal, target.kcal)
  const remainingKcal = target.kcal - total.kcal
  const calPercent = Math.min(Math.round((total.kcal / (target.kcal || 1)) * 100), 150)

  const distribution = calculateMacroDistribution(total)

  // Macro metrics configuration
  const macroItems = [
    {
      id: 'protein',
      label: 'Białko',
      shortLabel: 'B',
      value: total.protein,
      goal: target.protein,
      kcal: distribution.proteinKcal,
      pctOfCalories: distribution.proteinPct,
      targetPct: goals.proteinPct,
      color: 'bg-protein',
      textColor: 'text-protein',
      borderColor: 'border-protein/30',
      lightBg: 'bg-protein/10',
    },
    {
      id: 'carbs',
      label: 'Węglowodany',
      shortLabel: 'W',
      value: total.carbs,
      goal: target.carbs,
      kcal: distribution.carbsKcal,
      pctOfCalories: distribution.carbsPct,
      targetPct: goals.carbsPct,
      color: 'bg-carbs',
      textColor: 'text-carbs',
      borderColor: 'border-carbs/30',
      lightBg: 'bg-carbs/10',
    },
    {
      id: 'fat',
      label: 'Tłuszcze',
      shortLabel: 'T',
      value: total.fat,
      goal: target.fat,
      kcal: distribution.fatKcal,
      pctOfCalories: distribution.fatPct,
      targetPct: goals.fatPct,
      color: 'bg-fat',
      textColor: 'text-fat',
      borderColor: 'border-fat/30',
      lightBg: 'bg-fat/10',
    },
  ]

  // Nutrition insights & calculations
  const proteinPerKg = goals.targetWeightKg > 0 ? (total.protein / goals.targetWeightKg).toFixed(1) : '—'
  const totalMealsCount = Object.values(plan.meals).reduce((acc, m) => acc + m.length, 0)

  return (
    <Card className={cn('overflow-hidden border border-border/80 bg-card shadow-xs', className)}>
      {/* Widget Header */}
      <div className="flex flex-col gap-3 border-b bg-muted/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Activity className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold tracking-tight text-foreground sm:text-base">
              Dzienny Bilans Odżywczy
            </h3>
            <p className="text-xs text-muted-foreground">
              {totalMealsCount} {totalMealsCount === 1 ? 'zaplanowany posiłek' : totalMealsCount >= 2 && totalMealsCount <= 4 ? 'zaplanowane posiłki' : 'zaplanowanych posiłków'}
              {status.state === 'match' && ' · Bilans w normie'}
              {status.state === 'under' && ` · Pozostało ${formatNumber(Math.abs(remainingKcal))} kcal`}
              {status.state === 'over' && ` · Przekroczono o ${formatNumber(remainingKcal * -1)} kcal`}
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            aria-pressed={activeTab === 'overview'}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium transition-all',
              activeTab === 'overview'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Flame className="size-3.5" aria-hidden="true" />
            Bilans
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('meals')}
            aria-pressed={activeTab === 'meals'}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium transition-all',
              activeTab === 'meals'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <UtensilsCrossed className="size-3.5" aria-hidden="true" />
            Posiłki ({totalMealsCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analysis')}
            aria-pressed={activeTab === 'analysis'}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium transition-all',
              activeTab === 'analysis'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <PieChart className="size-3.5" aria-hidden="true" />
            Proporcje
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="p-5 sm:p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Row: Calories Hero & Quick Status */}
            <div className="grid gap-6 lg:grid-cols-[1.1fr_1.9fr] lg:items-center">
              {/* Calories Summary Box */}
              <div className="rounded-2xl border border-border/80 bg-linear-to-br from-background via-muted/20 to-muted/40 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Kalorie całkowite
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums sm:text-4xl">
                        {formatNumber(total.kcal)}
                      </span>
                      <span className="text-sm font-medium text-muted-foreground">
                        / {formatNumber(target.kcal)} kcal
                      </span>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tracking-tight',
                      status.state === 'match'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        : status.state === 'under'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
                    )}
                  >
                    {status.state === 'match' && 'W normie'}
                    {status.state === 'under' && `${calPercent}% celu`}
                    {status.state === 'over' && `+${calPercent - 100}% nad celu`}
                  </span>
                </div>

                {/* Calorie Bar */}
                <div className="mt-4 space-y-1.5">
                  <div
                    role="progressbar"
                    aria-label="Realizacja celu kalorycznego"
                    aria-valuemin={0}
                    aria-valuemax={target.kcal}
                    aria-valuenow={total.kcal}
                    className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        total.kcal > target.kcal * 1.05
                          ? 'bg-amber-500'
                          : 'bg-kcal',
                      )}
                      style={{ width: `${Math.min(calPercent, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {remainingKcal >= 0 ? (
                        <>
                          Pozostało{' '}
                          <strong className="font-semibold text-foreground">
                            {formatNumber(remainingKcal)} kcal
                          </strong>
                        </>
                      ) : (
                        <>
                          Przekroczenie:{' '}
                          <strong className="font-semibold text-destructive">
                            {formatNumber(Math.abs(remainingKcal))} kcal
                          </strong>
                        </>
                      )}
                    </span>
                    <span className="tabular-nums font-medium">{calPercent}%</span>
                  </div>
                </div>
              </div>

              {/* Three Macros Grid */}
              <div className="grid gap-3 sm:grid-cols-3">
                {macroItems.map((m) => {
                  const macroPct = m.goal > 0 ? Math.round((m.value / m.goal) * 100) : 0
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        'flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-border',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn('size-2.5 rounded-full', m.color)} aria-hidden="true" />
                          <span className="text-xs font-semibold text-muted-foreground">{m.label}</span>
                        </div>
                        <span className={cn('text-[11px] font-semibold tabular-nums', m.textColor)}>
                          {macroPct}%
                        </span>
                      </div>

                      <div className="my-2.5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold tabular-nums text-foreground">
                            {formatNumber(m.value, 0)}
                          </span>
                          <span className="text-xs text-muted-foreground">/ {formatNumber(m.goal, 0)} g</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                          {formatNumber(m.kcal)} kcal ({m.pctOfCalories}% en.)
                        </p>
                      </div>

                      <div
                        role="progressbar"
                        aria-label={`${m.label} względem celu`}
                        aria-valuemin={0}
                        aria-valuemax={Math.round(m.goal)}
                        aria-valuenow={Math.round(m.value)}
                        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                      >
                        <div
                          className={cn('h-full rounded-full transition-all duration-300', m.color)}
                          style={{ width: `${Math.min(macroPct, 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Quick Macro Ratio Bar */}
            <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-medium text-foreground">
                  Aktualna struktura energii z makroskładników:
                </span>
                <span className="text-muted-foreground">
                  Cel: B: {goals.proteinPct}% · W: {goals.carbsPct}% · T: {goals.fatPct}%
                </span>
              </div>

              {/* Stacked Percentage Bar */}
              <div
                className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
                aria-label="Podział procentowy kalorii: białko, węglowodany, tłuszcze"
              >
                {distribution.totalMacroKcal > 0 ? (
                  <>
                    <div
                      style={{ width: `${distribution.proteinPct}%` }}
                      className="bg-protein transition-all duration-300"
                      title={`Białko: ${distribution.proteinPct}%`}
                    />
                    <div
                      style={{ width: `${distribution.carbsPct}%` }}
                      className="bg-carbs transition-all duration-300"
                      title={`Węglowodany: ${distribution.carbsPct}%`}
                    />
                    <div
                      style={{ width: `${distribution.fatPct}%` }}
                      className="bg-fat transition-all duration-300"
                      title={`Tłuszcze: ${distribution.fatPct}%`}
                    />
                  </>
                ) : (
                  <div className="h-full w-full bg-muted-foreground/20" />
                )}
              </div>

              {/* Legend with Values */}
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-protein" aria-hidden="true" />
                  <span className="text-muted-foreground">Białko:</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {distribution.proteinPct}% ({formatNumber(distribution.proteinKcal)} kcal)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-carbs" aria-hidden="true" />
                  <span className="text-muted-foreground">Węglowodany:</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {distribution.carbsPct}% ({formatNumber(distribution.carbsKcal)} kcal)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-fat" aria-hidden="true" />
                  <span className="text-muted-foreground">Tłuszcze:</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {distribution.fatPct}% ({formatNumber(distribution.fatKcal)} kcal)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'meals' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Rozkład kalorii i makroskładników w 4 zaplanowanych porach posiłków:
              </p>
              <span className="text-xs font-semibold text-foreground">
                Suma: {formatNumber(total.kcal)} kcal
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {MEAL_SLOTS.map(({ key: slotKey, label }) => {
                const meals = plan.meals[slotKey]
                const nutrition = slotNutrition(meals)
                const shareOfTotal = total.kcal > 0 ? Math.round((nutrition.kcal / total.kcal) * 100) : 0
                const slotDist = calculateMacroDistribution(nutrition)

                return (
                  <div
                    key={slotKey}
                    className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-primary/40"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-foreground">{label}</h4>
                          <p className="text-xs text-muted-foreground">
                            {meals.length === 0
                              ? 'Brak zaplanowanych dań'
                              : meals.map((m) => m.recipeName).join(', ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-bold tabular-nums text-foreground">
                            {formatNumber(nutrition.kcal)} kcal
                          </p>
                          <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                            {shareOfTotal}% dnia
                          </span>
                        </div>
                      </div>

                      {/* Mini Slot Progress Bar */}
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${Math.min(shareOfTotal, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Macro details for this slot */}
                    <div className="mt-3 flex items-center justify-between border-t pt-2.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1 tabular-nums">
                        <span className="size-1.5 rounded-full bg-protein" aria-hidden="true" />
                        <span>B:</span>
                        <span className="font-medium text-foreground">{formatNumber(nutrition.protein, 1)}g</span>
                        <span className="text-[10px] text-muted-foreground">({slotDist.proteinPct}%)</span>
                      </div>
                      <div className="flex items-center gap-1 tabular-nums">
                        <span className="size-1.5 rounded-full bg-carbs" aria-hidden="true" />
                        <span>W:</span>
                        <span className="font-medium text-foreground">{formatNumber(nutrition.carbs, 1)}g</span>
                        <span className="text-[10px] text-muted-foreground">({slotDist.carbsPct}%)</span>
                      </div>
                      <div className="flex items-center gap-1 tabular-nums">
                        <span className="size-1.5 rounded-full bg-fat" aria-hidden="true" />
                        <span>T:</span>
                        <span className="font-medium text-foreground">{formatNumber(nutrition.fat, 1)}g</span>
                        <span className="text-[10px] text-muted-foreground">({slotDist.fatPct}%)</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-5">
            {/* Energy conversion formula card */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-protein" aria-hidden="true" />
                  <span className="text-xs font-semibold text-foreground">Białko (4 kcal/g)</span>
                </div>
                <p className="mt-2 text-xl font-bold tabular-nums text-foreground">
                  {formatNumber(distribution.proteinKcal)}{' '}
                  <span className="text-xs font-normal text-muted-foreground">kcal</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(total.protein, 1)} g · {distribution.proteinPct}% całej energii
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-carbs" aria-hidden="true" />
                  <span className="text-xs font-semibold text-foreground">Węglowodany (4 kcal/g)</span>
                </div>
                <p className="mt-2 text-xl font-bold tabular-nums text-foreground">
                  {formatNumber(distribution.carbsKcal)}{' '}
                  <span className="text-xs font-normal text-muted-foreground">kcal</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(total.carbs, 1)} g · {distribution.carbsPct}% całej energii
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-fat" aria-hidden="true" />
                  <span className="text-xs font-semibold text-foreground">Tłuszcze (9 kcal/g)</span>
                </div>
                <p className="mt-2 text-xl font-bold tabular-nums text-foreground">
                  {formatNumber(distribution.fatKcal)}{' '}
                  <span className="text-xs font-normal text-muted-foreground">kcal</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(total.fat, 1)} g · {distribution.fatPct}% całej energii
                </p>
              </div>
            </div>

            {/* Dietitian Insights / Coaching Box */}
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Sparkles className="size-4" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-foreground">
                    Wnioski dietetyczne dla dzisiejszego jadłospisu
                  </h4>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="size-1 rounded-full bg-primary" />
                      <span>
                        Podaż białka na kg masy ciała (dla wagi docelowej {goals.targetWeightKg} kg):{' '}
                        <strong className="text-foreground">{proteinPerKg} g/kg m.c.</strong>
                        {Number(proteinPerKg) >= 1.6
                          ? ' — optymalny poziom pod budowę i ochronę mięśni.'
                          : ' — w normie zbilansowanej diety.'}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="size-1 rounded-full bg-primary" />
                      <span>
                        Wskaźnik bilansu energetycznego:{' '}
                        {remainingKcal > 100 ? (
                          <strong className="text-foreground">
                            Deficyt {formatNumber(remainingKcal)} kcal względem założeń.
                          </strong>
                        ) : remainingKcal < -100 ? (
                          <strong className="text-destructive">
                            Nadwyżka {formatNumber(Math.abs(remainingKcal))} kcal względem założeń.
                          </strong>
                        ) : (
                          <strong className="text-emerald-700 dark:text-emerald-400">
                            Wzorowa zgodność z zaplanowaną kalorycznością (+/- 100 kcal).
                          </strong>
                        )}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="size-1 rounded-full bg-primary" />
                      <span>
                        Odchylenie makro:{' '}
                        {Math.abs(distribution.proteinPct - goals.proteinPct) <= 3 &&
                        Math.abs(distribution.carbsPct - goals.carbsPct) <= 3
                          ? 'Proporcje makroskładników są niemal identyczne z celem profilu.'
                          : `Rozkład: B ${distribution.proteinPct}% (cel: ${goals.proteinPct}%), W ${distribution.carbsPct}% (cel: ${goals.carbsPct}%), T ${distribution.fatPct}% (cel: ${goals.fatPct}%).`}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
