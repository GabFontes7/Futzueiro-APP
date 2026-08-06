import { calculateRachaLayout } from '@/lib/racha'
import type {
  DrawAssignment,
  DrawResult,
  GameMode,
  Player,
  PlayerId,
  TeamLabel,
} from '@/types'

const LUCK_MIN = -3
const LUCK_MAX = 3
const DRAW_ATTEMPTS = 48

interface RankedPlayer {
  id: PlayerId
  overall: number
  effectiveOverall: number
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function pairKey(a: PlayerId, b: PlayerId): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`
}

/** Pares que jogaram juntos no último racha (anti-repetição). */
export function buildPartnerPairs(lastDraw: DrawResult | null): Set<string> {
  const pairs = new Set<string>()
  if (!lastDraw) return pairs

  for (const roster of Object.values(lastDraw.teams)) {
    for (let i = 0; i < roster.length; i += 1) {
      for (let j = i + 1; j < roster.length; j += 1) {
        pairs.add(pairKey(roster[i], roster[j]))
      }
    }
  }

  return pairs
}

/** Quem ficou em Próximos no último racha e está presente hoje → imune. */
export function getImmunePlayerIds(
  presentIds: PlayerId[],
  lastDraw: DrawResult | null,
): Set<PlayerId> {
  if (!lastDraw) return new Set()
  const present = new Set(presentIds)
  return new Set(lastDraw.proximos.filter((id) => present.has(id)))
}

function applyHiddenLuck(overall: number): number {
  return overall + randomInt(LUCK_MIN, LUCK_MAX)
}

function pickProximos(
  present: Player[],
  proximosCount: number,
  immuneIds: Set<PlayerId>,
): PlayerId[] {
  if (proximosCount <= 0) return []

  const nonImmune = present.filter((p) => !immuneIds.has(p.id))
  const immune = present.filter((p) => immuneIds.has(p.id))

  if (nonImmune.length >= proximosCount) {
    return shuffle(nonImmune)
      .slice(0, proximosCount)
      .map((p) => p.id)
  }

  // Caso extremo: não há não-imunes suficientes — completa com imunes
  const forced = shuffle(immune).slice(0, proximosCount - nonImmune.length)
  return [...nonImmune, ...forced].map((p) => p.id)
}

function countForbiddenOnTeam(
  team: PlayerId[],
  candidateId: PlayerId,
  forbidden: Set<string>,
): number {
  let count = 0
  for (const memberId of team) {
    if (forbidden.has(pairKey(memberId, candidateId))) count += 1
  }
  return count
}

function assignBalancedTeams(
  pool: RankedPlayer[],
  labels: TeamLabel[],
  teamSize: number,
  forbidden: Set<string>,
): { teams: Record<TeamLabel, PlayerId[]>; assignments: DrawAssignment[] } {
  const teams: Record<TeamLabel, PlayerId[]> = {}
  const sums: Record<TeamLabel, number> = {}

  for (const label of labels) {
    teams[label] = []
    sums[label] = 0
  }

  // Ordem aleatória a cada tentativa; o greedy equilibra pelas somas
  const ordered = shuffle(pool)

  for (const player of ordered) {
    const candidates = labels
      .filter((label) => teams[label].length < teamSize)
      .map((label) => ({
        label,
        size: teams[label].length,
        sum: sums[label],
        repeats: countForbiddenOnTeam(teams[label], player.id, forbidden),
      }))

    candidates.sort((a, b) => {
      if (a.repeats !== b.repeats) return a.repeats - b.repeats
      if (a.sum !== b.sum) return a.sum - b.sum
      if (a.size !== b.size) return a.size - b.size
      return a.label.localeCompare(b.label)
    })

    const chosen = candidates[0]
    teams[chosen.label].push(player.id)
    sums[chosen.label] += player.effectiveOverall
  }

  const assignments: DrawAssignment[] = pool.map((player) => {
    const team =
      labels.find((label) => teams[label].includes(player.id)) ?? labels[0]
    return {
      playerId: player.id,
      team,
      effectiveOverall: player.effectiveOverall,
    }
  })

  return { teams, assignments }
}

function scoreAssignment(
  teams: Record<TeamLabel, PlayerId[]>,
  poolById: Map<PlayerId, RankedPlayer>,
  forbidden: Set<string>,
): number {
  const averages: number[] = []
  let repeatPenalty = 0

  for (const roster of Object.values(teams)) {
    if (roster.length === 0) continue
    const sum = roster.reduce(
      (acc, id) => acc + (poolById.get(id)?.effectiveOverall ?? 0),
      0,
    )
    averages.push(sum / roster.length)

    for (let i = 0; i < roster.length; i += 1) {
      for (let j = i + 1; j < roster.length; j += 1) {
        if (forbidden.has(pairKey(roster[i], roster[j]))) {
          repeatPenalty += 1
        }
      }
    }
  }

  if (averages.length === 0) return repeatPenalty * 100

  const mean = averages.reduce((a, b) => a + b, 0) / averages.length
  const variance =
    averages.reduce((acc, value) => acc + (value - mean) ** 2, 0) /
    averages.length

  // Prioriza equilíbrio; anti-repetição como soft constraint
  return variance + repeatPenalty * 12
}

function computeBaseAverages(
  teams: Record<TeamLabel, PlayerId[]>,
  playersById: Map<PlayerId, Player>,
): Record<TeamLabel, number> {
  const averages: Record<TeamLabel, number> = {}

  for (const [label, roster] of Object.entries(teams)) {
    if (roster.length === 0) {
      averages[label] = 0
      continue
    }
    const sum = roster.reduce(
      (acc, id) => acc + (playersById.get(id)?.overall ?? 0),
      0,
    )
    averages[label] = Math.round((sum / roster.length) * 10) / 10
  }

  return averages
}

export interface RunDrawOptions {
  presentPlayers: Player[]
  mode: GameMode
  lastDraw: DrawResult | null
}

/**
 * Sorteio equilibrado com:
 * - Fator sorte oculto (-3..+3) só no cálculo interno
 * - Próximos imunes (não repetem fila)
 * - Próximos de hoje aleatórios entre não-imunes
 * - Anti-repetição soft vs parceiros do último racha
 */
export function runBalancedDraw({
  presentPlayers,
  mode,
  lastDraw,
}: RunDrawOptions): DrawResult {
  const presentIds = presentPlayers.map((p) => p.id)
  const layout = calculateRachaLayout(presentPlayers.length, mode)
  const playersById = new Map(presentPlayers.map((p) => [p.id, p]))
  const immuneIds = getImmunePlayerIds(presentIds, lastDraw)
  const forbidden = buildPartnerPairs(lastDraw)

  const proximos = pickProximos(
    presentPlayers,
    layout.proximosCount,
    immuneIds,
  )
  const proximosSet = new Set(proximos)

  const teamPoolPlayers = presentPlayers.filter((p) => !proximosSet.has(p.id))
  const labels = layout.teamLabels

  const emptyTeams: Record<TeamLabel, PlayerId[]> = {}
  for (const label of labels) emptyTeams[label] = []

  if (labels.length === 0 || teamPoolPlayers.length === 0) {
    const assignments: DrawAssignment[] = presentPlayers.map((p) => ({
      playerId: p.id,
      team: 'proximos',
      effectiveOverall: p.overall,
    }))

    return {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      mode,
      teams: emptyTeams,
      proximos: presentIds,
      teamAverages: {},
      assignments,
    }
  }

  let bestTeams = emptyTeams
  let bestAssignments: DrawAssignment[] = []
  let bestScore = Number.POSITIVE_INFINITY

  for (let attempt = 0; attempt < DRAW_ATTEMPTS; attempt += 1) {
    const ranked: RankedPlayer[] = teamPoolPlayers.map((p) => ({
      id: p.id,
      overall: p.overall,
      effectiveOverall: applyHiddenLuck(p.overall),
    }))

    const poolById = new Map(ranked.map((p) => [p.id, p]))
    const { teams, assignments } = assignBalancedTeams(
      ranked,
      labels,
      layout.teamSize,
      forbidden,
    )
    const score = scoreAssignment(teams, poolById, forbidden)

    if (score < bestScore) {
      bestScore = score
      bestTeams = teams
      bestAssignments = assignments
    }
  }

  const proximosAssignments: DrawAssignment[] = proximos.map((id) => ({
    playerId: id,
    team: 'proximos',
    effectiveOverall: playersById.get(id)?.overall ?? 0,
  }))

  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    mode,
    teams: bestTeams,
    proximos,
    teamAverages: computeBaseAverages(bestTeams, playersById),
    assignments: [...bestAssignments, ...proximosAssignments],
  }
}

/** Assinatura da configuração atual — invalida sorteio se presença/modo mudarem. */
export function drawConfigSignature(
  presentIds: PlayerId[],
  mode: GameMode,
): string {
  return `${mode}:${[...presentIds].sort().join(',')}`
}
