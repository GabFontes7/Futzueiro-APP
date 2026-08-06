import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  badge?: string
  children?: ReactNode
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  badge,
  children,
}: EmptyStateProps) {
  return (
    <div className="panel-ut flex flex-col items-center gap-3 px-4 py-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-black/40 shadow-[0_0_20px_var(--color-gold-glow)]">
        <Icon className="size-7 text-[var(--color-accent)]" strokeWidth={1.75} />
      </div>
      <h3 className="font-display text-2xl tracking-[0.08em] text-gradient-gold">
        {title}
      </h3>
      <p className="max-w-[280px] text-sm text-[var(--color-text-muted)]">
        {description}
      </p>
      {badge && (
        <span className="rounded-full border border-[var(--color-border)] bg-black/40 px-3 py-1 text-xs font-medium text-[var(--color-accent)]">
          {badge}
        </span>
      )}
      {children}
    </div>
  )
}
