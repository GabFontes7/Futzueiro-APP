import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { PlayerCard } from '@/components/cards/PlayerCard'
import { buildRevealQueue, firePackConfetti } from '@/lib/packOpening'
import { useI18n } from '@/i18n'
import type { DrawResult, Player, PlayerId } from '@/types'

interface PackOpeningProps {
  draw: DrawResult
  playersById: Map<PlayerId, Player>
  onComplete: () => void
}

export function PackOpening({
  draw,
  playersById,
  onComplete,
}: PackOpeningProps) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const queue = useMemo(() => buildRevealQueue(draw), [draw])

  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    setIndex(0)
    setRevealed(false)
  }, [draw.id])

  const current = queue[index]
  const player = current ? playersById.get(current.playerId) : undefined
  const total = queue.length
  const isLast = index >= total - 1

  const badgeLabel =
    current?.destination === 'proximos'
      ? t.racha.pack.badgeProximos
      : t.racha.pack.badgeTeam.replace('{label}', String(current?.destination ?? ''))

  const finish = useCallback(() => {
    onComplete()
    navigate('/novo-racha/resumo')
  }, [navigate, onComplete])

  const reveal = useCallback(() => {
    if (revealed || !player) return
    setRevealed(true)
    firePackConfetti()
  }, [player, revealed])

  const goNext = useCallback(() => {
    if (!revealed) {
      reveal()
      return
    }
    if (isLast) {
      finish()
      return
    }
    setIndex((prev) => prev + 1)
    setRevealed(false)
  }, [finish, isLast, reveal, revealed])

  if (!current || !player) {
    return null
  }

  return (
    <div className="relative flex min-h-[70dvh] flex-col">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-soft)]">
            {t.racha.pack.progress
              .replace('{current}', String(index + 1))
              .replace('{total}', String(total))}
          </p>
          <h3 className="font-display text-2xl tracking-[0.08em] text-gradient-gold">
            {t.racha.pack.title}
          </h3>
        </div>

        <button
          type="button"
          onClick={finish}
          className="rounded-xl border border-[var(--color-border)] bg-black/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-accent)] transition-colors hover:bg-white/5"
        >
          {t.racha.pack.revealAll}
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${current.playerId}-${index}`}
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ duration: 0.28 }}
            className="flex w-full flex-col items-center gap-4"
          >
            <span
              className={[
                'rounded-full border px-4 py-1.5 font-display text-xl tracking-[0.12em]',
                current.destination === 'proximos'
                  ? 'border-white/20 bg-white/5 text-[var(--color-text-muted)]'
                  : 'border-[var(--color-border-strong)] bg-black/50 text-[var(--color-accent)] shadow-[0_0_18px_rgba(245,197,24,0.25)]',
              ].join(' ')}
            >
              {badgeLabel}
            </span>

            <button
              type="button"
              onClick={reveal}
              aria-label={
                revealed
                  ? t.racha.pack.cardRevealed
                  : t.racha.pack.tapToReveal
              }
              className="relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]"
            >
              <motion.div
                animate={
                  revealed
                    ? { rotateY: 0, scale: 1, filter: 'blur(0px)' }
                    : { rotateY: -8, scale: 0.98, filter: 'blur(18px)' }
                }
                transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                <PlayerCard
                  name={player.name}
                  overall={player.overall}
                  size="lg"
                  className="pointer-events-none shadow-[0_20px_50px_rgba(0,0,0,0.55)]"
                />
              </motion.div>

              {!revealed && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[var(--radius-card)] bg-black/25">
                  <span className="rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] backdrop-blur-sm">
                    {t.racha.pack.tapToReveal}
                  </span>
                </span>
              )}
            </button>

            <AnimatePresence>
              {revealed && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="font-display text-3xl tracking-[0.1em] text-[var(--color-text)]"
                >
                  {player.name}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={goNext}
          className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-accent)] py-3.5 text-sm font-bold text-[var(--color-text-inverse)] shadow-[0_0_18px_rgba(245,197,24,0.35)] transition-transform active:scale-[0.98]"
        >
          {!revealed
            ? t.racha.pack.tapToReveal
            : isLast
              ? t.racha.pack.finish
              : t.common.next}
        </button>

        {!revealed && (
          <p className="text-center text-[11px] text-[var(--color-text-muted)]">
            {t.racha.pack.hint}
          </p>
        )}
      </div>
    </div>
  )
}
