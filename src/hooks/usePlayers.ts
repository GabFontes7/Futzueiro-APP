import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  deletePlayerRemote,
  fetchPlayers,
  insertPlayer,
  updatePlayerRemote,
} from '@/lib/db/players'
import { uploadPlayerPhoto } from '@/lib/db/playerPhotos'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { sortPlayersByName } from '@/lib/players'
import type { Player, PlayerId, PlayerInput } from '@/types'

export type PlayerFormPayload = PlayerInput & {
  photoFile?: File | null
}

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

  const addPlayer = useCallback(async (payload: PlayerFormPayload) => {
    const { photoFile, ...input } = payload
    const created = await insertPlayer(input)
    if (!created) return null

    if (photoFile) {
      const photoUrl = await uploadPlayerPhoto(created.id, photoFile)
      if (photoUrl) {
        const withPhoto = await updatePlayerRemote(created.id, {
          name: created.name,
          overall: created.overall,
          photoUrl,
        })
        if (withPhoto) {
          setPlayers((prev) => sortPlayersByName([...prev, withPhoto]))
          return withPhoto
        }
      }
    }

    setPlayers((prev) => sortPlayersByName([...prev, created]))
    return created
  }, [])

  const updatePlayer = useCallback(
    async (id: PlayerId, payload: PlayerFormPayload) => {
      const { photoFile, ...input } = payload
      let photoUrl = input.photoUrl

      if (photoFile) {
        const uploaded = await uploadPlayerPhoto(id, photoFile)
        if (!uploaded) return null
        photoUrl = uploaded
      }

      const updated = await updatePlayerRemote(id, {
        ...input,
        ...(photoUrl !== undefined ? { photoUrl } : {}),
      })
      if (updated) {
        setPlayers((prev) =>
          sortPlayersByName(
            prev.map((player) => (player.id === id ? updated : player)),
          ),
        )
      }
      return updated
    },
    [],
  )

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
