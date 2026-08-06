import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, Sparkles, Users } from 'lucide-react'
import { PackOpening } from '@/components/sorteio/PackOpening'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePlayersContext } from '@/context/PlayersContext'
import { useRachaContext } from '@/context/RachaContext'
import { getImmunePlayerIds } from '@/lib/draw'
import { useI18n } from '@/i18n'
import type { Player, PlayerId, TeamLabel } from '@/types'

function TeamBlock({
  label,
  playerIds,
  playersById,
  average,
  teamTitle,
  avgLabel,
}: {
  label: TeamLabel
  playerIds: PlayerId[]
  playersById: Map<PlayerId, Player>
  average: number
  teamTitle: string
  avgLabel: string
}) {
  return (
    <section className="panel-ut p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="font-display text-2xl tracking-[0.08em] text-gradient-gold">
          {teamTitle.replace('{label}', label)}
        </h3>
        <span className="text-xs font-semibold text-[var(--color-accent-soft)]">
          {avgLabel} {average.toFixed(1)}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {playerIds.map((id) => {
          const player = playersById.get(id)
          if (!player) return null
          return (
            <li
              key={id}
              className="flex items-center justify-between rounded-lg bg-black/25 px-2.5 py-2"
            >
              <span className="truncate font-display text-lg tracking-wider">
                {player.name}
              </span>
              <span className="font-display text-lg text-[var(--color-accent)]">
                {player.overall}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function SorteioStep() {
  const { t } = useI18n()
  const { players } = usePlayersContext()
  const {
    presentIds,
    presentCount,
    currentDraw,
    packOpeningDone,
    ensureDraw,
    redraw,
    completePackOpening,
    restartPackOpening,
    lastDraw,
  } = useRachaContext()

  const playersById = useMemo(() => {
    const map = new Map<PlayerId, Player>()
    for (const player of players) map.set(player.id, player)
    return map
  }, [players])

  const immuneIds = useMemo(
    () => getImmunePlayerIds(presentIds, lastDraw),
    [presentIds, lastDraw],
  )

  useEffect(() => {
    if (presentCount > 0) {
      ensureDraw()
    }
  }, [presentCount, ensureDraw])

  if (presentCount === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t.racha.sorteio.noPresent}
        description={t.racha.sorteio.noPresentHint}
      >
        <Link
          to="/novo-racha/presenca"
          className="mt-1 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-4 py-2.5 text-sm font-bold text-[var(--color-text-inverse)]"
        >
          {t.racha.sorteio.backToPresence}
        </Link>
      </EmptyState>
    )
  }

  if (!currentDraw) {
    return (
      <EmptyState
        icon={Sparkles}
        title={t.racha.sorteio.drawing}
        description={t.racha.sorteio.drawingHint}
      />
    )
  }

  if (!packOpeningDone) {
    return (
      <PackOpening
        draw={currentDraw}
        playersById={playersById}
        onComplete={completePackOpening}
      />
    )
  }

  const teamLabels = Object.keys(currentDraw.teams).sort()

  return (
    <div className="flex flex-col gap-4 pb-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl tracking-[0.06em] text-gradient-gold">
            {t.racha.sorteio.title}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {t.racha.sorteio.subtitle
              .replace('{mode}', currentDraw.mode)
              .replace('{count}', String(presentCount))}
          </p>
          {immuneIds.size > 0 && (
            <p className="mt-2 text-[11px] text-[var(--color-accent-soft)]">
              {t.racha.sorteio.immuneHint.replace(
                '{count}',
                String(immuneIds.size),
              )}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-1.5">
          <button
            type="button"
            onClick={() => redraw()}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-black/30 px-3 py-2 text-xs font-semibold text-[var(--color-accent)] transition-colors hover:bg-white/5"
          >
            <RefreshCw className="size-3.5" />
            {t.racha.sorteio.redraw}
          </button>
          <button
            type="button"
            onClick={restartPackOpening}
            className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] hover:bg-white/5"
          >
            {t.racha.pack.replay}
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        {teamLabels.map((label) => (
          <TeamBlock
            key={label}
            label={label}
            playerIds={currentDraw.teams[label] ?? []}
            playersById={playersById}
            average={currentDraw.teamAverages[label] ?? 0}
            teamTitle={t.racha.sorteio.teamTitle}
            avgLabel={t.racha.sorteio.avgLabel}
          />
        ))}
      </div>

      {currentDraw.proximos.length > 0 && (
        <section className="rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-black/30 p-3">
          <h3 className="mb-2 font-display text-2xl tracking-[0.08em] text-[var(--color-text-muted)]">
            {t.racha.sorteio.proximosTitle}
          </h3>
          <ul className="flex flex-col gap-1.5">
            {currentDraw.proximos.map((id) => {
              const player = playersById.get(id)
              if (!player) return null
              return (
                <li
                  key={id}
                  className="flex items-center justify-between rounded-lg bg-black/25 px-2.5 py-2"
                >
                  <span className="truncate font-display text-lg tracking-wider text-[var(--color-text-muted)]">
                    {player.name}
                  </span>
                  <span className="font-display text-lg text-[var(--color-text-muted)]">
                    {player.overall}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <Link
        to="/novo-racha/resumo"
        className="flex w-full items-center justify-center rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-accent)] py-3 text-sm font-bold text-[var(--color-text-inverse)] shadow-[0_0_18px_rgba(245,197,24,0.35)]"
      >
        {t.racha.sorteio.goToSummary}
      </Link>
    </div>
  )
}
