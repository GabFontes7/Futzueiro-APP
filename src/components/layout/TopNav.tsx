import { NavLink } from 'react-router-dom'
import { Award, History, Trophy, Users, Volleyball } from 'lucide-react'
import { useI18n } from '@/i18n'

const tabs = [
  { to: '/jogadores', key: 'jogadores' as const, icon: Users },
  { to: '/novo-racha', key: 'novoRacha' as const, icon: Volleyball },
  { to: '/votacao', key: 'votacao' as const, icon: Trophy },
  { to: '/bola-de-ouro', key: 'bolaDeOuro' as const, icon: Award },
  { to: '/historico', key: 'historico' as const, icon: History },
]

export function TopNav() {
  const { t } = useI18n()

  return (
    <nav
      className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-xl"
      style={{ paddingTop: 'var(--safe-top)' }}
      aria-label="Navegação principal"
    >
      <div className="flex flex-col items-center gap-1 px-4 pt-3 pb-2">
        <img
          src="/brand/logo-futzueiro.png"
          alt="Futzueiro Futebol Clube"
          className="h-16 w-auto drop-shadow-[0_0_18px_var(--color-gold-glow)]"
          draggable={false}
        />
        <p className="font-display text-xl tracking-[0.2em] text-gradient-gold">
          {t.app.shortName}
        </p>
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
          Futzueiro App · {t.app.tagline}
        </p>
      </div>

      <div className="flex gap-0.5 px-1.5 pb-2">
        {tabs.map(({ to, key, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[9px] font-semibold uppercase tracking-wide transition-all',
                isActive
                  ? 'border border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] text-[var(--color-accent)] shadow-[0_0_16px_rgba(245,197,24,0.2)]'
                  : 'border border-transparent text-[var(--color-text-muted)] hover:bg-white/5 hover:text-[var(--color-text)]',
              ].join(' ')
            }
          >
            <Icon className="size-4 shrink-0" strokeWidth={2} />
            <span className="max-w-full truncate leading-tight">{t.nav[key]}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
