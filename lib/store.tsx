'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  DUMMY_PROFILE,
  DUMMY_RECIPES,
  generateDummyPlans,
  generateDummyWeights,
  plannedMealFromRecipe,
} from './dummy-data'
import { emptyDayPlan } from './nutrition'
import type { DateKey, DayPlan, Goals, MealSlot, Recipe, WeightEntry } from './types'

interface PlannerState {
  recipes: Recipe[]
  plans: Record<DateKey, DayPlan>
  goals: Goals
  weights: WeightEntry[]
}

interface PlannerActions {
  saveRecipe: (recipe: Recipe) => void
  deleteRecipe: (recipeId: string) => void
  toggleFavorite: (recipeId: string) => void
  addMeal: (date: DateKey, slot: MealSlot, recipeId: string) => void
  removeMeal: (date: DateKey, slot: MealSlot, mealId: string) => void
  updateIngredientGrams: (
    date: DateKey,
    slot: MealSlot,
    mealId: string,
    ingredientId: string,
    grams: number,
  ) => void
  setGoals: (goals: Goals) => void
  logWeight: (entry: WeightEntry) => void
  removeWeight: (date: DateKey) => void
}

const PlannerContext = createContext<(PlannerState & PlannerActions) | null>(null)

function createInitialState(): PlannerState {
  const today = new Date()
  return {
    recipes: DUMMY_RECIPES,
    plans: generateDummyPlans(today),
    goals: DUMMY_PROFILE.goals,
    weights: generateDummyWeights(today),
  }
}

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlannerState>(createInitialState)

  const updatePlan = useCallback((date: DateKey, update: (plan: DayPlan) => DayPlan) => {
    setState((s) => ({
      ...s,
      plans: { ...s.plans, [date]: update(s.plans[date] ?? emptyDayPlan(date)) },
    }))
  }, [])

  const saveRecipe = useCallback((recipe: Recipe) => {
    setState((s) => {
      const exists = s.recipes.some((r) => r.id === recipe.id)
      return {
        ...s,
        recipes: exists
          ? s.recipes.map((r) => (r.id === recipe.id ? recipe : r))
          : [recipe, ...s.recipes],
      }
    })
  }, [])

  const deleteRecipe = useCallback((recipeId: string) => {
    setState((s) => ({ ...s, recipes: s.recipes.filter((r) => r.id !== recipeId) }))
  }, [])

  const toggleFavorite = useCallback((recipeId: string) => {
    setState((s) => ({
      ...s,
      recipes: s.recipes.map((r) => (r.id === recipeId ? { ...r, czyUlubiony: !r.czyUlubiony } : r)),
    }))
  }, [])

  const addMeal = useCallback(
    (date: DateKey, slot: MealSlot, recipeId: string) => {
      setState((s) => {
        const recipe = s.recipes.find((r) => r.id === recipeId)
        if (!recipe) return s
        const plan = s.plans[date] ?? emptyDayPlan(date)
        return {
          ...s,
          plans: {
            ...s.plans,
            [date]: {
              ...plan,
              meals: { ...plan.meals, [slot]: [...plan.meals[slot], plannedMealFromRecipe(recipe)] },
            },
          },
        }
      })
    },
    [],
  )

  const removeMeal = useCallback(
    (date: DateKey, slot: MealSlot, mealId: string) => {
      updatePlan(date, (plan) => ({
        ...plan,
        meals: { ...plan.meals, [slot]: plan.meals[slot].filter((m) => m.id !== mealId) },
      }))
    },
    [updatePlan],
  )

  const updateIngredientGrams = useCallback(
    (date: DateKey, slot: MealSlot, mealId: string, ingredientId: string, grams: number) => {
      const safeGrams = Number.isFinite(grams) ? Math.max(0, Math.min(grams, 5000)) : 0
      updatePlan(date, (plan) => ({
        ...plan,
        meals: {
          ...plan.meals,
          [slot]: plan.meals[slot].map((meal) =>
            meal.id !== mealId
              ? meal
              : {
                  ...meal,
                  ingredients: meal.ingredients.map((i) =>
                    i.id === ingredientId ? { ...i, grams: safeGrams } : i,
                  ),
                },
          ),
        },
      }))
    },
    [updatePlan],
  )

  const setGoals = useCallback((goals: Goals) => setState((s) => ({ ...s, goals })), [])

  const logWeight = useCallback((entry: WeightEntry) => {
    setState((s) => ({
      ...s,
      weights: [...s.weights.filter((w) => w.date !== entry.date), entry].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    }))
  }, [])

  const removeWeight = useCallback((date: DateKey) => {
    setState((s) => ({ ...s, weights: s.weights.filter((w) => w.date !== date) }))
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      saveRecipe,
      deleteRecipe,
      toggleFavorite,
      addMeal,
      removeMeal,
      updateIngredientGrams,
      setGoals,
      logWeight,
      removeWeight,
    }),
    [state, saveRecipe, deleteRecipe, toggleFavorite, addMeal, removeMeal, updateIngredientGrams, setGoals, logWeight, removeWeight],
  )

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>
}

export function usePlanner() {
  const ctx = useContext(PlannerContext)
  if (!ctx) throw new Error('usePlanner must be used within PlannerProvider')
  return ctx
}
