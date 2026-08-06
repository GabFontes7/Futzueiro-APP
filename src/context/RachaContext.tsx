import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { usePlayersContext } from '@/context/PlayersContext'
import { useDrawHistory } from '@/hooks/useDrawHistory'
import { useRachaSession } from '@/hooks/useRachaSession'
import { fetchNextGameNumber } from '@/lib/db/matches'
import { buildCandidatesSnapshot } from '@/lib/gameNumber'
import { publishMatchForVoting } from '@/lib/voting'
import type { Player, PlayerId } from '@/types'

type SessionApi = ReturnType<typeof useRachaSession>
type HistoryApi = ReturnType<typeof useDrawHistory>

type RachaContextValue = SessionApi &
  HistoryApi & {
    finalizeRacha: () => Promise<{ ok: boolean; error?: string }>
  }

const RachaContext = createContext<RachaContextValue | null>(null)

export function RachaProvider({ children }: { children: ReactNode }) {
  const { players, loading: playersLoading } = usePlayersContext()
  const historyApi = useDrawHistory()

  const playersById = useMemo(() => {
    const map = new Map<PlayerId, Player>()
    for (const player of players) {
      map.set(player.id, player)
    }
    return map
  }, [players])

  const validIds = useMemo(() => players.map((p) => p.id), [players])

  const sessionApi = useRachaSession(
    validIds,
    playersById,
    historyApi.lastDraw,
    !playersLoading,
  )

  const { currentDraw, clearDay } = sessionApi

  const finalizeRacha = useCallback(async () => {
    if (!currentDraw) {
      return { ok: false, error: 'Nenhum sorteio para finalizar' }
    }

    const gameNumber = await fetchNextGameNumber()
    const enriched = {
      ...currentDraw,
      gameNumber,
      candidates: buildCandidatesSnapshot(players),
      date: new Date().toISOString(),
    }

    const published = await publishMatchForVoting(enriched)
    if (!published.ok) {
      return {
        ok: false,
        error: published.error ?? 'Falha ao salvar no Supabase',
      }
    }

    await clearDay()
    await historyApi.refresh()

    return { ok: true }
  }, [clearDay, currentDraw, historyApi, players])

  const value: RachaContextValue = {
    ...sessionApi,
    ...historyApi,
    finalizeRacha,
  }

  return <RachaContext.Provider value={value}>{children}</RachaContext.Provider>
}

export function useRachaContext(): RachaContextValue {
  const ctx = useContext(RachaContext)
  if (!ctx) {
    throw new Error('useRachaContext deve ser usado dentro de RachaProvider')
  }
  return ctx
}
