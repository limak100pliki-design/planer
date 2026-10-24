'use client'

import { useEffect, useId, useState } from 'react'
import { Check, User, Users } from 'lucide-react'
import { usePlanner } from '@/lib/store'
import { formatNumber, goalsInGrams } from '@/lib/nutrition'
import type { Goals } from '@/lib/types'
import { cn } from '@/lib/utils'
import { SectionHeader } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SharePlanDialog } from '@/components/planner/share-plan-dialog'
import { PWAInstallButton } from '@/components/pwa-install-button'

const PRESETS: { label: string; protein: number; carbs: number; fat: number }[] = [
  { label: 'Zbilansowana', protein: 25, carbs: 50, fat: 25 },
  { label: 'Wysokobiałkowa', protein: 35, carbs: 40, fat: 25 },
  { label: 'Niskowęglowodanowa', protein: 30, carbs: 20, fat: 50 },
  { label: 'Sportowa', protein: 25, carbs: 55, fat: 20 },
]

const MACROS = [
  { key: 'proteinPct', label: 'Białko', color: 'bg-protein', kcalPerG: 4 },
  { key: 'carbsPct', label: 'Węglowodany', color: 'bg-carbs', kcalPerG: 4 },
  { key: 'fatPct', label: 'Tłuszcze', color: 'bg-fat', kcalPerG: 9 },
] as const

