import { getSupabase } from '@/lib/supabase'
import type { DrawResult, GameMode, PlayerSnapshot } from '@/types'

interface MatchRow {
  id: string
  game_number: number
  played_at: string
  mode: string
  teams: Record<string, string[]>
  proximos: string[]
  team_averages: Record<string, number> | null
  assignments: DrawResult['assignments'] | null
  candidates: PlayerSnapshot[]
  voting_open: boolean
}

export function matchRowToDraw(row: MatchRow): DrawResult {
  return {
    id: row.id,
    date: row.played_at,
    mode: row.mode as GameMode,
    teams: row.teams ?? {},
    proximos: row.proximos ?? [],
    teamAverages: row.team_averages ?? {},
    assignments: row.assignments ?? [],
    gameNumber: row.game_number,
    candidates: row.candidates ?? [],
  }
}

export async function fetchMatchHistory(limit = 40): Promise<DrawResult[]> {
  const sb = getSupabase()
  if (!sb) return []

  const { data, error } = await sb
    .from('matches')
    .select('*')
    .order('game_number', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return (data as MatchRow[]).map(matchRowToDraw)
}

export async function fetchNextGameNumber(): Promise<number> {
  const sb = getSupabase()
  if (!sb) return 1

  const { data } = await sb
    .from('matches')
    .select('game_number')
    .order('game_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const max = (data as { game_number: number } | null)?.game_number ?? 0
  return max + 1
}

export async function publishMatch(draw: DrawResult): Promise<{
  ok: boolean
  error?: string
}> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Supabase não configurado' }
  if (!draw.gameNumber) {
    return { ok: false, error: 'Sorteio sem número de jogo' }
  }

  const { error } = await sb.from('matches').upsert(
    {
      id: draw.id,
      game_number: draw.gameNumber,
      played_at: draw.date,
      mode: draw.mode,
      teams: draw.teams,
      proximos: draw.proximos,
      team_averages: draw.teamAverages,
      assignments: draw.assignments,
      candidates: draw.candidates ?? [],
      voting_open: true,
    },
    { onConflict: 'id' },
  )

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
