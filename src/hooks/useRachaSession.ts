import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { drawConfigSignature, runBalancedDraw } from '@/lib/draw'
import { fetchRachaSession, saveRachaSession } from '@/lib/db/session'
import { calculateRachaLayout, DEFAULT_RACHA_SESSION } from '@/lib/racha'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type {
  DrawResult,
  GameMode,
  Player,
  PlayerId,
  RachaSession,
} from '@/types'

export function useRachaSession(
  validPlayerIds: PlayerId[],
  playersById: Map<PlayerId, Player>,
  lastHistoricDraw: DrawResult | null,
  playersReady = false,
) {
  const [session, setSession] = useState<RachaSession>({
    ...DEFAULT_RACHA_SESSION,
  })
  const [loading, setLoading] = useState(true)
  const skipNextRealtime = useRef(false)

  const persist = useCallback(async (next: RachaSession) => {
    setSession(next)
    if (!isSupabaseConfigured()) return
    skipNextRealtime.current = true
    await saveRachaSession(next)
  }, [])

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setSession({ ...DEFAULT_RACHA_SESSION })
      setLoading(false)
      return
    }
    const remote = await fetchRachaSession()
    setSession(remote)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) return

    const channel = sb
      .channel('racha-session-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'racha_session' },
        () => {
          if (skipNextRealtime.current) {
            skipNextRealtime.current = false
            return
          }
          void refresh()
        },
      )
      .subscribe()

    return () => {
      void sb.removeChannel(channel)
    }
  }, [refresh])

  const validSet = useMemo(() => new Set(validPlayerIds), [validPlayerIds])

  // Remove presentes excluídos do elenco (só após jogadores carregarem)
  useEffect(() => {
    if (loading || !playersReady) return
    const filtered = session.presentIds.filter((id) => validSet.has(id))
    if (filtered.length === session.presentIds.length) return

    void persist({
      ...session,
      presentIds: filtered,
      currentDraw: null,
      packOpeningCompletedDrawId: null,
    })
  }, [loading, persist, playersReady, session, validSet])

  const layout = useMemo(
    () => calculateRachaLayout(session.presentIds.length, session.mode),
    [session.presentIds.length, session.mode],
  )

  const configSignature = useMemo(
    () => drawConfigSignature(session.presentIds, session.mode),
    [session.presentIds, session.mode],
  )

  const packOpeningDone = Boolean(
    session.currentDraw &&
      session.packOpeningCompletedDrawId === session.currentDraw.id,
  )

  const isPresent = useCallback(
    (id: PlayerId) => session.presentIds.includes(id),
    [session.presentIds],
  )

  const togglePresent = useCallback(
    (id: PlayerId) => {
      const exists = session.presentIds.includes(id)
      void persist({
        ...session,
        presentIds: exists
          ? session.presentIds.filter((pid) => pid !== id)
          : [...session.presentIds, id],
        currentDraw: null,
        packOpeningCompletedDrawId: null,
      })
    },
    [persist, session],
  )

  const setMode = useCallback(
    (mode: GameMode) => {
      void persist({
        ...session,
        mode,
        currentDraw: null,
        packOpeningCompletedDrawId: null,
      })
    },
    [persist, session],
  )

  const markAll = useCallback(
    (ids: PlayerId[]) => {
      void persist({
        ...session,
        presentIds: [...ids],
        currentDraw: null,
        packOpeningCompletedDrawId: null,
      })
    },
    [persist, session],
  )

  const clearAll = useCallback(() => {
    void persist({
      ...session,
      presentIds: [],
      currentDraw: null,
      packOpeningCompletedDrawId: null,
    })
  }, [persist, session])

  const runDraw = useCallback(
    async (force = false): Promise<DrawResult | null> => {
      const presentPlayers = session.presentIds
        .map((id) => playersById.get(id))
        .filter((p): p is Player => Boolean(p))

      if (presentPlayers.length === 0) {
        if (session.currentDraw) {
          await persist({
            ...session,
            currentDraw: null,
            packOpeningCompletedDrawId: null,
          })
        }
        return null
      }

      const signature = drawConfigSignature(session.presentIds, session.mode)
      if (
        !force &&
        session.currentDraw &&
        session.currentDraw.configSignature === signature
      ) {
        return session.currentDraw
      }

      const draw = runBalancedDraw({
        presentPlayers,
        mode: session.mode,
        lastDraw: lastHistoricDraw,
      })
      draw.configSignature = signature

      await persist({
        ...session,
        currentDraw: draw,
        packOpeningCompletedDrawId: null,
      })
      return draw
    },
    [lastHistoricDraw, persist, playersById, session],
  )

  const ensureDraw = useCallback(() => runDraw(false), [runDraw])

  const redraw = useCallback(() => runDraw(true), [runDraw])

  const completePackOpening = useCallback(() => {
    if (!session.currentDraw) return
    void persist({
      ...session,
      packOpeningCompletedDrawId: session.currentDraw.id,
    })
  }, [persist, session])

  const restartPackOpening = useCallback(() => {
    void persist({
      ...session,
      packOpeningCompletedDrawId: null,
    })
  }, [persist, session])

  const clearDay = useCallback(async () => {
    await persist({
      ...session,
      presentIds: [],
      currentDraw: null,
      packOpeningCompletedDrawId: null,
    })
  }, [persist, session])

  const clearCurrentDraw = useCallback(() => {
    void persist({
      ...session,
      currentDraw: null,
      packOpeningCompletedDrawId: null,
    })
  }, [persist, session])

  return {
    session,
    loading,
    mode: session.mode,
    presentIds: session.presentIds,
    presentCount: session.presentIds.length,
    currentDraw: session.currentDraw,
    packOpeningDone,
    configSignature,
    layout,
    isPresent,
    togglePresent,
    setMode,
    markAll,
    clearAll,
    ensureDraw,
    redraw,
    completePackOpening,
    restartPackOpening,
    clearCurrentDraw,
    clearDay,
  }
}
