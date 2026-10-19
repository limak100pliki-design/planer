'use client'

import { useId, useState } from 'react'
import { formatNumber, ingredientNutrition } from '@/lib/nutrition'
import type { Ingredient } from '@/lib/types'
import { Input } from '@/components/ui/input'

export function IngredientRow({
  ingredient,
  onGramsChange,
}: {
  ingredient: Ingredient
  onGramsChange: (grams: number) => void
}) {
  const inputId = useId()
  const [text, setText] = useState(String(ingredient.grams))
  const n = ingredientNutrition(ingredient)

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_84px] items-center gap-x-2 gap-y-1 rounded-lg px-1 py-1 hover:bg-muted/50 sm:grid-cols-[minmax(0,1fr)_84px_repeat(4,52px)]">
      <label htmlFor={inputId} className="truncate text-sm" title={ingredient.name}>
        {ingredient.name}
      </label>
      <div className="relative">
        <Input
          id={inputId}
          type="number"
          inputMode="decimal"
          min={0}
          max={5000}
          step={5}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            onGramsChange(Number(e.target.value) || 0)
          }}
          onBlur={() => setText(String(ingredient.grams))}
          className="h-8 pr-6 text-right tabular-nums"
        />
        <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">
          g
        </span>
      </div>

      <p className="col-span-2 text-xs text-muted-foreground tabular-nums sm:hidden">
        {formatNumber(n.kcal)} kcal · B {formatNumber(n.protein, 1)} g · W {formatNumber(n.carbs, 1)} g · T{' '}
        {formatNumber(n.fat, 1)} g
      </p>

      <span className="hidden text-right text-sm font-medium tabular-nums sm:block">{formatNumber(n.kcal)}</span>
      <span className="hidden text-right text-sm text-muted-foreground tabular-nums sm:block">
        {formatNumber(n.protein, 1)}
      </span>
      <span className="hidden text-right text-sm text-muted-foreground tabular-nums sm:block">
        {formatNumber(n.carbs, 1)}
      </span>
      <span className="hidden text-right text-sm text-muted-foreground tabular-nums sm:block">
        {formatNumber(n.fat, 1)}
      </span>
    </li>
  )
}
