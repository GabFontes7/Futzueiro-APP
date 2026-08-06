import { getTeamEmoji, formatTeamAverage } from '@/lib/whatsapp'
import type { DrawResult, Player, PlayerId, TeamLabel } from '@/types'

interface PitchBoardProps {
  draw: DrawResult
  playersById: Map<PlayerId, Player>
  teamTitle: string
  avgLabel: string
  proximosTitle: string
}

function PlayerChip({ name, overall }: { name: string; overall: number }) {
  return (
    <div className="rounded-lg border border-white/20 bg-black/45 px-2 py-1.5 text-center shadow-sm backdrop-blur-[2px]">
      <p className="truncate font-display text-sm tracking-wider text-white leading-tight">
        {name}
      </p>
      <p className="font-display text-xs text-[var(--color-accent)]">{overall}</p>
    </div>
  )
}

function TeamZone({
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
    <div className="flex min-h-0 flex-col gap-2 rounded-xl border border-white/15 bg-black/25 p-2">
      <div className="text-center">
        <p className="font-display text-lg tracking-[0.08em] text-white">
          {getTeamEmoji(label)} {teamTitle.replace('{label}', label)}
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-100/80">
          {avgLabel} {formatTeamAverage(average)}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-2">
        {playerIds.map((id) => {
          const player = playersById.get(id)
          if (!player) return null
          return (
            <PlayerChip
              key={id}
              name={player.name}
              overall={player.overall}
            />
          )
        })}
      </div>
    </div>
  )
}

/**
 * Campinho estilizado: fundo verde + linhas, times em zonas, próximos abaixo.
 */
export function PitchBoard({
  draw,
  playersById,
  teamTitle,
  avgLabel,
  proximosTitle,
}: PitchBoardProps) {
  const teamLabels = Object.keys(draw.teams).sort()
  const columns =
    teamLabels.length <= 1 ? 1 : teamLabels.length === 2 ? 2 : teamLabels.length === 3 ? 3 : 2

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative overflow-hidden rounded-2xl border border-emerald-700/50 shadow-[inset_0_0_40px_rgba(0,0,0,0.35)]"
        style={{
          background: `
            linear-gradient(90deg, rgba(255,255,255,0.06) 0 2px, transparent 2px),
            linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px),
            repeating-linear-gradient(
              90deg,
              #1b7a3c 0px,
              #1b7a3c 28px,
              #196f37 28px,
              #196f37 56px
            )
          `,
          backgroundSize: '100% 100%, 100% 12px, 56px 100%',
        }}
      >
        {/* Linha central */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-3 left-1/2 w-px -translate-x-1/2 bg-white/35"
        />
        {/* Círculo central */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30"
        />
        {/* Áreas */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-8 left-2 w-8 rounded-r-md border border-white/25 border-l-0"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-8 right-2 w-8 rounded-l-md border border-white/25 border-r-0"
        />

        <div
          className="relative z-10 grid gap-2 p-3"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
          {teamLabels.map((label) => (
            <TeamZone
              key={label}
              label={label}
              playerIds={draw.teams[label] ?? []}
              playersById={playersById}
              average={draw.teamAverages[label] ?? 0}
              teamTitle={teamTitle}
              avgLabel={avgLabel}
            />
          ))}
        </div>
      </div>

      {draw.proximos.length > 0 && (
        <section className="rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] p-3">
          <h4 className="mb-2 text-center font-display text-xl tracking-[0.08em] text-[var(--color-text-muted)]">
            ⏳ {proximosTitle}
          </h4>
          <div className="flex flex-wrap justify-center gap-2">
            {draw.proximos.map((id) => {
              const player = playersById.get(id)
              if (!player) return null
              return (
                <div
                  key={id}
                  className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5"
                >
                  <span className="font-display text-base tracking-wider text-[var(--color-text-muted)]">
                    {player.name}{' '}
                    <span className="text-[var(--color-accent-dim)]">
                      ({player.overall})
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
