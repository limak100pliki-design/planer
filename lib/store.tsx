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
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  arrayUnion,
  arrayRemove,
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
import { emptyDayPlan, mealNutrition } from './nutrition'
import type { DateKey, DayPlan, Goals, MealSlot, Recipe, SharedPlanInfo, WeightEntry } from './types'

interface PlannerState {
  recipes: Recipe[]
  plans: Record<DateKey, DayPlan>
  goals: Goals
  weights: WeightEntry[]
  user: User | null
  isLoadingAuth: boolean
  isSyncing: boolean
  authError: AuthErrorInfo | null
  activePlanId: string | null
  sharedPlanInfo: SharedPlanInfo | null
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
  scaleMealCalories: (date: DateKey, slot: MealSlot, mealId: string, targetKcal: number) => void
  setGoals: (goals: Goals) => void
  logWeight: (entry: WeightEntry) => void
  removeWeight: (date: DateKey) => void
  login: () => Promise<void>
  logout: () => Promise<void>
  clearAuthError: () => void
  createOrGetShareCode: () => Promise<string>
  joinSharedPlanWithCode: (code: string) => Promise<{ success: boolean; error?: string }>
  leaveSharedPlan: () => Promise<void>
  importRecipesBulk: (importedRecipes: Recipe[]) => Promise<{ count: number }>
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
    activePlanId: null,
    sharedPlanInfo: null,
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
        setState((s) => ({
          ...s,
          user: null,
          isLoadingAuth: false,
          isSyncing: false,
          activePlanId: null,
          sharedPlanInfo: null,
        }))
        return
      }

      setState((s) => ({ ...s, user: currentUser, isLoadingAuth: false, isSyncing: true }))

      try {
        const userDocRef = doc(db, 'users', currentUser.uid)
        const userDoc = await getDoc(userDocRef)

        let targetPlanId = currentUser.uid

        if (!userDoc.exists()) {
          // Initialize user document with current goals to seed their account
          const initialData = {
            uid: currentUser.uid,
            displayName: currentUser.displayName || 'Użytkownik',
            activePlanId: currentUser.uid,
            goals: DUMMY_PROFILE.goals,
          }
          await setDoc(userDocRef, initialData)
          setState((s) => ({ ...s, goals: DUMMY_PROFILE.goals }))
        } else {
          const userData = userDoc.data()
          if (userData?.goals) {
            setState((s) => ({ ...s, goals: userData.goals }))
          }
          if (userData?.activePlanId) {
            targetPlanId = userData.activePlanId
          }
        }

        // Check shared plan document
        const planDocRef = doc(db, 'plans', targetPlanId)
        const planDoc = await getDoc(planDocRef)
        let planInfo: SharedPlanInfo = {
          planId: targetPlanId,
          isShared: false,
          ownerId: currentUser.uid,
          ownerName: currentUser.displayName || 'Główny profil',
          membersCount: 1,
          isOwner: true,
        }

        if (planDoc.exists()) {
          const planData = planDoc.data()
          const membersList = planData.members || [planData.ownerId || currentUser.uid]
          planInfo = {
            planId: targetPlanId,
            isShared: membersList.length > 1,
            shareCode: planData.shareCode,
            ownerId: planData.ownerId || currentUser.uid,
            ownerName: planData.ownerName || 'Współdzielony plan',
            membersCount: membersList.length,
            isOwner: planData.ownerId === currentUser.uid || targetPlanId === currentUser.uid,
          }
        } else {
          // Bootstrap plan record
          await setDoc(
            planDocRef,
            {
              id: targetPlanId,
              ownerId: currentUser.uid,
              ownerName: currentUser.displayName || 'Główny profil',
              members: [currentUser.uid],
              createdAt: new Date().toISOString(),
            },
            { merge: true },
          )
        }

        // Load personal weight logs
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

        // Load collaborative recipes from plans/{planId}/recipes (with fallback to user personal)
        const sharedRecipesRef = collection(db, 'plans', targetPlanId, 'recipes')
        const sharedRecipesSnap = await getDocs(sharedRecipesRef)
        let loadedRecipes: Recipe[] = []

        if (!sharedRecipesSnap.empty) {
          sharedRecipesSnap.forEach((d) => loadedRecipes.push(d.data() as Recipe))
        } else {
          // Fallback to user recipes
          const userRecipesRef = collection(db, 'users', currentUser.uid, 'recipes')
          const userRecipesSnap = await getDocs(userRecipesRef)
          if (!userRecipesSnap.empty) {
            userRecipesSnap.forEach((d) => loadedRecipes.push(d.data() as Recipe))
            // Copy to shared plan so members can access them
            for (const r of loadedRecipes) {
              setDoc(doc(db, 'plans', targetPlanId, 'recipes', r.id), r).catch(() => {})
            }
          }
        }

        if (loadedRecipes.length > 0) {
          setState((s) => ({ ...s, recipes: loadedRecipes }))
        }

        // Load collaborative meal plans from plans/{planId}/mealPlans
        const sharedPlansRef = collection(db, 'plans', targetPlanId, 'mealPlans')
        const sharedPlansSnap = await getDocs(sharedPlansRef)
        const loadedPlans: Record<DateKey, DayPlan> = {}

        if (!sharedPlansSnap.empty) {
          sharedPlansSnap.forEach((d) => {
            const planData = d.data() as DayPlan
            loadedPlans[planData.date] = planData
          })
        } else {
          // Fallback to user mealPlans
          const userPlansRef = collection(db, 'users', currentUser.uid, 'mealPlans')
          const userPlansSnap = await getDocs(userPlansRef)
          if (!userPlansSnap.empty) {
            userPlansSnap.forEach((d) => {
              const planData = d.data() as DayPlan
              loadedPlans[planData.date] = planData
              // Copy to shared plan
              setDoc(doc(db, 'plans', targetPlanId, 'mealPlans', planData.date), planData).catch(() => {})
            })
          }
        }

        setState((s) => ({
          ...s,
          activePlanId: targetPlanId,
          sharedPlanInfo: planInfo,
          plans: Object.keys(loadedPlans).length > 0 ? { ...s.plans, ...loadedPlans } : s.plans,
          isSyncing: false,
        }))
      } catch (error) {
        console.warn('Nie udało się wczytać danych z Firestore:', error)
        setState((s) => ({ ...s, isSyncing: false }))
      }
    })

    return () => unsubscribe()
  }, [])

  // Proactive Session Keep-Alive and Token Refresh
  // Prevents premature logouts due to 1-hour token expiration, browser tab suspension,
  // sleep mode wakeups, and network changes.
  useEffect(() => {
    const refreshAuthToken = async (force: boolean = false) => {
      const currentUser = auth.currentUser
      if (!currentUser) return
      try {
        await currentUser.getIdToken(force)
      } catch (err) {
        console.warn('[Firebase Auth] Cicha próba odświeżenia tokena sesji:', err)
      }
    }

    // Refresh token every 20 minutes (well before the 60-minute token expiry) while page is open
    const interval = setInterval(() => {
      refreshAuthToken(true)
    }, 20 * 60 * 1000)

    // Re-verify session when tab becomes visible again, gains focus, or reconnects
    const handleActivity = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshAuthToken(false)
      }
    }

    window.addEventListener('visibilitychange', handleActivity)
    window.addEventListener('focus', handleActivity)
    window.addEventListener('online', handleActivity)

    return () => {
      clearInterval(interval)
      window.removeEventListener('visibilitychange', handleActivity)
      window.removeEventListener('focus', handleActivity)
      window.removeEventListener('online', handleActivity)
    }
  }, [])

  // Real-time synchronization for collaborative shared plan
  useEffect(() => {
    const activePlanId = state.activePlanId
    const currentUser = state.user
    if (!currentUser || !activePlanId) return

    // 1. Listen to shared plan metadata (members count, share code, etc.)
    const planDocRef = doc(db, 'plans', activePlanId)
    const unsubPlan = onSnapshot(
      planDocRef,
      (snap) => {
        if (!snap.exists()) return
        const planData = snap.data()
        const membersList: string[] = planData.members || [planData.ownerId || currentUser.uid]
        setState((s) => ({
          ...s,
          sharedPlanInfo: {
            planId: activePlanId,
            isShared: membersList.length > 1,
            shareCode: planData.shareCode,
            ownerId: planData.ownerId || currentUser.uid,
            ownerName: planData.ownerName || 'Współdzielony plan',
            membersCount: membersList.length,
            isOwner: planData.ownerId === currentUser.uid || activePlanId === currentUser.uid,
          },
        }))
      },
      (err) => console.warn('Plan metadata listener error:', err),
    )

    // 2. Listen to meal plans for this active plan
    const mealPlansRef = collection(db, 'plans', activePlanId, 'mealPlans')
    const unsubMealPlans = onSnapshot(
      mealPlansRef,
      (snapshot) => {
        const remotePlans: Record<DateKey, DayPlan> = {}
        snapshot.forEach((docSnap) => {
          const plan = docSnap.data() as DayPlan
          remotePlans[plan.date] = plan
        })
        if (Object.keys(remotePlans).length > 0) {
          setState((s) => ({
            ...s,
            plans: { ...s.plans, ...remotePlans },
          }))
        }
      },
      (err) => console.warn('Meal plans listener error:', err),
    )

    // 3. Listen to recipes for this active plan
    const recipesRef = collection(db, 'plans', activePlanId, 'recipes')
    const unsubRecipes = onSnapshot(
      recipesRef,
      (snapshot) => {
        if (snapshot.empty) return
        const remoteRecipes: Recipe[] = []
        snapshot.forEach((docSnap) => {
          remoteRecipes.push(docSnap.data() as Recipe)
        })
        setState((s) => ({
          ...s,
          recipes: remoteRecipes,
        }))
      },
      (err) => console.warn('Recipes listener error:', err),
    )

    return () => {
      unsubPlan()
      unsubMealPlans()
      unsubRecipes()
    }
  }, [state.activePlanId, state.user?.uid])

  // Helper to persist a day plan with debouncing (protects Firestore write quotas)
  const persistPlanDebounced = useCallback(
    (date: DateKey, plan: DayPlan) => {
      const currentUser = auth.currentUser
      if (!currentUser) return // Guest mode: zero quota consumed

      const targetPlanId = state.activePlanId || currentUser.uid
      const timerKey = `${targetPlanId}_${date}`
      const timer = debounceTimers.current.get(timerKey)
      if (timer) clearTimeout(timer)

      const newTimer = setTimeout(async () => {
        try {
          const path = `plans/${targetPlanId}/mealPlans/${date}`
          await setDoc(doc(db, 'plans', targetPlanId, 'mealPlans', date), plan)
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `plans/${targetPlanId}/mealPlans/${date}`)
        } finally {
          debounceTimers.current.delete(timerKey)
        }
      }, 450)

      debounceTimers.current.set(timerKey, newTimer)
    },
    [state.activePlanId],
  )

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

  const saveRecipe = useCallback(
    (recipe: Recipe) => {
      setState((s) => {
        const exists = s.recipes.some((r) => r.id === recipe.id)
        const nextRecipes = exists
          ? s.recipes.map((r) => (r.id === recipe.id ? recipe : r))
          : [recipe, ...s.recipes]

        // Persist to collaborative plan in Firestore if user logged in
        const currentUser = auth.currentUser
        if (currentUser) {
          const targetPlanId = s.activePlanId || currentUser.uid
          const path = `plans/${targetPlanId}/recipes/${recipe.id}`
          setDoc(doc(db, 'plans', targetPlanId, 'recipes', recipe.id), recipe).catch((err) =>
            handleFirestoreError(err, OperationType.WRITE, path),
          )
        }

        return { ...s, recipes: nextRecipes }
      })
    },
    [],
  )

  const deleteRecipe = useCallback(
    (recipeId: string) => {
      setState((s) => {
        const currentUser = auth.currentUser
        if (currentUser) {
          const targetPlanId = s.activePlanId || currentUser.uid
          const path = `plans/${targetPlanId}/recipes/${recipeId}`
          deleteDoc(doc(db, 'plans', targetPlanId, 'recipes', recipeId)).catch((err) =>
            handleFirestoreError(err, OperationType.DELETE, path),
          )
        }
        return { ...s, recipes: s.recipes.filter((r) => r.id !== recipeId) }
      })
    },
    [],
  )

  const importRecipesBulk = useCallback(
    async (importedRecipes: Recipe[]): Promise<{ count: number }> => {
      const sanitized: Recipe[] = importedRecipes.map((r, index) => ({
        id: r.id && r.id.trim() ? r.id.trim() : `recipe-${Date.now()}-${index}`,
        name: r.name || 'Bez nazwy',
        description: r.description || '',
        prepTimeMin: typeof r.prepTimeMin === 'number' && r.prepTimeMin > 0 ? r.prepTimeMin : 20,
        mealTypes: Array.isArray(r.mealTypes) && r.mealTypes.length > 0 ? r.mealTypes : ['obiad'],
        pochodzenie: r.pochodzenie || 'Import JSON',
        czyUlubiony: false, // Ensure imported recipes start as not favorite
        createdAt: r.createdAt || new Date().toISOString(),
        ingredients: Array.isArray(r.ingredients)
          ? r.ingredients.map((ing, iIdx) => ({
              id: ing.id && ing.id.trim() ? ing.id.trim() : `ing-${Date.now()}-${index}-${iIdx}`,
              name: ing.name || 'Składnik',
              grams: typeof ing.grams === 'number' && ing.grams > 0 ? ing.grams : 100,
              per100g: {
                kcal: Number(ing.per100g?.kcal) || 0,
                protein: Number(ing.per100g?.protein) || 0,
                carbs: Number(ing.per100g?.carbs) || 0,
                fat: Number(ing.per100g?.fat) || 0,
              },
            }))
          : [],
      }))

      setState((s) => {
        const existingIds = new Set(s.recipes.map((r) => r.id))
        const newOnes = sanitized.filter((r) => !existingIds.has(r.id))
        const updated = s.recipes.map((r) => {
          const match = sanitized.find((sr) => sr.id === r.id)
          return match || r
        })
        const combined = [...sanitized, ...s.recipes.filter((r) => !sanitized.some((sr) => sr.id === r.id))]

        const currentUser = auth.currentUser
        if (currentUser) {
          const targetPlanId = s.activePlanId || currentUser.uid
          for (const r of sanitized) {
            setDoc(doc(db, 'plans', targetPlanId, 'recipes', r.id), r).catch((err) =>
              handleFirestoreError(err, OperationType.WRITE, `plans/${targetPlanId}/recipes/${r.id}`),
            )
          }
        }

        return { ...s, recipes: combined }
      })

      return { count: sanitized.length }
    },
    [],
  )

  const toggleFavorite = useCallback(
    (recipeId: string) => {
      setState((s) => {
        const nextRecipes = s.recipes.map((r) =>
          r.id === recipeId ? { ...r, czyUlubiony: !r.czyUlubiony } : r,
        )
        const target = nextRecipes.find((r) => r.id === recipeId)
        const currentUser = auth.currentUser
        if (currentUser && target) {
          const targetPlanId = s.activePlanId || currentUser.uid
          const path = `plans/${targetPlanId}/recipes/${recipeId}`
          setDoc(doc(db, 'plans', targetPlanId, 'recipes', recipeId), target).catch((err) =>
            handleFirestoreError(err, OperationType.WRITE, path),
          )
        }
        return { ...s, recipes: nextRecipes }
      })
    },
    [],
  )

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

  const scaleMealCalories = useCallback(
    (date: DateKey, slot: MealSlot, mealId: string, targetKcal: number) => {
      const safeTarget = Number.isFinite(targetKcal) ? Math.max(10, Math.min(Math.round(targetKcal), 4000)) : 0
      if (safeTarget <= 0) return

      updatePlan(date, (plan) => {
        const slotMeals = plan.meals[slot] || []
        const meal = slotMeals.find((m) => m.id === mealId)
        if (!meal || meal.ingredients.length === 0) return plan

        const currentKcal = mealNutrition(meal).kcal
        if (currentKcal <= 0) return plan

        const ratio = safeTarget / currentKcal

        const updatedMeals = slotMeals.map((m) => {
          if (m.id !== mealId) return m
          return {
            ...m,
            ingredients: m.ingredients.map((ing) => {
              const scaledGrams = Math.max(1, Math.round(ing.grams * ratio))
              return {
                ...ing,
                grams: Math.min(scaledGrams, 5000),
              }
            }),
          }
        })

        return {
          ...plan,
          meals: {
            ...plan.meals,
            [slot]: updatedMeals,
          },
        }
      })
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
        const cleanEntry: Record<string, unknown> = {
          date: entry.date,
          weightKg: entry.weightKg,
        }
        if (typeof entry.waistCm === 'number' && !Number.isNaN(entry.waistCm)) {
          cleanEntry.waistCm = entry.waistCm
        }
        if (typeof entry.hipsCm === 'number' && !Number.isNaN(entry.hipsCm)) {
          cleanEntry.hipsCm = entry.hipsCm
        }

        setDoc(doc(db, 'users', currentUser.uid), { weightLogs: { [entry.date]: cleanEntry } }, { merge: true }).catch(
          () => {},
        )
        setDoc(doc(db, 'users', currentUser.uid, 'weightLogs', entry.date), cleanEntry).catch((err) =>
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

  const createOrGetShareCode = useCallback(async (): Promise<string> => {
    const currentUser = auth.currentUser
    if (!currentUser) throw new Error('Zaloguj się, aby wygenerować kod wspólnego planu.')

    const targetPlanId = state.activePlanId || currentUser.uid
    const planRef = doc(db, 'plans', targetPlanId)
    const planSnap = await getDoc(planRef)
    const existingCode = planSnap.data()?.shareCode

    if (existingCode) {
      await setDoc(
        doc(db, 'shareCodes', existingCode),
        {
          code: existingCode,
          planId: targetPlanId,
          ownerUid: currentUser.uid,
          ownerName: currentUser.displayName || 'Główny profil',
          createdAt: new Date().toISOString(),
        },
        { merge: true },
      )
      return existingCode
    }

    // Generate clean 4-digit numeric code
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString()
    const newCode = `TAL-${randomSuffix}`

    await setDoc(doc(db, 'shareCodes', newCode), {
      code: newCode,
      planId: targetPlanId,
      ownerUid: currentUser.uid,
      ownerName: currentUser.displayName || 'Główny profil',
      createdAt: new Date().toISOString(),
    })

    await setDoc(
      planRef,
      {
        id: targetPlanId,
        ownerId: currentUser.uid,
        ownerName: currentUser.displayName || 'Główny profil',
        members: planSnap.data()?.members || [currentUser.uid],
        shareCode: newCode,
        createdAt: planSnap.data()?.createdAt || new Date().toISOString(),
      },
      { merge: true },
    )

    setState((s) => ({
      ...s,
      sharedPlanInfo: s.sharedPlanInfo
        ? { ...s.sharedPlanInfo, shareCode: newCode }
        : {
            planId: targetPlanId,
            isShared: false,
            shareCode: newCode,
            ownerId: currentUser.uid,
            ownerName: currentUser.displayName || 'Główny profil',
            membersCount: 1,
            isOwner: true,
          },
    }))

    return newCode
  }, [state.activePlanId])

  const joinSharedPlanWithCode = useCallback(
    async (code: string): Promise<{ success: boolean; error?: string }> => {
      const currentUser = auth.currentUser
      if (!currentUser) {
        return { success: false, error: 'Zaloguj się najpierw, aby dołączyć do wspólnego planu.' }
      }

      const cleanCode = code.trim().toUpperCase()
      if (!cleanCode) {
        return { success: false, error: 'Wpisz kod parowania (np. TAL-1234).' }
      }

      try {
        setState((s) => ({ ...s, isSyncing: true }))
        const codeRef = doc(db, 'shareCodes', cleanCode)
        const codeSnap = await getDoc(codeRef)

        if (!codeSnap.exists()) {
          setState((s) => ({ ...s, isSyncing: false }))
          return {
            success: false,
            error: 'Nie znaleziono planu dla podanego kodu. Upewnij się, że kod jest poprawny.',
          }
        }

        const codeData = codeSnap.data()
        const targetPlanId = codeData.planId

        // 1. Add this user to target plan members
        const planRef = doc(db, 'plans', targetPlanId)
        const planSnap = await getDoc(planRef)
        const currentMembers: string[] = planSnap.data()?.members || [codeData.ownerUid]
        const updatedMembers = Array.from(new Set([...currentMembers, currentUser.uid]))

        await setDoc(
          planRef,
          {
            members: updatedMembers,
          },
          { merge: true },
        )

        // 2. Update user's activePlanId in /users/{uid}
        await setDoc(
          doc(db, 'users', currentUser.uid),
          {
            activePlanId: targetPlanId,
          },
          { merge: true },
        )

        // 3. Load collaborative mealPlans from /plans/{targetPlanId}/mealPlans
        const plansRef = collection(db, 'plans', targetPlanId, 'mealPlans')
        const plansSnap = await getDocs(plansRef)
        const loadedPlans: Record<DateKey, DayPlan> = {}
        plansSnap.forEach((d) => {
          const p = d.data() as DayPlan
          loadedPlans[p.date] = p
        })

        // 4. Load collaborative recipes from /plans/{targetPlanId}/recipes
        const recipesRef = collection(db, 'plans', targetPlanId, 'recipes')
        const recipesSnap = await getDocs(recipesRef)
        const loadedRecipes: Recipe[] = []
        recipesSnap.forEach((d) => loadedRecipes.push(d.data() as Recipe))

        setState((s) => ({
          ...s,
          activePlanId: targetPlanId,
          sharedPlanInfo: {
            planId: targetPlanId,
            isShared: true,
            shareCode: cleanCode,
            ownerId: codeData.ownerUid,
            ownerName: codeData.ownerName || 'Współdzielony plan',
            membersCount: updatedMembers.length,
            isOwner: codeData.ownerUid === currentUser.uid,
          },
          plans: Object.keys(loadedPlans).length > 0 ? { ...s.plans, ...loadedPlans } : s.plans,
          recipes: loadedRecipes.length > 0 ? loadedRecipes : s.recipes,
          isSyncing: false,
        }))

        return { success: true }
      } catch (err) {
        console.error('Błąd podczas dołączania do planu:', err)
        setState((s) => ({ ...s, isSyncing: false }))
        return { success: false, error: 'Wystąpił błąd podczas łączenia z planem.' }
      }
    },
    [],
  )

  const leaveSharedPlan = useCallback(async () => {
    const currentUser = auth.currentUser
    if (!currentUser) return

    setState((s) => ({ ...s, isSyncing: true }))

    try {
      const prevPlanId = state.activePlanId
      if (prevPlanId && prevPlanId !== currentUser.uid) {
        try {
          await updateDoc(doc(db, 'plans', prevPlanId), {
            members: arrayRemove(currentUser.uid),
          })
        } catch {
          // ignore
        }
      }

      await setDoc(
        doc(db, 'users', currentUser.uid),
        {
          activePlanId: currentUser.uid,
        },
        { merge: true },
      )

      // Reload user's personal recipes & plans
      const plansRef = collection(db, 'users', currentUser.uid, 'mealPlans')
      const plansSnap = await getDocs(plansRef)
      const loadedPlans: Record<DateKey, DayPlan> = {}
      plansSnap.forEach((d) => {
        const p = d.data() as DayPlan
        loadedPlans[p.date] = p
      })

      const recipesRef = collection(db, 'users', currentUser.uid, 'recipes')
      const recipesSnap = await getDocs(recipesRef)
      const loadedRecipes: Recipe[] = []
      recipesSnap.forEach((d) => loadedRecipes.push(d.data() as Recipe))

      setState((s) => ({
        ...s,
        activePlanId: currentUser.uid,
        sharedPlanInfo: {
          planId: currentUser.uid,
          isShared: false,
          ownerId: currentUser.uid,
          ownerName: currentUser.displayName || 'Mój profil',
          membersCount: 1,
          isOwner: true,
        },
        plans: Object.keys(loadedPlans).length > 0 ? loadedPlans : s.plans,
        recipes: loadedRecipes.length > 0 ? loadedRecipes : s.recipes,
        isSyncing: false,
      }))
    } catch (err) {
      console.error('Błąd odłączania planu:', err)
      setState((s) => ({ ...s, isSyncing: false }))
    }
  }, [state.activePlanId])

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
      scaleMealCalories,
      setGoals,
      logWeight,
      removeWeight,
      login,
      logout,
      clearAuthError,
      createOrGetShareCode,
      joinSharedPlanWithCode,
      leaveSharedPlan,
      importRecipesBulk,
    }),
    [
      state,
      saveRecipe,
      deleteRecipe,
      toggleFavorite,
      addMeal,
      removeMeal,
      updateIngredientGrams,
      scaleMealCalories,
      setGoals,
      logWeight,
      removeWeight,
      login,
      logout,
      clearAuthError,
      createOrGetShareCode,
      joinSharedPlanWithCode,
      leaveSharedPlan,
      importRecipesBulk,
    ],
  )

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>
}

export function usePlanner() {
  const ctx = useContext(PlannerContext)
  if (!ctx) throw new Error('usePlanner must be used within PlannerProvider')
  return ctx
}
