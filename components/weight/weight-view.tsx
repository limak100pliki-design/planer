'use client'

import { useId, useState } from 'react'
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts'
import { Check, Droplets, Pencil, Ruler, Scale, Trash2, TrendingDown, TrendingUp, User, Users, X } from 'lucide-react'
import { usePlanner } from '@/lib/store'
import { formatShortDate, fromDateKey, toDateKey } from '@/lib/date'
import { BLOOD_SUGAR_CONTEXT_LABELS, formatNumber, getBloodSugarStatus, mgDlToMmol } from '@/lib/nutrition'
import type { BloodSugarContext } from '@/lib/types'
import { cn } from '@/lib/utils'
import { SectionHeader } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

const chartConfig = {
  weightKg: { label: 'Waga (kg)', color: 'var(--primary)' },
  waistCm: { label: 'Talia (cm)', color: 'var(--chart-2)' },
  hipsCm: { label: 'Biodra (cm)', color: 'var(--chart-5)' },
  bloodSugarMgDl: { label: 'Cukier (mg/dL)', color: '#ec4899' },
} satisfies ChartConfig

type MetricView = 'weight' | 'sugar' | 'waist' | 'hips' | 'all'

export function WeightView() {
  const {
    weights,
    goals,
    logWeight,
    removeWeight,
    sharedPlanInfo,
    planMembers,
    selectedWeightAccountUid,
    setSelectedWeightAccountUid,
    activeMember,
  } = usePlanner()
  const id = useId()
  const [date, setDate] = useState(() => toDateKey(new Date()))
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')
  const [hips, setHips] = useState('')
  const [bloodSugar, setBloodSugar] = useState('')
  const [bloodSugarContext, setBloodSugarContext] = useState<BloodSugarContext>('fasting')
  const [bloodSugarNote, setBloodSugarNote] = useState('')
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [activeMetric, setActiveMetric] = useState<MetricView>('weight')
  const [error, setError] = useState<string | null>(null)

  // Weight stats
  const first = weights[0]
  const latest = weights.at(-1)
  const change = first && latest ? latest.weightKg - first.weightKg : 0
  const toGoal = latest ? latest.weightKg - goals.targetWeightKg : 0

  // Waist stats
  const weightsWithWaist = weights.filter((w) => typeof w.waistCm === 'number')
  const firstWaist = weightsWithWaist[0]
  const latestWaist = weightsWithWaist.at(-1)
  const waistChange =
    firstWaist && latestWaist && firstWaist.waistCm !== undefined && latestWaist.waistCm !== undefined
      ? latestWaist.waistCm - firstWaist.waistCm
      : 0

  // Hips stats
  const weightsWithHips = weights.filter((w) => typeof w.hipsCm === 'number')
  const firstHips = weightsWithHips[0]
  const latestHips = weightsWithHips.at(-1)
  const hipsChange =
    firstHips && latestHips && firstHips.hipsCm !== undefined && latestHips.hipsCm !== undefined
      ? latestHips.hipsCm - firstHips.hipsCm
      : 0

  // Blood sugar stats
  const weightsWithSugar = weights.filter((w) => typeof w.bloodSugarMgDl === 'number')
  const latestSugar = weightsWithSugar.at(-1)
  const sugarCount = weightsWithSugar.length
  const avgSugar =
    sugarCount > 0
      ? Math.round(weightsWithSugar.reduce((acc, cur) => acc + (cur.bloodSugarMgDl || 0), 0) / sugarCount)
      : null
  const latestSugarEval = latestSugar?.bloodSugarMgDl
    ? getBloodSugarStatus(latestSugar.bloodSugarMgDl, latestSugar.bloodSugarContext || 'fasting')
    : null

  const data = weights.map((w) => ({
    ...w,
    label: formatShortDate(fromDateKey(w.date)),
  }))

  const waistData = weightsWithWaist.map((w) => ({
    ...w,
    label: formatShortDate(fromDateKey(w.date)),
  }))

  const hipsData = weightsWithHips.map((w) => ({
    ...w,
    label: formatShortDate(fromDateKey(w.date)),
  }))

  const sugarData = weightsWithSugar.map((w) => ({
    ...w,
    label: formatShortDate(fromDateKey(w.date)),
  }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const kg = Number(weight.replace(',', '.'))
    if (!Number.isFinite(kg) || kg < 30 || kg > 300) return setError('Podaj wagę od 30 do 300 kg.')
    if (!date) return setError('Wybierz datę.')

    let waistVal: number | undefined = undefined
    if (waist.trim()) {
      const parsedWaist = Number(waist.replace(',', '.'))
      if (!Number.isFinite(parsedWaist) || parsedWaist < 30 || parsedWaist > 250) {
        return setError('Podaj obwód talii w przedziale 30 - 250 cm.')
      }
      waistVal = Math.round(parsedWaist * 10) / 10
    }

    let hipsVal: number | undefined = undefined
    if (hips.trim()) {
      const parsedHips = Number(hips.replace(',', '.'))
      if (!Number.isFinite(parsedHips) || parsedHips < 40 || parsedHips > 250) {
        return setError('Podaj obwód bioder w przedziale 40 - 250 cm.')
      }
      hipsVal = Math.round(parsedHips * 10) / 10
    }

    let sugarVal: number | undefined = undefined
    if (bloodSugar.trim()) {
      const parsedSugar = Number(bloodSugar.replace(',', '.'))
      if (!Number.isFinite(parsedSugar) || parsedSugar < 20 || parsedSugar > 600) {
        return setError('Podaj poziom cukru w przedziale 20 - 600 mg/dL.')
      }
      sugarVal = Math.round(parsedSugar)
    }

    logWeight({
      date,
      weightKg: Math.round(kg * 10) / 10,
      ...(waistVal !== undefined ? { waistCm: waistVal } : {}),
      ...(hipsVal !== undefined ? { hipsCm: hipsVal } : {}),
      ...(sugarVal !== undefined ? { bloodSugarMgDl: sugarVal } : {}),
      ...(sugarVal !== undefined ? { bloodSugarContext } : {}),
      ...(sugarVal !== undefined && bloodSugarNote.trim() ? { bloodSugarNote: bloodSugarNote.trim() } : {}),
    })

    setWeight('')
    setWaist('')
    setHips('')
    setBloodSugar('')
    setBloodSugarContext('fasting')
    setBloodSugarNote('')
    setEditingDate(null)
    setError(null)
  }

  const handleEdit = (w: (typeof weights)[number]) => {
    setDate(w.date)
    setWeight(String(w.weightKg))
    setWaist(w.waistCm !== undefined ? String(w.waistCm) : '')
    setHips(w.hipsCm !== undefined ? String(w.hipsCm) : '')
    setBloodSugar(w.bloodSugarMgDl !== undefined ? String(w.bloodSugarMgDl) : '')
    setBloodSugarContext(w.bloodSugarContext || 'fasting')
    setBloodSugarNote(w.bloodSugarNote || '')
    setEditingDate(w.date)
    setError(null)
  }

  const handleCancelEdit = () => {
    setDate(toDateKey(new Date()))
    setWeight('')
    setWaist('')
    setHips('')
    setBloodSugar('')
    setBloodSugarContext('fasting')
    setBloodSugarNote('')
    setEditingDate(null)
    setError(null)
  }

  return (
    <div>
      <SectionHeader
        title="Monitor Wagi, Wymiarów i Cukru"
        description="Zapisuj wagę, obwody ciała oraz poziom cukru we krwi (glikemię), aby kompleksowo dbać o zdrowie i postępy."
      />

      {/* Multi-Account Data Source Switcher for Shared Plans */}
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
                    Konto źródłowe pomiarów i celu
                  </span>
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary px-1.5 py-0">
                    Konto współdzielone
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-foreground font-medium">
                  Pomiary i cel wagi pobierane z konta:{' '}
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

      {/* Top statistics cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Stat
          label="Aktualna waga"
          value={latest ? `${formatNumber(latest.weightKg, 1)} kg` : '—'}
          subtext={
            first && latest
              ? `${change > 0 ? '+' : ''}${formatNumber(change, 1)} kg od początku`
              : undefined
          }
          icon={change <= 0 ? TrendingDown : TrendingUp}
          tone={change <= 0 ? 'good' : 'bad'}
        />

        {/* Blood sugar stat card */}
        <Card className="gap-1 p-4 border-pink-500/25 bg-gradient-to-br from-card to-pink-500/5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Cukier we krwi</p>
            <Droplets className="size-4 text-pink-500" />
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
              {latestSugar?.bloodSugarMgDl ? `${latestSugar.bloodSugarMgDl} mg/dL` : '—'}
            </p>
            {latestSugar?.bloodSugarMgDl && (
              <span className="text-xs text-muted-foreground tabular-nums">
                ({mgDlToMmol(latestSugar.bloodSugarMgDl)} mmol/L)
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-xs pt-0.5">
            {latestSugarEval ? (
              <span className={cn('text-[11px] font-medium px-1.5 py-0.2 rounded border', latestSugarEval.badgeClass)}>
                {latestSugarEval.label}
              </span>
            ) : (
              <span className="text-muted-foreground text-[11px]">Brak pomiarów</span>
            )}
            {avgSugar && (
              <span className="text-muted-foreground text-[11px]">Śr: {avgSugar} mg/dL</span>
            )}
          </div>
        </Card>

        <Stat
          label="Obwód talii"
          value={latestWaist?.waistCm ? `${formatNumber(latestWaist.waistCm, 1)} cm` : '—'}
          subtext={
            firstWaist && latestWaist && firstWaist.waistCm && latestWaist.waistCm
              ? `${waistChange > 0 ? '+' : ''}${formatNumber(waistChange, 1)} cm od początku`
              : undefined
          }
          icon={waistChange <= 0 ? TrendingDown : TrendingUp}
          tone={waistChange <= 0 ? 'good' : 'bad'}
        />

        <Stat
          label="Obwód bioder"
          value={latestHips?.hipsCm ? `${formatNumber(latestHips.hipsCm, 1)} cm` : '—'}
          subtext={
            firstHips && latestHips && firstHips.hipsCm && latestHips.hipsCm
              ? `${hipsChange > 0 ? '+' : ''}${formatNumber(hipsChange, 1)} cm od początku`
              : undefined
          }
          icon={hipsChange <= 0 ? TrendingDown : TrendingUp}
          tone={hipsChange <= 0 ? 'good' : 'bad'}
        />

        <Stat
          label={`Cel (${formatNumber(goals.targetWeightKg, 1)} kg)`}
          value={toGoal > 0 ? `${formatNumber(toGoal, 1)} kg` : 'Cel osiągnięty'}
          subtext="Waga docelowa"
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.8fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>
                {activeMetric === 'weight' && 'Przebieg wagi (kg)'}
                {activeMetric === 'sugar' && 'Poziom cukru we krwi (mg/dL)'}
                {activeMetric === 'waist' && 'Obwód talii (cm)'}
                {activeMetric === 'hips' && 'Obwód bioder (cm)'}
                {activeMetric === 'all' && 'Zestawienie pomiarów'}
              </CardTitle>
              <CardDescription>
                {activeMetric === 'weight' && 'Linia przerywana oznacza wagę docelową.'}
                {activeMetric === 'sugar' && 'Linie referencyjne: norma na czczo (70–99 mg/dL) oraz limit po posiłku (<140 mg/dL).'}
                {activeMetric === 'waist' && 'Zmiany obwodu talii w czasie.'}
                {activeMetric === 'hips' && 'Zmiany obwodu bioder w czasie.'}
                {activeMetric === 'all' && 'Porównanie trendów na jednym wykresie.'}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-1">
              <Button
                variant={activeMetric === 'weight' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setActiveMetric('weight')}
              >
                Waga
              </Button>
              <Button
                variant={activeMetric === 'sugar' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs gap-1 text-pink-600 dark:text-pink-400"
                onClick={() => setActiveMetric('sugar')}
              >
                <Droplets className="size-3 text-pink-500" />
                Cukier
              </Button>
              <Button
                variant={activeMetric === 'waist' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setActiveMetric('waist')}
              >
                Talia
              </Button>
              <Button
                variant={activeMetric === 'hips' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setActiveMetric('hips')}
              >
                Biodra
              </Button>
              <Button
                variant={activeMetric === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setActiveMetric('all')}
              >
                Wszystko
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {activeMetric === 'weight' && (
              data.length < 2 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  Dodaj co najmniej dwa pomiary, aby zobaczyć wykres wagi.
                </p>
              ) : (
                <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
                  <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
                    <defs>
                      <linearGradient id="fillWeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-weightKg)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-weightKg)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                    <YAxis
                      domain={[
                        (min: number) => Math.floor(Math.min(min, goals.targetWeightKg) - 1),
                        (max: number) => Math.ceil(max + 1),
                      ]}
                      tickLine={false}
                      axisLine={false}
                      width={36}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ReferenceLine
                      y={goals.targetWeightKg}
                      stroke="var(--kcal)"
                      strokeDasharray="5 5"
                      label={{ value: 'Cel', position: 'insideTopRight', fill: 'var(--kcal)', fontSize: 12 }}
                    />
                    <Area
                      dataKey="weightKg"
                      type="monotone"
                      stroke="var(--color-weightKg)"
                      strokeWidth={2}
                      fill="url(#fillWeight)"
                      dot={{ r: 3, fill: 'var(--color-weightKg)' }}
                    />
                  </AreaChart>
                </ChartContainer>
              )
            )}

            {/* Blood sugar chart view */}
            {activeMetric === 'sugar' && (
              sugarData.length < 2 ? (
                <div className="py-16 text-center space-y-2">
                  <Droplets className="size-8 mx-auto text-pink-500 opacity-60" />
                  <p className="text-sm text-muted-foreground">
                    Dodaj co najmniej dwa pomiary cukru we krwi, aby zobaczyć wykres glikemii z poziomami normy.
                  </p>
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
                  <AreaChart data={sugarData} margin={{ left: 4, right: 12, top: 12, bottom: 4 }}>
                    <defs>
                      <linearGradient id="fillSugar" x1="0" y1="0" x2="0" y2="1">
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
                        const item = payload[0].payload as (typeof sugarData)[0]
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
                    {/* Clinical Reference lines */}
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
                      fill="url(#fillSugar)"
                      dot={{ r: 4, fill: '#ec4899', strokeWidth: 1, stroke: '#fff' }}
                    />
                  </AreaChart>
                </ChartContainer>
              )
            )}

            {activeMetric === 'waist' && (
              waistData.length < 2 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  Dodaj co najmniej dwa pomiary obwodu talii, aby zobaczyć wykres.
                </p>
              ) : (
                <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
                  <AreaChart data={waistData} margin={{ left: 4, right: 12, top: 8 }}>
                    <defs>
                      <linearGradient id="fillWaist" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-waistCm)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-waistCm)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                    <YAxis
                      domain={[
                        (min: number) => Math.floor(min - 1),
                        (max: number) => Math.ceil(max + 1),
                      ]}
                      tickLine={false}
                      axisLine={false}
                      width={36}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      dataKey="waistCm"
                      type="monotone"
                      stroke="var(--color-waistCm)"
                      strokeWidth={2}
                      fill="url(#fillWaist)"
                      dot={{ r: 3, fill: 'var(--color-waistCm)' }}
                    />
                  </AreaChart>
                </ChartContainer>
              )
            )}

            {activeMetric === 'hips' && (
              hipsData.length < 2 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  Dodaj co najmniej dwa pomiary obwodu bioder, aby zobaczyć wykres.
                </p>
              ) : (
                <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
                  <AreaChart data={hipsData} margin={{ left: 4, right: 12, top: 8 }}>
                    <defs>
                      <linearGradient id="fillHips" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-hipsCm)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-hipsCm)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                    <YAxis
                      domain={[
                        (min: number) => Math.floor(min - 1),
                        (max: number) => Math.ceil(max + 1),
                      ]}
                      tickLine={false}
                      axisLine={false}
                      width={36}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      dataKey="hipsCm"
                      type="monotone"
                      stroke="var(--color-hipsCm)"
                      strokeWidth={2}
                      fill="url(#fillHips)"
                      dot={{ r: 3, fill: 'var(--color-hipsCm)' }}
                    />
                  </AreaChart>
                </ChartContainer>
              )
            )}

            {activeMetric === 'all' && (
              data.length < 2 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  Dodaj co najmniej dwa pomiary, aby zobaczyć zestawienie.
                </p>
              ) : (
                <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
                  <LineChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                    <YAxis tickLine={false} axisLine={false} width={36} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      dataKey="weightKg"
                      type="monotone"
                      stroke="var(--color-weightKg)"
                      strokeWidth={2}
                      dot={{ r: 3, fill: 'var(--color-weightKg)' }}
                      connectNulls
                    />
                    <Line
                      dataKey="waistCm"
                      type="monotone"
                      stroke="var(--color-waistCm)"
                      strokeWidth={2}
                      dot={{ r: 3, fill: 'var(--color-waistCm)' }}
                      connectNulls
                    />
                    <Line
                      dataKey="hipsCm"
                      type="monotone"
                      stroke="var(--color-hipsCm)"
                      strokeWidth={2}
                      dot={{ r: 3, fill: 'var(--color-hipsCm)' }}
                      connectNulls
                    />
                    <Line
                      dataKey="bloodSugarMgDl"
                      type="monotone"
                      stroke="#ec4899"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#ec4899' }}
                      connectNulls
                    />
                  </LineChart>
                </ChartContainer>
              )
            )}
          </CardContent>
        </Card>

        {/* Form and History */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">
                {editingDate ? `Edycja pomiaru (${formatShortDate(fromDateKey(editingDate))})` : 'Nowy pomiar'}
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

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`${id}-date`}>Data</Label>
                    <Input id={`${id}-date`} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`${id}-kg`} className="flex items-center gap-1.5">
                      <Scale className="size-3.5 text-primary" /> Waga (kg)
                    </Label>
                    <Input
                      id={`${id}-kg`}
                      inputMode="decimal"
                      placeholder="np. 79,8"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="tabular-nums"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`${id}-waist`} className="flex items-center gap-1.5 text-xs">
                      <Ruler className="size-3.5 text-chart-2" /> Talia (cm)
                    </Label>
                    <Input
                      id={`${id}-waist`}
                      inputMode="decimal"
                      placeholder="np. 84,0 (opcja)"
                      value={waist}
                      onChange={(e) => setWaist(e.target.value)}
                      className="tabular-nums"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`${id}-hips`} className="flex items-center gap-1.5 text-xs">
                      <Ruler className="size-3.5 text-chart-5" /> Biodra (cm)
                    </Label>
                    <Input
                      id={`${id}-hips`}
                      inputMode="decimal"
                      placeholder="np. 99,5 (opcja)"
                      value={hips}
                      onChange={(e) => setHips(e.target.value)}
                      className="tabular-nums"
                    />
                  </div>
                </div>

                {/* Blood Sugar Section in Form */}
                <div className="rounded-xl border border-pink-500/25 bg-gradient-to-br from-pink-500/5 to-transparent p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${id}-sugar`} className="flex items-center gap-1.5 text-xs font-semibold text-pink-700 dark:text-pink-400">
                      <Droplets className="size-3.5 text-pink-500" /> Pomiar cukru we krwi (glikemia)
                    </Label>
                    {bloodSugar.trim() && Number.isFinite(Number(bloodSugar.replace(',', '.'))) && (
                      <span className="text-[11px] font-medium text-muted-foreground">
                        ≈ {mgDlToMmol(Number(bloodSugar.replace(',', '.')))} mmol/L
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-[130px_1fr] gap-2.5 items-start">
                    <div className="space-y-1">
                      <Input
                        id={`${id}-sugar`}
                        inputMode="numeric"
                        placeholder="np. 92"
                        value={bloodSugar}
                        onChange={(e) => setBloodSugar(e.target.value)}
                        className="tabular-nums"
                      />
                      <span className="text-[10px] text-muted-foreground pl-1">mg/dL (opcjonalnie)</span>
                    </div>

                    <div className="space-y-1">
                      <select
                        id={`${id}-sugar-context`}
                        value={bloodSugarContext}
                        onChange={(e) => setBloodSugarContext(e.target.value as BloodSugarContext)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="fasting">Na czczo (po przebudzeniu)</option>
                        <option value="postprandial">Po posiłku (1-2h)</option>
                        <option value="before_bed">Przed snem</option>
                        <option value="random">W ciągu dnia (losowy)</option>
                      </select>
                      <span className="text-[10px] text-muted-foreground pl-1">Moment pomiaru</span>
                    </div>
                  </div>

                  {/* Real-time clinical feedback badge */}
                  {bloodSugar.trim() && Number.isFinite(Number(bloodSugar.replace(',', '.'))) && (
                    <div>
                      {(() => {
                        const val = Number(bloodSugar.replace(',', '.'))
                        if (val < 20 || val > 600) return null
                        const evalRes = getBloodSugarStatus(val, bloodSugarContext)
                        return (
                          <div className={cn('flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs', evalRes.badgeClass)}>
                            <span className="font-semibold">{evalRes.label}:</span>
                            <span>{evalRes.description}</span>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  <div className="space-y-1">
                    <Input
                      id={`${id}-sugar-note`}
                      placeholder="Notatka (np. po lekkiej kolacji, przed treningiem)"
                      value={bloodSugarNote}
                      onChange={(e) => setBloodSugarNote(e.target.value)}
                      className="text-xs h-8"
                      maxLength={100}
                    />
                  </div>
                </div>

                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full">
                  {editingDate
                    ? 'Zaktualizuj pomiar'
                    : `Zapisz pomiar (${activeMember?.displayName || 'konto'})`}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ostatnie pomiary</CardTitle>
              <CardDescription>Kliknij ikonę ołówka, aby edytować wybrany pomiar.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="max-h-80 divide-y overflow-y-auto pr-1">
                {[...weights].reverse().map((w) => (
                  <li key={w.date} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{formatShortDate(fromDateKey(w.date))}</span>
                        <span className="font-semibold tabular-nums text-primary">
                          {formatNumber(w.weightKg, 1)} kg
                        </span>
                      </div>

                      {/* Waist & Hips */}
                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        {typeof w.waistCm === 'number' && (
                          <span className="inline-flex items-center gap-1">
                            <span className="size-1.5 rounded-full bg-chart-2" />
                            Talia: <strong className="font-medium text-foreground">{formatNumber(w.waistCm, 1)} cm</strong>
                          </span>
                        )}
                        {typeof w.hipsCm === 'number' && (
                          <span className="inline-flex items-center gap-1">
                            <span className="size-1.5 rounded-full bg-chart-5" />
                            Biodra: <strong className="font-medium text-foreground">{formatNumber(w.hipsCm, 1)} cm</strong>
                          </span>
                        )}
                      </div>

                      {/* Blood Sugar Badge & Note */}
                      {typeof w.bloodSugarMgDl === 'number' && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {(() => {
                            const evalRes = getBloodSugarStatus(w.bloodSugarMgDl, w.bloodSugarContext || 'fasting')
                            return (
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums',
                                  evalRes.badgeClass,
                                )}
                              >
                                <Droplets className="size-3 shrink-0" />
                                <span>{w.bloodSugarMgDl} mg/dL</span>
                                <span className="text-[10px] font-normal opacity-85">
                                  ({mgDlToMmol(w.bloodSugarMgDl)} mmol/L)
                                </span>
                                <span className="text-[10px] font-normal border-l border-current/25 pl-1 ml-0.5">
                                  {BLOOD_SUGAR_CONTEXT_LABELS[w.bloodSugarContext || 'fasting'] || w.bloodSugarContext}
                                </span>
                              </span>
                            )
                          })()}
                          {w.bloodSugarNote && (
                            <span className="text-[11px] text-muted-foreground italic truncate max-w-[180px]">
                              „{w.bloodSugarNote}”
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleEdit(w)}
                        aria-label={`Edytuj pomiar z ${formatShortDate(fromDateKey(w.date))}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          if (editingDate === w.date) handleCancelEdit()
                          removeWeight(w.date)
                        }}
                        aria-label={`Usuń pomiar z ${formatShortDate(fromDateKey(w.date))}`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  subtext,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  subtext?: string
  icon?: React.ComponentType<{ className?: string }>
  tone?: 'good' | 'bad'
}) {
  return (
    <Card className="gap-1 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center justify-between gap-1">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        {Icon && (
          <Icon className={tone === 'good' ? 'size-5 text-primary' : 'size-5 text-destructive'} aria-hidden="true" />
        )}
      </div>
      {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
    </Card>
  )
}
