'use client'

import { useId, useState } from 'react'
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts'
import { Check, Pencil, Ruler, Scale, Trash2, TrendingDown, TrendingUp, User, Users, X } from 'lucide-react'
import { usePlanner } from '@/lib/store'
import { formatShortDate, fromDateKey, toDateKey } from '@/lib/date'
import { formatNumber } from '@/lib/nutrition'
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
} satisfies ChartConfig

type MetricView = 'weight' | 'waist' | 'hips' | 'all'

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

    logWeight({
      date,
      weightKg: Math.round(kg * 10) / 10,
      ...(waistVal !== undefined ? { waistCm: waistVal } : {}),
      ...(hipsVal !== undefined ? { hipsCm: hipsVal } : {}),
    })

    setWeight('')
    setWaist('')
    setHips('')
    setEditingDate(null)
    setError(null)
  }

  const handleEdit = (w: (typeof weights)[number]) => {
    setDate(w.date)
    setWeight(String(w.weightKg))
    setWaist(w.waistCm !== undefined ? String(w.waistCm) : '')
    setHips(w.hipsCm !== undefined ? String(w.hipsCm) : '')
    setEditingDate(w.date)
    setError(null)
  }

  const handleCancelEdit = () => {
    setDate(toDateKey(new Date()))
    setWeight('')
    setWaist('')
    setHips('')
    setEditingDate(null)
    setError(null)
  }

  return (
    <div>
      <SectionHeader
        title="Monitor Wagi i Wymiarów"
        description="Zapisuj wagę oraz obwód talii i bioder, aby kompleksowo obserwować postępy sylwetki."
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

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                {activeMetric === 'waist' && 'Obwód talii (cm)'}
                {activeMetric === 'hips' && 'Obwód bioder (cm)'}
                {activeMetric === 'all' && 'Zestawienie wagi i wymiarów'}
              </CardTitle>
              <CardDescription>
                {activeMetric === 'weight' && 'Linia przerywana oznacza wagę docelową.'}
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
                  </LineChart>
                </ChartContainer>
              )
            )}
          </CardContent>
        </Card>

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

