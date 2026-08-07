export type PlayerId = string

export interface Player {
  id: PlayerId
  name: string
  overall: number
  createdAt: string
  updatedAt: string
}

export type GameMode = '5x5' | '6x6'

export type TeamLabel = string

export interface DrawAssignment {
  playerId: PlayerId
  team: TeamLabel | 'proximos'
  effectiveOverall: number
}

export interface PlayerSnapshot {
  id: PlayerId
  name: string
}

export interface DrawResult {
  id: string
  date: string
  mode: GameMode
  teams: Record<TeamLabel, PlayerId[]>
  proximos: PlayerId[]
  teamAverages: Record<TeamLabel, number>
  assignments: DrawAssignment[]
  configSignature?: string
  gameNumber?: number
  candidates?: PlayerSnapshot[]
}

export interface GoldenBallEntry {
  playerId: PlayerId
  playerName: string
  points: number
}

export interface MatchVoteStatus {
  matchId: string
  gameNumber: number
  playedAt: string
  mode: GameMode
  votingOpen: boolean
  votingClosesAt: string | null
  candidates: PlayerSnapshot[]
  /** Quantidade de boletos (pessoas que votaram), não de picks */
  voteCount: number
}

export type AwardKind = 'day' | 'month' | 'year'

export interface AwardRecord {
  kind: AwardKind
  periodKey: string
  playerId: PlayerId
  playerName: string
  points: number
  matchId?: string | null
}

export type RachaStep = 'presenca' | 'sorteio' | 'resumo'

export interface PlayerInput {
  name: string
  overall: number
}

export interface RachaSession {
  presentIds: PlayerId[]
  mode: GameMode
  currentDraw: DrawResult | null
  packOpeningCompletedDrawId: string | null
}

export interface RachaLayout {
  presentCount: number
  teamSize: number
  teamCount: number
  proximosCount: number
  teamLabels: TeamLabel[]
}

export const MAX_DAY_PICKS = 3
export const VOTING_DURATION_MS = 12 * 60 * 60 * 1000
