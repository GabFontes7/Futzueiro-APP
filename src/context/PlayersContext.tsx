import {
  createContext,
  useContext,
  type ReactNode,
} from 'react'
import { usePlayers } from '@/hooks/usePlayers'

type PlayersContextValue = ReturnType<typeof usePlayers>

const PlayersContext = createContext<PlayersContextValue | null>(null)

export function PlayersProvider({ children }: { children: ReactNode }) {
  const value = usePlayers()
  return (
    <PlayersContext.Provider value={value}>{children}</PlayersContext.Provider>
  )
}

export function usePlayersContext(): PlayersContextValue {
  const ctx = useContext(PlayersContext)
  if (!ctx) {
    throw new Error('usePlayersContext deve ser usado dentro de PlayersProvider')
  }
  return ctx
}
