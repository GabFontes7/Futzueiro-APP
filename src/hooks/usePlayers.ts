import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  deletePlayerRemote,
  fetchPlayers,
  insertPlayer,
  updatePlayerRemote,
} from '@/lib/db/players'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { sortPlayersByName } from '@/lib/players'
import type { Player, PlayerId, PlayerInput } from '@/types'

export function usePlayers() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setPlayers([])
      setLoading(false)
      setError('Supabase não configurado')
      return
    }

    setLoading(true)
    const list = await fetchPlayers()
    setPlayers(list)
    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) return

    const channel = sb
      .channel('players-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        () => {
          void refresh()
        },
      )
      .subscribe()

    return () => {
      void sb.removeChannel(channel)
    }
  }, [refresh])

  const sortedPlayers = useMemo(() => sortPlayersByName(players), [players])

  const addPlayer = useCallback(async (input: PlayerInput) => {
    const created = await insertPlayer(input)
    if (created) {
      setPlayers((prev) => sortPlayersByName([...prev, created]))
    }
    return created
  }, [])

  const updatePlayer = useCallback(async (id: PlayerId, input: PlayerInput) => {
    const updated = await updatePlayerRemote(id, input)
    if (updated) {
      setPlayers((prev) =>
        sortPlayersByName(
          prev.map((player) => (player.id === id ? updated : player)),
        ),
      )
    }
    return updated
  }, [])

  const deletePlayer = useCallback(async (id: PlayerId) => {
    const ok = await deletePlayerRemote(id)
    if (ok) {
      setPlayers((prev) => prev.filter((player) => player.id !== id))
    }
    return ok
  }, [])

  const getPlayerById = useCallback(
    (id: PlayerId) => players.find((player) => player.id === id),
    [players],
  )

  return {
    players: sortedPlayers,
    count: players.length,
    loading,
    error,
    refresh,
    addPlayer,
    updatePlayer,
    deletePlayer,
    getPlayerById,
  }
}
