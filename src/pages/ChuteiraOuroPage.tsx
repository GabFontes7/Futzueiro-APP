import { useEffect, useState } from 'react'
import { Award, Loader2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { fetchGoldenBoot, type GoldenBootEntry } from '@/lib/db/partida'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useI18n } from '@/i18n'

export function ChuteiraOuroPage() {
  const { t } = useI18n()
  const year = new Date().getFullYear()
  const [rows, setRows] = useState<GoldenBootEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!isSupabaseConfigured()) {
        setLoading(false)
        return
      }
      const list = await fetchGoldenBoot(year)
      if (!cancelled) {
        setRows(list)
        setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [year])

  if (!isSupabaseConfigured()) {
    return (
      <section className="flex flex-col gap-4">
        <header>
          <h2 className="font-display text-3xl tracking-[0.06em] text-gradient-gold">
            {t.pages.chuteiraOuro.title}
          </h2>
        </header>
        <p className="text-sm text-[var(--color-text-muted)]">
          {t.pages.partida.needsConfig}
        </p>
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

  return (
    <section className="flex flex-col gap-5 pb-8">
      <header>
        <h2 className="font-display text-3xl tracking-[0.06em] text-gradient-gold">
          {t.pages.chuteiraOuro.title}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {t.pages.chuteiraOuro.subtitle.replace('{year}', String(year))}
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          icon={Award}
          title={t.pages.chuteiraOuro.empty}
          description={t.pages.chuteiraOuro.emptyHint}
        />
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map((row, index) => (
            <li
              key={row.playerId}
              className="panel-ut flex items-center gap-3 p-3"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] font-display text-lg text-[var(--color-accent)]">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-display text-xl tracking-wide text-[var(--color-text)]">
                {row.playerName}
              </span>
              <span className="font-display text-2xl text-gradient-gold">
                {row.goals}
                <span className="ml-1 text-xs font-sans font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  {t.pages.chuteiraOuro.goalsUnit}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
