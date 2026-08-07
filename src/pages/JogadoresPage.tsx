import { useState } from 'react'
import { Loader2, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { PlayerCard } from '@/components/cards/PlayerCard'
import { PlayerFormSheet } from '@/components/players/PlayerFormSheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePlayersContext } from '@/context/PlayersContext'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useI18n } from '@/i18n'
import type { Player } from '@/types'

export function JogadoresPage() {
  const { t } = useI18n()
  const { players, loading, addPlayer, updatePlayer, deletePlayer } =
    usePlayersContext()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Player | null>(null)

  const openCreate = () => {
    setEditing(null)
    setSheetOpen(true)
  }

  const openEdit = (player: Player) => {
    setEditing(player)
    setSheetOpen(true)
  }

  const closeSheet = () => {
    setSheetOpen(false)
    setEditing(null)
  }

  const handleSubmit = async (input: Parameters<typeof addPlayer>[0]) => {
    if (editing) {
      await updatePlayer(editing.id, input)
      return
    }
    await addPlayer(input)
  }

  const handleDelete = async (player: Player) => {
    const confirmed = window.confirm(
      t.pages.jogadores.deleteConfirm.replace('{name}', player.name),
    )
    if (confirmed) await deletePlayer(player.id)
  }

  if (!isSupabaseConfigured()) {
    return (
      <section className="flex flex-col gap-4">
        <header>
          <h2 className="font-display text-3xl tracking-[0.06em] text-gradient-gold">
            {t.pages.jogadores.title}
          </h2>
        </header>
        <EmptyState
          icon={Users}
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

  return (
    <section className="relative flex flex-col gap-5 pb-20">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl tracking-[0.06em] text-gradient-gold">
            {t.pages.jogadores.title}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {t.pages.jogadores.subtitle}
          </p>
        </div>
        {players.length > 0 && (
          <span className="rounded-full border border-[var(--color-border)] bg-black/30 px-2.5 py-1 font-display text-lg text-[var(--color-accent)]">
            {players.length}
          </span>
        )}
      </header>

      {players.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t.pages.jogadores.empty}
          description={t.pages.jogadores.emptyHint}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {players.map((player) => (
            <li
              key={player.id}
              className="panel-ut flex flex-col items-center gap-3 p-3"
            >
              <PlayerCard
                name={player.name}
                overall={player.overall}
                photoUrl={player.photoUrl}
                size="sm"
                className="w-full max-w-[140px]"
              />

              <div className="w-full text-center">
                <p className="truncate font-display text-lg tracking-wider text-[var(--color-text)]">
                  {player.name}
                </p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  OVR {player.overall}
                </p>
              </div>

              <div className="flex w-full gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(player)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] py-2 text-xs font-semibold text-[var(--color-accent)] transition-colors hover:bg-white/5"
                >
                  <Pencil className="size-3.5" />
                  {t.common.edit}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(player)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-500/30 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 className="size-3.5" />
                  {t.common.delete}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={openCreate}
        aria-label={t.pages.jogadores.addPlayer}
        className="fixed bottom-[calc(1.25rem+var(--safe-bottom))] right-[max(1rem,calc(50%-240px+1rem))] z-40 flex size-14 items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-[0_0_24px_rgba(245,197,24,0.45)] transition-transform active:scale-95"
      >
        <Plus className="size-7" strokeWidth={2.5} />
      </button>

      <PlayerFormSheet
        open={sheetOpen}
        player={editing}
        onClose={closeSheet}
        onSubmit={handleSubmit}
      />
    </section>
  )
}
