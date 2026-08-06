import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Loader2, Trophy } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { getDeviceId } from '@/lib/deviceId'
import { formatGameLabel } from '@/lib/gameNumber'
import {
  castVote,
  fetchOpenMatch,
  hasDeviceVoted,
  supabaseReady,
} from '@/lib/voting'
import { useI18n } from '@/i18n'
import type { MatchVoteStatus, PlayerId } from '@/types'

export function VotacaoPage() {
  const { t } = useI18n()
  const deviceId = useMemo(() => getDeviceId(), [])
  const [match, setMatch] = useState<MatchVoteStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [alreadyVoted, setAlreadyVoted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (!supabaseReady()) {
      setMatch(null)
      setLoading(false)
      return
    }

    const open = await fetchOpenMatch()
    setMatch(open)

    if (open) {
      const voted = await hasDeviceVoted(open.matchId, deviceId)
      setAlreadyVoted(voted)
      setSuccess(voted)
    } else {
      setAlreadyVoted(false)
      setSuccess(false)
    }

    setLoading(false)
  }, [deviceId])

  useEffect(() => {
    void load()
  }, [load])

  const handleVote = async (playerId: PlayerId) => {
    if (!match || alreadyVoted || submitting) return
    setSubmitting(true)
    setError(null)

    const result = await castVote({
      matchId: match.matchId,
      deviceId,
      playerId,
    })

    setSubmitting(false)

    if (!result.ok) {
      if (result.error === 'already_voted') {
        setAlreadyVoted(true)
        setSuccess(true)
        return
      }
      setError(result.error ?? t.pages.votacao.voteError)
      return
    }

    setAlreadyVoted(true)
    setSuccess(true)
  }

  if (!supabaseReady()) {
    return (
      <section className="flex flex-col gap-4">
        <header>
          <h2 className="font-display text-3xl tracking-[0.06em] text-gradient-gold">
            {t.pages.votacao.title}
          </h2>
        </header>
        <EmptyState
          icon={Trophy}
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

  if (!match) {
    return (
      <section className="flex flex-col gap-4">
        <header>
          <h2 className="font-display text-3xl tracking-[0.06em] text-gradient-gold">
            {t.pages.votacao.title}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {t.pages.votacao.subtitle}
          </p>
        </header>
        <EmptyState
          icon={Trophy}
          title={t.pages.votacao.empty}
          description={t.pages.votacao.emptyHint}
        />
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4 pb-8">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-soft)]">
          {formatGameLabel(match.gameNumber, match.playedAt)} · {match.mode}
        </p>
        <h2 className="font-display text-3xl tracking-[0.06em] text-gradient-gold">
          {t.pages.votacao.title}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {t.pages.votacao.subtitle}
        </p>
      </header>

      {success || alreadyVoted ? (
        <div className="panel-ut flex flex-col items-center gap-3 px-4 py-10 text-center">
          <div className="flex size-14 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/15 text-emerald-300">
            <Check className="size-7" strokeWidth={2.5} />
          </div>
          <h3 className="font-display text-2xl tracking-[0.08em] text-gradient-gold">
            {t.pages.votacao.registered}
          </h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            {t.pages.votacao.registeredHint}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-[var(--color-text-muted)]">
            {t.pages.votacao.pickHint}
          </p>
          <ul className="flex flex-col gap-2">
            {match.candidates.map((candidate) => (
              <li key={candidate.id}>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleVote(candidate.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-[var(--color-border)] bg-black/30 px-4 py-3.5 text-left transition-all hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-elevated)] active:scale-[0.99] disabled:opacity-60"
                >
                  <span className="font-display text-xl tracking-wider text-[var(--color-text)]">
                    {candidate.name}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                    {t.pages.votacao.voteAction}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {error && (
        <p className="text-center text-sm text-red-400">{error}</p>
      )}
    </section>
  )
}
