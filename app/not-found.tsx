import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
      <h1 className="text-3xl font-bold tracking-tight">404 — Strona nie znaleziona</h1>
      <p className="mt-2 text-sm text-muted-foreground">Przepraszamy, podana strona nie istnieje.</p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Wróć do planera
      </Link>
    </div>
  )
}
