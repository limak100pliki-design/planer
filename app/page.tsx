import { AppShell } from '@/components/app-shell'
import { PlannerProvider } from '@/lib/store'

export default function Page() {
  return (
    <PlannerProvider>
      <AppShell />
    </PlannerProvider>
  )
}

