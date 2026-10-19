'use client'

import type { DayPlan } from '@/lib/types'
import { NutritionDashboardWidget } from './nutrition-dashboard-widget'

export { NutritionDashboardWidget }

export function DailySummary({
  plan,
  className,
  onNavigateToGoals,
}: {
  plan: DayPlan
  className?: string
  onNavigateToGoals?: () => void
}) {
  return (
    <NutritionDashboardWidget
      plan={plan}
      className={className}
      onNavigateToGoals={onNavigateToGoals}
    />
  )
}
