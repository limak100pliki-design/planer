'use client'

import { useId, useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { usePlanner } from '@/lib/store'
import { MEAL_SLOTS } from '@/lib/nutrition'
import type { Ingredient, MealSlot, Nutrition, Recipe } from '@/lib/types'
import { cn } from '@/lib/utils'
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
import { Textarea } from '@/components/ui/textarea'

interface DraftIngredient {
  id: string
  name: string
  grams: string
  kcal: string
  protein: string
  carbs: string
  fat: string
}

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random()))

const emptyIngredient = (): DraftIngredient => ({
  id: `ing-${newId()}`,
  name: '',
  grams: '100',
  kcal: '',
  protein: '',
  carbs: '',
  fat: '',
})

const toDraft = (i: Ingredient): DraftIngredient => ({
  id: i.id,
  name: i.name,
  grams: String(i.grams),
  kcal: String(i.per100g.kcal),
  protein: String(i.per100g.protein),
  carbs: String(i.per100g.carbs),
  fat: String(i.per100g.fat),
})

const num = (v: string) => {
  const parsed = Number(v.replace(',', '.'))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

export function RecipeFormDialog({
  open,
  recipe,
  onOpenChange,
}: {
  open: boolean
  recipe: Recipe | null
  onOpenChange: (open: boolean) => void
}) {
  const { recipes, saveRecipe } = usePlanner()
  const formId = useId()
  const [name, setName] = useState(recipe?.name ?? '')
  const [prepTime, setPrepTime] = useState(String(recipe?.prepTimeMin ?? 15))
  const [mealTypes, setMealTypes] = useState<MealSlot[]>(recipe?.mealTypes ?? [])
  const [description, setDescription] = useState(recipe?.description ?? '')
  const [pochodzenie, setPochodzenie] = useState(recipe?.pochodzenie ?? '')
  const [ingredients, setIngredients] = useState<DraftIngredient[]>(
    recipe?.ingredients.map(toDraft) ?? [emptyIngredient()],
  )
  const [error, setError] = useState<string | null>(null)

  const knownIngredients = useMemo(() => {
    const map = new Map<string, Nutrition>()
    for (const r of recipes) for (const i of r.ingredients) map.set(i.name.toLowerCase(), i.per100g)
    return map
  }, [recipes])
  const knownNames = useMemo(() => {
    const set = new Set<string>()
    for (const r of recipes) for (const i of r.ingredients) set.add(i.name)
    return [...set].sort((a, b) => a.localeCompare(b, 'pl'))
  }, [recipes])

  const updateIngredient = (id: string, patch: Partial<DraftIngredient>) => {
    setIngredients((list) =>
      list.map((i) => {
        if (i.id !== id) return i
        const next = { ...i, ...patch }
        if (patch.name !== undefined) {
          const known = knownIngredients.get(patch.name.toLowerCase())
          if (known) {
            next.kcal = String(known.kcal)
            next.protein = String(known.protein)
            next.carbs = String(known.carbs)
            next.fat = String(known.fat)
          }
        }
        return next
      }),
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validIngredients = ingredients.filter((i) => i.name.trim())
    if (!name.trim()) return setError('Podaj nazwę przepisu.')
    if (validIngredients.length === 0) return setError('Dodaj co najmniej jeden składnik.')
    if (!description.trim()) return setError('Uzupełnij opis przyrządzenia.')

    saveRecipe({
      id: recipe?.id ?? `rec-${newId()}`,
      name: name.trim(),
      prepTimeMin: Math.round(num(prepTime)),
      mealTypes,
      description: description.trim(),
      createdAt: recipe?.createdAt ?? new Date().toISOString(),
      pochodzenie: pochodzenie.trim(),
      czyUlubiony: recipe?.czyUlubiony ?? false,
      ingredients: validIngredients.map((i) => ({
        id: i.id,
        name: i.name.trim(),
        grams: num(i.grams),
        per100g: { kcal: num(i.kcal), protein: num(i.protein), carbs: num(i.carbs), fat: num(i.fat) },
      })),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{recipe ? 'Edytuj przepis' : 'Nowy przepis'}</DialogTitle>
          <DialogDescription>Wartości odżywcze składników podawaj na 100 g produktu.</DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-name`}>Nazwa</Label>
              <Input
                id={`${formId}-name`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. Owsianka z jabłkiem"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-time`}>Czas (min)</Label>
              <Input
                id={`${formId}-time`}
                type="number"
                min={0}
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
              />
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Rodzaj posiłku</legend>
            <div className="flex flex-wrap gap-2">
              {MEAL_SLOTS.map(({ key, label }) => {
                const active = mealTypes.includes(key)
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setMealTypes((t) => (active ? t.filter((x) => x !== key) : [...t, key]))
                    }
                    className={cn(
                      'rounded-full border px-3 py-1 text-sm transition-colors',
                      active ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Składniki</legend>
            <datalist id={`${formId}-known`}>
              {knownNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <div className="hidden grid-cols-[minmax(0,1fr)_72px_64px_56px_56px_56px_32px] gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:grid">
              <span>Nazwa</span>
              <span>Ilość g</span>
              <span>kcal</span>
              <span>Białko</span>
              <span>Węgl.</span>
              <span>Tłuszcz</span>
              <span className="sr-only">Akcje</span>
            </div>
            <ul className="space-y-3 md:space-y-2">
              {ingredients.map((ing, idx) => (
                <li
                  key={ing.id}
                  className="grid grid-cols-4 gap-2 rounded-lg border p-3 md:grid-cols-[minmax(0,1fr)_72px_64px_56px_56px_56px_32px] md:border-0 md:p-0"
                >
                  <Input
                    aria-label={`Nazwa składnika ${idx + 1}`}
                    list={`${formId}-known`}
                    value={ing.name}
                    onChange={(e) => updateIngredient(ing.id, { name: e.target.value })}
                    placeholder="Składnik"
                    className="col-span-3 md:col-span-1"
                  />
                  <Input
                    aria-label={`Ilość w gramach, składnik ${idx + 1}`}
                    inputMode="decimal"
                    value={ing.grams}
                    onChange={(e) => updateIngredient(ing.id, { grams: e.target.value })}
                    className="tabular-nums"
                  />
                  {(['kcal', 'protein', 'carbs', 'fat'] as const).map((field) => (
                    <Input
                      key={field}
                      aria-label={`${{ kcal: 'Kalorie', protein: 'Białko', carbs: 'Węglowodany', fat: 'Tłuszcze' }[field]} na 100 g, składnik ${idx + 1}`}
                      placeholder={{ kcal: 'kcal', protein: 'B', carbs: 'W', fat: 'T' }[field]}
                      inputMode="decimal"
                      value={ing[field]}
                      onChange={(e) => updateIngredient(ing.id, { [field]: e.target.value })}
                      className="tabular-nums"
                    />
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setIngredients((list) => list.filter((i) => i.id !== ing.id))}
                    aria-label={`Usuń składnik ${idx + 1}`}
                    disabled={ingredients.length === 1}
                    className="col-start-4 row-start-1 justify-self-end md:col-auto md:row-auto"
                  >
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIngredients((list) => [...list, emptyIngredient()])}
            >
              <Plus data-icon="inline-start" />
              Dodaj składnik
            </Button>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-desc`}>Opis przyrządzenia</Label>
            <Textarea
              id={`${formId}-desc`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder={'Każdy krok w nowej linii, np.\nUgotuj płatki w mleku.\nDodaj owoce.'}
            />
            <p className="text-xs text-muted-foreground">Każda linia to osobny krok.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-source`}>Pochodzenie</Label>
            <Input
              id={`${formId}-source`}
              value={pochodzenie}
              onChange={(e) => setPochodzenie(e.target.value)}
              placeholder="np. link do strony lub „Kuchnia polska”, s. 42"
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground">Opcjonalne – skąd pochodzi przepis.</p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button type="submit" form={formId}>
            Zapisz przepis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
