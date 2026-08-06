import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { PlayerCard } from '@/components/cards/PlayerCard'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { clampOverall, getPlayerImageFileName } from '@/lib/players'
import type { Player, PlayerInput } from '@/types'
import { useI18n } from '@/i18n'

interface PlayerFormSheetProps {
  open: boolean
  player?: Player | null
  onClose: () => void
  onSubmit: (input: PlayerInput) => void | Promise<void>
}

const DEFAULT_OVERALL = 70

export function PlayerFormSheet({
  open,
  player,
  onClose,
  onSubmit,
}: PlayerFormSheetProps) {
  const { t } = useI18n()
  const isEditing = Boolean(player)
  const [name, setName] = useState('')
  const [overall, setOverall] = useState(DEFAULT_OVERALL)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(player?.name ?? '')
    setOverall(player?.overall ?? DEFAULT_OVERALL)
    setError(null)
    setSaving(false)
  }, [open, player])

  const previewName = name.trim() || 'Jogador'
  const expectedFile = useMemo(() => getPlayerImageFileName(previewName), [previewName])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError(t.pages.jogadores.form.nameRequired)
      return
    }

    setSaving(true)
    try {
      await onSubmit({
        name: trimmed,
        overall: clampOverall(overall),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      title={isEditing ? t.pages.jogadores.form.editTitle : t.pages.jogadores.form.createTitle}
      onClose={onClose}
    >
      <form className="flex flex-col gap-5" onSubmit={(e) => void handleSubmit(e)}>
        <div className="flex justify-center">
          <PlayerCard name={previewName} overall={overall} size="md" />
        </div>

        <p className="text-center text-[11px] text-[var(--color-text-muted)]">
          {t.pages.jogadores.form.imageHint}{' '}
          <span className="font-mono text-[var(--color-accent-soft)]">/cartas/{expectedFile}</span>
        </p>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-soft)]">
            {t.pages.jogadores.form.name}
          </span>
          <input
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              if (error) setError(null)
            }}
            placeholder={t.pages.jogadores.form.namePlaceholder}
            autoComplete="off"
            autoFocus
            className="rounded-xl border border-[var(--color-border)] bg-black/40 px-3 py-3 text-base text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
          />
          {error && <span className="text-xs text-red-400">{error}</span>}
        </label>

        <label className="flex flex-col gap-3">
          <div className="flex items-end justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-soft)]">
              {t.pages.jogadores.form.overall}
            </span>
            <span className="font-display text-3xl leading-none text-gradient-gold">
              {overall}
            </span>
          </div>
          <input
            type="range"
            min={50}
            max={99}
            step={1}
            value={overall}
            onChange={(event) => setOverall(Number(event.target.value))}
            className="w-full accent-[var(--color-accent)]"
          />
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
            <span>50 · Bronze</span>
            <span>70 · Prata</span>
            <span>80 · Ouro</span>
          </div>
        </label>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-white/5"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-4 py-3 text-sm font-bold text-[var(--color-text-inverse)] shadow-[0_0_18px_rgba(245,197,24,0.35)] transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? '…' : t.common.save}
          </button>
        </div>
      </form>
    </BottomSheet>
  )
}
