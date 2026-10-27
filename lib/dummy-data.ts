import { addDays, startOfWeek, toDateKey } from './date'
import { emptyDayPlan, MEAL_SLOTS } from './nutrition'
import type {
  DateKey,
  DayPlan,
  Ingredient,
  MealSlot,
  Nutrition,
  PlannedMeal,
  Recipe,
  UserProfile,
  WeightEntry,
} from './types'

const n = (kcal: number, protein: number, carbs: number, fat: number): Nutrition => ({
  kcal,
  protein,
  carbs,
  fat,
})

const ING = {
  owsiane: { name: 'Płatki owsiane', per100g: n(379, 13.2, 67.7, 6.5) },
  mleko: { name: 'Mleko 2%', per100g: n(50, 3.4, 4.8, 2) },
  banan: { name: 'Banan', per100g: n(89, 1.1, 22.8, 0.3) },
  maslo: { name: 'Masło orzechowe', per100g: n(588, 25, 20, 50) },
  jajko: { name: 'Jajko kurze', per100g: n(143, 12.6, 0.7, 9.5) },
  chleb: { name: 'Chleb żytni pełnoziarnisty', per100g: n(259, 8.5, 48, 3.3) },
  pomidor: { name: 'Pomidor', per100g: n(18, 0.9, 3.9, 0.2) },
  awokado: { name: 'Awokado', per100g: n(160, 2, 8.5, 14.7) },
  jogurt: { name: 'Jogurt grecki 2%', per100g: n(73, 10, 3.6, 2) },
  borowki: { name: 'Borówki amerykańskie', per100g: n(57, 0.7, 14.5, 0.3) },
  orzechy: { name: 'Orzechy włoskie', per100g: n(654, 15.2, 13.7, 65.2) },
  kurczak: { name: 'Pierś z kurczaka', per100g: n(110, 23, 0, 1.5) },
  ryz: { name: 'Ryż basmati (suchy)', per100g: n(351, 8, 78, 0.6) },
  brokul: { name: 'Brokuł', per100g: n(34, 2.8, 6.6, 0.4) },
  oliwa: { name: 'Oliwa z oliwek', per100g: n(884, 0, 0, 100) },
  losos: { name: 'Łosoś atlantycki', per100g: n(208, 20, 0, 13) },
  ziemniaki: { name: 'Ziemniaki', per100g: n(77, 2, 17, 0.1) },
  szpinak: { name: 'Szpinak', per100g: n(23, 2.9, 3.6, 0.4) },
  makaron: { name: 'Makaron pełnoziarnisty (suchy)', per100g: n(348, 13, 72, 2.5) },
  passata: { name: 'Passata pomidorowa', per100g: n(32, 1.5, 5.5, 0.2) },
  wolowina: { name: 'Wołowina mielona chuda', per100g: n(176, 20, 0, 10) },
  twarog: { name: 'Twaróg półtłusty', per100g: n(133, 18.7, 3.7, 4.7) },
  rzodkiewka: { name: 'Rzodkiewka', per100g: n(16, 0.7, 3.4, 0.1) },
  tortilla: { name: 'Tortilla pełnoziarnista', per100g: n(290, 9, 48, 7) },
  hummus: { name: 'Hummus', per100g: n(166, 8, 14, 9.6) },
  ogorek: { name: 'Ogórek', per100g: n(15, 0.7, 3.6, 0.1) },
  papryka: { name: 'Papryka czerwona', per100g: n(31, 1, 6, 0.3) },
  mozzarella: { name: 'Mozzarella light', per100g: n(165, 20, 1.5, 9) },
  jablko: { name: 'Jabłko', per100g: n(52, 0.3, 14, 0.2) },
} as const

type IngKey = keyof typeof ING

const ing = (key: IngKey, grams: number): Ingredient => ({
  id: `ing-${key}`,
  name: ING[key].name,
  grams,
  per100g: { ...ING[key].per100g },
})

