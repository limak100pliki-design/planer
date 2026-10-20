'use client'

import { Clock, Pencil, Trash2 } from 'lucide-react'
import { usePlanner } from '@/lib/store'
import { formatNumber, ingredientNutrition, ingredientsNutrition } from '@/lib/nutrition'
import type { Recipe } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MacroPills } from '@/components/shared'

export function RecipeDetailDialog({
  recipe,
  onOpenChange,
  onEdit,
}: {
  recipe: Recipe | null
  onOpenChange: (open: boolean) => void
  onEdit: (recipe: Recipe) => void
}) {
  const { deleteRecipe } = usePlanner()

  return (
    <Dialog open={recipe !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        {recipe && (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg">{recipe.name}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Szczegółowe wartości odżywcze, proporcje składników i opis przyrządzenia.
              </DialogDescription>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Clock className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  {recipe.prepTimeMin} min
                </span>
                <MacroPills nutrition={ingredientsNutrition(recipe.ingredients)} />
              </div>
            </DialogHeader>

            <section aria-labelledby="skladniki">
              <h3 id="skladniki" className="mb-2 text-sm font-semibold">
                Składniki
              </h3>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Nazwa</th>
                      <th className="px-3 py-2 text-right font-medium">Ilość</th>
                      <th className="px-3 py-2 text-right font-medium" title="Wartości na 100 g">
                        kcal/100g
                      </th>
                      <th className="px-3 py-2 text-right font-medium">B/W/T (100g)</th>
                      <th className="px-3 py-2 text-right font-medium">kcal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y tabular-nums">
                    {recipe.ingredients.map((i) => (
                      <tr key={i.id}>
                        <td className="px-3 py-2">{i.name}</td>
                        <td className="px-3 py-2 text-right">{formatNumber(i.grams)} g</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{formatNumber(i.per100g.kcal)}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap text-muted-foreground">
                          {formatNumber(i.per100g.protein, 1)} / {formatNumber(i.per100g.carbs, 1)} /{' '}
                          {formatNumber(i.per100g.fat, 1)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatNumber(ingredientNutrition(i).kcal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section aria-labelledby="opis">
              <h3 id="opis" className="mb-2 text-sm font-semibold">
                Opis przyrządzenia
              </h3>
              <ol className="space-y-2">
                {recipe.description
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((step, idx) => (
                    <li key={idx} className="flex gap-3 text-sm leading-relaxed">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                        {idx + 1}
                      </span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
              </ol>
            </section>

            <DialogFooter>
              <Button
                variant="destructive"
                onClick={() => {
                  deleteRecipe(recipe.id)
                  onOpenChange(false)
                }}
              >
                <Trash2 data-icon="inline-start" />
                Usuń
              </Button>
              <Button onClick={() => onEdit(recipe)}>
                <Pencil data-icon="inline-start" />
                Edytuj
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
