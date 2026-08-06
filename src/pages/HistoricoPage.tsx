import { History } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { useRachaContext } from '@/context/RachaContext'
import { formatGameLabel } from '@/lib/gameNumber'
import { useI18n } from '@/i18n'

export function HistoricoPage() {
  const { t } = useI18n()
  const { history } = useRachaContext()

  return (
    <section className="flex flex-col gap-4 pb-8">
      <header>
        <h2 className="font-display text-3xl tracking-[0.06em] text-gradient-gold">
          {t.pages.historico.title}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {t.pages.historico.subtitle}
        </p>
      </header>

      {history.length === 0 ? (
        <EmptyState
          icon={History}
          title={t.pages.historico.empty}
          description={t.pages.historico.subtitle}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {history.map((draw) => (
            <li
              key={draw.id}
              className="panel-ut px-3 py-3"
            >
              <p className="font-display text-xl tracking-wider text-gradient-gold">
                {draw.gameNumber != null
                  ? formatGameLabel(draw.gameNumber, draw.date)
                  : new Date(draw.date).toLocaleDateString('pt-BR')}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {draw.mode} · {Object.keys(draw.teams).length} times
                {draw.proximos.length > 0
                  ? ` · ${draw.proximos.length} próximos`
                  : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
