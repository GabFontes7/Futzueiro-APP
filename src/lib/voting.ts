import { publishMatch } from '@/lib/db/matches'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type {
  DrawResult,
  GameMode,
  GoldenBallEntry,
  MatchVoteStatus,
  PlayerId,
  PlayerSnapshot,
} from '@/types'

interface MatchRow {
  id: string
  game_number: number
  played_at: string
  mode: string
  teams: Record<string, string[]>
  proximos: string[]
  candidates: PlayerSnapshot[]
  voting_open: boolean
}

interface VoteRow {
  match_id: string
  device_id: string
  player_id: string
}

interface GoldenRow {
  player_id: string
  player_name: string
  points: number | string
  year: number
}

export function supabaseReady(): boolean {
  return isSupabaseConfigured()
}

export async function publishMatchForVoting(
  draw: DrawResult,
): Promise<{ ok: boolean; error?: string }> {
  return publishMatch(draw)
}

export async function fetchOpenMatch(): Promise<MatchVoteStatus | null> {
  const sb = getSupabase()
  if (!sb) return null

  const { data, error } = await sb
    .from('matches')
    .select('*')
    .eq('voting_open', true)
    .order('game_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  const row = data as MatchRow

  const { count } = await sb
    .from('votes')
    .select('*', { count: 'exact', head: true })
    .eq('match_id', row.id)

  return {
    matchId: row.id,
    gameNumber: row.game_number,
    playedAt: row.played_at,
    mode: row.mode as GameMode,
    votingOpen: row.voting_open,
    candidates: row.candidates ?? [],
    voteCount: count ?? 0,
  }
}

export async function fetchLatestMatch(): Promise<MatchVoteStatus | null> {
  const sb = getSupabase()
  if (!sb) return null

  const { data, error } = await sb
    .from('matches')
    .select('*')
    .order('game_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  const row = data as MatchRow

  const { count } = await sb
    .from('votes')
    .select('*', { count: 'exact', head: true })
    .eq('match_id', row.id)

  return {
    matchId: row.id,
    gameNumber: row.game_number,
    playedAt: row.played_at,
    mode: row.mode as GameMode,
    votingOpen: row.voting_open,
    candidates: row.candidates ?? [],
    voteCount: count ?? 0,
  }
}

export async function hasDeviceVoted(
  matchId: string,
  deviceId: string,
): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false

  const { data } = await sb
    .from('votes')
    .select('id')
    .eq('match_id', matchId)
    .eq('device_id', deviceId)
    .maybeSingle()

  return Boolean(data)
}

export async function castVote(params: {
  matchId: string
  deviceId: string
  playerId: PlayerId
}): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Supabase não configurado' }

  const { error } = await sb.from('votes').insert({
    match_id: params.matchId,
    device_id: params.deviceId,
    player_id: params.playerId,
  })

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'already_voted' }
    }
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

export async function fetchYearStandings(
  year = new Date().getFullYear(),
): Promise<GoldenBallEntry[]> {
  const sb = getSupabase()
  if (!sb) return []

  const { data, error } = await sb
    .from('golden_ball_points')
    .select('player_id, player_name, points, year')
    .eq('year', year)

  if (error || !data) return []

  const totals = new Map<string, GoldenBallEntry>()

  for (const row of data as GoldenRow[]) {
    const points = Number(row.points)
    const existing = totals.get(row.player_id)
    if (existing) {
      existing.points += points
    } else {
      totals.set(row.player_id, {
        playerId: row.player_id,
        playerName: row.player_name,
        points,
      })
    }
  }

  return [...totals.values()].sort((a, b) => b.points - a.points)
}

export async function fetchRecentClosedMatches(limit = 10): Promise<
  Array<{
    matchId: string
    gameNumber: number
    playedAt: string
    winners: GoldenBallEntry[]
  }>
> {
  const sb = getSupabase()
  if (!sb) return []

  const { data: matches } = await sb
    .from('matches')
    .select('id, game_number, played_at, voting_open')
    .eq('voting_open', false)
    .order('game_number', { ascending: false })
    .limit(limit)

  if (!matches?.length) return []

  const results = []

  for (const match of matches) {
    const { data: points } = await sb
      .from('golden_ball_points')
      .select('player_id, player_name, points')
      .eq('match_id', match.id)

    results.push({
      matchId: match.id as string,
      gameNumber: match.game_number as number,
      playedAt: match.played_at as string,
      winners: ((points as GoldenRow[]) ?? []).map((row) => ({
        playerId: row.player_id,
        playerName: row.player_name,
        points: Number(row.points),
      })),
    })
  }

  return results
}

/**
 * Encerra votação: empate em 1º divide 1 ponto (2 empatados → 0,5 cada).
 */
export async function closeMatchVoting(
  matchId: string,
): Promise<{ ok: boolean; winners?: GoldenBallEntry[]; error?: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Supabase não configurado' }

  const { data: match, error: matchError } = await sb
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .maybeSingle()

  if (matchError || !match) {
    return { ok: false, error: matchError?.message ?? 'Jogo não encontrado' }
  }

  if (!(match as MatchRow).voting_open) {
    return { ok: false, error: 'already_closed' }
  }

  const { data: votes, error: votesError } = await sb
    .from('votes')
    .select('player_id')
    .eq('match_id', matchId)

  if (votesError) return { ok: false, error: votesError.message }

  const tally = new Map<string, number>()
  for (const vote of (votes as VoteRow[]) ?? []) {
    tally.set(vote.player_id, (tally.get(vote.player_id) ?? 0) + 1)
  }

  const candidates = ((match as MatchRow).candidates ?? []) as PlayerSnapshot[]
  const nameById = new Map(candidates.map((c) => [c.id, c.name]))

  let maxVotes = 0
  for (const count of tally.values()) {
    maxVotes = Math.max(maxVotes, count)
  }

  const winnerIds =
    maxVotes === 0
      ? []
      : [...tally.entries()]
          .filter(([, count]) => count === maxVotes)
          .map(([id]) => id)

  const share = winnerIds.length > 0 ? 1 / winnerIds.length : 0
  const year = new Date((match as MatchRow).played_at).getFullYear()

  const winners: GoldenBallEntry[] = winnerIds.map((playerId) => ({
    playerId,
    playerName: nameById.get(playerId) ?? 'Jogador',
    points: share,
  }))

  if (winners.length > 0) {
    const { error: insertError } = await sb.from('golden_ball_points').insert(
      winners.map((w) => ({
        match_id: matchId,
        player_id: w.playerId,
        player_name: w.playerName,
        points: w.points,
        year,
      })),
    )
    if (insertError) return { ok: false, error: insertError.message }
  }

  const { error: updateError } = await sb
    .from('matches')
    .update({ voting_open: false })
    .eq('id', matchId)

  if (updateError) return { ok: false, error: updateError.message }

  return { ok: true, winners }
}
