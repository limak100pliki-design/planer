'use client'

import { useId, useMemo, useRef, useState, useEffect } from 'react'
import {
  Clock,
  Filter,
  Heart,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
  Utensils,
  X,
} from 'lucide-react'
import { usePlanner } from '@/lib/store'
import { ingredientsNutrition, MEAL_SLOT_LABEL, MEAL_SLOTS } from '@/lib/nutrition'
import type { MealSlot, Recipe } from '@/lib/types'
import { SectionHeader, MacroPills } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ExpandChevron, RecipeInstructions } from '@/components/recipe-instructions'
import { cn } from '@/lib/utils'
import { RecipeDetailDialog } from './recipe-detail-dialog'
import { RecipeFormDialog } from './recipe-form-dialog'

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'l')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function RecipesView() {
  const { recipes, toggleFavorite } = usePlanner()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchInputId = useId()

  const [query, setQuery] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<MealSlot | 'all'>('all')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Recipe | null | 'new'>(null)

  const favoritesCount = recipes.filter((r) => r.czyUlubiony).length

  // Keyboard shortcut: pressing '/' focuses the search bar
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Extract top popular ingredients for quick filter chips
  const popularIngredients = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of recipes) {
      for (const ing of r.ingredients) {
        const clean = ing.name.trim()
        map.set(clean, (map.get(clean) || 0) + 1)
      }
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name]) => name)
  }, [recipes])

  // Filter recipes by query (normalized for Polish diacritics), meal slot, and favorite status
  const { filtered, matchingIngredientMap } = useMemo(() => {
    const normalizedQuery = normalizeText(query)
    const matchingIngMap = new Map<string, string[]>()

    const results = recipes.filter((recipe) => {
      // Favorite filter
      if (onlyFavorites && !recipe.czyUlubiony) return false

      // Meal slot filter
      if (selectedSlot !== 'all' && !recipe.mealTypes.includes(selectedSlot)) return false

      // Query filter (name OR ingredient name)
      if (!normalizedQuery) return true

      const nameMatch = normalizeText(recipe.name).includes(normalizedQuery)
      const matchedIngredients = recipe.ingredients
        .filter((ing) => normalizeText(ing.name).includes(normalizedQuery))
        .map((ing) => ing.name)

      if (matchedIngredients.length > 0) {
        matchingIngMap.set(recipe.id, matchedIngredients)
      }

      return nameMatch || matchedIngredients.length > 0
    })

    return { filtered: results, matchingIngredientMap: matchingIngMap }
  }, [recipes, query, selectedSlot, onlyFavorites])

  const hasActiveFilters = Boolean(query.trim() || selectedSlot !== 'all' || onlyFavorites)

  const clearAllFilters = () => {
    setQuery('')
    setSelectedSlot('all')
    setOnlyFavorites(false)
    searchInputRef.current?.focus()
  }

  const viewing = recipes.find((r) => r.id === viewingId) ?? null

  return (
    <div>
      <SectionHeader
        title="Moje Przepisy"
        description="Baza Twoich przepisów z wartościami odżywczymi, składnikami i opisem przyrządzenia."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus data-icon="inline-start" />
            Nowy przepis
          </Button>
        }
      />

      {/* Main Search and Filters Bar Card */}
      <Card className="mb-6 p-4 sm:p-5">
        <div className="flex flex-col gap-3.5">
          {/* Search Input Row */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id={searchInputId}
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Szukaj po nazwie przepisu lub składniku (np. kurczak, jajko, łosoś)…"
                aria-label="Szukaj przepisów po nazwie lub składniku"
                className="h-10 pl-9 pr-20 text-sm"
              />
              <div className="absolute top-1/2 right-2.5 flex -translate-y-1/2 items-center gap-1.5">
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('')
                      searchInputRef.current?.focus()
                    }}
                    aria-label="Wyczyść pole wyszukiwania"
                    className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                ) : (
                  <kbd className="hidden rounded border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
                    /
                  </kbd>
                )}
              </div>
            </div>

            {/* Favorite Filter Toggle Button */}
            <Button
              type="button"
              variant={onlyFavorites ? 'default' : 'outline'}
              aria-pressed={onlyFavorites}
              onClick={() => setOnlyFavorites((v) => !v)}
              className="h-10 shrink-0 self-start sm:self-auto"
            >
              <Heart
                data-icon="inline-start"
                className={cn('size-4', onlyFavorites && 'fill-current text-primary-foreground')}
              />
              Tylko ulubione
              <span
                className={cn(
                  'ml-1.5 rounded-full px-1.5 py-0.2 text-xs tabular-nums',
                  onlyFavorites ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground',
                )}
              >
                {favoritesCount}
              </span>
            </Button>
          </div>

          {/* Meal Slot Filter Tabs & Popular Ingredient Suggestions */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t pt-3">
            {/* Meal Slot Pills */}
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtruj wg typu posiłku">
              <span className="mr-1 text-xs font-medium text-muted-foreground">Posiłek:</span>
              <button
                type="button"
                onClick={() => setSelectedSlot('all')}
                aria-pressed={selectedSlot === 'all'}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  selectedSlot === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                Wszystkie
              </button>
              {MEAL_SLOTS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedSlot(selectedSlot === key ? 'all' : key)}
                  aria-pressed={selectedSlot === key}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                    selectedSlot === key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Popular Ingredient Quick Chips */}
            {popularIngredients.length > 0 && (
              <div className="hidden items-center gap-1.5 xl:flex">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Tag className="size-3" aria-hidden="true" />
                  Szybkie składniki:
                </span>
                <div className="flex flex-wrap gap-1">
                  {popularIngredients.map((ingName) => {
                    const isSelected = query.toLowerCase() === ingName.toLowerCase()
                    return (
                      <button
                        key={ingName}
                        type="button"
                        onClick={() => setQuery(isSelected ? '' : ingName)}
                        className={cn(
                          'rounded-md border px-2 py-0.5 text-[11px] transition-colors',
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary font-medium'
                            : 'border-border/60 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
                        )}
                      >
                        {ingName}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Active Search & Filter Status Feedback */}
      {hasActiveFilters && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
          <p role="status">
            Znaleziono <strong className="font-semibold text-foreground">{filtered.length}</strong>{' '}
            {filtered.length === 1 ? 'przepis' : filtered.length >= 2 && filtered.length <= 4 ? 'przepisy' : 'przepisów'}
            {query && (
              <>
                {' '}dla zapytania „<span className="font-semibold text-foreground">{query}</span>”
              </>
            )}
            {selectedSlot !== 'all' && (
              <>
                {' '}w kategorii <span className="font-semibold text-foreground">{MEAL_SLOT_LABEL[selectedSlot]}</span>
              </>
            )}
            {onlyFavorites && ' (tylko ulubione)'}
          </p>

          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 text-xs text-muted-foreground hover:text-foreground">
            <RotateCcw className="size-3.5" data-icon="inline-start" />
            Wyczyść filtry
          </Button>
        </div>
      )}

      {/* Recipe List or Empty State */}
      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Search className="size-6" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-foreground">Brak pasujących przepisów</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {query
              ? `Nie znaleźliśmy żadnego przepisu pasującego do „${query}”. Spróbuj innego składnika lub nazwy.`
              : onlyFavorites
                ? 'Nie masz jeszcze ulubionych przepisów w tej kategorii. Dodaj przepis do ulubionych klikając serce.'
                : 'Brak przepisów spełniających wybrane kryteria.'}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-4">
              <RotateCcw className="size-3.5" data-icon="inline-start" />
              Pokaż wszystkie przepisy
            </Button>
          )}
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              matchedIngredients={matchingIngredientMap.get(recipe.id)}
              onToggleFavorite={() => toggleFavorite(recipe.id)}
              onOpenDetails={() => setViewingId(recipe.id)}
            />
          ))}
        </ul>
      )}

      <RecipeDetailDialog
        recipe={viewing}
        onOpenChange={(open) => !open && setViewingId(null)}
        onEdit={(r) => {
          setViewingId(null)
          setEditing(r)
        }}
      />
      <RecipeFormDialog
        key={editing === 'new' ? 'new' : (editing?.id ?? 'closed')}
        open={editing !== null}
        recipe={editing === 'new' ? null : editing}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </div>
  )
}

