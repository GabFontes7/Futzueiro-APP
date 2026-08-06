import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ClipboardList, Copy, Flag } from 'lucide-react'
import { PitchBoard } from '@/components/resumo/PitchBoard'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePlayersContext } from '@/context/PlayersContext'
import { useRachaContext } from '@/context/RachaContext'
import { buildWhatsAppShareText } from '@/lib/whatsapp'
import { useI18n } from '@/i18n'
import type { Player, PlayerId } from '@/types'

export function ResumoStep() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { players } = usePlayersContext()
  const {
    currentDraw,
    completePackOpening,
    packOpeningDone,
    finalizeRacha,
  } = useRachaContext()

  const [copied, setCopied] = useState(false)

  const playersById = useMemo(() => {
    const map = new Map<PlayerId, Player>()
    for (const player of players) map.set(player.id, player)
    return map
  }, [players])

  useEffect(() => {
    if (currentDraw && !packOpeningDone) {
      completePackOpening()
    }
  }, [completePackOpening, currentDraw, packOpeningDone])

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2500)
    return () => window.clearTimeout(timer)
  }, [copied])

  const shareText = useMemo(() => {
    if (!currentDraw) return ''
    return buildWhatsAppShareText(currentDraw, playersById)
  }, [currentDraw, playersById])

  const handleCopy = async () => {
    if (!shareText) return
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
    } catch {
      // Fallback para ambientes sem clipboard API
      const area = document.createElement('textarea')
      area.value = shareText
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.left = '-9999px'
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      document.body.removeChild(area)
      setCopied(true)
    }
  }

  const handleFinalize = async () => {
    const confirmed = window.confirm(t.racha.resumo.finalizeConfirm)
    if (!confirmed) return
    const result = await finalizeRacha()
    if (result.error) {
      window.alert(result.error)
    }
    navigate('/votacao')
  }

  if (!currentDraw) {
    return (
      <EmptyState
        icon={ClipboardList}
        title={t.racha.resumo.empty}
        description={t.racha.resumo.emptyHint}
      >
        <Link
          to="/novo-racha/sorteio"
          className="mt-1 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-4 py-2.5 text-sm font-bold text-[var(--color-text-inverse)]"
        >
          {t.racha.resumo.goToDraw}
        </Link>
      </EmptyState>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <header>
        <h3 className="font-display text-3xl tracking-[0.06em] text-gradient-gold">
          {t.racha.resumo.title}
        </h3>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {t.racha.resumo.subtitle.replace('{mode}', currentDraw.mode)}
        </p>
      </header>

      <PitchBoard
        draw={currentDraw}
        playersById={playersById}
        teamTitle={t.racha.sorteio.teamTitle}
        avgLabel={t.racha.sorteio.avgLabel}
        proximosTitle={t.racha.sorteio.proximosTitle}
      />

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => void handleCopy()}
          className={[
            'flex w-full items-center justify-center gap-2 rounded-xl border py-3.5 text-sm font-bold transition-all',
            copied
              ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-300'
              : 'border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-[0_0_18px_rgba(245,197,24,0.35)]',
          ].join(' ')}
        >
          {copied ? (
            <>
              <Check className="size-4" strokeWidth={3} />
              {t.racha.resumo.copied}
            </>
          ) : (
            <>
              <Copy className="size-4" />
              {t.racha.resumo.copyWhatsApp}
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => void handleFinalize()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-black/40 py-3.5 text-sm font-bold text-[var(--color-accent)] transition-colors hover:bg-white/5"
        >
          <Flag className="size-4" />
          {t.racha.resumo.finalize}
        </button>
      </div>
    </div>
  )
}
