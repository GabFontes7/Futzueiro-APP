import { useCallback, useEffect, useState } from 'react'
import { Award, Loader2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  fetchMonthAwards,
  fetchMonthlyStandings,
  fetchOpenMatch,
  fetchRecentClosedMatches,
  fetchYearTitleStandings,
  supabaseReady,
} from '@/lib/voting'
import { useI18n } from '@/i18n'
import type { GoldenBallEntry, MatchVoteStatus } from '@/types'

function StandingList({
  title,
  empty,
  entries,
  unit,
}: {
  title: string
  empty: string
  entries: GoldenBallEntry[]
  unit: string
}) {
  return (
    <div>
      <h3 className="mb-2 font-display text-2xl tracking-[0.08em] text-gradient-gold">
        {title}
      </h3>
      {entries.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">{empty}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((entry, index) => (
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
                  : entry.points.toFixed(1)}{' '}
                <span className="text-xs text-[var(--color-text-muted)]">
                  {unit}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export function BolaDeOuroPage() {
  const { t } = useI18n()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [monthBoard, setMonthBoard] = useState<GoldenBallEntry[]>([])
  const [yearBoard, setYearBoard] = useState<GoldenBallEntry[]>([])
  const [monthTitles, setMonthTitles] = useState<
    Array<{ periodKey: string; names: string }>
  >([])
  const [openMatch, setOpenMatch] = useState<MatchVoteStatus | null>(null)
  const [recent, setRecent] = useState<
    Array<{
      matchId: string
      gameNumber: number
      playedAt: string
      winners: GoldenBallEntry[]
    }>
  >([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    if (!supabaseReady()) {
      setLoading(false)
      return
    }

    const [monthly, yearly, titles, open, closed] = await Promise.all([
      fetchMonthlyStandings(year, month),
      fetchYearTitleStandings(year),
      fetchMonthAwards(year),
      fetchOpenMatch(),
      fetchRecentClosedMatches(8),
    ])

    setMonthBoard(monthly)
    setYearBoard(yearly)
    setOpenMatch(open)
    setRecent(closed)

    const byPeriod = new Map<string, string[]>()
    for (const award of titles) {
      const list = byPeriod.get(award.periodKey) ?? []
      list.push(award.playerName)
      byPeriod.set(award.periodKey, list)
    }
    setMonthTitles(
      [...byPeriod.entries()].map(([periodKey, names]) => ({
        periodKey,
        names: names.join(' · '),
      })),
    )

    setLoading(false)
  }, [month, year])

  useEffect(() => {
    void load()
  }, [load])

  if (!supabaseReady()) {
    return (
      <EmptyState
        icon={Award}
        title={t.pages.votacao.needsConfig}
        description={t.pages.votacao.needsConfigHint}
      />
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
    <section className="flex flex-col gap-6 pb-8">
      <header>
        <h2 className="font-display text-3xl tracking-[0.06em] text-gradient-gold">
          {t.pages.bolaDeOuro.title}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {t.pages.bolaDeOuro.subtitle.replace('{year}', String(year))}
        </p>
      </header>

      {openMatch && (
        <div className="panel-ut p-4 text-sm text-[var(--color-text-muted)]">
          {t.pages.bolaDeOuro.openVotingHint
            .replace('{game}', String(openMatch.gameNumber))
            .replace('{count}', String(openMatch.voteCount))}
        </div>
      )}

      <StandingList
        title={t.pages.bolaDeOuro.monthBoard}
        empty={t.pages.bolaDeOuro.monthEmpty}
        entries={monthBoard}
        unit={t.pages.bolaDeOuro.votesUnit}
      />

      <StandingList
        title={t.pages.bolaDeOuro.yearBoard}
        empty={t.pages.bolaDeOuro.yearEmpty}
        entries={yearBoard}
        unit={t.pages.bolaDeOuro.titlesUnit}
      />

      {monthTitles.length > 0 && (
        <div>
          <h3 className="mb-2 font-display text-2xl tracking-[0.08em] text-gradient-gold">
            {t.pages.bolaDeOuro.monthChampions}
          </h3>
          <ul className="flex flex-col gap-2">
            {monthTitles.map((item) => (
              <li
                key={item.periodKey}
                className="rounded-xl border border-[var(--color-border)] bg-black/25 px-3 py-2.5"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-soft)]">
                  {item.periodKey}
                </p>
                <p className="font-display text-lg tracking-wider">{item.names}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <h3 className="mb-2 font-display text-2xl tracking-[0.08em] text-gradient-gold">
            {t.pages.bolaDeOuro.recentDays}
          </h3>
          <ul className="flex flex-col gap-2">
            {recent.map((item) => (
              <li
                key={item.matchId}
                className="rounded-xl border border-[var(--color-border)] bg-black/25 px-3 py-2.5"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-soft)]">
                  {t.pages.bolaDeOuro.dayLabel.replace(
                    '{n}',
                    String(item.gameNumber),
                  )}
                </p>
                <p className="text-sm">
                  {item.winners.length === 0
                    ? t.pages.bolaDeOuro.noWinner
                    : item.winners.map((w) => w.playerName).join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