function RecipeCard({
  recipe,
  matchedIngredients,
  onToggleFavorite,
  onOpenDetails,
}: {
  recipe: Recipe
  matchedIngredients?: string[]
  onToggleFavorite: () => void
  onOpenDetails: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const panelId = `recipe-instructions-${recipe.id}`

  return (
    <li
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-card p-5 transition-colors',
        expanded ? 'border-primary/40' : 'hover:border-primary/40',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap gap-1.5">
          {recipe.mealTypes.map((t) => (
            <Badge key={t} variant="secondary">
              {MEAL_SLOT_LABEL[t]}
            </Badge>
          ))}
        </div>
        {matchedIngredients && matchedIngredients.length > 0 && (
          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-[10px]">
            Składnik: {matchedIngredients.join(', ')}
          </Badge>
        )}
      </div>

      <div className="flex items-start gap-1">
        <h2 className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={panelId}
            className="-mx-1 flex w-full items-start justify-between gap-3 rounded-md px-1 text-left font-semibold leading-snug outline-none transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="text-pretty">{recipe.name}</span>
            <ExpandChevron open={expanded} className="mt-0.5" />
          </button>
        </h2>
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-pressed={recipe.czyUlubiony}
          aria-label={recipe.czyUlubiony ? `Usuń „${recipe.name}” z ulubionych` : `Dodaj „${recipe.name}” do ulubionych`}
          title={recipe.czyUlubiony ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
          className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-md outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Heart
            aria-hidden="true"
            className={cn(
              'size-4 transition-[color,fill,transform] duration-200 active:scale-90',
              recipe.czyUlubiony ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground',
            )}
          />
        </button>
      </div>

      <p className="line-clamp-2 text-sm text-muted-foreground">
        {recipe.ingredients.map((i) => i.name).join(', ')}
      </p>

      <RecipeInstructions id={panelId} open={expanded} text={recipe.description} source={recipe.pochodzenie} />

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <MacroPills nutrition={ingredientsNutrition(recipe.ingredients)} />
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" aria-hidden="true" />
            {recipe.prepTimeMin} min
          </span>
          <Button variant="ghost" size="sm" onClick={onOpenDetails}>
            Szczegóły
          </Button>
        </div>
      </div>
    </li>
  )
}
