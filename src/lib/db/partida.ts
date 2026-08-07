import { getSupabase } from '@/lib/supabase'
import type { PlayerId } from '@/types'

export type GoalSide = 'home' | 'away'
export type MatchDayStatus = 'open' | 'closed'
export type PitchGameStatus = 'ready' | 'live' | 'ended'

export interface MatchDay {
  id: string
  dayKey: string
  status: MatchDayStatus
  createdAt: string
  closedAt: string | null
}

export interface PitchGame {
  id: string
  dayId: string
  sequence: number
  homeScore: number
  awayScore: number
  status: PitchGameStatus
  durationSeconds: number
  createdAt: string
  endedAt: string | null
}

export interface GoalEvent {
  id: string
  dayId: string
  gameId: string
  playerId: PlayerId
  playerName: string
  side: GoalSide
  createdAt: string
}

export interface GoldenBootEntry {
  playerId: PlayerId
  playerName: string
  goals: number
}

interface MatchDayRow {
  id: string
  day_key: string
  status: MatchDayStatus
  created_at: string
  closed_at: string | null
}

interface PitchGameRow {
  id: string
  day_id: string
  sequence: number
  home_score: number
  away_score: number
  status: PitchGameStatus
  duration_seconds: number
  created_at: string
  ended_at: string | null
}

interface GoalRow {
  id: string
  day_id: string
  game_id: string
  player_id: string
  player_name: string
  side: GoalSide
  created_at: string
}

function mapDay(row: MatchDayRow): MatchDay {
  return {
    id: row.id,
    dayKey: row.day_key,
    status: row.status,
    createdAt: row.created_at,
    closedAt: row.closed_at,
  }
}

function mapGame(row: PitchGameRow): PitchGame {
  return {
    id: row.id,
    dayId: row.day_id,
    sequence: row.sequence,
    homeScore: row.home_score,
    awayScore: row.away_score,
    status: row.status,
    durationSeconds: row.duration_seconds,
    createdAt: row.created_at,
    endedAt: row.ended_at,
  }
}

function mapGoal(row: GoalRow): GoalEvent {
  return {
    id: row.id,
    dayId: row.day_id,
    gameId: row.game_id,
    playerId: row.player_id,
    playerName: row.player_name,
    side: row.side,
    createdAt: row.created_at,
  }
}

export function todayKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export async function ensureOpenMatchDay(
  dayKey = todayKey(),
): Promise<MatchDay | null> {
  const sb = getSupabase()
  if (!sb) return null

  const existing = await sb
    .from('match_days')
    .select('*')
    .eq('day_key', dayKey)
    .maybeSingle()

  if (existing.data) return mapDay(existing.data as MatchDayRow)

  const { data, error } = await sb
    .from('match_days')
    .insert({ day_key: dayKey, status: 'open' })
    .select('*')
    .single()

  if (error || !data) {
    // race: another client created it
    const again = await sb
      .from('match_days')
      .select('*')
      .eq('day_key', dayKey)
      .maybeSingle()
    return again.data ? mapDay(again.data as MatchDayRow) : null
  }
  return mapDay(data as MatchDayRow)
}

export async function fetchLatestPitchGame(
  dayId: string,
): Promise<PitchGame | null> {
  const sb = getSupabase()
  if (!sb) return null

  const { data, error } = await sb
    .from('pitch_games')
    .select('*')
    .eq('day_id', dayId)
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return mapGame(data as PitchGameRow)
}

export async function ensureCurrentPitchGame(
  day: MatchDay,
  durationSeconds = 420,
): Promise<PitchGame | null> {
  if (day.status === 'closed') return null

  const latest = await fetchLatestPitchGame(day.id)
  if (latest && latest.status !== 'ended') return latest

  const sb = getSupabase()
  if (!sb) return null

  const nextSeq = (latest?.sequence ?? 0) + 1
  const { data, error } = await sb
    .from('pitch_games')
    .insert({
      day_id: day.id,
      sequence: nextSeq,
      duration_seconds: durationSeconds,
      status: 'ready',
    })
    .select('*')
    .single()

  if (error || !data) return null
  return mapGame(data as PitchGameRow)
}

