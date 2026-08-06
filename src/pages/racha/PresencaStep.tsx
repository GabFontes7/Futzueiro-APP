import { Link } from 'react-router-dom'
import { Check, Users } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePlayersContext } from '@/context/PlayersContext'
import { useRachaContext } from '@/context/RachaContext'
import { useI18n } from '@/i18n'
import type { GameMode, RachaLayout } from '@/types'

function formatLayoutSummary(
  layout: RachaLayout,
  templates: {
    withProximos: string
    teamsOnly: string
    proximosOnly: string
    empty: string
  },
): string {
  const { presentCount, teamSize, teamCount, proximosCount } = layout

  if (presentCount === 0) return templates.empty

  if (teamCount === 0) {
    return templates.proximosOnly
      .replace('{presentes}', String(presentCount))
      .replace('{proximos}', String(proximosCount))
  }

  if (proximosCount === 0) {
    return templates.teamsOnly
      .replace('{presentes}', String(presentCount))
      .replace('{times}', String(teamCount))
      .replace('{tamanho}', String(teamSize))
  }

  return templates.withProximos
    .replace('{presentes}', String(presentCount))
    .replace('{times}', String(teamCount))
    .replace('{tamanho}', String(teamSize))
    .replace('{proximos}', String(proximosCount))
}

export function PresencaStep() {
  const { t } = useI18n()
  const { players } = usePlayersContext()
  const {
    mode,
    setMode,
    isPresent,
    togglePresent,
    markAll,
    clearAll,
    layout,
    presentCount,
  } = useRachaContext()

  const summary = formatLayoutSummary(layout, t.racha.presenca.summary)

  const modes: { value: GameMode; label: string }[] = [
    { value: '5x5', label: t.racha.presenca.mode5 },
    { value: '6x6', label: t.racha.presenca.mode6 },
  ]

  if (players.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t.racha.presenca.noPlayers}
        description={t.racha.presenca.noPlayersHint}
      >
        <Link
          to="/jogadores"
          className="mt-1 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-4 py-2.5 text-sm font-bold text-[var(--color-text-inverse)]"
        >
          {t.racha.presenca.goToPlayers}
        </Link>
      </EmptyState>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-28">
      {/* Modalidade */}
      <section className="panel-ut p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-soft)]">
          {t.racha.presenca.modeLabel}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {modes.map((item) => {
            const active = mode === item.value
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setMode(item.value)}
                className={[
                  'rounded-xl border px-3 py-3 font-display text-2xl tracking-[0.08em] transition-all',
                  active
                    ? 'border-[var(--color-accent)] bg-black/40 text-[var(--color-accent)] shadow-[0_0_16px_rgba(245,197,24,0.25)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]',
                ].join(' ')}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* Ações rápidas */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          {t.racha.presenca.listLabel} · {presentCount}/{players.length}
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => markAll(players.map((p) => p.id))}
            className="rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-accent)] transition-colors hover:bg-white/5"
          >
            {t.racha.presenca.markAll}
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-white/5"
          >
            {t.racha.presenca.unmarkAll}
          </button>
        </div>
      </div>

      {/* Lista de presença */}
      <ul className="flex flex-col gap-2">
        {players.map((player) => {
          const checked = isPresent(player.id)
          return (
            <li key={player.id}>
              <button
                type="button"
                onClick={() => togglePresent(player.id)}
                className={[
                  'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all',
                  checked
                    ? 'border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)]'
                    : 'border-[var(--color-border)] bg-black/20 opacity-80',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors',
                    checked
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-text-inverse)]'
                      : 'border-white/25 bg-transparent text-transparent',
                  ].join(' ')}
                >
                  <Check className="size-4" strokeWidth={3} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-xl tracking-wider text-[var(--color-text)]">
                    {player.name}
                  </span>
                </span>

                <span
                  className={[
                    'font-display text-xl leading-none',
                    player.overall >= 80
                      ? 'text-[var(--color-gold)]'
                      : player.overall >= 70
                        ? 'text-[var(--color-silver)]'
                        : 'text-[var(--color-bronze)]',
                  ].join(' ')}
                >
                  {player.overall}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {/* Footer dinâmico + avançar */}
      <div
        className="fixed bottom-0 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t border-[var(--color-border)] bg-[var(--color-bg)]/95 px-4 pt-3 backdrop-blur-xl"
        style={{ paddingBottom: 'calc(0.75rem + var(--safe-bottom))' }}
      >
        <div className="panel-ut mb-3 px-3 py-2.5 text-center">
          <p className="text-sm font-medium text-[var(--color-text)]">{summary}</p>
          {layout.teamCount > 0 && (
            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--color-accent-soft)]">
              {t.racha.presenca.teamsHint.replace(
                '{labels}',
                layout.teamLabels.map((l) => `Time ${l}`).join(' · '),
              )}
            </p>
          )}
        </div>

        <Link
          to="/novo-racha/sorteio"
          className="flex w-full items-center justify-center rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-accent)] py-3 text-sm font-bold text-[var(--color-text-inverse)] shadow-[0_0_18px_rgba(245,197,24,0.35)] transition-transform active:scale-[0.98]"
        >
          {t.racha.presenca.continueToDraw}
        </Link>
      </div>
    </div>
  )
}
