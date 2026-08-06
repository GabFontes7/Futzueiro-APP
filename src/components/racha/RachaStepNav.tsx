import { NavLink } from 'react-router-dom'
import { useI18n } from '@/i18n'
import type { RachaStep } from '@/types'

const steps: { path: RachaStep; number: number }[] = [
  { path: 'presenca', number: 1 },
  { path: 'sorteio', number: 2 },
  { path: 'resumo', number: 3 },
]

export function RachaStepNav() {
  const { t } = useI18n()

  return (
    <ol className="mb-4 flex gap-1.5" aria-label="Passos do racha">
      {steps.map((step) => (
        <li key={step.path} className="min-w-0 flex-1">
          <NavLink
            to={`/novo-racha/${step.path}`}
            className={({ isActive }) =>
              [
                'flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-center transition-all',
                isActive
                  ? 'border-[var(--color-accent)] bg-[var(--color-surface-elevated)] text-[var(--color-accent)] shadow-[0_0_14px_rgba(245,197,24,0.25)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]',
              ].join(' ')
            }
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-black/50 font-display text-sm text-[var(--color-accent)]">
              {step.number}
            </span>
            <span className="truncate text-[9px] font-semibold uppercase tracking-wide leading-tight">
              {t.racha.steps[step.path]}
            </span>
          </NavLink>
        </li>
      ))}
    </ol>
  )
}
