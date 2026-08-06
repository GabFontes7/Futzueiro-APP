import { Outlet } from 'react-router-dom'
import { RachaStepNav } from '@/components/racha/RachaStepNav'
import { useI18n } from '@/i18n'

export function NovoRachaPage() {
  const { t } = useI18n()

  return (
    <section className="flex flex-col gap-2">
      <header className="mb-1">
        <h2 className="font-display text-3xl tracking-[0.06em] text-gradient-gold">
          {t.nav.novoRacha}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {t.app.tagline}
        </p>
      </header>

      <RachaStepNav />
      <Outlet />
    </section>
  )
}
