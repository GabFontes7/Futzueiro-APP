import { useEffect, useState, type KeyboardEvent } from 'react'
import {
  DEFAULT_CARD_IMAGE,
  getCardTier,
  resolvePlayerImageSrc,
} from '@/lib/players'

export type CardSize = 'sm' | 'md' | 'lg'

interface PlayerCardProps {
  name: string
  overall: number
  /** Foto enviada pelo jogador (Supabase). Se vazia, tenta /cartas e depois default. */
  photoUrl?: string | null
  /** Preview local (blob:) ao escolher arquivo no formulário */
  previewSrc?: string | null
  size?: CardSize
  showOverallBadge?: boolean
  className?: string
  onClick?: () => void
}

const sizeClasses: Record<CardSize, string> = {
  sm: 'w-[96px]',
  md: 'w-[140px]',
  lg: 'w-[200px]',
}

const tierClass = {
  gold: 'card-tier-gold',
  silver: 'card-tier-silver',
  bronze: 'card-tier-bronze',
} as const

/**
 * Cartinha estilo UT.
 * prioridade: previewSrc → photoUrl → /cartas/{nome}.png → default.png (onError)
 */
export function PlayerCard({
  name,
  overall,
  photoUrl = null,
  previewSrc = null,
  size = 'md',
  showOverallBadge = true,
  className = '',
  onClick,
}: PlayerCardProps) {
  const resolvedSrc = previewSrc?.trim() || resolvePlayerImageSrc(name, photoUrl)
  const [src, setSrc] = useState(resolvedSrc)
  const tier = getCardTier(overall)

  useEffect(() => {
    setSrc(resolvedSrc)
  }, [resolvedSrc])

  const classes = [
    'group relative aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] border-[3px]',
    'bg-[var(--color-surface-card)] transition-transform duration-300 ease-out',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]',
    onClick
      ? 'cursor-pointer active:scale-[0.97] hover:scale-[1.03] hover:brightness-110'
      : 'cursor-default',
    sizeClasses[size],
    tierClass[tier],
    className,
  ].join(' ')

  const onKeyDown = (event: KeyboardEvent) => {
    if (!onClick) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }

  const content = (
    <>
      <img
        src={src}
        alt={`Cartinha ${name}`}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 group-active:scale-105"
        draggable={false}
        onError={() => {
          if (src !== DEFAULT_CARD_IMAGE) setSrc(DEFAULT_CARD_IMAGE)
        }}
      />

      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-active:opacity-100"
        style={{
          background:
            'linear-gradient(125deg, transparent 30%, rgba(255,255,255,0.18) 48%, transparent 62%)',
        }}
      />

      {showOverallBadge && (
        <span
          className={[
            'absolute top-1.5 left-1.5 flex size-8 items-center justify-center rounded-md',
            'border border-black/40 font-display text-lg leading-none text-[var(--color-text-inverse)]',
            'shadow-md',
            tier === 'gold' && 'bg-[var(--color-gold)]',
            tier === 'silver' && 'bg-[var(--color-silver)]',
            tier === 'bronze' && 'bg-[var(--color-bronze)]',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {overall}
        </span>
      )}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`Cartinha de ${name}`}
        className={classes}
      >
        {content}
      </button>
    )
  }

  return (
    <div
      role="img"
      aria-label={`Cartinha de ${name}`}
      className={classes}
      onKeyDown={onKeyDown}
    >
      {content}
    </div>
  )
}
