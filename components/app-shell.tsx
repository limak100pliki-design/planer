'use client'

import { useEffect, useState } from 'react'
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  Check,
  Cloud,
  Copy,
  ExternalLink,
  Leaf,
  Loader2,
  LogIn,
  LogOut,
  Scale,
  ShoppingBasket,
  Target,
  UserCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePlanner } from '@/lib/store'
import { MealPlanner } from '@/components/planner/meal-planner'
import { RecipesView } from '@/components/recipes/recipes-view'
import { SettingsView } from '@/components/settings/settings-view'
import { WeightView } from '@/components/weight/weight-view'
import { ShoppingView } from '@/components/shopping/shopping-view'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
  const [copiedDomain, setCopiedDomain] = useState(false)
  const { user, login, logout, isLoadingAuth, isSyncing, authError, clearAuthError } = usePlanner()

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentSection = SECTIONS.find((s) => s.id === active)!
  const ActiveComponent = currentSection.component

  const copyDomain = async (domain: string) => {
    try {
      await navigator.clipboard.writeText(domain)
      setCopiedDomain(true)
      setTimeout(() => setCopiedDomain(false), 2000)
    } catch {
      // fallback
    }
  }

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

        {/* User Account & Firebase Cloud Sync Box */}
        <div className="mt-auto border-t p-3">
          {isLoadingAuth ? (
            <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Ładowanie konta...
            </div>
          ) : user ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center gap-2.5">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Użytkownik'}
                    className="size-8 rounded-full border border-primary/30 object-cover"
                  />
                ) : (
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {user.displayName || 'Użytkownik'}
                  </p>
                  <p className="flex items-center gap-1 text-[11px] text-primary">
                    <Cloud className="size-3" />
                    {isSyncing ? 'Synchronizacja...' : 'Zsynchronizowano'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="mt-2.5 h-7 w-full justify-start text-xs text-muted-foreground hover:text-destructive"
              >
                <LogOut className="size-3.5" data-icon="inline-start" />
                Wyloguj się
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border/80 bg-muted/40 p-3">
              <p className="text-xs font-medium text-foreground">Synchronizacja w chmurze</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Zaloguj się kontem Google, aby zapisać dane w Firestore (tryb oszczędzania limitów).
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={login}
                className="mt-2.5 h-8 w-full gap-1.5 text-xs font-medium"
              >
                <LogIn className="size-3.5" />
                Zaloguj przez Google
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <Brand compact />
        <div className="flex items-center gap-2">
          {user ? (
            <button
              type="button"
              onClick={logout}
              title={`Zalogowano jako ${user.displayName || user.email}. Kliknij aby wylogować.`}
              className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary"
            >
              <UserCheck className="size-3" />
              <span className="max-w-[100px] truncate">{user.displayName?.split(' ')[0] || 'Konto'}</span>
            </button>
          ) : (
            <Button variant="outline" size="sm" onClick={login} className="h-7 gap-1 px-2 text-xs">
              <LogIn className="size-3" />
              Zaloguj
            </Button>
          )}

          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {currentSection.shortLabel}
          </span>
        </div>
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

      {/* Auth Error Diagnostic Modal */}
      <Dialog open={authError !== null} onOpenChange={(open) => !open && clearAuthError()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="size-5" />
              <DialogTitle>
                {authError?.isUnauthorizedDomain
                  ? 'Wymagana autoryzacja domeny'
                  : authError?.isPopupBlocked
                    ? 'Okno logowania zablokowane'
                    : 'Informacja o logowaniu'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-left text-xs leading-relaxed text-muted-foreground">
              {authError?.isUnauthorizedDomain ? (
                <>
                  Google Firebase wymaga jednorazowego dodania domeny Twojej aplikacji do listy zaufanych domen, aby zezwolić na logowanie.
                </>
              ) : authError?.isPopupBlocked ? (
                <>
                  Twoja przeglądarka zablokowała wyskakujące okno logowania Google. Zezwól na wyskakujące okna dla tej witryny w pasku adresu.
                </>
              ) : (
                authError?.message || 'Nie udało się ukończyć logowania.'
              )}
            </DialogDescription>
          </DialogHeader>

          {authError?.isUnauthorizedDomain && (
            <div className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs">
              <div>
                <p className="font-semibold text-foreground">Domena do autoryzacji:</p>
                <div className="mt-1 flex items-center justify-between rounded-lg border bg-background px-2.5 py-1.5 font-mono text-xs">
                  <span>{authError.domain || 'twoja-domena.pages.dev'}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyDomain(authError.domain)}
                    className="h-6 gap-1 px-2 text-[11px]"
                  >
                    {copiedDomain ? <Check className="size-3 text-primary" /> : <Copy className="size-3" />}
                    {copiedDomain ? 'Skopiowano' : 'Kopiuj'}
                  </Button>
                </div>
              </div>

              <div className="space-y-1 text-muted-foreground">
                <p className="font-semibold text-foreground">Jak to zrobić w 1 minutę:</p>
                <ol className="list-inside list-decimal space-y-1">
                  <li>Kliknij przycisk poniżej, aby otworzyć konsolę Firebase.</li>
                  <li>W sekcji <strong>Authorized domains</strong> kliknij <strong>Add domain</strong>.</li>
                  <li>Wklej skopiowaną powyżej domenę i kliknij <strong>Add</strong>.</li>
                </ol>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            {authError?.isUnauthorizedDomain && (
              <Button asChild variant="default" size="sm" className="gap-1.5">
                <a
                  href={`https://console.firebase.google.com/project/${authError.projectId}/authentication/settings`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-3.5" />
                  Otwórz ustawienia Firebase
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={clearAuthError}>
              Zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