export function SettingsView() {
  const {
    goals,
    setGoals,
    sharedPlanInfo,
    planMembers,
    selectedWeightAccountUid,
    setSelectedWeightAccountUid,
    activeMember,
  } = usePlanner()
  const [draft, setDraft] = useState<Goals>(goals)
  const [saved, setSaved] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const id = useId()

  // Keep draft in sync if user changes selected account
  useEffect(() => {
    setDraft(goals)
    setSaved(false)
  }, [goals])

  const pctSum = draft.proteinPct + draft.carbsPct + draft.fatPct
  const valid = pctSum === 100 && draft.kcal >= 800 && draft.kcal <= 6000
  const grams = goalsInGrams(draft)
  const dirty = JSON.stringify(draft) !== JSON.stringify(goals)

  const update = (patch: Partial<Goals>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setSaved(false)
  }

  return (
    <div>
      <SectionHeader
        title="Cele i Parametry"
        description="Ustaw dzienne zapotrzebowanie kaloryczne, rozkład makroskładników oraz docelową wagę."
      />

      {/* Account Switcher for Goals & Measurements on Shared Account */}
      {(sharedPlanInfo?.isShared || planMembers.length > 1) && (
        <div className="mb-6 rounded-2xl border border-primary/25 bg-card/90 p-4 shadow-xs backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="size-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Konto dla celów dietetycznych i wagowych
                  </span>
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary px-1.5 py-0">
                    Konto współdzielone
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-foreground font-medium">
                  Konfigurujesz cele i wskaźniki dla:{' '}
                  <span className="font-bold text-primary">
                    {activeMember?.displayName || 'Wybrane konto'}
                  </span>
                  {activeMember?.isCurrent && (
                    <span className="ml-1 text-xs text-muted-foreground font-normal">(Ty)</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/80 bg-muted/40 p-1">
              {planMembers.map((member) => {
                const isSelected = member.uid === selectedWeightAccountUid
                return (
                  <button
                    key={member.uid}
                    type="button"
                    onClick={() => setSelectedWeightAccountUid(member.uid)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                      isSelected
                        ? 'bg-background text-primary shadow-xs font-semibold ring-1 ring-border/50'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                    )}
                  >
                    <User className="size-3.5" />
                    <span>{member.displayName}</span>
                    {member.isCurrent && (
                      <span className="text-[10px] opacity-75 font-normal">(Ty)</span>
                    )}
                    {isSelected && <Check className="size-3 text-primary ml-0.5" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          setGoals(draft)
          setSaved(true)
        }}
        className="grid gap-6 lg:grid-cols-[1fr_1.2fr]"
      >
        <Card>
          <CardHeader>
            <CardTitle>Cel kaloryczny</CardTitle>
            <CardDescription>Dzienna ilość energii z posiłków.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-kcal`}>Kalorie dziennie (kcal)</Label>
              <Input
                id={`${id}-kcal`}
                type="number"
                min={800}
                max={6000}
                step={50}
                value={draft.kcal}
                onChange={(e) => update({ kcal: Number(e.target.value) || 0 })}
                className="h-10 text-lg tabular-nums"
              />
              {(draft.kcal < 800 || draft.kcal > 6000) && (
                <p className="text-xs text-destructive">Podaj wartość od 800 do 6000 kcal.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-weight`}>Docelowa waga (kg)</Label>
              <Input
                id={`${id}-weight`}
                type="number"
                min={30}
                max={250}
                step={0.5}
                value={draft.targetWeightKg}
                onChange={(e) => update({ targetWeightKg: Number(e.target.value) || 0 })}
                className="tabular-nums"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rozkład makroskładników</CardTitle>
            <CardDescription>Procent energii z każdego makroskładnika — suma musi wynosić 100%.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => {
                const active =
                  draft.proteinPct === p.protein && draft.carbsPct === p.carbs && draft.fatPct === p.fat
                return (
                  <button
                    key={p.label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => update({ proteinPct: p.protein, carbsPct: p.carbs, fatPct: p.fat })}
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

            <div className="flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              {MACROS.map((m) => (
                <div key={m.key} className={cn(m.color, 'transition-[width]')} style={{ width: `${draft[m.key]}%` }} />
              ))}
            </div>

            <div className="space-y-4">
              {MACROS.map((m) => {
                const g = m.key === 'proteinPct' ? grams.protein : m.key === 'carbsPct' ? grams.carbs : grams.fat
                return (
                  <div key={m.key} className="grid grid-cols-[1fr_auto] items-center gap-3 sm:grid-cols-[140px_1fr_96px]">
                    <Label htmlFor={`${id}-${m.key}`} className="flex items-center gap-2">
                      <span className={cn('size-2.5 rounded-full', m.color)} aria-hidden="true" />
                      {m.label}
                    </Label>
                    <input
                      type="range"
                      aria-label={`${m.label} — suwak`}
                      min={5}
                      max={70}
                      value={draft[m.key]}
                      onChange={(e) => update({ [m.key]: Number(e.target.value) })}
                      className="col-span-2 order-last accent-primary sm:order-none sm:col-span-1"
                    />
                    <div className="relative">
                      <Input
                        id={`${id}-${m.key}`}
                        type="number"
                        min={0}
                        max={100}
                        value={draft[m.key]}
                        onChange={(e) => update({ [m.key]: Number(e.target.value) || 0 })}
                        className="pr-7 text-right tabular-nums"
                      />
                      <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-foreground">
                        %
                      </span>
                    </div>
                    <p className="col-span-2 -mt-2 text-xs text-muted-foreground tabular-nums sm:col-span-2 sm:col-start-2 sm:mt-0">
                      {formatNumber(g)} g dziennie · {formatNumber(g * m.kcalPerG)} kcal
                    </p>
                  </div>
                )
              })}
            </div>

            <div
              className={cn(
                'flex items-center justify-between rounded-lg px-3 py-2 text-sm tabular-nums',
                pctSum === 100 ? 'bg-secondary text-secondary-foreground' : 'bg-destructive/10 text-destructive',
              )}
              role="status"
            >
              <span>Suma</span>
              <span className="font-semibold">{pctSum}%</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 lg:col-span-2">
          {saved && !dirty && (
            <span className="inline-flex items-center gap-1.5 text-sm text-primary" role="status">
              <Check className="size-4" aria-hidden="true" />
              Zapisano zmiany
            </span>
          )}
          <Button type="button" variant="outline" disabled={!dirty} onClick={() => setDraft(goals)}>
            Przywróć
          </Button>
          <Button type="submit" disabled={!valid || !dirty} size="lg">
            Zapisz cele
          </Button>
        </div>
      </form>

      {/* Multi-Account Shared Plan Card */}
      <Card className="mt-8 border-primary/20 bg-card">
        <CardHeader className="sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="size-5 text-primary" />
              Współdzielenie Planu i Łączenie Kont
            </CardTitle>
            <CardDescription>
              Możesz zalogować się na 2 lub więcej kont Google i korzystać z dokładnie jednego wspólnego planu.
            </CardDescription>
          </div>
          <Badge
            variant={sharedPlanInfo?.isShared ? 'default' : 'secondary'}
            className="w-fit text-xs font-medium"
          >
            {sharedPlanInfo?.isShared
              ? `Wspólny plan (${sharedPlanInfo.membersCount} konta)`
              : 'Indywidualny plan'}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed sm:text-sm">
            Idealne rozwiązanie dla par, rodzin lub osób korzystających z kilku urządzeń (np. telefon i komputer).
            Wystarczy wygenerować kod parowania na jednym koncie, a na drugim wpisać go, aby oba konta natychmiast widziały i wspólnie edytowały te same posiłki, przepisy oraz listę zakupów.
          </p>

          {(sharedPlanInfo?.isShared || planMembers.length > 1) && (
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-2.5">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Users className="size-3.5 text-primary" />
                Połączone profile w tym planie:
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {planMembers.map((member) => {
                  const isSelected = member.uid === selectedWeightAccountUid
                  return (
                    <div
                      key={member.uid}
                      className={cn(
                        'flex items-center justify-between rounded-lg border p-2.5 text-xs transition-colors',
                        isSelected ? 'border-primary/40 bg-primary/5' : 'border-border/60 bg-background',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <User className="size-3.5" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{member.displayName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {member.isOwner ? 'Właściciel planu' : 'Członek planu'}
                            {member.isCurrent && ' · Twoje konto'}
                          </p>
                        </div>
                      </div>
                      {isSelected ? (
                        <Badge variant="default" className="text-[10px] py-0.5 px-2">
                          Aktywny
                        </Badge>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedWeightAccountUid(member.uid)}
                          className="h-7 text-xs px-2.5 text-primary border-primary/30"
                        >
                          Wybierz
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShareModalOpen(true)}
              className="gap-2 text-xs font-medium"
            >
              <Users className="size-4 text-primary" />
              {sharedPlanInfo?.isShared
                ? 'Zarządzaj wspólnym planem i kodem'
                : 'Połącz z innym kontem / Wygeneruj kod'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PWA Phone Install Card */}
      <div className="mt-6">
        <PWAInstallButton variant="card" />
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
        <span>Planer Posiłków — Wersja <strong className="font-semibold text-foreground">v2.0.0</strong> (PWA Android / iOS)</span>
        <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Stała sesja i tryb offline aktywne
        </span>
      </div>

      <SharePlanDialog open={shareModalOpen} onOpenChange={setShareModalOpen} />
    </div>
  )
}
