'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Droplet,
  Droplets,
  HelpCircle,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  X,
} from 'lucide-react'
import { usePlanner } from '@/lib/store'
import { formatShortDate, fromDateKey, toDateKey } from '@/lib/date'
import {
  BLOOD_SUGAR_CONTEXT_LABELS,
  formatNumber,
  getBloodSugarStatus,
  mgDlToMmol,
} from '@/lib/nutrition'
import type { BloodSugarContext, WeightEntry } from '@/lib/types'
import { cn } from '@/lib/utils'
import { SectionHeader } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'

const chartConfig = {
  bloodSugarMgDl: { label: 'Cukier (mg/dL)', color: '#ec4899' },
} satisfies ChartConfig

type FilterContext = 'all' | 'fasting' | 'postprandial' | 'before_bed' | 'random'
type FilterRange = 'all' | '14d' | '30d'

export function GlucoseView() {
  const {
    weights,
    logWeight,
    removeWeight,
    sharedPlanInfo,
    planMembers,
    selectedWeightAccountUid,
    setSelectedWeightAccountUid,
    activeMember,
  } = usePlanner()

  const id = useId()
  const [mounted, setMounted] = useState(false)
  const [date, setDate] = useState(() => toDateKey(new Date()))
  const [sugar, setSugar] = useState('')
  const [context, setContext] = useState<BloodSugarContext>('fasting')
  const [note, setNote] = useState('')
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [contextFilter, setContextFilter] = useState<FilterContext>('all')
  const [rangeFilter, setRangeFilter] = useState<FilterRange>('all')
  const [showGuidelines, setShowGuidelines] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // All entries that have a valid glucose measurement
  const allSugarEntries = useMemo(() => {
    return (weights || [])
      .filter((w) => typeof w.bloodSugarMgDl === 'number' && !Number.isNaN(w.bloodSugarMgDl))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [weights])

  // Filtered entries according to current view options
  const filteredEntries = useMemo(() => {
    let result = [...allSugarEntries]

    if (contextFilter !== 'all') {
      result = result.filter((w) => (w.bloodSugarContext || 'fasting') === contextFilter)
    }

    if (rangeFilter !== 'all') {
      const now = new Date()
      const days = rangeFilter === '14d' ? 14 : 30
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      const cutoffStr = toDateKey(cutoff)
      result = result.filter((w) => w.date >= cutoffStr)
    }

    return result
  }, [allSugarEntries, contextFilter, rangeFilter])

  // Key clinical stats
  const latestEntry = allSugarEntries.at(-1)
  const latestSugar = latestEntry?.bloodSugarMgDl
  const latestEval = latestSugar
    ? getBloodSugarStatus(latestSugar, latestEntry?.bloodSugarContext || 'fasting')
    : null

  const fastingEntries = allSugarEntries.filter((w) => (w.bloodSugarContext || 'fasting') === 'fasting')
  const avgFasting =
    fastingEntries.length > 0
      ? Math.round(
          fastingEntries.reduce((sum, w) => sum + (w.bloodSugarMgDl || 0), 0) / fastingEntries.length,
        )
      : null

  const postprandialEntries = allSugarEntries.filter((w) => w.bloodSugarContext === 'postprandial')
  const avgPostprandial =
    postprandialEntries.length > 0
      ? Math.round(
          postprandialEntries.reduce((sum, w) => sum + (w.bloodSugarMgDl || 0), 0) /
            postprandialEntries.length,
        )
      : null

  const inRangeCount = allSugarEntries.filter((w) => {
    const val = w.bloodSugarMgDl || 0
    const ctx = w.bloodSugarContext || 'fasting'
    const ev = getBloodSugarStatus(val, ctx)
    return ev.status === 'normal'
  }).length

  const inRangePercent =
    allSugarEntries.length > 0 ? Math.round((inRangeCount / allSugarEntries.length) * 100) : null

  // Chart data
  const chartData = useMemo(() => {
    return filteredEntries.map((w) => ({
      ...w,
      label: formatShortDate(fromDateKey(w.date)),
      mmol: w.bloodSugarMgDl ? mgDlToMmol(w.bloodSugarMgDl) : null,
    }))
  }, [filteredEntries])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const numSugar = Number(sugar.replace(',', '.'))
    if (!Number.isFinite(numSugar) || numSugar < 20 || numSugar > 600) {
      setError('Wpisz prawidłowy poziom cukru w przedziale 20 – 600 mg/dL.')
      return
    }

    if (!date) {
      setError('Wybierz datę pomiaru.')
      return
    }

    // Merge with any existing entry for this day so we never overwrite weight/waist
    const existing = weights.find((w) => w.date === date)
    const newEntry: WeightEntry = {
      ...(existing || {}),
      date,
      bloodSugarMgDl: Math.round(numSugar),
      bloodSugarContext: context,
      bloodSugarNote: note.trim() || undefined,
    }

    logWeight(newEntry)

    setSugar('')
    setNote('')
    setEditingDate(null)
  }

  const handleEdit = (w: WeightEntry) => {
    setDate(w.date)
    setSugar(w.bloodSugarMgDl !== undefined ? String(w.bloodSugarMgDl) : '')
    setContext(w.bloodSugarContext || 'fasting')
    setNote(w.bloodSugarNote || '')
    setEditingDate(w.date)
    setError(null)
  }

  const handleCancelEdit = () => {
    setDate(toDateKey(new Date()))
    setSugar('')
    setContext('fasting')
    setNote('')
    setEditingDate(null)
    setError(null)
  }

  const handleDelete = (dateToDelete: string) => {
    const existing = weights.find((w) => w.date === dateToDelete)
    if (!existing) return

    // If entry only had blood sugar and no weight/waist, completely delete the record
    if (typeof existing.weightKg !== 'number' && typeof existing.waistCm !== 'number' && typeof existing.hipsCm !== 'number') {
      removeWeight(dateToDelete)
    } else {
      // Remove only blood sugar fields and keep weight/measurements
      const updated: WeightEntry = {
        date: existing.date,
        weightKg: existing.weightKg,
        waistCm: existing.waistCm,
        hipsCm: existing.hipsCm,
      }
      logWeight(updated)
    }

    if (editingDate === dateToDelete) {
      handleCancelEdit()
    }
  }

  if (!mounted) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Dziennik Cukru we Krwi"
          description="Ładowanie dziennika glikemii..."
        />
        <div className="h-64 animate-pulse rounded-2xl bg-muted/40" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Dziennik Cukru we Krwi (Glikemia)"
        description="Rejestruj i monitoruj poziom glukozy na czczo, po posiłkach i przed snem zgodnie ze standardami PTD."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGuidelines((prev) => !prev)}
            className="gap-1.5 text-xs"
          >
            <HelpCircle className="size-3.5 text-pink-500" />
            {showGuidelines ? 'Ukryj normy PTD' : 'Pokaż normy glikemii (PTD)'}
          </Button>
        }
      />

      {/* Multi-Account Data Source Switcher for Shared Plans */}
      {(sharedPlanInfo?.isShared || planMembers.length > 1) && (
        <div className="rounded-2xl border border-primary/25 bg-card/90 p-4 shadow-xs backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="size-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Konto źródłowe pomiarów glikemii
                  </span>
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary px-1.5 py-0">
                    Konto współdzielone
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-foreground font-medium">
                  Pomiary cukru dla:{' '}
                  <span className="font-bold text-primary">
                    {activeMember?.displayName || 'Wybrane konto'}
                  </span>
                  {activeMember?.isCurrent && (
                    <span className="ml-1 text-xs text-muted-foreground font-normal">(Ty)</span>
                  )}
                </p>
              </div>
            </div>

            {/* Segmented Account Buttons */}
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

      {/* Clinical Guidelines Card (Toggleable) */}
      {showGuidelines && (
        <Card className="border-pink-500/30 bg-pink-500/5 p-4 transition-all">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Droplets className="size-4 text-pink-500" />
                <h3 className="text-sm font-semibold text-foreground">
                  Kryteria rozpoznawania i normy glikemii (wg Polskiego Towarzystwa Diabetologicznego)
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Standardowe zakresy stężenia glukozy w osoczu krwi żylnej i glukometrach:
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowGuidelines(false)}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
              aria-label="Zamknij wytyczne"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-1">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">Prawidłowa glikemia</span>
              <p className="text-foreground">
                • <strong>Na czczo:</strong> 70 – 99 mg/dL (3.9–5.5 mmol/L)
              </p>
              <p className="text-foreground">
                • <strong>Po posiłku (1-2h):</strong> &lt; 140 mg/dL (&lt; 7.8 mmol/L)
              </p>
            </div>

            <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 space-y-1">
              <span className="font-semibold text-orange-700 dark:text-orange-400">Stan przedcukrzycowy</span>
              <p className="text-foreground">
                • <strong>Na czczo (IFG):</strong> 100 – 125 mg/dL (5.6–6.9 mmol/L)
              </p>
              <p className="text-foreground">
                • <strong>Po posiłku (IGT):</strong> 140 – 199 mg/dL (7.8–11.0 mmol/L)
              </p>
            </div>

            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 space-y-1">
              <span className="font-semibold text-rose-700 dark:text-rose-400">Wysoki cukier / Hipoglikemia</span>
              <p className="text-foreground">
                • <strong>Cukrzyca:</strong> ≥ 126 mg/dL (na czczo) lub ≥ 200 mg/dL
              </p>
              <p className="text-foreground">
                • <strong>Hipoglikemia:</strong> &lt; 70 mg/dL (zbyt niski cukier)
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Top statistics cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Latest measurement */}
        <Card className="gap-1 p-4 border-pink-500/30 bg-gradient-to-br from-card to-pink-500/5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Ostatni pomiar</p>
            <Droplet className="size-4 text-pink-500" />
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
              {latestSugar ? `${latestSugar} mg/dL` : '—'}
            </p>
            {latestSugar && (
              <span className="text-xs text-muted-foreground tabular-nums">
                ({mgDlToMmol(latestSugar)} mmol/L)
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-xs pt-0.5">
            {latestEval ? (
              <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-md border', latestEval.badgeClass)}>
                {latestEval.label}
              </span>
            ) : (
              <span className="text-muted-foreground text-[11px]">Brak pomiarów</span>
            )}
            {latestEntry && (
              <span className="text-muted-foreground text-[11px]">
                {formatShortDate(fromDateKey(latestEntry.date))} · {BLOOD_SUGAR_CONTEXT_LABELS[latestEntry.bloodSugarContext || 'fasting']}
              </span>
            )}
          </div>
        </Card>

        {/* Fasting average */}
        <Card className="gap-1 p-4">
          <p className="text-xs font-medium text-muted-foreground">Średnia na czczo</p>
          <div className="flex items-baseline justify-between gap-1">
            <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
              {avgFasting ? `${avgFasting} mg/dL` : '—'}
            </p>
            {avgFasting && (
              <span className="text-xs text-muted-foreground tabular-nums">
                ({mgDlToMmol(avgFasting)} mmol/L)
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {fastingEntries.length > 0
              ? `${fastingEntries.length} ${fastingEntries.length === 1 ? 'pomiar' : 'pomiarów'} (norma 70–99)`
              : 'Norma na czczo: 70–99 mg/dL'}
          </p>
        </Card>

        {/* Postprandial average */}
        <Card className="gap-1 p-4">
          <p className="text-xs font-medium text-muted-foreground">Średnia po posiłkach</p>
          <div className="flex items-baseline justify-between gap-1">
            <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
              {avgPostprandial ? `${avgPostprandial} mg/dL` : '—'}
            </p>
            {avgPostprandial && (
              <span className="text-xs text-muted-foreground tabular-nums">
                ({mgDlToMmol(avgPostprandial)} mmol/L)
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {postprandialEntries.length > 0
              ? `${postprandialEntries.length} ${postprandialEntries.length === 1 ? 'pomiar' : 'pomiarów'} (norma <140)`
              : 'Norma poposiłkowa: <140 mg/dL'}
          </p>
        </Card>

        {/* Time in Range (TIR) */}
        <Card className="gap-1 p-4">
          <p className="text-xs font-medium text-muted-foreground">Pomiary w normie</p>
          <div className="flex items-baseline justify-between gap-1">
            <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
              {inRangePercent !== null ? `${inRangePercent}%` : '—'}
            </p>
            {inRangePercent !== null && (
              <CheckCircle2
                className={cn('size-4', inRangePercent >= 80 ? 'text-emerald-500' : 'text-orange-500')}
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {allSugarEntries.length > 0
              ? `${inRangeCount} z ${allSugarEntries.length} pomiarów w normie`
              : 'Wskaźnik prawidłowych wyników'}
          </p>
        </Card>
      </div>

      {/* Main Grid: Chart & Form */}
      <div className="grid items-start gap-6 lg:grid-cols-[1.8fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Droplets className="size-4 text-pink-500" />
                Wykres Poziomu Cukru we Krwi
              </CardTitle>
              <CardDescription>
                Poziomy referencyjne: dolna norma (70 mg/dL), limit na czczo (99 mg/dL), limit po posiłku (140 mg/dL).
              </CardDescription>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-1">
              <Button
                variant={contextFilter === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setContextFilter('all')}
              >
                Wszystkie
              </Button>
              <Button
                variant={contextFilter === 'fasting' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setContextFilter('fasting')}
              >
                Na czczo
              </Button>
              <Button
                variant={contextFilter === 'postprandial' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setContextFilter('postprandial')}
              >
                Po posiłku
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {chartData.length < 2 ? (
              <div className="py-20 text-center space-y-3">
                <Droplet className="size-10 mx-auto text-pink-500/50" />
                <p className="text-sm font-medium text-foreground">
                  Zapisz co najmniej dwa pomiary cukru, aby zobaczyć wykres trendu glikemii.
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Wprowadź wynik z glukometru w formularzu obok, aby obserwować wahania cukru i reakcję organizmu na posiłki.
                </p>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
                <AreaChart data={chartData} margin={{ left: 4, right: 12, top: 12, bottom: 4 }}>
                  <defs>
                    <linearGradient id="fillSugarView" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                  <YAxis
                    domain={[
                      (min: number) => Math.max(40, Math.floor(Math.min(min, 65) - 5)),
                      (max: number) => Math.ceil(Math.max(max, 145) + 10),
                    ]}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null
                      const item = payload[0].payload as (typeof chartData)[0]
                      const val = item.bloodSugarMgDl || 0
                      const ctx = item.bloodSugarContext || 'fasting'
                      const evalResult = getBloodSugarStatus(val, ctx)
                      return (
                        <div className="rounded-lg border bg-background/95 p-2.5 shadow-md text-xs space-y-1">
                          <div className="font-semibold text-foreground">{item.label} ({item.date})</div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base text-pink-600 tabular-nums">{val} mg/dL</span>
                            <span className="text-muted-foreground">({mgDlToMmol(val)} mmol/L)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium border', evalResult.badgeClass)}>
                              {evalResult.label}
                            </span>
                            <span className="text-muted-foreground text-[11px] font-medium">
                              · {BLOOD_SUGAR_CONTEXT_LABELS[ctx] || ctx}
                            </span>
                          </div>
                          {item.bloodSugarNote && (
                            <p className="text-muted-foreground text-[11px] italic pt-0.5">„{item.bloodSugarNote}”</p>
                          )}
                        </div>
                      )
                    }}
                  />
                  {/* Reference Lines based on Polish Diabetes Association Guidelines */}
                  <ReferenceLine
                    y={70}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{ value: 'Dolna norma (70)', position: 'insideBottomLeft', fill: '#d97706', fontSize: 10 }}
                  />
                  <ReferenceLine
                    y={99}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    label={{ value: 'Norma na czczo (99)', position: 'insideTopLeft', fill: '#059669', fontSize: 10 }}
                  />
                  <ReferenceLine
                    y={140}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    label={{ value: 'Max po posiłku (140)', position: 'insideTopRight', fill: '#dc2626', fontSize: 10 }}
                  />
                  <Area
                    dataKey="bloodSugarMgDl"
                    type="monotone"
                    stroke="#ec4899"
                    strokeWidth={2.5}
                    fill="url(#fillSugarView)"
                    dot={{ r: 4, fill: '#ec4899', strokeWidth: 1.5, stroke: '#fff' }}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Form: Add or Edit Blood Sugar Record */}
        <div className="space-y-6">
          <Card className="border-pink-500/25">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-1.5">
                <Plus className="size-4 text-pink-500" />
                {editingDate ? `Edycja pomiaru (${formatShortDate(fromDateKey(editingDate))})` : 'Dodaj pomiar cukru'}
              </CardTitle>
              {editingDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="h-7 px-2 text-xs text-muted-foreground"
                >
                  <X className="mr-1 size-3" /> Anuluj
                </Button>
              )}
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {(sharedPlanInfo?.isShared || planMembers.length > 1) && (
                  <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                    <span className="text-muted-foreground">Konto dla pomiaru:</span>
                    <span className="font-semibold text-primary flex items-center gap-1.5">
                      <User className="size-3.5" />
                      {activeMember?.displayName || 'Wybrane konto'}
                    </span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor={`${id}-glucose-date`}>Data pomiaru</Label>
                  <Input
                    id={`${id}-glucose-date`}
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${id}-glucose-val`} className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Droplets className="size-3.5 text-pink-500" /> Wynik z glukometru (mg/dL)
                    </Label>
                    {sugar.trim() && Number.isFinite(Number(sugar.replace(',', '.'))) && (
                      <span className="text-xs font-semibold text-pink-600 dark:text-pink-400">
                        ≈ {mgDlToMmol(Number(sugar.replace(',', '.')))} mmol/L
                      </span>
                    )}
                  </div>
                  <Input
                    id={`${id}-glucose-val`}
                    inputMode="numeric"
                    placeholder="np. 92"
                    value={sugar}
                    onChange={(e) => setSugar(e.target.value)}
                    className="text-lg font-semibold tabular-nums"
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`${id}-glucose-ctx`}>Moment pomiaru (kontekst)</Label>
                  <select
                    id={`${id}-glucose-ctx`}
                    value={context}
                    onChange={(e) => setContext(e.target.value as BloodSugarContext)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="fasting">Na czczo (po przebudzeniu)</option>
                    <option value="postprandial">Po posiłku (1–2h)</option>
                    <option value="before_bed">Przed snem</option>
                    <option value="random">W ciągu dnia (losowy)</option>
                  </select>
                </div>

                {/* Real-time clinical feedback badge */}
                {sugar.trim() && Number.isFinite(Number(sugar.replace(',', '.'))) && (
                  <div>
                    {(() => {
                      const val = Number(sugar.replace(',', '.'))
                      if (val < 20 || val > 600) return null
                      const evalRes = getBloodSugarStatus(val, context)
                      return (
                        <div className={cn('flex items-center gap-2 rounded-xl border p-2.5 text-xs', evalRes.badgeClass)}>
                          <span className="font-bold">{evalRes.label}:</span>
                          <span>{evalRes.description}</span>
                        </div>
                      )
                    })()}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor={`${id}-glucose-note`} className="text-xs">
                    Notatka (opcjonalnie)
                  </Label>
                  <Input
                    id={`${id}-glucose-note`}
                    placeholder="np. po owsiance z orzechami, przed snem"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={100}
                    className="text-xs"
                  />
                </div>

                {error && (
                  <p role="alert" className="text-sm text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="size-4 shrink-0" />
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold">
                  {editingDate ? 'Zaktualizuj pomiar cukru' : 'Zapisz pomiar cukru'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* History List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Historia pomiarów cukru</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {allSugarEntries.length} {allSugarEntries.length === 1 ? 'wpis' : 'wpisów'}
                </span>
              </CardTitle>
              <CardDescription>
                Wszystkie zarejestrowane pomiary stężenia glukozy we krwi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allSugarEntries.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  Brak zarejestrowanych pomiarów cukru.
                </p>
              ) : (
                <ul className="max-h-80 divide-y overflow-y-auto pr-1">
                  {[...allSugarEntries].reverse().map((w) => {
                    const evalRes = getBloodSugarStatus(w.bloodSugarMgDl || 0, w.bloodSugarContext || 'fasting')
                    return (
                      <li key={w.date} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{formatShortDate(fromDateKey(w.date))}</span>
                            <span className="font-bold tabular-nums text-pink-600 dark:text-pink-400">
                              {w.bloodSugarMgDl} mg/dL
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              ({mgDlToMmol(w.bloodSugarMgDl || 0)} mmol/L)
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-md border', evalRes.badgeClass)}>
                              {evalRes.label}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-medium">
                              · {BLOOD_SUGAR_CONTEXT_LABELS[w.bloodSugarContext || 'fasting'] || w.bloodSugarContext}
                            </span>
                            {w.bloodSugarNote && (
                              <span className="text-[11px] text-muted-foreground italic truncate max-w-[180px]">
                                „{w.bloodSugarNote}”
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleEdit(w)}
                            aria-label={`Edytuj pomiar cukru z ${formatShortDate(fromDateKey(w.date))}`}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(w.date)}
                            aria-label={`Usuń pomiar cukru z ${formatShortDate(fromDateKey(w.date))}`}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
