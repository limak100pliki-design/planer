'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Database, Globe, Loader2, Sparkles } from 'lucide-react'
import {
  searchLocalIngredients,
  searchOpenFoodFacts,
  type IngredientSuggestion,
} from '@/lib/nutrition-api'
import type { Recipe } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface IngredientAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelectSuggestion: (suggestion: IngredientSuggestion) => void
  userRecipes?: Recipe[]
  placeholder?: string
  className?: string
  ariaLabel?: string
}

export function IngredientAutocomplete({
  value,
  onChange,
  onSelectSuggestion,
  userRecipes = [],
  placeholder = 'Nazwa składnika…',
  className,
  ariaLabel,
}: IngredientAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<IngredientSuggestion[]>([])
  const [isLoadingApi, setIsLoadingApi] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search logic on input change
  useEffect(() => {
    const query = value.trim()
    if (query.length < 2) {
      setSuggestions([])
      setIsOpen(false)
      setIsLoadingApi(false)
      return
    }

    // 1. Instant local search (0ms)
    const localMatches = searchLocalIngredients(query, userRecipes)
    setSuggestions(localMatches)
    setIsOpen(true)
    setHighlightedIndex(-1)

    // 2. Debounced API search (Open Food Facts)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    setIsLoadingApi(true)
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const apiMatches = await searchOpenFoodFacts(query)
        setSuggestions((prev) => {
          const existingNames = new Set(prev.map((i) => i.name.toLowerCase()))
          const newUniqueApi = apiMatches.filter((item) => !existingNames.has(item.name.toLowerCase()))
          return [...prev, ...newUniqueApi].slice(0, 8)
        })
      } finally {
        setIsLoadingApi(false)
      }
    }, 350)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [value, userRecipes])

  const handleSelect = (item: IngredientSuggestion) => {
    onSelectSuggestion(item)
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault()
        handleSelect(suggestions[highlightedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative">
        <Input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => {
            if (value.trim().length >= 2 && suggestions.length > 0) {
              setIsOpen(true)
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          className="pr-7 text-sm"
        />

        {isLoadingApi && (
          <div className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
          </div>
        )}
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full z-50 mt-1 max-h-64 w-full min-w-[280px] overflow-y-auto rounded-xl border border-border/80 bg-popover p-1.5 shadow-lg animate-in fade-in-50 zoom-in-95">
          <div className="mb-1 flex items-center justify-between px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1">
              <Sparkles className="size-3 text-primary" />
              Podpowiedzi odżywcze (na 100g)
            </span>
            {isLoadingApi ? (
              <span className="flex items-center gap-1 text-primary">
                <Loader2 className="size-2.5 animate-spin" /> szukam w Open Food Facts…
              </span>
            ) : (
              <span>Wybierz, aby uzupełnić makro</span>
            )}
          </div>

          <ul role="listbox" className="space-y-1">
            {suggestions.map((item, index) => {
              const isHighlighted = highlightedIndex === index
              return (
                <li
                  key={item.id}
                  role="option"
                  aria-selected={isHighlighted}
                  onMouseDown={(e) => {
                    e.preventDefault() // prevent blur
                    handleSelect(item)
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    'flex cursor-pointer flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                    isHighlighted ? 'bg-primary/10 text-primary-foreground' : 'hover:bg-muted/60',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-foreground text-xs leading-snug">
                      {item.name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.source === 'api' ? (
                        <Badge variant="outline" className="text-[9px] py-0 px-1 border-primary/30 text-primary flex items-center gap-0.5">
                          <Globe className="size-2.5" />
                          API
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[9px] py-0 px-1">
                          {item.category || 'Baza'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-x-2 text-[11px] text-muted-foreground tabular-nums">
                    <span className="font-semibold text-foreground">{item.per100g.kcal} kcal</span>
                    <span className="text-protein font-medium">B: {item.per100g.protein}g</span>
                    <span className="text-carbs font-medium">W: {item.per100g.carbs}g</span>
                    <span className="text-fat font-medium">T: {item.per100g.fat}g</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
