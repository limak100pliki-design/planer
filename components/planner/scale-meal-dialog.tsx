'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { ArrowRight, Flame, Minus, Plus, Scale, Sparkles } from 'lucide-react'
import { formatNumber, mealNutrition } from '@/lib/nutrition'
import type { PlannedMeal } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface ScaleMealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  meal: PlannedMeal
  onConfirmScale: (targetKcal: number) => void
}

export function ScaleMealDialog({
  open,
  onOpenChange,
  meal,
  onConfirmScale,
}: ScaleMealDialogProps) {
  const currentNutrition = useMemo(() => mealNutrition(meal), [meal])
  const currentKcal = Math.round(currentNutrition.kcal)
  const [targetInput, setTargetInput] = useState<string>(String(currentKcal || 400))
  const inputId = useId()

  // Reset input value whenever dialog opens or meal changes
  useEffect(() => {
    if (open) {
      setTargetInput(String(currentKcal || 400))
    }
  }, [open, currentKcal])

  // Keep state synced with current meal when dialog opens
  const targetKcal = useMemo(() => {
    const val = Number(targetInput)
    return Number.isFinite(val) && val > 0 ? Math.round(val) : currentKcal
  }, [targetInput, currentKcal])

  const ratio = currentKcal > 0 ? targetKcal / currentKcal : 1
  const pctChange = Math.round((ratio - 1) * 100)

  // Calculate projected macros and scaled ingredients
  const projectedData = useMemo(() => {
    const scaledProtein = Math.round(currentNutrition.protein * ratio * 10) / 10
    const scaledCarbs = Math.round(currentNutrition.carbs * ratio * 10) / 10
    const scaledFat = Math.round(currentNutrition.fat * ratio * 10) / 10

    const ingredientsWithPreview = meal.ingredients.map((ing) => {
      const newGrams = Math.max(1, Math.round(ing.grams * ratio))
      const diffGrams = newGrams - ing.grams
      return {
        ...ing,
        originalGrams: ing.grams,
        newGrams,
        diffGrams,
      }
    })

    return {
      scaledProtein,
      scaledCarbs,
      scaledFat,
      ingredientsWithPreview,
    }
  }, [currentNutrition, meal.ingredients, ratio])

  const handleStep = (delta: number) => {
    setTargetInput((prev) => {
      const current = Number(prev) || currentKcal
      const next = Math.max(50, Math.min(3000, current + delta))
      return String(next)
    })
  }

  const handlePreset = (presetKcal: number) => {
    setTargetInput(String(presetKcal))
  }

  const handleApply = () => {
    if (targetKcal > 0) {
      onConfirmScale(targetKcal)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Scale className="size-5" />
            <DialogTitle>Dopasuj kalorie posiłku</DialogTitle>
          </div>
          <DialogDescription>
            Zmień kaloryczność dania „<strong className="text-foreground">{meal.recipeName}</strong>”. Gramatura wszystkich składników przeliczy się automatycznie z zachowaniem oryginalnych proporcji przepisu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Main Calorie Input & Steppers */}
          <div className="rounded-2xl border border-border/80 bg-muted/30 p-4">
            <Label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Docelowa kaloryczność posiłku
            </Label>

            <div className="mt-2.5 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleStep(-50)}
                aria-label="Odejmij 50 kcal"
                className="size-10 rounded-xl"
              >
                <Minus className="size-4" />
              </Button>

              <div className="relative flex-1">
                <Input
                  id={inputId}
                  type="number"
                  inputMode="numeric"
                  min={50}
                  max={3000}
                  step={25}
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  className="h-12 text-center text-2xl font-bold tabular-nums pr-12"
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  kcal
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleStep(50)}
                aria-label="Dodaj 50 kcal"
                className="size-10 rounded-xl"
              >
                <Plus className="size-4" />
              </Button>
            </div>

            {/* Slider */}
            <div className="mt-3.5 space-y-1.5">
              <input
                type="range"
                min={150}
                max={1200}
                step={25}
                value={targetKcal}
                onChange={(e) => setTargetInput(e.target.value)}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
                aria-label="Suwak kaloryczności posiłku"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
                <span>150 kcal</span>
                <span>Obecnie: {currentKcal} kcal</span>
                <span>1200 kcal</span>
              </div>
            </div>

            {/* Presets */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">Szybkie cele:</span>
              {[300, 400, 500, 600, 700].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePreset(preset)}
                  className={`rounded-md border px-2 py-0.5 text-xs font-medium transition-colors ${
                    targetKcal === preset
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border/60 bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {preset} kcal
                </button>
              ))}
            </div>
          </div>

          {/* Proportional Ratio & Projected Macros Summary */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" />
                Nowy bilans odżywczy posiłku
              </span>
              <Badge
                variant={ratio === 1 ? 'secondary' : ratio > 1 ? 'default' : 'outline'}
                className="text-[11px] tabular-nums"
              >
                {ratio === 1
                  ? 'Bez zmian'
                  : `${pctChange > 0 ? `+${pctChange}` : pctChange}% porcji (×${ratio.toFixed(2)})`}
              </Badge>
            </div>

            <div className="mt-2.5 grid grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded-lg bg-background/80 p-2 border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Kalorie</p>
                <p className="mt-0.5 text-sm font-bold text-foreground tabular-nums">{targetKcal}</p>
                <p className="text-[10px] text-muted-foreground">kcal</p>
              </div>
              <div className="rounded-lg bg-background/80 p-2 border border-border/50">
                <p className="text-[10px] text-protein uppercase font-medium">Białko</p>
                <p className="mt-0.5 text-sm font-bold text-foreground tabular-nums">
                  {formatNumber(projectedData.scaledProtein, 1)}
                </p>
                <p className="text-[10px] text-muted-foreground">g</p>
              </div>
              <div className="rounded-lg bg-background/80 p-2 border border-border/50">
                <p className="text-[10px] text-carbs uppercase font-medium">Węglowodany</p>
                <p className="mt-0.5 text-sm font-bold text-foreground tabular-nums">
                  {formatNumber(projectedData.scaledCarbs, 1)}
                </p>
                <p className="text-[10px] text-muted-foreground">g</p>
              </div>
              <div className="rounded-lg bg-background/80 p-2 border border-border/50">
                <p className="text-[10px] text-fat uppercase font-medium">Tłuszcze</p>
                <p className="mt-0.5 text-sm font-bold text-foreground tabular-nums">
                  {formatNumber(projectedData.scaledFat, 1)}
                </p>
                <p className="text-[10px] text-muted-foreground">g</p>
              </div>
            </div>
          </div>

          {/* Scaled Ingredients Preview Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Przeliczone składniki:</span>
              <span>{meal.ingredients.length} składników w proporcji</span>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-xl border border-border/80 divide-y bg-card text-xs">
              {projectedData.ingredientsWithPreview.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-3 py-2">
                  <span className="font-medium text-foreground truncate pr-2 max-w-[200px]">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-2 tabular-nums shrink-0">
                    <span className="text-muted-foreground line-through text-[11px]">
                      {item.originalGrams} g
                    </span>
                    <ArrowRight className="size-3 text-muted-foreground" />
                    <span className="font-bold text-foreground">{item.newGrams} g</span>
                    {item.diffGrams !== 0 && (
                      <span
                        className={`text-[10px] font-medium ${
                          item.diffGrams > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        ({item.diffGrams > 0 ? `+${item.diffGrams}` : item.diffGrams} g)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button type="button" onClick={handleApply} className="gap-1.5">
            <Scale className="size-4" />
            Zastosuj proporcje ({targetKcal} kcal)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
