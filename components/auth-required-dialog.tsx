'use client'

import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Lock,
  Loader2,
  RefreshCw,
  Scale,
  Sparkles,
  UtensilsCrossed,
  WifiOff,
} from 'lucide-react'
import { usePlanner } from '@/lib/store'
import { Button } from '@/components/ui/button'

export function AuthRequiredDialog() {
  const { user, isLoadingAuth, login, authError, clearAuthError } = usePlanner()
  const [mounted, setMounted] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [copiedDomain, setCopiedDomain] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine)
    }

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Lock background scrolling while the blocking modal is visible
  useEffect(() => {
    if (!mounted) return
    const shouldLock = !user && !isLoadingAuth

    if (shouldLock) {
      const originalStyle = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalStyle
      }
    }
  }, [mounted, user, isLoadingAuth])

  // Prevent Escape key from dismissing the modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !user && !isLoadingAuth) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [user, isLoadingAuth])

  // Do not render during SSR or while auth is still restoring from IndexedDB/cache
  if (!mounted || isLoadingAuth || user) {
    return null
  }

  const handleLogin = async () => {
    setIsLoggingIn(true)
    try {
      await login()
    } finally {
      setIsLoggingIn(false)
    }
  }

  const copyDomain = async (domain?: string) => {
    if (!domain) return
    try {
      await navigator.clipboard.writeText(domain)
      setCopiedDomain(true)
      setTimeout(() => setCopiedDomain(false), 2000)
    } catch {
      // fallback
    }
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      aria-describedby="auth-modal-desc"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl text-card-foreground animate-in zoom-in-95 duration-200 sm:p-7">
        {/* Top visual badge */}
        <div className="flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-8 ring-amber-500/5 mb-4">
            <Lock className="size-7" />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">
            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
            Wymagane logowanie
          </span>

          <h2 id="auth-modal-title" className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Zostałeś wylogowany
          </h2>
          <p id="auth-modal-desc" className="mt-2 text-xs text-muted-foreground leading-relaxed sm:text-sm">
            Twoja sesja wygasła lub nastąpiło wylogowanie z konta. Aby korzystać z Planera Posiłków, synchronizować
            posiłki, przepisy i pomiary, musisz się zalogować.
          </p>
        </div>

        {/* Feature benefits list */}
        <div className="my-5 space-y-2 rounded-xl border border-border/70 bg-muted/40 p-3.5 text-xs">
          <div className="flex items-center gap-2.5 text-foreground font-medium">
            <CheckCircle2 className="size-4 shrink-0 text-primary" />
            <span>Stałe logowanie — aplikacja nie wyloguje Cię w PWA</span>
          </div>
          <div className="flex items-center gap-2.5 text-foreground font-medium">
            <UtensilsCrossed className="size-4 shrink-0 text-primary" />
            <span>Pełny dostęp do Twoich przepisów i jadłospisu</span>
          </div>
          <div className="flex items-center gap-2.5 text-foreground font-medium">
            <Scale className="size-4 shrink-0 text-primary" />
            <span>Dostęp do monitora wagi, talii i bioder oraz konta partnerskiego</span>
          </div>
        </div>

        {/* Offline Warning Notice */}
        {!isOnline && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 font-medium">
            <WifiOff className="size-4 shrink-0" />
            <span>Brak połączenia z siecią — włącz Wi-Fi lub dane komórkowe, aby się zalogować.</span>
          </div>
        )}

        {/* Auth Error Box (if popup blocked or domain authorization needed) */}
        {authError && (
          <div className="mb-4 space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 text-xs text-destructive">
            <div className="flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">
                  {authError.isPopupBlocked
                    ? 'Wyskakujące okno zostało zablokowane'
                    : authError.isUnauthorizedDomain
                      ? 'Wymagana autoryzacja domeny Firebase'
                      : 'Błąd logowania'}
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  {authError.isPopupBlocked
                    ? 'Twoja przeglądarka zablokowała wyskakujące okno logowania Google. Zezwól na wyskakujące okienka dla tej strony w pasku adresu i kliknij ponownie Zaloguj.'
                    : authError.isUnauthorizedDomain
                      ? 'Dodaj poniższą domenę w konsoli Firebase Auth (sekcja Authorized domains).'
                      : authError.message || 'Nie udało się ukończyć logowania przez Google.'}
                </p>
              </div>
            </div>

            {authError.isUnauthorizedDomain && (
              <div className="rounded-lg border bg-background p-2.5 text-xs space-y-2">
                <div className="flex items-center justify-between font-mono text-[11px] text-foreground">
                  <span className="truncate">{authError.domain}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyDomain(authError.domain)}
                    className="h-6 gap-1 px-2 text-[10px]"
                  >
                    {copiedDomain ? <Check className="size-3 text-primary" /> : <Copy className="size-3" />}
                    {copiedDomain ? 'Skopiowano' : 'Kopiuj'}
                  </Button>
                </div>
                <a
                  href={`https://console.firebase.google.com/project/${authError.projectId}/authentication/settings`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 w-full rounded-md bg-primary py-1.5 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <ExternalLink className="size-3" />
                  Otwórz ustawienia Firebase
                </a>
              </div>
            )}
          </div>
        )}

        {/* Forced Login Action Button */}
        <div className="space-y-2.5">
          <Button
            size="lg"
            onClick={handleLogin}
            disabled={isLoggingIn || !isOnline}
            className="w-full h-11 gap-3 text-sm font-semibold shadow-md bg-foreground text-background hover:bg-foreground/90 transition-all cursor-pointer"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="size-4.5 animate-spin" />
                <span>Łączenie z kontem Google...</span>
              </>
            ) : (
              <>
                <GoogleLogo />
                <span>Zaloguj się przez Google</span>
              </>
            )}
          </Button>

          {authError && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearAuthError()
                handleLogin()
              }}
              className="w-full text-xs gap-1.5"
            >
              <RefreshCw className="size-3.5" />
              Spróbuj ponownie
            </Button>
          )}

          <p className="text-center text-[11px] text-muted-foreground pt-1">
            Po zalogowaniu sesja zostanie zabezpieczona na stałe na tym urządzeniu.
          </p>
        </div>
      </div>
    </div>
  )
}

function GoogleLogo() {
  return (
    <svg className="size-4.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}
