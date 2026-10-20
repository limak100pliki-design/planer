'use client'

import { useEffect, useState } from 'react'
import {
  Check,
  Copy,
  Link2,
  Loader2,
  LogIn,
  LogOut,
  QrCode,
  Share2,
  Sparkles,
  Users,
} from 'lucide-react'
import { usePlanner } from '@/lib/store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface SharePlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SharePlanDialog({ open, onOpenChange }: SharePlanDialogProps) {
  const {
    user,
    sharedPlanInfo,
    login,
    createOrGetShareCode,
    joinSharedPlanWithCode,
    leaveSharedPlan,
  } = usePlanner()

  const [shareCode, setShareCode] = useState<string>(sharedPlanInfo?.shareCode || '')
  const [inputCode, setInputCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [isLoadingCode, setIsLoadingCode] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinSuccess, setJoinSuccess] = useState(false)

  // Keep shareCode in sync when sharedPlanInfo updates from Firestore
  useEffect(() => {
    if (sharedPlanInfo?.shareCode) {
      setShareCode(sharedPlanInfo.shareCode)
    }
  }, [sharedPlanInfo?.shareCode])

  const handleGenerateCode = async () => {
    setIsLoadingCode(true)
    try {
      const code = await createOrGetShareCode()
      setShareCode(code)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingCode(false)
    }
  }

  const handleCopyCode = async () => {
    if (!shareCode) return
    try {
      await navigator.clipboard.writeText(shareCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setJoinError(null)
    setJoinSuccess(false)
    setIsJoining(true)

    try {
      const res = await joinSharedPlanWithCode(inputCode)
      if (res.success) {
        setJoinSuccess(true)
        setInputCode('')
        setTimeout(() => {
          onOpenChange(false)
        }, 1500)
      } else {
        setJoinError(res.error || 'Nie udało się połączyć z planem.')
      }
    } finally {
      setIsJoining(false)
    }
  }

  const handleLeave = async () => {
    setIsLeaving(true)
    try {
      await leaveSharedPlan()
      onOpenChange(false)
    } finally {
      setIsLeaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Users className="size-5" />
            <DialogTitle>Wspólny Plan dla Wielu Kont</DialogTitle>
          </div>
          <DialogDescription>
            Zaloguj się na dwóch kontach (np. Ty i partner, lub Twój telefon i laptop) i korzystajcie z dokładnie tego samego planu posiłków oraz listy zakupów w czasie rzeczywistym.
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="rounded-xl border border-border/80 bg-muted/40 p-5 text-center text-xs space-y-3">
            <p className="font-semibold text-foreground text-sm">Wymagane zalogowanie</p>
            <p className="text-muted-foreground">
              Aby połączyć plan posiłków z innymi kontami, musisz być zalogowany kontem Google.
            </p>
            <Button
              type="button"
              onClick={login}
              className="gap-2 text-xs"
            >
              <LogIn className="size-3.5" />
              Zaloguj przez Google
            </Button>
          </div>
        ) : (
          <div className="space-y-5 py-1">
            {/* Current Status Badge */}
            <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  Status połączenia
                </span>
                <p className="text-muted-foreground">
                  {sharedPlanInfo?.isShared
                    ? `Wspólny plan aktywny (Połączone konta: ${sharedPlanInfo.membersCount})`
                    : 'Obecnie używasz indywidualnego profilu'}
                </p>
              </div>
              <Badge variant={sharedPlanInfo?.isShared ? 'default' : 'secondary'} className="text-[11px]">
                {sharedPlanInfo?.isShared ? 'Współdzielony' : 'Indywidualny'}
              </Badge>
            </div>

            {/* Section 1: Share Your Plan Code */}
            <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">1. Twój kod parowania</h4>
                  <p className="text-xs text-muted-foreground">
                    Podaj ten kod na drugim koncie, aby zobaczyło Twój plan.
                  </p>
                </div>
                <Share2 className="size-4 text-muted-foreground" />
              </div>

              {shareCode ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border bg-muted/30 px-3 py-2.5">
                  <div className="font-mono text-xl font-bold tracking-wider text-primary">
                    {shareCode}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCode}
                    className="gap-1.5 text-xs h-8"
                  >
                    {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
                    {copied ? 'Skopiowano' : 'Kopiuj kod'}
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateCode}
                  disabled={isLoadingCode}
                  className="w-full gap-2 text-xs"
                >
                  {isLoadingCode ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />}
                  Wygeneruj kod parowania planu
                </Button>
              )}
            </div>

            {/* Section 2: Join Another Account's Plan */}
            <form onSubmit={handleJoin} className="rounded-2xl border border-border/80 bg-card p-4 space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-foreground">2. Dołącz do planu innego konta</h4>
                <p className="text-xs text-muted-foreground">
                  Wpisz kod otrzymany z pierwszego konta (np. TAL-1234).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="np. TAL-4821"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  className="font-mono uppercase tracking-wider text-sm h-9"
                  maxLength={12}
                />
                <Button
                  type="submit"
                  disabled={isJoining || !inputCode.trim()}
                  className="shrink-0 h-9 text-xs"
                >
                  {isJoining && <Loader2 className="size-3.5 animate-spin mr-1" />}
                  Połącz konta
                </Button>
              </div>

              {joinError && (
                <p role="alert" className="text-xs text-destructive">
                  {joinError}
                </p>
              )}

              {joinSuccess && (
                <p role="status" className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <Check className="size-3.5" /> Połączono pomyślnie! Oba konta współdzielą teraz ten sam plan.
                </p>
              )}
            </form>

            {/* Section 3: Leave Shared Plan if currently shared */}
            {sharedPlanInfo?.isShared && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">Wróć do osobnego planu</p>
                  <p className="text-[11px] text-muted-foreground">
                    Możesz w każdej chwili odłączyć to konto od wspólnego planu.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleLeave}
                  disabled={isLeaving}
                  className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive h-8"
                >
                  {isLeaving ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <LogOut className="size-3.5 mr-1" />}
                  Odłącz
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Zamknij
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
