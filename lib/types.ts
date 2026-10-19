/**
 * Data model mirrors the planned Firestore structure:
 *
 *   users/{uid}                          -> UserProfile (goals)
 *   users/{uid}/recipes/{recipeId}       -> Recipe
 *   users/{uid}/mealPlans/{YYYY-MM-DD}   -> DayPlan
 *   users/{uid}/weightLogs/{YYYY-MM-DD}  -> WeightEntry
 *
 * Planned meals store a snapshot of the recipe ingredients so that
 * per-day gram adjustments never mutate the source recipe.
 */

export type DateKey = string // 'YYYY-MM-DD'

export type MealSlot = 'sniadanie' | 'drugieSniadanie' | 'obiad' | 'kolacja'

export interface Nutrition {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface Ingredient {
  id: string
  name: string
  grams: number
  per100g: Nutrition
}

export interface Recipe {
  id: string
  name: string
  description: string
  prepTimeMin: number
  mealTypes: MealSlot[]
  ingredients: Ingredient[]
  createdAt: string
  /** Where the recipe came from: a URL or a book/person reference. */
  pochodzenie: string
  czyUlubiony: boolean
}

export interface PlannedMeal {
  id: string
  recipeId: string
  recipeName: string
  ingredients: Ingredient[]
}

export interface DayPlan {
  date: DateKey
  meals: Record<MealSlot, PlannedMeal[]>
}

export interface Goals {
  kcal: number
  proteinPct: number
  carbsPct: number
  fatPct: number
  targetWeightKg: number
}

export interface WeightEntry {
  date: DateKey
  weightKg: number
}

export interface UserProfile {
  uid: string
  displayName: string
  goals: Goals
}