export const DUMMY_RECIPES: Recipe[] = [
  {
    id: 'rec-owsianka-banan',
    name: 'Owsianka z bananem i masłem orzechowym',
    prepTimeMin: 10,
    mealTypes: ['sniadanie'],
    createdAt: '2026-09-01T08:00:00.000Z',
    pochodzenie: 'https://www.kwestiasmaku.com/przepis/owsianka-z-bananem',
    czyUlubiony: true,
    ingredients: [ing('owsiane', 60), ing('mleko', 250), ing('banan', 100), ing('maslo', 15)],
    description:
      'Wsyp płatki owsiane do garnka i zalej mlekiem.\nGotuj na małym ogniu 4–5 minut, często mieszając.\nPrzełóż do miski, dodaj pokrojonego w plasterki banana.\nNa wierzch nałóż masło orzechowe.',
  },
  {
    id: 'rec-jajecznica-awokado',
    name: 'Jajecznica na chlebie żytnim z awokado',
    prepTimeMin: 12,
    mealTypes: ['sniadanie', 'kolacja'],
    createdAt: '2026-09-02T08:00:00.000Z',
    pochodzenie: 'Przepis własny',
    czyUlubiony: false,
    ingredients: [ing('jajko', 120), ing('chleb', 70), ing('awokado', 50), ing('pomidor', 80)],
    description:
      'Rozbij jajka do miski i lekko roztrzep widelcem.\nSmaż na rozgrzanej patelni na małym ogniu, delikatnie mieszając.\nPokrój chleb i posmaruj rozgniecionym awokado.\nPołóż jajecznicę na chlebie, podawaj z pokrojonym pomidorem.',
  },
  {
    id: 'rec-jogurt-borowki',
    name: 'Jogurt grecki z borówkami i orzechami',
    prepTimeMin: 3,
    mealTypes: ['drugieSniadanie'],
    createdAt: '2026-09-03T08:00:00.000Z',
    pochodzenie: 'Książka „Jadłonomia”, s. 34',
    czyUlubiony: true,
    ingredients: [ing('jogurt', 200), ing('borowki', 80), ing('orzechy', 15)],
    description:
      'Przełóż jogurt do miseczki.\nDodaj umyte borówki.\nPosyp posiekanymi orzechami włoskimi.',
  },
  {
    id: 'rec-twarozek-rzodkiewka',
    name: 'Twarożek z rzodkiewką i chlebem',
    prepTimeMin: 7,
    mealTypes: ['drugieSniadanie', 'kolacja'],
    createdAt: '2026-09-04T08:00:00.000Z',
    pochodzenie: 'Przepis babci Krysi',
    czyUlubiony: false,
    ingredients: [ing('twarog', 150), ing('rzodkiewka', 60), ing('ogorek', 60), ing('chleb', 50)],
    description:
      'Rozgnieć twaróg widelcem.\nPokrój rzodkiewkę i ogórek w drobną kostkę i wymieszaj z twarogiem.\nDopraw solą i pieprzem.\nPodawaj z kromką chleba.',
  },
  {
    id: 'rec-kurczak-ryz',
    name: 'Kurczak z ryżem i brokułami',
    prepTimeMin: 25,
    mealTypes: ['obiad'],
    createdAt: '2026-09-05T08:00:00.000Z',
    pochodzenie: 'https://aniagotuje.pl/przepis/kurczak-z-ryzem',
    czyUlubiony: true,
    ingredients: [ing('kurczak', 150), ing('ryz', 70), ing('brokul', 150), ing('oliwa', 10)],
    description:
      'Ugotuj ryż zgodnie z instrukcją na opakowaniu.\nPierś z kurczaka pokrój w kostkę i dopraw ulubionymi przyprawami.\nSmaż kurczaka na oliwie ok. 8 minut, aż będzie złocisty.\nBrokuła podziel na różyczki i gotuj na parze 5 minut.\nPodawaj wszystko razem.',
  },
  {
    id: 'rec-losos-ziemniaki',
    name: 'Łosoś z ziemniakami i szpinakiem',
    prepTimeMin: 30,
    mealTypes: ['obiad'],
    createdAt: '2026-09-06T08:00:00.000Z',
    pochodzenie: 'Książka „Zdrowa kuchnia na co dzień”, rozdz. 5',
    czyUlubiony: false,
    ingredients: [ing('losos', 130), ing('ziemniaki', 250), ing('szpinak', 100), ing('oliwa', 5)],
    description:
      'Ziemniaki obierz i ugotuj w osolonej wodzie do miękkości.\nŁososia dopraw solą, pieprzem i sokiem z cytryny.\nPiecz łososia w 200°C przez 15 minut.\nSzpinak podsmaż krótko na oliwie z czosnkiem.\nPodawaj łososia z ziemniakami i szpinakiem.',
  },
  {
    id: 'rec-bolognese',
    name: 'Makaron pełnoziarnisty bolognese',
    prepTimeMin: 30,
    mealTypes: ['obiad'],
    createdAt: '2026-09-07T08:00:00.000Z',
    pochodzenie: 'https://www.kwestiasmaku.com/przepis/spaghetti-bolognese',
    czyUlubiony: false,
    ingredients: [ing('makaron', 80), ing('wolowina', 120), ing('passata', 200), ing('oliwa', 5)],
    description:
      'Ugotuj makaron al dente.\nNa oliwie podsmaż mięso mielone, rozbijając grudki.\nDodaj passatę, oregano, bazylię, sól i pieprz.\nDuś sos 15 minut na małym ogniu.\nWymieszaj z makaronem i podawaj.',
  },
  {
    id: 'rec-wrap-hummus',
    name: 'Wrap z hummusem i warzywami',
    prepTimeMin: 8,
    mealTypes: ['kolacja'],
    createdAt: '2026-09-08T08:00:00.000Z',
    pochodzenie: 'Przepis własny',
    czyUlubiony: false,
    ingredients: [
      ing('tortilla', 60),
      ing('hummus', 50),
      ing('papryka', 60),
      ing('ogorek', 50),
      ing('mozzarella', 40),
    ],
    description:
      'Podgrzej tortillę na suchej patelni.\nPosmaruj ją równomiernie hummusem.\nUłóż pokrojoną paprykę, ogórek i mozzarellę.\nZawiń ciasno i przekrój na pół.',
  },
  {
    id: 'rec-jablko-maslo',
    name: 'Jabłko z masłem orzechowym',
    prepTimeMin: 2,
    mealTypes: ['drugieSniadanie'],
    createdAt: '2026-09-09T08:00:00.000Z',
    pochodzenie: '',
    czyUlubiony: false,
    ingredients: [ing('jablko', 180), ing('maslo', 20)],
    description: 'Pokrój jabłko w ósemki.\nPodawaj z masłem orzechowym do maczania.',
  },
]

