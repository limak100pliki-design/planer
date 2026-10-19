'use client'

import { useId, useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { usePlanner } from '@/lib/store'
import { addDays, eachDateKey, startOfWeek, toDateKey } from '@/lib/date'
import { formatWeight, MEAL_SLOTS } from '@/lib/nutrition'
import { cn } from '@/lib/utils'
import { SectionHeader } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ShoppingItem {
  key: string
  name: string
  grams: number
  usedIn: number
}

function rangeForWeek(offsetWeeks: number) {
  const start = addDays(startOfWeek(new Date()), offsetWeeks * 7)
  return { from: toDateKey(start), to: toDateKey(addDays(start, 6)) }
}

export function ShoppingView() {
  const { plans } = usePlanner()
  const id = useId()
  const [range, setRange] = useState(() => rangeForWeek(0))
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  const { items, mealCount } = useMemo(() => {
    const map = new Map<string, ShoppingItem>()
    let meals = 0
    for (const key of eachDateKey(range.from, range.to)) {
      const plan = plans[key]
      if (!plan) continue
      for (const { key: slot } of MEAL_SLOTS) {
        for (const meal of plan.meals[slot]) {
          meals++
          for (const ing of meal.ingredients) {
            const k = ing.name.trim().toLowerCase()
            const existing = map.get(k)
            if (existing) {
              existing.grams += ing.grams
              existing.usedIn++
            } else {
              map.set(k, { key: k, name: ing.name, grams: ing.grams, usedIn: 1 })
            }
          }
        }
      }
    }
    return {
      items: [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'pl')),
      mealCount: meals,
    }
  }, [plans, range])

  const toggle = (key: string) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const presets = [
    { label: 'Ten tydzień', ...rangeForWeek(0) },
    { label: 'Następny tydzień', ...rangeForWeek(1) },
    { label: 'Poprzedni tydzień', ...rangeForWeek(-1) },
  ]

  const remaining = items.filter((i) => !checked.has(i.key))

  const copyList = async () => {
    const text = remaining.map((i) => `- ${i.name}: ${formatWeight(i.grams)}`).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div>
      <SectionHeader
        title="Lista Zakupów"
        description="Zsumowane składniki ze wszystkich posiłków zaplanowanych w wybranym okresie."
        actions={
          <Button variant="outline" onClick={copyList} disabled={remaining.length === 0}>
            {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
            {copied ? 'Skopiowano' : 'Kopiuj listę'}
          </Button>
        }
      />

      <Card className="mb-6 gap-4 p-5">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => {
            const active = p.from === range.from && p.to === range.to
            return (
              <button
                key={p.label}
                type="button"
                aria-pressed={active}
                onClick={() => setRange({ from: p.from, to: p.to })}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm transition-colors',
                  active ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                {p.label}
              </button>
            )
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-[200px_200px_1fr] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-from`}>Od</Label>
            <Input
              id={`${id}-from`}
              type="date"
              value={range.from}
              max={range.to}
              onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-to`}>Do</Label>
            <Input
              id={`${id}-to`}
              type="date"
              value={range.to}
              min={range.from}
              onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))}
            />
          </div>
          <p className="text-sm text-muted-foreground sm:text-right" role="status">
            {mealCount} posiłków · {items.length} produktów
          </p>
        </div>
      </Card>

      {items.length === 0 ? (
        <Card className="items-center p-10 text-center text-sm text-muted-foreground">
          Brak zaplanowanych posiłków w wybranym okresie.
        </Card>
      ) : (
        <Card className="gap-0 p-0">
          <ul className="divide-y">
            {items.map((item) => {
              const done = checked.has(item.key)
              const inputId = `${id}-${item.key}`
              return (
                <li key={item.key}>
                  <label
                    htmlFor={inputId}
                    className="flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={done}
                      onChange={() => toggle(item.key)}
                      className="size-4 shrink-0 accent-primary"
                    />
                    <span className={cn('flex-1 text-sm', done && 'text-muted-foreground line-through')}>
                      {item.name}
                      <span className="ml-2 text-xs text-muted-foreground no-underline">
                        w {item.usedIn} {item.usedIn === 1 ? 'posiłku' : 'posiłkach'}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'text-sm font-semibold tabular-nums',
                        done && 'font-normal text-muted-foreground line-through',
                      )}
                    >
                      {formatWeight(item.grams)}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
