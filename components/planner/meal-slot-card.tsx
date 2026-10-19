'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { usePlanner } from '@/lib/store'
import { formatNumber, mealNutrition, slotNutrition } from '@/lib/nutrition'
import type { DateKey, MealSlot, PlannedMeal } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MacroPills } from '@/components/shared'
import { ExpandChevron, RecipeInstructions } from '@/components/recipe-instructions'
import { IngredientRow } from './ingredient-row'
import { AddMealDialog } from './add-meal-dialog'

export function MealSlotCard({
  date,
  slot,
  label,
  meals,
}: {
  date: DateKey
  slot: MealSlot
  label: string
  meals: PlannedMeal[]
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const total = slotNutrition(meals)

  return (
    <Card className="gap-0 p-0">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h3 className="font-semibold">{label}</h3>
          <p className="text-sm text-muted-foreground tabular-nums">
            {meals.length > 0 ? `${formatNumber(total.kcal)} kcal` : 'Brak zaplanowanych posiłków'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          <Plus data-icon="inline-start" />
          Dodaj posiłek
        </Button>
      </div>

      {meals.length === 0 ? (
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="m-4 flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed py-8 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent/50 hover:text-foreground"
        >
          <Plus className="size-5" aria-hidden="true" />
          Wybierz przepis z listy zapisanych
        </button>
      ) : (
        <ul className="divide-y">
          {meals.map((meal) => (
            <PlannedMealItem key={meal.id} date={date} slot={slot} meal={meal} />
          ))}
        </ul>
      )}

      <AddMealDialog open={dialogOpen} onOpenChange={setDialogOpen} date={date} slot={slot} slotLabel={label} />
    </Card>
  )
}

function PlannedMealItem({ date, slot, meal }: { date: DateKey; slot: MealSlot; meal: PlannedMeal }) {
  const { recipes, removeMeal, updateIngredientGrams } = usePlanner()
  const [expanded, setExpanded] = useState(false)
  const total = mealNutrition(meal)
  const description = recipes.find((r) => r.id === meal.recipeId)?.description
  const panelId = `instructions-${meal.id}`

  return (
    <li className="px-5 py-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={panelId}
            className="-mx-1 flex items-center gap-2 rounded-md px-1 text-left outline-none transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="text-pretty font-medium leading-snug">{meal.recipeName}</span>
            <ExpandChevron open={expanded} />
          </button>
          <MacroPills nutrition={total} className="mt-1" />
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => removeMeal(date, slot, meal.id)}
          aria-label={`Usuń ${meal.recipeName}`}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 />
        </Button>
      </div>

      <RecipeInstructions
        id={panelId}
        open={expanded}
        text={description}
        className="mb-3"
      />

      <div
        className="hidden grid-cols-[minmax(0,1fr)_84px_repeat(4,52px)] gap-2 px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid"
        aria-hidden="true"
      >
        <span>Składnik</span>
        <span className="text-right">Gramy</span>
        <span className="text-right">kcal</span>
        <span className="text-right">B</span>
        <span className="text-right">W</span>
        <span className="text-right">T</span>
      </div>
      <ul className="space-y-1.5">
        {meal.ingredients.map((ingredient) => (
          <IngredientRow
            key={ingredient.id}
            ingredient={ingredient}
            onGramsChange={(grams) => updateIngredientGrams(date, slot, meal.id, ingredient.id, grams)}
          />
        ))}
      </ul>
    </li>
  )
}
