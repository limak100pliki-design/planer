import { POLISH_FOOD_DATABASE } from './nutrition-database'
import type { Nutrition, Recipe } from './types'

export interface IngredientSuggestion {
  id: string
  name: string
  per100g: Nutrition
  source: 'local' | 'recipe' | 'api'
  category?: string
  brand?: string
}

function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'l')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Searches local verified database and previous recipes with 0ms latency
 */
export function searchLocalIngredients(
  query: string,
  userRecipes: Recipe[] = [],
): IngredientSuggestion[] {
  const q = normalizeSearch(query)
  if (!q || q.length < 2) return []

  const results: IngredientSuggestion[] = []
  const seenNames = new Set<string>()

  // 1. Search user's own existing recipe ingredients first
  for (const r of userRecipes) {
    for (const ing of r.ingredients) {
      const clean = ing.name.trim()
      const norm = normalizeSearch(clean)
      const key = clean.toLowerCase()
      if (norm.includes(q) && !seenNames.has(key)) {
        seenNames.add(key)
        results.push({
          id: `recipe-${ing.id}`,
          name: clean,
          per100g: { ...ing.per100g },
          source: 'recipe',
          category: 'Z Twoich przepisów',
        })
      }
    }
  }

  // 2. Search comprehensive Polish food staple database
  for (const item of POLISH_FOOD_DATABASE) {
    const normName = normalizeSearch(item.name)
    const matchesName = normName.includes(q)
    const matchesAlias = item.aliases?.some((a) => normalizeSearch(a).includes(q))

    const key = item.name.toLowerCase()
    if ((matchesName || matchesAlias) && !seenNames.has(key)) {
      seenNames.add(key)
      results.push({
        id: item.id,
        name: item.name,
        per100g: item.per100g,
        source: 'local',
        category: item.category,
      })
    }
  }

  return results.slice(0, 8)
}

/**
 * Searches Open Food Facts API for live nutritional database results
 */
export async function searchOpenFoodFacts(query: string): Promise<IngredientSuggestion[]> {
  const q = query.trim()
  if (!q || q.length < 2) return []

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)

    const url = `https://pl.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
      q,
    )}&search_simple=1&action=process&json=1&page_size=6&fields=product_name,nutriments,brands,categories`

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) return []

    const data = await response.json()
    const products = data?.products || []

    const results: IngredientSuggestion[] = []
    const seenNames = new Set<string>()

    for (const p of products) {
      const name = (p.product_name || '').trim()
      if (!name) continue

      const key = name.toLowerCase()
      if (seenNames.has(key)) continue
      seenNames.add(key)

      const nutriments = p.nutriments || {}
      // Open Food Facts has various naming conventions for calories and macros
      const kcal =
        Number(nutriments['energy-kcal_100g']) ||
        Number(nutriments['energy-kcal']) ||
        Number(nutriments['energy-kcal_value']) ||
        (nutriments['energy_100g'] ? Math.round(Number(nutriments['energy_100g']) / 4.184) : 0)

      const protein = Number(nutriments['proteins_100g']) || Number(nutriments['proteins']) || 0
      const carbs = Number(nutriments['carbohydrates_100g']) || Number(nutriments['carbohydrates']) || 0
      const fat = Number(nutriments['fat_100g']) || Number(nutriments['fat']) || 0

      // Only include products with valid nutritional data
      if (kcal > 0 || protein > 0 || carbs > 0 || fat > 0) {
        results.push({
          id: `off-${p._id || Math.random().toString(36)}`,
          name,
          per100g: {
            kcal: Math.round(kcal),
            protein: Math.round(protein * 10) / 10,
            carbs: Math.round(carbs * 10) / 10,
            fat: Math.round(fat * 10) / 10,
          },
          source: 'api',
          brand: p.brands ? p.brands.split(',')[0].trim() : undefined,
          category: 'Open Food Facts',
        })
      }
    }

    return results
  } catch (error) {
    console.warn('[Nutrition API] Zapytanie do Open Food Facts nie powiodło się lub przekroczyło limit czasu:', error)
    return []
  }
}
