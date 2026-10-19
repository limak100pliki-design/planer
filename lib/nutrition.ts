import type { DayPlan, Goals, Ingredient, MealSlot, Nutrition, PlannedMeal } from './types'

export const MEAL_SLOTS: { key: MealSlot; label: string }[] = [
  { key: 'sniadanie', label: 'Śniadanie' },
  { key: 'drugieSniadanie', label: 'II Śniadanie' },
  { key: 'obiad', label: 'Obiad' },
  { key: 'kolacja', label: 'Kolacja' },
]

export const MEAL_SLOT_LABEL: Record<MealSlot, string> = {
  sniadanie: 'Śniadanie',
  drugieSniadanie: 'II Śniadanie',
  obiad: 'Obiad',
  kolacja: 'Kolacja',
}

export const EMPTY_NUTRITION: Nutrition = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

export function ingredientNutrition(ingredient: Ingredient): Nutrition {
  const factor = ingredient.grams / 100
  return {
    kcal: ingredient.per100g.kcal * factor,
    protein: ingredient.per100g.protein * factor,
    carbs: ingredient.per100g.carbs * factor,
    fat: ingredient.per100g.fat * factor,
  }
}

export function sumNutrition(items: Nutrition[]): Nutrition {
  return items.reduce(
    (acc, n) => ({
      kcal: acc.kcal + n.kcal,
      protein: acc.protein + n.protein,
      carbs: acc.carbs + n.carbs,
      fat: acc.fat + n.fat,
    }),
    { ...EMPTY_NUTRITION },
  )
}

export function ingredientsNutrition(ingredients: Ingredient[]): Nutrition {
  return sumNutrition(ingredients.map(ingredientNutrition))
}

export function mealNutrition(meal: PlannedMeal): Nutrition {
  return ingredientsNutrition(meal.ingredients)
}

export function slotNutrition(meals: PlannedMeal[]): Nutrition {
  return sumNutrition(meals.map(mealNutrition))
}

export function dayNutrition(plan: DayPlan | undefined): Nutrition {
  if (!plan) return { ...EMPTY_NUTRITION }
  return sumNutrition(MEAL_SLOTS.map(({ key }) => slotNutrition(plan.meals[key])))
}

export function goalsInGrams(goals: Goals): Nutrition {
  return {
    kcal: goals.kcal,
    protein: (goals.kcal * goals.proteinPct) / 100 / 4,
    carbs: (goals.kcal * goals.carbsPct) / 100 / 4,
    fat: (goals.kcal * goals.fatPct) / 100 / 9,
  }
}

const numberFormatters = new Map<number, Intl.NumberFormat>()

export function formatNumber(value: number, digits = 0): string {
  let formatter = numberFormatters.get(digits)
  if (!formatter) {
    formatter = new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    })
    numberFormatters.set(digits, formatter)
  }
  return formatter.format(value)
}

export function formatWeight(grams: number): string {
  if (grams >= 1000) return `${formatNumber(grams / 1000, 2)} kg`
  return `${formatNumber(grams)} g`
}

export function emptyDayPlan(date: string): DayPlan {
  return {
    date,
    meals: { sniadanie: [], drugieSniadanie: [], obiad: [], kolacja: [] },
  }
}

export interface MacroDistribution {
  proteinKcal: number
  carbsKcal: number
  fatKcal: number
  totalMacroKcal: number
  proteinPct: number
  carbsPct: number
  fatPct: number
}

export function calculateMacroDistribution(nutrition: Nutrition): MacroDistribution {
  const proteinKcal = nutrition.protein * 4
  const carbsKcal = nutrition.carbs * 4
  const fatKcal = nutrition.fat * 9
  const totalMacroKcal = proteinKcal + carbsKcal + fatKcal

  if (totalMacroKcal <= 0) {
    return {
      proteinKcal: 0,
      carbsKcal: 0,
      fatKcal: 0,
      totalMacroKcal: 0,
      proteinPct: 0,
      carbsPct: 0,
      fatPct: 0,
    }
  }

  const pPct = Math.round((proteinKcal / totalMacroKcal) * 100)
  const cPct = Math.round((carbsKcal / totalMacroKcal) * 100)
  const fPct = Math.max(0, 100 - pPct - cPct)

  return {
    proteinKcal,
    carbsKcal,
    fatKcal,
    totalMacroKcal,
    proteinPct: pPct,
    carbsPct: cPct,
    fatPct: fPct,
  }
}

export interface NutritionStatus {
  diff: number
  percent: number
  state: 'under' | 'match' | 'over'
  label: string
}

export function getNutritionStatus(actualKcal: number, targetKcal: number): NutritionStatus {
  if (targetKcal <= 0) {
    return { diff: 0, percent: 0, state: 'match', label: 'Brak ustalonego celu' }
  }
  const diff = actualKcal - targetKcal
  const percent = Math.round((actualKcal / targetKcal) * 100)

  if (Math.abs(diff) <= 75) {
    return { diff, percent, state: 'match', label: 'Cel osiągnięty idealnie' }
  } else if (diff < 0) {
    return { diff, percent, state: 'under', label: `Pozostało ${formatNumber(Math.abs(diff))} kcal` }
  } else {
    return { diff, percent, state: 'over', label: `Przekroczono o ${formatNumber(diff)} kcal` }
  }
}
