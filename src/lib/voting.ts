import { publishMatch } from '@/lib/db/matches'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type {
  AwardRecord,
  DrawResult,
  GameMode,
  GoldenBallEntry,
  MatchVoteStatus,
  PlayerId,
  PlayerSnapshot,
} from '@/types'
import { MAX_DAY_PICKS } from '@/types'

interface MatchRow {
  id: string
  game_number: number
  played_at: string
  mode: string
  candidates: PlayerSnapshot[]
  voting_open: boolean
  voting_closes_at: string | null
}

interface VoteRow {
  match_id: string
  device_id: string
  user_id: string | null
  player_id: string | null
  picks: PlayerId[] | null
}

function periodDay(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

function periodMonth(iso: string): { year: number; month: number; key: string } {
  const d = new Date(iso)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  return { year, month, key: `${year}-${String(month).padStart(2, '0')}` }
}

function mapMatchStatus(row: MatchRow, voteCount: number): MatchVoteStatus {
  return {
    matchId: row.id,
    gameNumber: row.game_number,
    playedAt: row.played_at,
    mode: row.mode as GameMode,
    votingOpen: row.voting_open,
    votingClosesAt: row.voting_closes_at,
    candidates: row.candidates ?? [],
    voteCount,
  }
}

async function countBallots(matchId: string): Promise<number> {
  const sb = getSupabase()
  if (!sb) return 0
  const { count } = await sb
    .from('votes')
    .select('*', { count: 'exact', head: true })
    .eq('match_id', matchId)
  return count ?? 0
}

export function supabaseReady(): boolean {
  return isSupabaseConfigured()
}

export async function publishMatchForVoting(
  draw: DrawResult,
): Promise<{ ok: boolean; error?: string }> {
  return publishMatch(draw)
}

/** Se passou das 12h, encerra automaticamente. */
export async function ensureVotingDeadline(
  matchId: string,
): Promise<MatchVoteStatus | null> {
  const sb = getSupabase()
  if (!sb) return null

  const { data } = await sb
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .maybeSingle()

  if (!data) return null
  const row = data as MatchRow

  if (
    row.voting_open &&
    row.voting_closes_at &&
    new Date(row.voting_closes_at).getTime() <= Date.now()
  ) {
    await closeMatchVoting(matchId)
    const { data: refreshed } = await sb
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .maybeSingle()
    if (!refreshed) return null
    return mapMatchStatus(refreshed as MatchRow, await countBallots(matchId))
  }

  return mapMatchStatus(row, await countBallots(matchId))
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
  return ensureVotingDeadline((data as MatchRow).id)
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
  return ensureVotingDeadline((data as MatchRow).id)
}

export async function hasUserVoted(params: {
  matchId: string
  deviceId: string
  userId?: string | null
}): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false

  if (params.userId) {
    const { data } = await sb
      .from('votes')
      .select('id')
      .eq('match_id', params.matchId)
      .eq('user_id', params.userId)
      .maybeSingle()
    if (data) return true
  }

  const { data } = await sb
    .from('votes')
    .select('id')
    .eq('match_id', params.matchId)
    .eq('device_id', params.deviceId)
    .maybeSingle()

  return Boolean(data)
}

