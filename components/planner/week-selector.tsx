import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatWeekRange } from '@/lib/date'

export function WeekSelector({
  weekStart,
  onPrev,
  onNext,
  onToday,
}: {
  weekStart: Date
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onToday}>
        Dziś
      </Button>
      <div className="flex items-center rounded-lg border bg-card">
        <Button variant="ghost" size="icon" onClick={onPrev} aria-label="Poprzedni tydzień">
          <ChevronLeft />
        </Button>
        <span className="min-w-44 px-1 text-center text-sm font-medium tabular-nums" aria-live="polite">
          {formatWeekRange(weekStart)}
        </span>
        <Button variant="ghost" size="icon" onClick={onNext} aria-label="Następny tydzień">
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
