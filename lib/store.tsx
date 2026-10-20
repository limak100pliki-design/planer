'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from 'firebase/firestore'
import { onAuthStateChanged, type User } from 'firebase/auth'
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  signInWithGoogle,
  logoutUser,
  testConnection,
  type AuthErrorInfo,
} from './firebase'
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
  user: User | null
  isLoadingAuth: boolean
  isSyncing: boolean
  authError: AuthErrorInfo | null
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
  login: () => Promise<void>
  logout: () => Promise<void>
  clearAuthError: () => void
}

const PlannerContext = createContext<(PlannerState & PlannerActions) | null>(null)

function createInitialState(): PlannerState {
  const today = new Date()
  return {
    recipes: DUMMY_RECIPES,
    plans: generateDummyPlans(today),
    goals: DUMMY_PROFILE.goals,
    weights: generateDummyWeights(today),
    user: null,
    isLoadingAuth: true,
    isSyncing: false,
    authError: null,
  }
}

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlannerState>(createInitialState)
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Initial connection test
  useEffect(() => {
    testConnection()
  }, [])

  // Listen to Auth state and load user data on login (Local-first / Quota-conserving)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setState((s) => ({ ...s, user: null, isLoadingAuth: false, isSyncing: false }))
        return
      }

      setState((s) => ({ ...s, user: currentUser, isLoadingAuth: false, isSyncing: true }))

      try {
        const userDocRef = doc(db, 'users', currentUser.uid)
        const userDoc = await getDoc(userDocRef)

        if (!userDoc.exists()) {
          // Initialize user document with current goals to seed their account
          const initialData = {
            uid: currentUser.uid,
            displayName: currentUser.displayName || 'Użytkownik',
            goals: DUMMY_PROFILE.goals,
          }
          await setDoc(userDocRef, initialData)
          setState((s) => ({ ...s, goals: DUMMY_PROFILE.goals, isSyncing: false }))
        } else {
          const userData = userDoc.data()
          if (userData?.goals) {
            setState((s) => ({ ...s, goals: userData.goals }))
          }

          // Load recipes collection once
          const recipesRef = collection(db, 'users', currentUser.uid, 'recipes')
          const recipesSnap = await getDocs(recipesRef)
          if (!recipesSnap.empty) {
            const loadedRecipes: Recipe[] = []
            recipesSnap.forEach((d) => loadedRecipes.push(d.data() as Recipe))
            setState((s) => ({ ...s, recipes: loadedRecipes }))
          }

          // Load weight logs collection once
          const weightsRef = collection(db, 'users', currentUser.uid, 'weightLogs')
          const weightsSnap = await getDocs(weightsRef)
          if (!weightsSnap.empty) {
            const loadedWeights: WeightEntry[] = []
            weightsSnap.forEach((d) => loadedWeights.push(d.data() as WeightEntry))
            setState((s) => ({
              ...s,
              weights: loadedWeights.sort((a, b) => a.date.localeCompare(b.date)),
            }))
          }

          // Load meal plans collection once
          const plansRef = collection(db, 'users', currentUser.uid, 'mealPlans')
          const plansSnap = await getDocs(plansRef)
          if (!plansSnap.empty) {
            const loadedPlans: Record<DateKey, DayPlan> = {}
            plansSnap.forEach((d) => {
              const planData = d.data() as DayPlan
              loadedPlans[planData.date] = planData
            })
            setState((s) => ({
              ...s,
              plans: { ...s.plans, ...loadedPlans },
            }))
          }

          setState((s) => ({ ...s, isSyncing: false }))
        }
      } catch (error) {
        console.warn('Nie udało się wczytać danych z Firestore:', error)
        setState((s) => ({ ...s, isSyncing: false }))
      }
    })

    return () => unsubscribe()
  }, [])

  // Helper to persist a day plan with debouncing (protects Firestore write quotas)
  const persistPlanDebounced = useCallback((date: DateKey, plan: DayPlan) => {
    const currentUser = auth.currentUser
    if (!currentUser) return // Guest mode: zero quota consumed

    const timer = debounceTimers.current.get(date)
    if (timer) clearTimeout(timer)

    const newTimer = setTimeout(async () => {
      try {
        const path = `users/${currentUser.uid}/mealPlans/${date}`
        await setDoc(doc(db, 'users', currentUser.uid, 'mealPlans', date), plan)
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}/mealPlans/${date}`)
      } finally {
        debounceTimers.current.delete(date)
      }
    }, 450)

    debounceTimers.current.set(date, newTimer)
  }, [])

  const updatePlan = useCallback(
    (date: DateKey, update: (plan: DayPlan) => DayPlan) => {
      setState((s) => {
        const updated = update(s.plans[date] ?? emptyDayPlan(date))
        persistPlanDebounced(date, updated)
        return {
          ...s,
          plans: { ...s.plans, [date]: updated },
        }
      })
    },
    [persistPlanDebounced],
  )

  const saveRecipe = useCallback((recipe: Recipe) => {
    setState((s) => {
      const exists = s.recipes.some((r) => r.id === recipe.id)
      const nextRecipes = exists
        ? s.recipes.map((r) => (r.id === recipe.id ? recipe : r))
        : [recipe, ...s.recipes]

      // Persist to Firestore if user logged in
      const currentUser = auth.currentUser
      if (currentUser) {
        const path = `users/${currentUser.uid}/recipes/${recipe.id}`
        setDoc(doc(db, 'users', currentUser.uid, 'recipes', recipe.id), recipe).catch((err) =>
          handleFirestoreError(err, OperationType.WRITE, path),
        )
      }

      return { ...s, recipes: nextRecipes }
    })
  }, [])

  const deleteRecipe = useCallback((recipeId: string) => {
    setState((s) => {
      const currentUser = auth.currentUser
      if (currentUser) {
        const path = `users/${currentUser.uid}/recipes/${recipeId}`
        deleteDoc(doc(db, 'users', currentUser.uid, 'recipes', recipeId)).catch((err) =>
          handleFirestoreError(err, OperationType.DELETE, path),
        )
      }
      return { ...s, recipes: s.recipes.filter((r) => r.id !== recipeId) }
    })
  }, [])

  const toggleFavorite = useCallback((recipeId: string) => {
    setState((s) => {
      const nextRecipes = s.recipes.map((r) =>
        r.id === recipeId ? { ...r, czyUlubiony: !r.czyUlubiony } : r,
      )
      const target = nextRecipes.find((r) => r.id === recipeId)
      const currentUser = auth.currentUser
      if (currentUser && target) {
        const path = `users/${currentUser.uid}/recipes/${recipeId}`
        setDoc(doc(db, 'users', currentUser.uid, 'recipes', recipeId), target).catch((err) =>
          handleFirestoreError(err, OperationType.WRITE, path),
        )
      }
      return { ...s, recipes: nextRecipes }
    })
  }, [])

  const addMeal = useCallback(
    (date: DateKey, slot: MealSlot, recipeId: string) => {
      setState((s) => {
        const recipe = s.recipes.find((r) => r.id === recipeId)
        if (!recipe) return s
        const plan = s.plans[date] ?? emptyDayPlan(date)
        const updatedPlan: DayPlan = {
          ...plan,
          meals: {
            ...plan.meals,
            [slot]: [...plan.meals[slot], plannedMealFromRecipe(recipe)],
          },
        }
        persistPlanDebounced(date, updatedPlan)
        return {
          ...s,
          plans: { ...s.plans, [date]: updatedPlan },
        }
      })
    },
    [persistPlanDebounced],
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

  const setGoals = useCallback((goals: Goals) => {
    setState((s) => {
      const currentUser = auth.currentUser
      if (currentUser) {
        const path = `users/${currentUser.uid}`
        setDoc(doc(db, 'users', currentUser.uid), { goals }, { merge: true }).catch((err) =>
          handleFirestoreError(err, OperationType.WRITE, path),
        )
      }
      return { ...s, goals }
    })
  }, [])

  const logWeight = useCallback((entry: WeightEntry) => {
    setState((s) => {
      const updated = [...s.weights.filter((w) => w.date !== entry.date), entry].sort((a, b) =>
        a.date.localeCompare(b.date),
      )
      const currentUser = auth.currentUser
      if (currentUser) {
        const path = `users/${currentUser.uid}/weightLogs/${entry.date}`
        setDoc(doc(db, 'users', currentUser.uid, 'weightLogs', entry.date), entry).catch((err) =>
          handleFirestoreError(err, OperationType.WRITE, path),
        )
      }
      return { ...s, weights: updated }
    })
  }, [])

  const removeWeight = useCallback((date: DateKey) => {
    setState((s) => {
      const currentUser = auth.currentUser
      if (currentUser) {
        const path = `users/${currentUser.uid}/weightLogs/${date}`
        deleteDoc(doc(db, 'users', currentUser.uid, 'weightLogs', date)).catch((err) =>
          handleFirestoreError(err, OperationType.DELETE, path),
        )
      }
      return { ...s, weights: s.weights.filter((w) => w.date !== date) }
    })
  }, [])

  const login = useCallback(async () => {
    setState((s) => ({ ...s, authError: null }))
    const res = await signInWithGoogle()
    if (res.error) {
      setState((s) => ({ ...s, authError: res.error ?? null }))
    }
  }, [])

  const logout = useCallback(async () => {
    await logoutUser()
  }, [])

  const clearAuthError = useCallback(() => {
    setState((s) => ({ ...s, authError: null }))
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
      login,
      logout,
      clearAuthError,
    }),
    [
      state,
      saveRecipe,
      deleteRecipe,
      toggleFavorite,
      addMeal,
      removeMeal,
      updateIngredientGrams,
      setGoals,
      logWeight,
      removeWeight,
      login,
      logout,
      clearAuthError,
    ],
  )

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>
}

export function usePlanner() {
  const ctx = useContext(PlannerContext)
  if (!ctx) throw new Error('usePlanner must be used within PlannerProvider')
  return ctx
}