/** Até 3 escolhas; cada uma vale +1 ponto. */
export async function castBallot(params: {
  matchId: string
  deviceId: string
  userId?: string | null
  picks: PlayerId[]
}): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Supabase não configurado' }

  const unique = [...new Set(params.picks.filter(Boolean))]
  if (unique.length === 0 || unique.length > MAX_DAY_PICKS) {
    return { ok: false, error: 'invalid_picks' }
  }

  const status = await ensureVotingDeadline(params.matchId)
  if (!status?.votingOpen) {
    return { ok: false, error: 'voting_closed' }
  }

  const already = await hasUserVoted({
    matchId: params.matchId,
    deviceId: params.deviceId,
    userId: params.userId,
  })
  if (already) return { ok: false, error: 'already_voted' }

  const { error } = await sb.from('votes').insert({
    match_id: params.matchId,
    device_id: params.deviceId,
    user_id: params.userId ?? null,
    player_id: unique[0],
    picks: unique,
  })

  if (error) {
    if (error.code === '23505') return { ok: false, error: 'already_voted' }
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

export async function fetchMonthlyStandings(
  year = new Date().getFullYear(),
  month = new Date().getMonth() + 1,
): Promise<GoldenBallEntry[]> {
  const sb = getSupabase()
  if (!sb) return []

  const { data, error } = await sb
    .from('monthly_scores')
    .select('player_id, player_name, points')
    .eq('year', year)
    .eq('month', month)
    .order('points', { ascending: false })

  if (error || !data) return []
  return data.map((row) => ({
    playerId: row.player_id as string,
    playerName: row.player_name as string,
    points: Number(row.points),
  }))
}

export async function fetchYearTitleStandings(
  year = new Date().getFullYear(),
): Promise<GoldenBallEntry[]> {
  const sb = getSupabase()
  if (!sb) return []

  const { data, error } = await sb
    .from('awards')
    .select('player_id, player_name, points')
    .eq('kind', 'month')
    .like('period_key', `${year}-%`)

  if (error || !data) return []

  const totals = new Map<string, GoldenBallEntry>()
  for (const row of data) {
    const id = row.player_id as string
    const existing = totals.get(id)
    if (existing) existing.points += 1
    else {
      totals.set(id, {
        playerId: id,
        playerName: row.player_name as string,
        points: 1,
      })
    }
  }

  return [...totals.values()].sort((a, b) => b.points - a.points)
}

export async function fetchDayAwards(limit = 12): Promise<AwardRecord[]> {
  const sb = getSupabase()
  if (!sb) return []

  const { data } = await sb
    .from('awards')
    .select('kind, period_key, player_id, player_name, points, match_id')
    .eq('kind', 'day')
    .order('created_at', { ascending: false })
    .limit(limit)

  return ((data as Array<Record<string, unknown>>) ?? []).map((row) => ({
    kind: 'day' as const,
    periodKey: String(row.period_key),
    playerId: String(row.player_id),
    playerName: String(row.player_name),
    points: Number(row.points),
    matchId: (row.match_id as string | null) ?? null,
  }))
}

async function upsertMonthlyPoints(
  year: number,
  month: number,
  entries: GoldenBallEntry[],
): Promise<void> {
  const sb = getSupabase()
  if (!sb || entries.length === 0) return

  for (const entry of entries) {
    const { data: existing } = await sb
      .from('monthly_scores')
      .select('id, points')
      .eq('year', year)
      .eq('month', month)
      .eq('player_id', entry.playerId)
      .maybeSingle()

    if (existing) {
      await sb
        .from('monthly_scores')
        .update({
          points: Number(existing.points) + entry.points,
          player_name: entry.playerName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      await sb.from('monthly_scores').insert({
        year,
        month,
        player_id: entry.playerId,
        player_name: entry.playerName,
        points: entry.points,
      })
    }
  }
}

/** Encerra votação, salva craque(s) do dia e soma no placar do mês. */
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

  const row = match as MatchRow
  if (!row.voting_open) return { ok: false, error: 'already_closed' }

  const { data: votes, error: votesError } = await sb
    .from('votes')
    .select('player_id, picks')
    .eq('match_id', matchId)

  if (votesError) return { ok: false, error: votesError.message }

  const tally = new Map<string, number>()
  for (const vote of (votes as VoteRow[]) ?? []) {
    const picks =
      Array.isArray(vote.picks) && vote.picks.length > 0
        ? vote.picks
        : vote.player_id
          ? [vote.player_id]
          : []
    for (const playerId of picks) {
      tally.set(playerId, (tally.get(playerId) ?? 0) + 1)
    }
  }

  const candidates = row.candidates ?? []
  const nameById = new Map(candidates.map((c) => [c.id, c.name]))
  const dayScores: GoldenBallEntry[] = [...tally.entries()]
    .map(([playerId, points]) => ({
      playerId,
      playerName: nameById.get(playerId) ?? 'Jogador',
      points,
    }))
    .sort((a, b) => b.points - a.points)

  let maxVotes = 0
  for (const entry of dayScores) maxVotes = Math.max(maxVotes, entry.points)

  const winners =
    maxVotes === 0
      ? []
      : dayScores.filter((entry) => entry.points === maxVotes)

  const share = winners.length > 0 ? 1 / winners.length : 0
  const dayKey = periodDay(row.played_at)
  const { year, month } = periodMonth(row.played_at)

  if (winners.length > 0) {
    await sb.from('awards').upsert(
      winners.map((w) => ({
        kind: 'day',
        period_key: dayKey,
        match_id: matchId,
        player_id: w.playerId,
        player_name: w.playerName,
        points: share,
      })),
    )
  }

  // Soma todas as escolhas no placar mensal (+1 por pick)
  await upsertMonthlyPoints(year, month, dayScores)

  // Tenta coroar o mês anterior se ainda não coroado
  await maybeCrownPreviousMonth()

  const { error: updateError } = await sb
    .from('matches')
    .update({ voting_open: false })
    .eq('id', matchId)

  if (updateError) return { ok: false, error: updateError.message }

  return {
    ok: true,
    winners: winners.map((w) => ({ ...w, points: share })),
  }
}

async function maybeCrownPreviousMonth(): Promise<void> {
  const sb = getSupabase()
  if (!sb) return

  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const year = prev.getFullYear()
  const month = prev.getMonth() + 1
  const key = `${year}-${String(month).padStart(2, '0')}`

  const { data: existing } = await sb
    .from('awards')
    .select('id')
    .eq('kind', 'month')
    .eq('period_key', key)
    .limit(1)

  if (existing && existing.length > 0) return

  const standings = await fetchMonthlyStandings(year, month)
  if (standings.length === 0) return

  const top = standings[0].points
  const champs = standings.filter((s) => s.points === top)
  const share = 1 / champs.length

  await sb.from('awards').insert(
    champs.map((c) => ({
      kind: 'month',
      period_key: key,
      match_id: null,
      player_id: c.playerId,
      player_name: c.playerName,
      points: share,
    })),
  )

  // Coroa o ano se estamos em janeiro (mês anterior = dezembro)
  if (month === 12) {
    await maybeCrownYear(year)
  }
}

async function maybeCrownYear(year: number): Promise<void> {
  const sb = getSupabase()
  if (!sb) return

  const key = String(year)
  const { data: existing } = await sb
    .from('awards')
    .select('id')
    .eq('kind', 'year')
    .eq('period_key', key)
    .limit(1)

  if (existing && existing.length > 0) return

  const standings = await fetchYearTitleStandings(year)
  if (standings.length === 0) return

  const top = standings[0].points
  const champs = standings.filter((s) => s.points === top)
  const share = 1 / champs.length

  await sb.from('awards').insert(
    champs.map((c) => ({
      kind: 'year',
      period_key: key,
      match_id: null,
      player_id: c.playerId,
      player_name: c.playerName,
      points: share,
    })),
  )
}

export async function fetchMonthAwards(
  year = new Date().getFullYear(),
): Promise<AwardRecord[]> {
  const sb = getSupabase()
  if (!sb) return []

  const { data } = await sb
    .from('awards')
    .select('kind, period_key, player_id, player_name, points, match_id')
    .eq('kind', 'month')
    .like('period_key', `${year}-%`)
    .order('period_key', { ascending: false })

  return ((data as Array<Record<string, unknown>>) ?? []).map((row) => ({
    kind: 'month',
    periodKey: String(row.period_key),
    playerId: String(row.player_id),
    playerName: String(row.player_name),
    points: Number(row.points),
    matchId: (row.match_id as string | null) ?? null,
  }))
}

// Compat: aliases usados pelas páginas antigas
export const hasDeviceVoted = (matchId: string, deviceId: string) =>
  hasUserVoted({ matchId, deviceId })

export const castVote = async (params: {
  matchId: string
  deviceId: string
  playerId: PlayerId
}) =>
  castBallot({
    matchId: params.matchId,
    deviceId: params.deviceId,
    picks: [params.playerId],
  })

export const fetchYearStandings = fetchYearTitleStandings

export async function fetchRecentClosedMatches(limit = 10) {
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
      .from('awards')
      .select('player_id, player_name, points')
      .eq('kind', 'day')
      .eq('match_id', match.id)

    results.push({
      matchId: match.id as string,
      gameNumber: match.game_number as number,
      playedAt: match.played_at as string,
      winners: (points ?? []).map((row) => ({
        playerId: row.player_id as string,
        playerName: row.player_name as string,
        points: Number(row.points),
      })),
    })
  }

  return results
}
