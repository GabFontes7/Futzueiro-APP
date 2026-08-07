import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Loader2, Trophy } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { getDeviceId } from '@/lib/deviceId'
import { formatGameLabel } from '@/lib/gameNumber'
import {
  castBallot,
  fetchOpenMatch,
  hasUserVoted,
  supabaseReady,
} from '@/lib/voting'
import { useI18n } from '@/i18n'
import type { MatchVoteStatus, PlayerId } from '@/types'
import { MAX_DAY_PICKS } from '@/types'

function useCountdown(closesAt: string | null) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    if (!closesAt) {
      setRemaining('')
      return
    }

    const tick = () => {
      const ms = new Date(closesAt).getTime() - Date.now()
      if (ms <= 0) {
        setRemaining('00:00:00')
        return
      }
      const total = Math.floor(ms / 1000)
      const h = String(Math.floor(total / 3600)).padStart(2, '0')
      const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
      const s = String(total % 60).padStart(2, '0')
      setRemaining(`${h}:${m}:${s}`)
    }

    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [closesAt])

  return remaining
}

export function VotacaoPage() {
  const { t } = useI18n()
  const deviceId = useMemo(() => getDeviceId(), [])
  const [match, setMatch] = useState<MatchVoteStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<PlayerId[]>([])
  const [alreadyVoted, setAlreadyVoted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const countdown = useCountdown(match?.votingClosesAt ?? null)

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
      const voted = await hasUserVoted({
        matchId: open.matchId,
        deviceId,
      })
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

  useEffect(() => {
    if (countdown !== '00:00:00' || !match?.votingOpen) return
    const id = window.setTimeout(() => {
      void load()
    }, 800)
    return () => window.clearTimeout(id)
  }, [countdown, match?.votingOpen, load])

  const togglePick = (playerId: PlayerId) => {
    if (alreadyVoted || submitting) return
    setSelected((prev) => {
      if (prev.includes(playerId)) return prev.filter((id) => id !== playerId)
      if (prev.length >= MAX_DAY_PICKS) return prev
      return [...prev, playerId]
    })
  }

  const handleSubmit = async () => {
    if (!match || alreadyVoted || submitting || selected.length === 0) return
    setSubmitting(true)
    setError(null)

    const result = await castBallot({
      matchId: match.matchId,
      deviceId,
      picks: selected,
    })

    setSubmitting(false)

    if (!result.ok) {
      if (result.error === 'already_voted') {
        setAlreadyVoted(true)
        setSuccess(true)
        return
      }
      if (result.error === 'voting_closed') {
        setError(t.pages.votacao.closed)
        await load()
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

  if (!match || !match.votingOpen) {
    return (
      <section className="flex flex-col gap-4">
        <header>
          <h2 className="font-display text-3xl tracking-[0.06em] text-gradient-gold">
            {t.pages.votacao.title}
          </h2>
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
        {countdown && (
          <p className="mt-2 font-display text-2xl tracking-[0.12em] text-[var(--color-accent)]">
            {t.pages.votacao.timer.replace('{time}', countdown)}
          </p>
        )}
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
            {t.pages.votacao.pickHint.replace('{max}', String(MAX_DAY_PICKS))}
          </p>
          <ul className="flex flex-col gap-2">
            {match.candidates.map((candidate) => {
              const active = selected.includes(candidate.id)
              const order = selected.indexOf(candidate.id)
              return (
                <li key={candidate.id}>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => togglePick(candidate.id)}
                    className={[
                      'flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-all',
                      active
                        ? 'border-[var(--color-accent)] bg-[var(--color-surface-elevated)]'
                        : 'border-[var(--color-border)] bg-black/30',
                    ].join(' ')}
                  >
                    <span className="font-display text-xl tracking-wider">
                      {candidate.name}
                    </span>
                    {active && (
                      <span className="font-display text-lg text-[var(--color-accent)]">
                        #{order + 1}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>

          <button
            type="button"
            disabled={submitting || selected.length === 0}
            onClick={() => void handleSubmit()}
            className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-accent)] py-3.5 text-sm font-bold text-[var(--color-text-inverse)] disabled:opacity-50"
          >
            {t.pages.votacao.confirm
              .replace('{count}', String(selected.length))
              .replace('{max}', String(MAX_DAY_PICKS))}
          </button>
        </>
      )}

      {error && <p className="text-center text-sm text-red-400">{error}</p>}
    </section>
  )
}
