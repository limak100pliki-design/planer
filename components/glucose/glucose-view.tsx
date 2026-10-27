'use client'

import { useId, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Droplet,
  Info,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  X,
} from 'lucide-react'
import { usePlanner } from '@/lib/store'
import { fromDateKey, toDateKey } from '@/lib/date'
import { formatNumber } from '@/lib/nutrition'
import { cn } from '@/lib/utils'
import { SectionHeader } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  classifyGlucose,
  estimateHbA1c,
  GLUCOSE_CONTEXT_LABELS,
  mgDlToMmol,
  mmolToMgDl,
  type GlucoseClassification,
} from '@/lib/glucose'
import type { DateKey, GlucoseContext, GlucoseEntry, MealSlot } from '@/lib/types'

type TimeframeOption = '7' | '14' | '30' | 'all'
type UnitOption = 'mg/dL' | 'mmol/L'

export function GlucoseView() {
  const {
    glucoseLogs,
    logGlucose,
    removeGlucose,
    sharedPlanInfo,
    planMembers,
    selectedWeightAccountUid,
    setSelectedWeightAccountUid,
    activeMember,
  } = usePlanner()

  const id = useId()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<GlucoseEntry | null>(null)
  const [timeframe, setTimeframe] = useState<TimeframeOption>('14')
  const [unit, setUnit] = useState<UnitOption>('mg/dL')

  // Form State
  const [formDate, setFormDate] = useState(() => toDateKey(new Date()))
  const [formTime, setFormTime] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [formValue, setFormValue] = useState('')
  const [formContext, setFormContext] = useState<GlucoseContext>('na_czczo')
  const [formMealSlot, setFormMealSlot] = useState<MealSlot | 'none'>('none')
  const [formNote, setFormNote] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  // Filtered entries by timeframe
  const sortedLogs = useMemo(() => {
    return [...glucoseLogs].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
  }, [glucoseLogs])

  const filteredLogs = useMemo(() => {
    if (timeframe === 'all') return sortedLogs
    const days = parseInt(timeframe, 10)
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    return sortedLogs.filter((l) => (l.timestamp || 0) >= cutoff)
  }, [sortedLogs, timeframe])

  // Statistics calculation
  const stats = useMemo(() => {
    if (filteredLogs.length === 0) {
      return {
        count: 0,
        average: 0,
        min: 0,
        max: 0,
        latest: null as GlucoseEntry | null,
        estimatedHbA1c: 0,
        tir: { inNorm: 0, low: 0, high: 0 },
      }
    }

    const values = filteredLogs.map((l) => l.valueMgDl)
    const sum = values.reduce((acc, v) => acc + v, 0)
    const average = Math.round(sum / values.length)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const latest = filteredLogs[filteredLogs.length - 1]
    const estimatedHbA1c = estimateHbA1c(average)

    let inNormCount = 0
    let lowCount = 0
    let highCount = 0

    for (const log of filteredLogs) {
      const cls = classifyGlucose(log.valueMgDl, log.context)
      if (cls.status === 'norma') inNormCount++
      else if (cls.status === 'hipo') lowCount++
      else highCount++
    }

    const total = filteredLogs.length
    const tir = {
      inNorm: Math.round((inNormCount / total) * 100),
      low: Math.round((lowCount / total) * 100),
      high: Math.round((highCount / total) * 100),
    }

    return {
      count: total,
      average,
      min,
      max,
      latest,
      estimatedHbA1c,
      tir,
    }
  }, [filteredLogs])

  // Chart data formatting
  const chartData = useMemo(() => {
    return filteredLogs.map((l) => {
      const cls = classifyGlucose(l.valueMgDl, l.context)
      return {
        ...l,
        displayDate: l.date.slice(5), // MM-DD
        displayDateTime: `${l.date.slice(5)} ${l.time}`,
        valueDisplay: unit === 'mg/dL' ? l.valueMgDl : mgDlToMmol(l.valueMgDl),
        status: cls.status,
      }
    })
  }, [filteredLogs, unit])

  // Groups by date descending for the history log table
  const groupedByDate = useMemo(() => {
    const map = new Map<DateKey, GlucoseEntry[]>()
    // iterate reversed to show newest date first
    for (let i = sortedLogs.length - 1; i >= 0; i--) {
      const entry = sortedLogs[i]
      const list = map.get(entry.date)
      if (list) {
        list.push(entry)
      } else {
        map.set(entry.date, [entry])
      }
    }
    return Array.from(map.entries())
  }, [sortedLogs])

  // Handlers
  const openNewModal = () => {
    const now = new Date()
    setFormDate(toDateKey(now))
    setFormTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
    setFormValue('')
    setFormContext('na_czczo')
    setFormMealSlot('none')
    setFormNote('')
    setEditingEntry(null)
    setFormError(null)
    setModalOpen(true)
  }

  const openEditModal = (entry: GlucoseEntry) => {
    setEditingEntry(entry)
    setFormDate(entry.date)
    setFormTime(entry.time)
    setFormValue(String(unit === 'mg/dL' ? entry.valueMgDl : mgDlToMmol(entry.valueMgDl)))
    setFormContext(entry.context)
    setFormMealSlot(entry.mealSlot || 'none')
    setFormNote(entry.note || '')
    setFormError(null)
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const rawNum = Number(formValue.replace(',', '.'))
    if (!Number.isFinite(rawNum) || rawNum <= 0) {
      setFormError('Wpisz prawidłową wartość poziomu cukru.')
      return
    }

    const valueMgDl = unit === 'mg/dL' ? Math.round(rawNum) : mmolToMgDl(rawNum)

    if (valueMgDl < 20 || valueMgDl > 700) {
      setFormError('Wartość glukozy musi mieścić się w przedziale 20 - 700 mg/dL (1.1 - 38.8 mmol/L).')
      return
    }

    if (!formDate || !formTime) {
      setFormError('Podaj datę i godzinę pomiaru.')
      return
    }

    await logGlucose({
      id: editingEntry?.id,
      date: formDate,
      time: formTime,
      valueMgDl,
      context: formContext,
      mealSlot: formMealSlot !== 'none' ? formMealSlot : undefined,
      note: formNote.trim() || undefined,
    })

    setModalOpen(false)
  }

  const handleDelete = async (idToDelete: string) => {
    if (confirm('Czy na pewno chcesz usunąć ten pomiar cukru?')) {
      await removeGlucose(idToDelete)
    }
  }

  // Live classification preview while typing
  const livePreview = useMemo(() => {
    const rawNum = Number(formValue.replace(',', '.'))
    if (!Number.isFinite(rawNum) || rawNum <= 0) return null
    const mg = unit === 'mg/dL' ? Math.round(rawNum) : mmolToMgDl(rawNum)
    return classifyGlucose(mg, formContext)
  }, [formValue, formContext, unit])

  const latestClassification = stats.latest ? classifyGlucose(stats.latest.valueMgDl, stats.latest.context) : null

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Pomiary Cukru we Krwi"
        description="Monitoruj glikemię na czczo i po posiłkach, analizuj trendy i kontroluj wskaźnik Time in Range (TIR)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Unit toggle */}
            <div className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setUnit('mg/dL')}
                className={cn(
                  'rounded-md px-2.5 py-1 transition-colors',
                  unit === 'mg/dL' ? 'bg-background text-foreground shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                mg/dL
              </button>
              <button
                type="button"
                onClick={() => setUnit('mmol/L')}
                className={cn(
                  'rounded-md px-2.5 py-1 transition-colors',
                  unit === 'mmol/L' ? 'bg-background text-foreground shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                mmol/L
              </button>
            </div>

            {/* Account Switcher for Collaborative Plans */}
            {planMembers.length > 1 && (
              <div className="inline-flex items-center rounded-lg border bg-muted/40 p-0.5">
                {planMembers.map((member) => {
                  const isSelected = (selectedWeightAccountUid || planMembers[0]?.uid) === member.uid
                  return (
                    <button
                      key={member.uid}
                      type="button"
                      onClick={() => setSelectedWeightAccountUid(member.uid)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                        isSelected
                          ? 'bg-background text-foreground shadow-2xs font-semibold'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <User className="size-3" />
                      <span>{member.displayName}</span>
                    </button>
                  )
                })}
              </div>
            )}

            <Button onClick={openNewModal} size="sm" className="gap-1.5 shadow-2xs">
              <Plus className="size-4" />
              <span>Dodaj pomiar</span>
            </Button>
          </div>
        }
      />

      {/* Clinical KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Latest measurement */}
        <Card className="gap-2 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-medium">
              <Droplet className="size-3.5 text-rose-500" />
              Ostatni pomiar
            </span>
            {stats.latest && (
              <span className="tabular-nums">
                {stats.latest.date === toDateKey(new Date()) ? `Dzisiaj, ${stats.latest.time}` : `${stats.latest.date} ${stats.latest.time}`}
              </span>
            )}
          </div>
          {stats.latest ? (
            <div className="mt-1 space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight tabular-nums">
                  {unit === 'mg/dL' ? stats.latest.valueMgDl : mgDlToMmol(stats.latest.valueMgDl)}
                </span>
                <span className="text-sm font-semibold text-muted-foreground">{unit}</span>
                {latestClassification && (
                  <Badge variant={latestClassification.badgeVariant} className="ml-auto text-[11px]">
                    {latestClassification.shortLabel}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Pora: <strong>{GLUCOSE_CONTEXT_LABELS[stats.latest.context].short}</strong>
                {stats.latest.note && ` · „${stats.latest.note}”`}
              </p>
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">Brak zarejestrowanych pomiarów</div>
          )}
        </Card>

        {/* Average blood glucose */}
        <Card className="gap-2 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-medium">
              <Activity className="size-3.5 text-primary" />
              Średnia glikemia
            </span>
            <span className="text-[11px] font-medium">
              {timeframe === 'all' ? 'Wszystkie' : `Ostatnie ${timeframe} dni`}
            </span>
          </div>
          {stats.count > 0 ? (
            <div className="mt-1 space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight tabular-nums">
                  {unit === 'mg/dL' ? stats.average : mgDlToMmol(stats.average)}
                </span>
                <span className="text-sm font-semibold text-muted-foreground">{unit}</span>
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  Zakres: {unit === 'mg/dL' ? stats.min : mgDlToMmol(stats.min)} - {unit === 'mg/dL' ? stats.max : mgDlToMmol(stats.max)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Wyliczono z <strong>{stats.count}</strong> {stats.count === 1 ? 'pomiaru' : stats.count < 5 ? 'pomiarów' : 'pomiarów'}
              </p>
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">Brak danych w wybranym okresie</div>
          )}
        </Card>

        {/* Estimated HbA1c */}
        <Card className="gap-2 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-medium">
              <Sparkles className="size-3.5 text-amber-500" />
              Szacowane HbA1c
            </span>
            <span className="text-[11px] text-muted-foreground/80">Wzór ADAG</span>
          </div>
          {stats.count > 0 ? (
            <div className="mt-1 space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight tabular-nums text-foreground">
                  ~{stats.estimatedHbA1c}%
                </span>
                <Badge
                  variant={stats.estimatedHbA1c < 5.7 ? 'default' : stats.estimatedHbA1c < 6.5 ? 'secondary' : 'destructive'}
                  className="ml-auto text-[11px]"
                >
                  {stats.estimatedHbA1c < 5.7 ? 'Prawidłowe' : stats.estimatedHbA1c < 6.5 ? 'Podwyższone' : 'Wysokie'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Orientacyjny wskaźnik glikacji hemoglobiny z pomiarów.
              </p>
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">Wymaga dodania pomiarów</div>
          )}
        </Card>

        {/* Time in Range (TIR) */}
        <Card className="gap-2 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-medium">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              Czas w normie (TIR)
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {stats.tir.inNorm}%
            </span>
          </div>
          {stats.count > 0 ? (
            <div className="mt-1 space-y-2">
              {/* Stacked bar */}
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                {stats.tir.low > 0 && (
                  <div
                    style={{ width: `${stats.tir.low}%` }}
                    className="bg-sky-500 transition-all"
                    title={`Poniżej normy: ${stats.tir.low}%`}
                  />
                )}
                {stats.tir.inNorm > 0 && (
                  <div
                    style={{ width: `${stats.tir.inNorm}%` }}
                    className="bg-emerald-500 transition-all"
                    title={`W normie: ${stats.tir.inNorm}%`}
                  />
                )}
                {stats.tir.high > 0 && (
                  <div
                    style={{ width: `${stats.tir.high}%` }}
                    className="bg-amber-500 transition-all"
                    title={`Powyżej normy: ${stats.tir.high}%`}
                  />
                )}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                <span className="text-sky-600 dark:text-sky-400">Niski: {stats.tir.low}%</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Norma: {stats.tir.inNorm}%</span>
                <span className="text-amber-600 dark:text-amber-400">Wysoki: {stats.tir.high}%</span>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">Brak danych</div>
          )}
        </Card>
      </div>

      {/* Interactive Trend Chart Card */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">Wykres Poziomu Cukru</CardTitle>
            <CardDescription className="text-xs">
              Trendy glikemii z wyznaczonymi granicami normy (70 – 140 mg/dL).
            </CardDescription>
          </div>

          {/* Timeframe filters */}
          <div className="inline-flex rounded-lg border bg-muted/30 p-0.5 text-xs font-medium">
            {(['7', '14', '30', 'all'] as TimeframeOption[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTimeframe(t)}
                className={cn(
                  'rounded-md px-3 py-1 transition-colors',
                  timeframe === t ? 'bg-background text-foreground shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t === 'all' ? 'Wszystkie' : `${t} dni`}
              </button>
            ))}
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed text-center text-sm text-muted-foreground">
            <Droplet className="mb-2 size-8 text-muted-foreground/40" />
            <p className="font-medium text-foreground">Brak pomiarów w wybranym przedziale</p>
            <p className="mt-1 text-xs">Kliknij „Dodaj pomiar”, aby wprowadzić pierwszy wynik.</p>
          </div>
        ) : (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/40" />
                <XAxis
                  dataKey="displayDateTime"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  domain={[
                    unit === 'mg/dL' ? 50 : 2.5,
                    unit === 'mg/dL' ? (dataMax: number) => Math.max(dataMax + 20, 200) : (dataMax: number) => Math.max(dataMax + 1.5, 11),
                  ]}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null
                    const d = payload[0].payload as GlucoseEntry & { displayDateTime: string; valueDisplay: number }
                    const cls = classifyGlucose(d.valueMgDl, d.context)
                    return (
                      <div className="rounded-xl border bg-popover/95 p-3 text-xs shadow-lg backdrop-blur">
                        <div className="flex items-center justify-between gap-3 border-b pb-1.5 font-medium text-foreground">
                          <span>{d.date} o {d.time}</span>
                          <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', cls.bgClass, cls.colorClass)}>
                            {cls.shortLabel}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1">
                          <p className="text-base font-bold tabular-nums text-foreground">
                            {d.valueDisplay} {unit}
                            {unit === 'mg/dL' ? (
                              <span className="ml-1 text-xs font-normal text-muted-foreground">({mgDlToMmol(d.valueMgDl)} mmol/L)</span>
                            ) : (
                              <span className="ml-1 text-xs font-normal text-muted-foreground">({d.valueMgDl} mg/dL)</span>
                            )}
                          </p>
                          <p className="text-muted-foreground">
                            Pora: <strong>{GLUCOSE_CONTEXT_LABELS[d.context].label}</strong>
                          </p>
                          {d.note && (
                            <p className="italic text-muted-foreground/90">„{d.note}”</p>
                          )}
                        </div>
                      </div>
                    )
                  }}
                />

                {/* Clinical reference lines (mg/dL or mmol/L) */}
                <ReferenceLine
                  y={unit === 'mg/dL' ? 70 : mgDlToMmol(70)}
                  stroke="#38bdf8"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{ value: 'Hipo (70)', fill: '#38bdf8', fontSize: 10, position: 'right' }}
                />
                <ReferenceLine
                  y={unit === 'mg/dL' ? 99 : mgDlToMmol(99)}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{ value: 'Norma na czczo (99)', fill: '#10b981', fontSize: 10, position: 'right' }}
                />
                <ReferenceLine
                  y={unit === 'mg/dL' ? 140 : mgDlToMmol(140)}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{ value: 'Norma po posiłku (140)', fill: '#f59e0b', fontSize: 10, position: 'right' }}
                />

                <Line
                  type="monotone"
                  dataKey="valueDisplay"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, stroke: 'var(--primary)', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* History Table Grouped by Day */}
      <Card className="overflow-hidden p-0">
        <div className="border-b px-5 py-3.5">
          <CardTitle className="text-base font-semibold">Dziennik Pomiarów</CardTitle>
          <CardDescription className="text-xs">
            Kompletna historia wykonanych pomiarów z podziałem na pory dnia i posiłki.
          </CardDescription>
        </div>

        {groupedByDate.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Brak zapisanych pomiarów. Kliknij „Dodaj pomiar”, aby rozpocząć rejestrację.
          </div>
        ) : (
          <div className="divide-y">
            {groupedByDate.map(([dateKey, dayEntries]) => {
              const dateObj = fromDateKey(dateKey)
              const isToday = dateKey === toDateKey(new Date())

              return (
                <div key={dateKey} className="space-y-1">
                  {/* Date section header */}
                  <div className="flex items-center justify-between bg-muted/40 px-5 py-2 text-xs font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-primary" />
                      {isToday ? (
                        <span className="text-foreground font-bold">Dzisiaj ({dateKey})</span>
                      ) : (
                        <span>{dateKey}</span>
                      )}
                    </span>
                    <span className="text-[11px] font-normal text-muted-foreground">
                      {dayEntries.length} {dayEntries.length === 1 ? 'pomiar' : 'pomiary'}
                    </span>
                  </div>

                  {/* List of entries for this day */}
                  <div className="divide-y">
                    {dayEntries.map((entry) => {
                      const cls = classifyGlucose(entry.valueMgDl, entry.context)
                      const displayVal = unit === 'mg/dL' ? entry.valueMgDl : mgDlToMmol(entry.valueMgDl)

                      return (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/20"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 font-mono text-xs font-semibold text-muted-foreground">
                              <Clock className="size-3 text-muted-foreground/70" />
                              {entry.time}
                            </span>

                            <Badge
                              variant="outline"
                              className={cn('text-[11px] font-medium border', cls.borderClass, cls.bgClass, cls.colorClass)}
                            >
                              {GLUCOSE_CONTEXT_LABELS[entry.context].short}
                            </Badge>

                            {entry.note && (
                              <span className="hidden sm:inline-block text-xs text-muted-foreground italic truncate max-w-xs">
                                „{entry.note}”
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-base font-bold tabular-nums text-foreground">
                                {displayVal}
                              </span>
                              <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
                              <div className={cn('text-[10px] font-medium', cls.colorClass)}>
                                {cls.shortLabel}
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(entry)}
                                aria-label="Edytuj pomiar"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(entry.id)}
                                aria-label="Usuń pomiar"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Polish Diabetes Association (PTD) Medical Norms Card */}
      <Card className="gap-3 p-5 bg-card/60">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <Info className="size-4" />
          <span>Normy stężenia glukozy we krwi (wg zaleceń Polskiego Towarzystwa Diabetologicznego)</span>
        </div>
        <div className="grid gap-3 pt-1 text-xs text-muted-foreground sm:grid-cols-3">
          <div className="rounded-lg border bg-background/60 p-3 space-y-1">
            <p className="font-semibold text-emerald-600 dark:text-emerald-400">Na czczo (po przebudzeniu)</p>
            <p className="text-base font-bold text-foreground">70 – 99 mg/dL</p>
            <p className="text-[11px]">3.9 – 5.5 mmol/L. Prawidłowy poziom glukozy po 8-12h bez posiłku.</p>
          </div>
          <div className="rounded-lg border bg-background/60 p-3 space-y-1">
            <p className="font-semibold text-emerald-600 dark:text-emerald-400">Po posiłku (1-2h po)</p>
            <p className="text-base font-bold text-foreground">&lt; 140 mg/dL</p>
            <p className="text-[11px]">&lt; 7.8 mmol/L. Cel glikemii poposiłkowej dla osób dbających o metabolizm.</p>
          </div>
          <div className="rounded-lg border bg-background/60 p-3 space-y-1">
            <p className="font-semibold text-amber-600 dark:text-amber-400">Stan podwyższony / Alarmowy</p>
            <p className="text-base font-bold text-foreground">&ge; 100 mg/dL na czczo</p>
            <p className="text-[11px]">Na czczo 100-125: stan przedcukrzycowy. Poniżej 70: hipoglikemia.</p>
          </div>
        </div>
      </Card>

      {/* Add / Edit Measurement Dialog Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <Droplet className="size-5" />
              <DialogTitle>{editingEntry ? 'Edytuj pomiar cukru' : 'Nowy pomiar cukru'}</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Wprowadź wynik z glukometru lub sensora CGM.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            {formError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {formError}
              </div>
            )}

            {/* Value Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor={`${id}-value`} className="text-xs font-semibold">
                  Wynik pomiaru ({unit})
                </Label>
                {livePreview && (
                  <Badge variant={livePreview.badgeVariant} className="text-[10px]">
                    {livePreview.label}
                  </Badge>
                )}
              </div>
              <div className="relative">
                <Input
                  id={`${id}-value`}
                  type="number"
                  step={unit === 'mg/dL' ? '1' : '0.1'}
                  min={unit === 'mg/dL' ? '20' : '1.1'}
                  max={unit === 'mg/dL' ? '700' : '38.8'}
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder={unit === 'mg/dL' ? 'np. 95' : 'np. 5.3'}
                  className="pr-16 text-lg font-bold tabular-nums"
                  required
                  autoFocus
                />
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  {unit}
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {unit === 'mg/dL'
                  ? [85, 95, 110, 125, 140, 160].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormValue(String(val))}
                        className="rounded-md border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        {val}
                      </button>
                    ))
                  : [4.7, 5.3, 6.1, 6.9, 7.8, 8.9].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormValue(String(val))}
                        className="rounded-md border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        {val}
                      </button>
                    ))}
              </div>
            </div>

            {/* Context of measurement */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Pora pomiaru</Label>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {(Object.entries(GLUCOSE_CONTEXT_LABELS) as [GlucoseContext, { label: string; short: string }][]).map(
                  ([ctxKey, info]) => {
                    const selected = formContext === ctxKey
                    return (
                      <button
                        key={ctxKey}
                        type="button"
                        onClick={() => setFormContext(ctxKey)}
                        className={cn(
                          'rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors',
                          selected
                            ? 'border-primary bg-primary/10 text-primary font-semibold'
                            : 'border-border bg-card hover:bg-accent text-foreground',
                        )}
                      >
                        {info.short}
                      </button>
                    )
                  },
                )}
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-date`} className="text-xs font-medium">
                  Data
                </Label>
                <Input
                  id={`${id}-date`}
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-time`} className="text-xs font-medium">
                  Godzina
                </Label>
                <Input
                  id={`${id}-time`}
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Optional Note */}
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-note`} className="text-xs font-medium">
                Notatka (opcjonalnie)
              </Label>
              <Input
                id={`${id}-note`}
                type="text"
                placeholder="np. po owsiance z orzechami, 30 min spaceru..."
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                maxLength={100}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Anuluj
              </Button>
              <Button type="submit">
                {editingEntry ? 'Zapisz zmiany' : 'Dodaj pomiar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
