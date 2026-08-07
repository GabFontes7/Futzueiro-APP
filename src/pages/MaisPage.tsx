import { Link } from 'react-router-dom'
import {
  Award,
  ChevronRight,
  History,
  type LucideIcon,
  Trophy,
  Wallet,
} from 'lucide-react'
import { useI18n } from '@/i18n'

type MaisItem =
  | {
      kind: 'link'
      to: string
      icon: LucideIcon
      title: string
      hint: string
    }
  | {
      kind: 'soon'
      icon: LucideIcon
      title: string
      hint: string
    }

export function MaisPage() {
  const { t } = useI18n()

  const items: MaisItem[] = [
    {
      kind: 'link',
      to: '/votacao',
      icon: Trophy,
      title: t.pages.mais.votacao,
      hint: t.pages.mais.votacaoHint,
    },
    {
      kind: 'link',
      to: '/bola-de-ouro',
      icon: Award,
      title: t.pages.mais.bolaDeOuro,
      hint: t.pages.mais.bolaDeOuroHint,
    },
    {
      kind: 'link',
      to: '/historico',
      icon: History,
      title: t.pages.mais.historico,
      hint: t.pages.mais.historicoHint,
    },
    {
      kind: 'soon',
      icon: Wallet,
      title: t.pages.mais.financeiro,
      hint: t.pages.mais.financeiroHint,
    },
  ]

  return (
    <section className="flex flex-col gap-5 pb-8">
      <header>
        <h2 className="font-display text-3xl tracking-[0.06em] text-gradient-gold">
          {t.pages.mais.title}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {t.pages.mais.subtitle}
        </p>
      </header>

      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const Icon = item.icon
          const inner = (
            <>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-black/30 text-[var(--color-accent)]">
                <Icon className="size-5" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-xl tracking-wide text-[var(--color-text)]">
                  {item.title}
                </span>
                <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">
                  {item.hint}
                </span>
              </span>
              {item.kind === 'link' ? (
                <ChevronRight className="size-4 shrink-0 text-[var(--color-text-muted)]" />
              ) : (
                <span className="shrink-0 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  {t.common.comingSoon}
                </span>
              )}
            </>
          )

          if (item.kind === 'link') {
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="panel-ut flex items-center gap-3 p-3 transition-colors hover:bg-white/5 active:scale-[0.99]"
                >
                  {inner}
                </Link>
              </li>
            )
          }

          return (
            <li key={item.title}>
              <div className="panel-ut flex items-center gap-3 p-3 opacity-70">
                {inner}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