export const DUMMY_PROFILE: UserProfile = {
  uid: 'demo-user',
  displayName: 'Anna (Ty)',
  goals: {
    kcal: 2100,
    proteinPct: 25,
    carbsPct: 50,
    fatPct: 25,
    targetWeightKg: 76,
  },
}

export const DUMMY_PARTNER_PROFILE: UserProfile = {
  uid: 'demo-partner',
  displayName: 'Piotr (Partner)',
  goals: {
    kcal: 2550,
    proteinPct: 30,
    carbsPct: 45,
    fatPct: 25,
    targetWeightKg: 84,
  },
}

let mealCounter = 0

export function plannedMealFromRecipe(recipe: Recipe, id?: string): PlannedMeal {
  return {
    id: id ?? `meal-${Date.now().toString(36)}-${(mealCounter++).toString(36)}`,
    recipeId: recipe.id,
    recipeName: recipe.name,
    ingredients: recipe.ingredients.map((i) => ({ ...i, per100g: { ...i.per100g } })),
  }
}

const ROTATION: Record<MealSlot, string[]> = {
  sniadanie: ['rec-owsianka-banan', 'rec-jajecznica-awokado'],
  drugieSniadanie: ['rec-jogurt-borowki', 'rec-jablko-maslo', 'rec-twarozek-rzodkiewka'],
  obiad: ['rec-kurczak-ryz', 'rec-losos-ziemniaki', 'rec-bolognese'],
  kolacja: ['rec-wrap-hummus', 'rec-twarozek-rzodkiewka', 'rec-jajecznica-awokado'],
}

/** Generates plans keyed by 'YYYY-MM-DD' — same shape as the mealPlans collection. */
export function generateDummyPlans(today: Date): Record<DateKey, DayPlan> {
  const recipesById = new Map(DUMMY_RECIPES.map((r) => [r.id, r]))
  const plans: Record<DateKey, DayPlan> = {}
  const weekStart = startOfWeek(today)

  for (let offset = -7; offset < 7; offset++) {
    const date = addDays(weekStart, offset)
    const key = toDateKey(date)
    const plan = emptyDayPlan(key)
    const dayIndex = offset + 7

    for (const { key: slot } of MEAL_SLOTS) {
      // Leave the last days of the current week partially planned.
      if (offset >= 4 && (slot === 'kolacja' || slot === 'drugieSniadanie')) continue
      const options = ROTATION[slot]
      const recipe = recipesById.get(options[dayIndex % options.length])
      if (recipe) plan.meals[slot].push(plannedMealFromRecipe(recipe, `meal-${key}-${slot}`))
    }
    plans[key] = plan
  }
  return plans
}

export function generateDummyWeights(today: Date): WeightEntry[] {
  const entries: WeightEntry[] = []
  const noise = [0.2, -0.1, 0.3, 0, -0.2, 0.1, 0.25, -0.15, 0.05, -0.05, 0.15, 0]
  let i = 0
  for (let daysAgo = 42; daysAgo >= 0; daysAgo -= 3) {
    const progress = (42 - daysAgo) / 42
    const weight = 82.6 - progress * 2.4 + noise[i % noise.length]
    const waist = 88.5 - progress * 3.2 + noise[(i + 2) % noise.length]
    const hips = 103.0 - progress * 2.5 + noise[(i + 4) % noise.length]
    entries.push({
      date: toDateKey(addDays(today, -daysAgo)),
      weightKg: Math.round(weight * 10) / 10,
      waistCm: Math.round(waist * 10) / 10,
      hipsCm: Math.round(hips * 10) / 10,
    })
    i++
  }
  return entries
}

export function generateDummyPartnerWeights(today: Date): WeightEntry[] {
  const entries: WeightEntry[] = []
  const noise = [-0.2, 0.1, -0.1, 0.3, -0.3, 0.2, -0.1, 0.15, -0.05, 0.1]
  let i = 0
  for (let daysAgo = 42; daysAgo >= 0; daysAgo -= 3) {
    const progress = (42 - daysAgo) / 42
    const weight = 92.4 - progress * 3.6 + noise[i % noise.length]
    const waist = 96.0 - progress * 4.2 + noise[(i + 2) % noise.length]
    const hips = 105.5 - progress * 2.8 + noise[(i + 4) % noise.length]
    entries.push({
      date: toDateKey(addDays(today, -daysAgo)),
      weightKg: Math.round(weight * 10) / 10,
      waistCm: Math.round(waist * 10) / 10,
      hipsCm: Math.round(hips * 10) / 10,
    })
    i++
  }
  return entries
}
