'use client'

import { useState } from 'react'
import {
  AlertCircle,
  Check,
  Copy,
  FileCode,
  FileUp,
  Loader2,
  Sparkles,
  Upload,
} from 'lucide-react'
import { usePlanner } from '@/lib/store'
import type { Recipe } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface ImportRecipesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportRecipesDialog({ open, onOpenChange }: ImportRecipesDialogProps) {
  const { importRecipesBulk } = usePlanner()
  const [jsonText, setJsonText] = useState('')
  const [parsedRecipes, setParsedRecipes] = useState<Recipe[] | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successCount, setSuccessCount] = useState<number | null>(null)

  const handleTextChange = (text: string) => {
    setJsonText(text)
    setErrorMsg(null)
    setSuccessCount(null)

    if (!text.trim()) {
      setParsedRecipes(null)
      return
    }

    try {
      const data = JSON.parse(text)
      const list = Array.isArray(data) ? data : [data]
      if (list.length === 0) {
        setErrorMsg('Tablica JSON jest pusta.')
        setParsedRecipes(null)
        return
      }

      // Check required fields
      const invalid = list.find((item: any) => !item.name || !Array.isArray(item.ingredients))
      if (invalid) {
        setErrorMsg('Każdy przepis musi zawierać pole "name" oraz tablicę "ingredients".')
        setParsedRecipes(null)
        return
      }

      setParsedRecipes(list as Recipe[])
    } catch (e: any) {
      setErrorMsg(`Błąd składni JSON: ${e.message}`)
      setParsedRecipes(null)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      handleTextChange(content)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!parsedRecipes || parsedRecipes.length === 0) return
    setIsSubmitting(true)
    try {
      const res = await importRecipesBulk(parsedRecipes)
      setSuccessCount(res.count)
      setTimeout(() => {
        onOpenChange(false)
        setJsonText('')
        setParsedRecipes(null)
        setSuccessCount(null)
      }, 1800)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Wystąpił błąd podczas importu.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Upload className="size-5" />
            <DialogTitle>Hurtowy Import Przepisów (JSON)</DialogTitle>
          </div>
          <DialogDescription>
            Wklej wygenerowany przez AI kod JSON lub wgraj plik .json z przepisami. Wszystkie przepisy zostaną dodane do Twojej bazy jako nieulubione.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* File Upload Trigger */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border p-3 bg-muted/20">
            <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
              <FileUp className="size-4 text-primary" />
              <span>Wgraj plik <strong>.json</strong> z dysku</span>
            </div>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <span className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-xs font-medium hover:bg-muted transition-colors">
                Wybierz plik
              </span>
            </label>
          </div>

          {/* Direct JSON Paste */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="json-paste-area" className="font-semibold text-foreground">
                Lub wklej kod JSON:
              </label>
              {parsedRecipes && (
                <span className="font-medium text-primary">
                  Rozpoznano: {parsedRecipes.length} {parsedRecipes.length === 1 ? 'przepis' : parsedRecipes.length < 5 ? 'przepisy' : 'przepisów'}
                </span>
              )}
            </div>
            <Textarea
              id="json-paste-area"
              rows={8}
              placeholder='[ { "id": "przepis-1", "name": "Omlet", "ingredients": [ ... ] } ]'
              value={jsonText}
              onChange={(e) => handleTextChange(e.target.value)}
              className="font-mono text-xs leading-relaxed"
            />
          </div>

          {/* Validation Status */}
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {parsedRecipes && !errorMsg && (
            <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-primary">
                <Check className="size-4" />
                Poprawny format JSON!
              </div>
              <ul className="list-inside list-disc text-muted-foreground max-h-24 overflow-y-auto space-y-0.5">
                {parsedRecipes.slice(0, 6).map((r, i) => (
                  <li key={i} className="truncate">
                    <strong className="text-foreground">{r.name}</strong> — {r.ingredients?.length || 0} składników, {r.prepTimeMin || 15} min
                  </li>
                ))}
                {parsedRecipes.length > 6 && (
                  <li className="text-muted-foreground font-medium">
                    ...i jeszcze {parsedRecipes.length - 6} innych przepisów
                  </li>
                )}
              </ul>
            </div>
          )}

          {successCount !== null && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              <Sparkles className="size-4" />
              Pomyślnie zaimportowano {successCount} przepisów do bazy!
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setJsonText('')
              setParsedRecipes(null)
              setErrorMsg(null)
            }}
            disabled={!jsonText}
            className="text-xs"
          >
            Wyczyść
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Anuluj
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!parsedRecipes || parsedRecipes.length === 0 || isSubmitting}
              onClick={handleImport}
              className="gap-1.5 text-xs font-semibold"
            >
              {isSubmitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              {parsedRecipes ? `Zaimportuj (${parsedRecipes.length})` : 'Zaimportuj'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
