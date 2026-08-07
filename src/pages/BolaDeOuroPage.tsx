import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Award, Loader2, Medal, Trophy, type LucideIcon } from 'lucide-react'
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

function CategoryHeader({
  icon: Icon,
  title,
  hint,
  tone,
}: {
  icon: LucideIcon
  title: string
  hint?: string
  tone: 'rodada' | 'mes' | 'ano'
}) {
  const toneClass =
    tone === 'ano'
      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)] shadow-[0_0_18px_rgba(245,197,24,0.25)]'
      : tone === 'mes'
        ? 'border-amber-300/50 bg-amber-400/10 text-amber-200'
        : 'border-[var(--color-border)] bg-white/5 text-[var(--color-text-muted)]'

  return (
    <div className="mb-3 flex items-start gap-3">
      <span
        className={[
          'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border',
          toneClass,
        ].join(' ')}
      >
        <Icon
          className={tone === 'ano' ? 'size-5' : tone === 'mes' ? 'size-5' : 'size-4'}
          strokeWidth={tone === 'ano' ? 2.4 : 2}
        />
      </span>
      <div className="min-w-0">
        <h3 className="font-display text-2xl tracking-[0.08em] text-gradient-gold">
          {title}
        </h3>
        {hint && (
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{hint}</p>
        )}
      </div>
    </div>
  )
}

function StandingList({
  empty,
  entries,
  unit,
}: {
  empty: string
  entries: GoldenBallEntry[]
  unit: string
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)]">{empty}</p>
  }

  return (
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
            {Number.isInteger(entry.points) ? entry.points : entry.points.toFixed(1)}{' '}
            <span className="text-xs text-[var(--color-text-muted)]">{unit}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

function AwardSection({
  children,
}: {
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-black/20 p-4">
      {children}
    </section>
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
    <section className="flex flex-col gap-5 pb-8">
      <header>
        <h2 className="font-display text-3xl tracking-[0.06em] text-gradient-gold">
          {t.pages.bolaDeOuro.title}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {t.pages.bolaDeOuro.subtitle.replace('{year}', String(year))}
        </p>
      </header>

      {/* 1 · Craque da Rodada */}
      <AwardSection>
        <CategoryHeader
          icon={Trophy}
          title={t.pages.bolaDeOuro.rodadaTitle}
          hint={t.pages.bolaDeOuro.rodadaHint}
          tone="rodada"
        />

        {openMatch && (
          <p className="mb-3 text-sm text-[var(--color-text-muted)]">
            {t.pages.bolaDeOuro.openVotingHint
              .replace('{game}', String(openMatch.gameNumber))
              .replace('{count}', String(openMatch.voteCount))}
          </p>
        )}

        {recent.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            {t.pages.bolaDeOuro.rodadaEmpty}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recent.map((item) => (
              <li
                key={item.matchId}
                className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-black/30 px-3 py-2.5"
              >
                <Trophy className="size-4 shrink-0 text-[var(--color-text-muted)]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-soft)]">
                    {t.pages.bolaDeOuro.rodadaLabel.replace(
                      '{n}',
                      String(item.gameNumber),
                    )}
                  </p>
                  <p className="truncate font-display text-lg tracking-wider">
                    {item.winners.length === 0
                      ? t.pages.bolaDeOuro.noWinner
                      : item.winners.map((w) => w.playerName).join(' · ')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AwardSection>

      {/* 2 · Melhor do Mês */}
      <AwardSection>
        <CategoryHeader
          icon={Medal}
          title={t.pages.bolaDeOuro.mesTitle}
          hint={t.pages.bolaDeOuro.mesHint}
          tone="mes"
        />

        <StandingList
          empty={t.pages.bolaDeOuro.monthEmpty}
          entries={monthBoard}
          unit={t.pages.bolaDeOuro.votesUnit}
        />

        {monthTitles.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-soft)]">
              {t.pages.bolaDeOuro.monthChampions}
            </p>
            <ul className="flex flex-col gap-2">
              {monthTitles.map((item) => (
                <li
                  key={item.periodKey}
                  className="flex items-center gap-3 rounded-xl border border-amber-300/25 bg-amber-400/5 px-3 py-2.5"
                >
                  <Medal className="size-4 shrink-0 text-amber-200" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-soft)]">
                      {item.periodKey}
                    </p>
                    <p className="truncate font-display text-lg tracking-wider">
                      {item.names}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </AwardSection>

      {/* 3 · Bola de Ouro (ano) */}
      <AwardSection>
        <CategoryHeader
          icon={Award}
          title={t.pages.bolaDeOuro.anoTitle}
          hint={t.pages.bolaDeOuro.anoHint.replace('{year}', String(year))}
          tone="ano"
        />

        <StandingList
          empty={t.pages.bolaDeOuro.yearEmpty}
          entries={yearBoard}
          unit={t.pages.bolaDeOuro.titlesUnit}
        />
      </AwardSection>
    </section>
  )
}
