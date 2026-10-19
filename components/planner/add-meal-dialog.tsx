'use client'

import { useMemo, useState } from 'react'
import { Clock, Search, X } from 'lucide-react'
import { usePlanner } from '@/lib/store'
import { ingredientsNutrition } from '@/lib/nutrition'
import type { DateKey, MealSlot } from '@/lib/types'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { MacroPills } from '@/components/shared'

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'l')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function AddMealDialog({
  open,
  onOpenChange,
  date,
  slot,
  slotLabel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: DateKey
  slot: MealSlot
  slotLabel: string
}) {
  const { recipes, addMeal } = usePlanner()
  const [query, setQuery] = useState('')

  const sorted = useMemo(() => {
    const q = normalizeText(query)
    return recipes
      .filter((r) => {
        if (!q) return true
        const nameMatch = normalizeText(r.name).includes(q)
        const ingredientMatch = r.ingredients.some((i) => normalizeText(i.name).includes(q))
        return nameMatch || ingredientMatch
      })
      .map((r) => {
        const matchedIng = q ? r.ingredients.filter((i) => normalizeText(i.name).includes(q)).map((i) => i.name) : []
        return {
          recipe: r,
          suggested: r.mealTypes.includes(slot),
          matchedIngredients: matchedIng,
        }
      })
      .sort((a, b) => Number(b.suggested) - Number(a.suggested))
  }, [recipes, query, slot])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setQuery('')
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dodaj posiłek: {slotLabel}</DialogTitle>
          <DialogDescription>Wybierz jeden z zapisanych przepisów.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj po nazwie lub składniku…"
            aria-label="Szukaj przepisu"
            className="pl-8 pr-8"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Wyczyść wyszukiwanie"
              className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <ul className="-mx-1 max-h-[55vh] space-y-1 overflow-y-auto px-1">
          {sorted.length === 0 && (
            <li className="py-8 text-center text-sm text-muted-foreground">
              Nie znaleziono przepisów pasujących do „{query}”.
            </li>
          )}
          {sorted.map(({ recipe, suggested, matchedIngredients }) => (
            <li key={recipe.id}>
              <button
                type="button"
                onClick={() => {
                  addMeal(date, slot, recipe.id)
                  onOpenChange(false)
                  setQuery('')
                }}
                className="w-full rounded-lg border bg-card p-3 text-left transition-colors outline-none hover:border-primary/50 hover:bg-accent/60 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium leading-snug">{recipe.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {matchedIngredients.length > 0 && (
                      <Badge variant="outline" className="border-primary/30 text-[10px] text-primary">
                        {matchedIngredients.join(', ')}
                      </Badge>
                    )}
                    {suggested && (
                      <Badge variant="secondary">
                        Polecane
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <MacroPills nutrition={ingredientsNutrition(recipe.ingredients)} />
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" aria-hidden="true" />
                    {recipe.prepTimeMin} min
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
