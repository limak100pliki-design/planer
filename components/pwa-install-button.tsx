'use client'

import { useState } from 'react'
import { Download, Smartphone, Share, CheckCircle2, X } from 'lucide-react'
import { usePWAInstall } from '@/lib/usePWAInstall'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface PWAInstallButtonProps {
  variant?: 'sidebar' | 'header' | 'card'
  className?: string
}

export function PWAInstallButton({ variant = 'sidebar', className }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall()
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  // If already running in standalone PWA mode, don't clutter the UI
  if (isInstalled) {
    if (variant === 'card') {
      return (
        <div className="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/10 p-3.5 text-xs text-primary font-medium">
          <CheckCircle2 className="size-4.5 shrink-0 text-primary" />
          <div>
            <p className="font-semibold text-foreground">Aplikacja PWA zainstalowana na tym urządzeniu</p>
            <p className="text-[11px] text-muted-foreground">
              Stała sesja jest aktywna — jesteś zawsze zalogowany(a), a Twoje plany i pomiary działają również offline.
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true)
      try {
        await install()
      } finally {
        setIsInstalling(false)
      }
    } else if (isIOS) {
      setShowIOSGuide(true)
    } else {
      // General prompt or information
      setShowIOSGuide(true)
    }
  }

  if (variant === 'header') {
    return (
      <>
        <Button
          size="sm"
          variant="outline"
          onClick={handleInstallClick}
          disabled={isInstalling}
          className={`h-8 gap-1.5 border-primary/30 text-xs font-medium text-primary hover:bg-primary/10 ${className || ''}`}
        >
          <Download className="size-3.5" />
          <span className="hidden sm:inline">Zainstaluj aplikację</span>
          <span className="sm:hidden">Zainstaluj</span>
        </Button>

        <IOSInstallDialog open={showIOSGuide} onOpenChange={setShowIOSGuide} isIOS={isIOS} />
      </>
    )
  }

  if (variant === 'card') {
    return (
      <>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/30 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Smartphone className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Aplikacja na telefon (PWA)</p>
              <p className="text-xs text-muted-foreground">
                Zainstaluj planer na ekranie głównym — aplikacja pozostaje <span className="font-medium text-foreground">zawsze zalogowana</span>, działa pełnoekranowo i jest dostępna offline.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="gap-2 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Download className="size-4" />
            {isInstallable ? 'Zainstaluj teraz' : 'Jak zainstalować'}
          </Button>
        </div>

        <IOSInstallDialog open={showIOSGuide} onOpenChange={setShowIOSGuide} isIOS={isIOS} />
      </>
    )
  }

  // Default 'sidebar' variant
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleInstallClick}
        disabled={isInstalling}
        className={`h-7.5 w-full justify-start gap-1.5 text-xs font-medium border-primary/30 text-primary hover:bg-primary/10 transition-colors ${className || ''}`}
      >
        <Smartphone className="size-3.5 shrink-0" />
        <span className="truncate">Zainstaluj na telefonie</span>
      </Button>

      <IOSInstallDialog open={showIOSGuide} onOpenChange={setShowIOSGuide} isIOS={isIOS} />
    </>
  )
}

function IOSInstallDialog({
  open,
  onOpenChange,
  isIOS,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isIOS: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Smartphone className="size-5 text-primary" />
            Instalacja na telefonie
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Aplikację możesz dodać do ekranu głównego swojego telefonu bez pobierania ze sklepu:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs text-foreground">
          {isIOS ? (
            <div className="space-y-2 rounded-xl bg-muted/50 p-3.5 border border-border/60">
              <p className="font-semibold text-foreground">Instrukcja dla iPhone / iPad (Safari):</p>
              <ol className="list-decimal pl-4 space-y-1.5 text-muted-foreground">
                <li>
                  Kliknij przycisk <span className="font-medium text-foreground">Udostępnij</span> (ikona kwadratu ze strzałką w górę na dolnym pasku Safari).
                </li>
                <li>
                  Przewiń w dół i wybierz <span className="font-medium text-foreground">„Do ekranu początkowego”</span> (ikona z plusem).
                </li>
                <li>
                  Kliknij <span className="font-semibold text-primary">Dodaj</span> w prawym górnym rogu.
                </li>
              </ol>
            </div>
          ) : (
            <div className="space-y-2 rounded-xl bg-muted/50 p-3.5 border border-border/60">
              <p className="font-semibold text-foreground">Instrukcja dla Android (Chrome / Opera):</p>
              <ol className="list-decimal pl-4 space-y-1.5 text-muted-foreground">
                <li>
                  Kliknij menu w przeglądarce (3 kropki w prawym górnym rogu Chrome).
                </li>
                <li>
                  Wybierz opcję <span className="font-medium text-foreground">„Zainstaluj aplikację”</span> lub <span className="font-medium text-foreground">„Dodaj do ekranu głównego”</span>.
                </li>
                <li>
                  Zatwierdź instalację. Aplikacja pojawi się wśród Twoich ikon na telefonie!
                </li>
              </ol>
            </div>
          )}
        </div>

        <Button
          size="sm"
          className="w-full mt-2"
          onClick={() => onOpenChange(false)}
        >
          Rozumiem
        </Button>
      </DialogContent>
    </Dialog>
  )
}
