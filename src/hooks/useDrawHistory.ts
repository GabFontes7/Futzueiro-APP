import { useCallback, useEffect, useState } from 'react'
import { fetchMatchHistory } from '@/lib/db/matches'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type { DrawResult } from '@/types'

export function useDrawHistory() {
  const [history, setHistory] = useState<DrawResult[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setHistory([])
      setLoading(false)
      return
    }
    setLoading(true)
    const list = await fetchMatchHistory()
    setHistory(list)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) return

    const channel = sb
      .channel('matches-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => {
          void refresh()
        },
      )
      .subscribe()

    return () => {
      void sb.removeChannel(channel)
    }
  }, [refresh])

  return {
    history,
    lastDraw: history[0] ?? null,
    loading,
    refresh,
  }
}