export async function updatePitchGame(
  gameId: string,
  patch: Partial<{
    homeScore: number
    awayScore: number
    status: PitchGameStatus
    durationSeconds: number
    endedAt: string | null
  }>,
): Promise<PitchGame | null> {
  const sb = getSupabase()
  if (!sb) return null

  const payload: Record<string, unknown> = {}
  if (patch.homeScore !== undefined) payload.home_score = patch.homeScore
  if (patch.awayScore !== undefined) payload.away_score = patch.awayScore
  if (patch.status !== undefined) payload.status = patch.status
  if (patch.durationSeconds !== undefined) {
    payload.duration_seconds = patch.durationSeconds
  }
  if (patch.endedAt !== undefined) payload.ended_at = patch.endedAt

  const { data, error } = await sb
    .from('pitch_games')
    .update(payload)
    .eq('id', gameId)
    .select('*')
    .single()

  if (error || !data) return null
  return mapGame(data as PitchGameRow)
}

export async function fetchGoalsForGame(gameId: string): Promise<GoalEvent[]> {
  const sb = getSupabase()
  if (!sb) return []

  const { data, error } = await sb
    .from('goals')
    .select('*')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as GoalRow[]).map(mapGoal)
}

export async function addGoal(input: {
  dayId: string
  gameId: string
  playerId: PlayerId
  playerName: string
  side: GoalSide
}): Promise<GoalEvent | null> {
  const sb = getSupabase()
  if (!sb) return null

  const { data, error } = await sb
    .from('goals')
    .insert({
      day_id: input.dayId,
      game_id: input.gameId,
      player_id: input.playerId,
      player_name: input.playerName,
      side: input.side,
    })
    .select('*')
    .single()

  if (error || !data) return null
  return mapGoal(data as GoalRow)
}

export async function deleteGoal(goalId: string): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  const { error } = await sb.from('goals').delete().eq('id', goalId)
  return !error
}

export async function closeMatchDay(dayId: string): Promise<MatchDay | null> {
  const sb = getSupabase()
  if (!sb) return null

  const { data, error } = await sb
    .from('match_days')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', dayId)
    .select('*')
    .single()

  if (error || !data) return null
  return mapDay(data as MatchDayRow)
}

export async function reopenOrCreateToday(): Promise<{
  day: MatchDay
  game: PitchGame
} | null> {
  const sb = getSupabase()
  if (!sb) return null

  const key = todayKey()
  const existing = await sb
    .from('match_days')
    .select('*')
    .eq('day_key', key)
    .maybeSingle()

  let day: MatchDay | null = null
  if (existing.data) {
    const row = existing.data as MatchDayRow
    if (row.status === 'closed') {
      const { data, error } = await sb
        .from('match_days')
        .update({ status: 'open', closed_at: null })
        .eq('id', row.id)
        .select('*')
        .single()
      if (error || !data) return null
      day = mapDay(data as MatchDayRow)
    } else {
      day = mapDay(row)
    }
  } else {
    day = await ensureOpenMatchDay(key)
  }
  if (!day) return null

  const game = await ensureCurrentPitchGame(day)
  if (!game) return null
  return { day, game }
}

export async function fetchGoldenBoot(year: number): Promise<GoldenBootEntry[]> {
  const sb = getSupabase()
  if (!sb) return []

  const from = `${year}-01-01`
  const to = `${year + 1}-01-01`

  const { data, error } = await sb
    .from('goals')
    .select('player_id, player_name, created_at')
    .gte('created_at', from)
    .lt('created_at', to)

  if (error || !data) return []

  const map = new Map<string, GoldenBootEntry>()
  for (const row of data as { player_id: string; player_name: string }[]) {
    const prev = map.get(row.player_id)
    if (prev) {
      prev.goals += 1
      prev.playerName = row.player_name
    } else {
      map.set(row.player_id, {
        playerId: row.player_id,
        playerName: row.player_name,
        goals: 1,
      })
    }
  }

  return [...map.values()].sort(
    (a, b) => b.goals - a.goals || a.playerName.localeCompare(b.playerName, 'pt-BR'),
  )
}
