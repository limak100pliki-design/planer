'use client'

import { BookOpen, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ExpandChevron({ open, className }: { open: boolean; className?: string }) {
  const Icon = open ? ChevronUp : ChevronDown
  return <Icon className={cn('size-4 shrink-0 text-muted-foreground', className)} aria-hidden="true" />
}

function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

function RecipeSource({ source }: { source: string }) {
  const url = parseHttpUrl(source)

  return (
    <div className="mt-4 border-t border-border/70 pt-3">
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pochodzenie</h4>
      {url ? (
        <a
          href={url.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {url.hostname.replace(/^www\./, '')}
            {url.pathname !== '/' ? url.pathname : ''}
          </span>
          <span className="sr-only">(otwiera się w nowej karcie)</span>
        </a>
      ) : (
        <p className="inline-flex items-start gap-1.5 text-sm text-foreground">
          <BookOpen className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          {source}
        </p>
      )}
    </div>
  )
}

export function RecipeInstructions({
  id,
  open,
  text,
  source,
  className,
}: {
  id: string
  open: boolean
  text: string | undefined
  source?: string
  className?: string
}) {
  const content = text?.trim()
  const origin = source?.trim()

  return (
    <div
      id={id}
      role="region"
      aria-label="Sposób przygotowania"
      inert={!open}
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
    >
      <div className="overflow-hidden">
        <div className={cn('rounded-lg bg-muted/60 p-4', className)}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sposób przygotowania
          </h4>
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
            {content || 'Brak opisu przygotowania dla tego przepisu.'}
          </p>
          {source !== undefined &&
            (origin ? (
              <RecipeSource source={origin} />
            ) : (
              <p className="mt-4 border-t border-border/70 pt-3 text-xs text-muted-foreground">
                Nie podano pochodzenia przepisu.
              </p>
            ))}
        </div>
      </div>
    </div>
  )
}
