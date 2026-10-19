'use client'

import { useEffect, useState } from 'react'
import { BookOpen, CalendarDays, Leaf, Scale, ShoppingBasket, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MealPlanner } from '@/components/planner/meal-planner'
import { RecipesView } from '@/components/recipes/recipes-view'
import { SettingsView } from '@/components/settings/settings-view'
import { WeightView } from '@/components/weight/weight-view'
import { ShoppingView } from '@/components/shopping/shopping-view'

const SECTIONS = [
  { id: 'planer', label: 'Planer Posiłków', shortLabel: 'Planer', icon: CalendarDays, component: MealPlanner },
  { id: 'przepisy', label: 'Moje Przepisy', shortLabel: 'Przepisy', icon: BookOpen, component: RecipesView },
  { id: 'cele', label: 'Cele i Parametry', shortLabel: 'Cele', icon: Target, component: SettingsView },
  { id: 'waga', label: 'Monitor Wagi', shortLabel: 'Waga', icon: Scale, component: WeightView },
  { id: 'zakupy', label: 'Lista Zakupów', shortLabel: 'Zakupy', icon: ShoppingBasket, component: ShoppingView },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

export function AppShell() {
  const [active, setActive] = useState<SectionId>('planer')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentSection = SECTIONS.find((s) => s.id === active)!
  const ActiveComponent = currentSection.component

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      {/* Desktop Sidebar */}
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
          Dane demonstracyjne. Gotowe do synchronizacji z Cloudflare Pages i bazą danych.
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <Brand compact />
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {currentSection.shortLabel}
        </span>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 sm:px-6 lg:px-10 lg:py-10 lg:pb-10">
        {mounted ? (
          <ActiveComponent />
        ) : (
          <div className="space-y-6 animate-pulse">
            <div className="h-9 w-64 rounded-lg bg-muted" />
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-muted" />
              ))}
            </div>
            <div className="h-44 rounded-2xl bg-muted" />
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="h-64 rounded-xl bg-muted" />
              <div className="h-64 rounded-xl bg-muted" />
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (thumb-friendly for smartphones) */}
      <nav
        aria-label="Nawigacja mobilna"
        className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 px-2 py-1.5 backdrop-blur lg:hidden supports-[padding:max(0px)]:pb-[max(0.375rem,env(safe-area-inset-bottom))]"
      >
        <ul className="flex items-center justify-around">
          {SECTIONS.map((section) => {
            const Icon = section.icon
            const isSelected = active === section.id
            return (
              <li key={section.id} className="flex-1">
                <button
                  type="button"
                  onClick={() => setActive(section.id)}
                  aria-current={isSelected ? 'page' : undefined}
                  className={cn(
                    'flex w-full flex-col items-center justify-center gap-1 rounded-xl py-1 text-center transition-colors',
                    isSelected
                      ? 'text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-8 items-center justify-center rounded-full transition-colors',
                      isSelected ? 'bg-primary/15 text-primary' : 'hover:bg-muted',
                    )}
                  >
                    <Icon className="size-4.5" />
                  </span>
                  <span className="text-[10px] leading-tight tracking-tight">
                    {section.shortLabel}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', compact ? 'py-1' : 'px-5 py-4')}>
      <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground sm:size-9">
        <Leaf className="size-4.5 sm:size-5" aria-hidden="true" />
      </span>
      <div className="leading-tight">
        <p className="font-semibold tracking-tight text-sm sm:text-base">Talerz</p>
        {!compact && <p className="text-xs text-muted-foreground">Planer diety</p>}
      </div>
    </div>
  )
}

function NavButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
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
