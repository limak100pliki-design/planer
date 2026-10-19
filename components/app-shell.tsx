'use client'

import { useState } from 'react'
import { BookOpen, CalendarDays, Leaf, Scale, ShoppingBasket, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MealPlanner } from '@/components/planner/meal-planner'
import { RecipesView } from '@/components/recipes/recipes-view'
import { SettingsView } from '@/components/settings/settings-view'
import { WeightView } from '@/components/weight/weight-view'
import { ShoppingView } from '@/components/shopping/shopping-view'

const SECTIONS = [
  { id: 'planer', label: 'Planer Posiłków', icon: CalendarDays, component: MealPlanner },
  { id: 'przepisy', label: 'Moje Przepisy', icon: BookOpen, component: RecipesView },
  { id: 'cele', label: 'Cele i Parametry', icon: Target, component: SettingsView },
  { id: 'waga', label: 'Monitor Wagi', icon: Scale, component: WeightView },
  { id: 'zakupy', label: 'Lista Zakupów', icon: ShoppingBasket, component: ShoppingView },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

export function AppShell() {
  const [active, setActive] = useState<SectionId>('planer')
  const ActiveComponent = SECTIONS.find((s) => s.id === active)!.component

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <Brand />
        <nav aria-label="Główna nawigacja" className="flex flex-col gap-1 px-3 py-4">
          {SECTIONS.map((section) => (
            <NavButton
              key={section.id}
              label={section.label}
              icon={section.icon}
              active={active === section.id}
              onClick={() => setActive(section.id)}
            />
          ))}
        </nav>
        <div className="mt-auto border-t p-4 text-xs leading-relaxed text-muted-foreground">
          Dane demonstracyjne. Struktura gotowa do synchronizacji z Firebase Firestore.
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur lg:hidden">
        <Brand />
        <nav aria-label="Główna nawigacja" className="flex gap-1 overflow-x-auto px-3 pb-3">
          {SECTIONS.map((section) => (
            <NavButton
              key={section.id}
              label={section.label}
              icon={section.icon}
              active={active === section.id}
              onClick={() => setActive(section.id)}
              compact
            />
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <ActiveComponent />
      </main>
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-4">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Leaf className="size-5" aria-hidden="true" />
      </span>
      <div className="leading-tight">
        <p className="font-semibold tracking-tight">Talerz</p>
        <p className="text-xs text-muted-foreground">Planer diety</p>
      </div>
    </div>
  )
}

function NavButton({
  label,
  icon: Icon,
  active,
  onClick,
  compact,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
  onClick: () => void
  compact?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex shrink-0 items-center gap-3 rounded-lg text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        compact ? 'px-3 py-2' : 'px-3 py-2.5',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  )
}
