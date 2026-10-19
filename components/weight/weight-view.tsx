'use client'

import { useId, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts'
import { Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { usePlanner } from '@/lib/store'
import { formatShortDate, fromDateKey, toDateKey } from '@/lib/date'
import { formatNumber } from '@/lib/nutrition'
import { SectionHeader } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

const chartConfig = {
  weightKg: { label: 'Waga (kg)', color: 'var(--primary)' },
} satisfies ChartConfig

export function WeightView() {
  const { weights, goals, logWeight, removeWeight } = usePlanner()
  const id = useId()
  const [date, setDate] = useState(() => toDateKey(new Date()))
  const [weight, setWeight] = useState('')
  const [error, setError] = useState<string | null>(null)

  const first = weights[0]
  const latest = weights.at(-1)
  const change = first && latest ? latest.weightKg - first.weightKg : 0
  const toGoal = latest ? latest.weightKg - goals.targetWeightKg : 0

  const data = weights.map((w) => ({ ...w, label: formatShortDate(fromDateKey(w.date)) }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const kg = Number(weight.replace(',', '.'))
    if (!Number.isFinite(kg) || kg < 30 || kg > 300) return setError('Podaj wagę od 30 do 300 kg.')
    if (!date) return setError('Wybierz datę.')
    logWeight({ date, weightKg: Math.round(kg * 10) / 10 })
    setWeight('')
    setError(null)
  }

  return (
    <div>
      <SectionHeader title="Monitor Wagi" description="Zapisuj pomiary i obserwuj postępy w czasie." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Aktualna waga" value={latest ? `${formatNumber(latest.weightKg, 1)} kg` : '—'} />
        <Stat
          label="Zmiana od początku"
          value={`${change > 0 ? '+' : ''}${formatNumber(change, 1)} kg`}
          icon={change <= 0 ? TrendingDown : TrendingUp}
          tone={change <= 0 ? 'good' : 'bad'}
        />
        <Stat
          label={`Do celu (${formatNumber(goals.targetWeightKg, 1)} kg)`}
          value={toGoal > 0 ? `${formatNumber(toGoal, 1)} kg` : 'Cel osiągnięty'}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.8fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Przebieg wagi</CardTitle>
            <CardDescription>Linia przerywana oznacza wagę docelową.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.length < 2 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Dodaj co najmniej dwa pomiary, aby zobaczyć wykres.
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
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Nowy pomiar</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`${id}-date`}>Data</Label>
                    <Input id={`${id}-date`} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`${id}-kg`}>Waga (kg)</Label>
                    <Input
                      id={`${id}-kg`}
                      inputMode="decimal"
                      placeholder="np. 79,8"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
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
                  Zapisz pomiar
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ostatnie pomiary</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="max-h-64 divide-y overflow-y-auto">
                {[...weights].reverse().map((w) => (
                  <li key={w.date} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span className="text-muted-foreground">{formatShortDate(fromDateKey(w.date))}</span>
                    <span className="ml-auto font-medium tabular-nums">{formatNumber(w.weightKg, 1)} kg</span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeWeight(w.date)}
                      aria-label={`Usuń pomiar z ${formatShortDate(fromDateKey(w.date))}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
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
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
  tone?: 'good' | 'bad'
}) {
  return (
    <Card className="gap-1 p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="flex items-center gap-2 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
        {Icon && (
          <Icon className={tone === 'good' ? 'size-5 text-primary' : 'size-5 text-destructive'} aria-hidden="true" />
        )}
      </p>
    </Card>
  )
}
