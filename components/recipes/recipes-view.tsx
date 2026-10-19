'use client'

import { useMemo, useState } from 'react'
import { Clock, Heart, Plus, Search } from 'lucide-react'
import { usePlanner } from '@/lib/store'
import { ingredientsNutrition, MEAL_SLOT_LABEL } from '@/lib/nutrition'
import type { Recipe } from '@/lib/types'
import { SectionHeader, MacroPills } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ExpandChevron, RecipeInstructions } from '@/components/recipe-instructions'
import { cn } from '@/lib/utils'
import { RecipeDetailDialog } from './recipe-detail-dialog'
import { RecipeFormDialog } from './recipe-form-dialog'

export function RecipesView() {
  const { recipes, toggleFavorite } = usePlanner()
  const [query, setQuery] = useState('')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Recipe | null | 'new'>(null)

  const favoritesCount = recipes.filter((r) => r.czyUlubiony).length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return recipes.filter((r) => {
      if (onlyFavorites && !r.czyUlubiony) return false
      if (!q) return true
      return r.name.toLowerCase().includes(q) || r.ingredients.some((i) => i.name.toLowerCase().includes(q))
    })
  }, [recipes, query, onlyFavorites])

  const viewing = recipes.find((r) => r.id === viewingId) ?? null

  return (
    <div>
      <SectionHeader
        title="Moje Przepisy"
        description="Baza Twoich przepisów z wartościami odżywczymi i opisem przyrządzenia."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus data-icon="inline-start" />
            Nowy przepis
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj po nazwie lub składniku…"
            aria-label="Szukaj przepisów"
            className="pl-8"
          />
        </div>
        <Button
          type="button"
          variant={onlyFavorites ? 'default' : 'outline'}
          aria-pressed={onlyFavorites}
          onClick={() => setOnlyFavorites((v) => !v)}
          className="self-start sm:self-auto"
        >
          <Heart data-icon="inline-start" className={cn(onlyFavorites && 'fill-current')} />
          Tylko ulubione
          <span
            className={cn(
              'ml-1 rounded-full px-1.5 text-xs tabular-nums',
              onlyFavorites ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground',
            )}
          >
            {favoritesCount}
          </span>
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="items-center p-10 text-center text-sm text-muted-foreground">
          {onlyFavorites && favoritesCount === 0
            ? 'Nie masz jeszcze ulubionych przepisów. Kliknij serce przy przepisie, aby go dodać.'
            : 'Brak przepisów spełniających kryteria.'}
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
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
  onToggleFavorite,
  onOpenDetails,
}: {
  recipe: Recipe
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
      <div className="flex flex-wrap gap-1.5">
        {recipe.mealTypes.map((t) => (
          <Badge key={t} variant="secondary">
            {MEAL_SLOT_LABEL[t]}
          </Badge>
        ))}
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
