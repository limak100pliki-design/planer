import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/nutrition'
import type { Nutrition } from '@/lib/types'

export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string
  description: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-1 text-pretty text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Bar({
  value,
  max,
  colorClass,
  label,
}: {
  value: number
  max: number
  colorClass: string
  label: string
}) {
  const pct = max > 0 ? (value / max) * 100 : 0
  const over = pct > 105
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(value)}
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-300', over ? 'bg-destructive' : colorClass)}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  )
}

export function MacroPills({ nutrition, className }: { nutrition: Nutrition; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground', className)}>
      <span className="font-medium text-foreground tabular-nums">{formatNumber(nutrition.kcal)} kcal</span>
      <MacroDot colorClass="bg-protein" label="B" value={nutrition.protein} />
      <MacroDot colorClass="bg-carbs" label="W" value={nutrition.carbs} />
      <MacroDot colorClass="bg-fat" label="T" value={nutrition.fat} />
    </div>
  )
}

function MacroDot({ colorClass, label, value }: { colorClass: string; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <span className={cn('size-1.5 rounded-full', colorClass)} aria-hidden="true" />
      {label} {formatNumber(value, 1)} g
    </span>
  )
}
