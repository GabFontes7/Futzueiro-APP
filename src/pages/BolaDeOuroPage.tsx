import { useCallback, useEffect, useState } from 'react'
import { Award, Loader2, Lock } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatGameLabel } from '@/lib/gameNumber'
import {
  closeMatchVoting,
  fetchLatestMatch,
  fetchOpenMatch,
  fetchRecentClosedMatches,
  fetchYearStandings,
  supabaseReady,
} from '@/lib/voting'
import { useI18n } from '@/i18n'
import type { GoldenBallEntry, MatchVoteStatus } from '@/types'

export function BolaDeOuroPage() {
  const { t } = useI18n()
  const year = new Date().getFullYear()
  const [standings, setStandings] = useState<GoldenBallEntry[]>([])
  const [openMatch, setOpenMatch] = useState<MatchVoteStatus | null>(null)
  const [latest, setLatest] = useState<MatchVoteStatus | null>(null)
  const [recent, setRecent] = useState<
    Array<{
      matchId: string
      gameNumber: number
      playedAt: string
      winners: GoldenBallEntry[]
    }>
  >([])
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    if (!supabaseReady()) {
      setLoading(false)
      return
    }

    const [yearBoard, open, last, closed] = await Promise.all([
      fetchYearStandings(year),
      fetchOpenMatch(),
      fetchLatestMatch(),
      fetchRecentClosedMatches(8),
    ])

    setStandings(yearBoard)
    setOpenMatch(open)
    setLatest(last)
    setRecent(closed)
    setLoading(false)
  }, [year])

  useEffect(() => {
    void load()
  }, [load])

  const handleClose = async () => {
    if (!openMatch) return
    const confirmed = window.confirm(t.pages.bolaDeOuro.closeConfirm)
    if (!confirmed) return

    setClosing(true)
    setMessage(null)
    const result = await closeMatchVoting(openMatch.matchId)
    setClosing(false)

    if (!result.ok) {
      setMessage(result.error ?? t.pages.bolaDeOuro.closeError)
      return
    }

    if (!result.winners?.length) {
      setMessage(t.pages.bolaDeOuro.closedNoVotes)
    } else {
      const names = result.winners.map((w) => w.playerName).join(', ')
      const pts = result.winners[0]?.points ?? 0
      setMessage(
        t.pages.bolaDeOuro.closedSuccess
          .replace('{names}', names)
          .replace('{points}', pts === 1 ? '1' : pts.toFixed(2).replace(/\.?0+$/, '')),
      )
    }

    await load()
  }

  if (!supabaseReady()) {
    return (
      <section className="flex flex-col gap-4">
        <header>
          <h2 className="font-display text-3xl tracking-[0.06em] text-gradient-gold">
            {t.pages.bolaDeOuro.title}
          </h2>
        </header>
        <EmptyState
          icon={Award}
          title={t.pages.votacao.needsConfig}
          description={t.pages.votacao.needsConfigHint}
        />
      </section>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[40dvh] items-center justify-center text-[var(--color-text-muted)]">
        <Loader2 className="size-6 animate-spin" />
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-5 pb-8">
      <header>
        <h2 className="font-display text-3xl tracking-[0.06em] text-gradient-gold">
          {t.pages.bolaDeOuro.title}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {t.pages.bolaDeOuro.subtitle.replace('{year}', String(year))}
        </p>
      </header>

      {openMatch && (
        <div className="panel-ut flex flex-col gap-3 p-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-soft)]">
              {t.pages.bolaDeOuro.openVoting}
            </p>
            <p className="font-display text-xl tracking-wider text-[var(--color-text)]">
              {formatGameLabel(openMatch.gameNumber, openMatch.playedAt)}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {t.pages.bolaDeOuro.votesSoFar.replace(
                '{count}',
                String(openMatch.voteCount),
              )}
            </p>
          </div>
          <button
            type="button"
            disabled={closing}
            onClick={() => void handleClose()}
            className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-black/40 py-3 text-sm font-bold text-[var(--color-accent)] disabled:opacity-60"
          >
            <Lock className="size-4" />
            {closing ? t.pages.bolaDeOuro.closing : t.pages.bolaDeOuro.closeVoting}
          </button>
        </div>
      )}

      {!openMatch && latest && (
        <p className="text-center text-xs text-[var(--color-text-muted)]">
          {t.pages.bolaDeOuro.noOpen.replace(
            '{label}',
            formatGameLabel(latest.gameNumber, latest.playedAt),
          )}
        </p>
      )}

      {message && (
        <p className="rounded-xl border border-[var(--color-border)] bg-black/30 px-3 py-2 text-center text-sm text-[var(--color-accent)]">
          {message}
        </p>
      )}

      <div>
        <h3 className="mb-2 font-display text-2xl tracking-[0.08em] text-gradient-gold">
          {t.pages.bolaDeOuro.yearBoard}
        </h3>
        {standings.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            {t.pages.bolaDeOuro.yearEmpty}
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {standings.map((entry, index) => (
              <li
                key={entry.playerId}
                className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-black/30 px-3 py-3"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-[var(--color-accent)] font-display text-lg text-[var(--color-text-inverse)]">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-display text-xl tracking-wider">
                  {entry.playerName}
                </span>
                <span className="font-display text-xl text-[var(--color-accent)]">
                  {Number.isInteger(entry.points)
                    ? entry.points
                    : entry.points.toFixed(2).replace(/\.?0+$/, '')}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {recent.length > 0 && (
        <div>
          <h3 className="mb-2 font-display text-2xl tracking-[0.08em] text-gradient-gold">
            {t.pages.bolaDeOuro.recent}
          </h3>
          <ul className="flex flex-col gap-2">
            {recent.map((item) => (
              <li
                key={item.matchId}
                className="rounded-xl border border-[var(--color-border)] bg-black/25 px-3 py-2.5"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-soft)]">
                  {formatGameLabel(item.gameNumber, item.playedAt)}
                </p>
                <p className="mt-1 text-sm text-[var(--color-text)]">
                  {item.winners.length === 0
                    ? t.pages.bolaDeOuro.noWinner
                    : item.winners
                        .map(
                          (w) =>
                            `${w.playerName} (${Number.isInteger(w.points) ? w.points : w.points.toFixed(2).replace(/\.?0+$/, '')})`,
                        )
                        .join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
