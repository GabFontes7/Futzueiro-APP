import { getSupabase } from '@/lib/supabase'
import { DEFAULT_RACHA_SESSION } from '@/lib/racha'
import type { DrawResult, GameMode, RachaSession } from '@/types'

interface SessionRow {
  id: string
  present_ids: string[] | null
  mode: string
  current_draw: DrawResult | null
  pack_opening_completed_draw_id: string | null
}

function mapSession(row: SessionRow | null): RachaSession {
  if (!row) return { ...DEFAULT_RACHA_SESSION }

  return {
    presentIds: Array.isArray(row.present_ids) ? row.present_ids : [],
    mode: row.mode === '6x6' ? '6x6' : '5x5',
    currentDraw: row.current_draw ?? null,
    packOpeningCompletedDrawId: row.pack_opening_completed_draw_id,
  }
}

export async function fetchRachaSession(): Promise<RachaSession> {
  const sb = getSupabase()
  if (!sb) return { ...DEFAULT_RACHA_SESSION }

  const { data, error } = await sb
    .from('racha_session')
    .select('*')
    .eq('id', 'current')
    .maybeSingle()

  if (error || !data) return { ...DEFAULT_RACHA_SESSION }
  return mapSession(data as SessionRow)
}

export async function saveRachaSession(
  session: RachaSession,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Supabase não configurado' }

  const { error } = await sb.from('racha_session').upsert({
    id: 'current',
    present_ids: session.presentIds,
    mode: session.mode,
    current_draw: session.currentDraw,
    pack_opening_completed_draw_id: session.packOpeningCompletedDrawId,
    updated_at: new Date().toISOString(),
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function patchRachaSession(
  patch: Partial<{
    presentIds: string[]
    mode: GameMode
    currentDraw: DrawResult | null
    packOpeningCompletedDrawId: string | null
  }>,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Supabase não configurado' }

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (patch.presentIds !== undefined) payload.present_ids = patch.presentIds
  if (patch.mode !== undefined) payload.mode = patch.mode
  if (patch.currentDraw !== undefined) payload.current_draw = patch.currentDraw
  if (patch.packOpeningCompletedDrawId !== undefined) {
    payload.pack_opening_completed_draw_id = patch.packOpeningCompletedDrawId
  }

  const { error } = await sb
    .from('racha_session')
    .update(payload)
    .eq('id', 'current')

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
