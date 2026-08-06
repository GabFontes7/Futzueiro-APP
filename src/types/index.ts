export type PlayerId = string

export interface Player {
  id: PlayerId
  name: string
  overall: number
  createdAt: string
  updatedAt: string
}

export type GameMode = '5x5' | '6x6'

export type TeamLabel = string // 'A' | 'B' | 'C' | ...

export interface DrawAssignment {
  playerId: PlayerId
  team: TeamLabel | 'proximos'
  /** Usado só no algoritmo — não exibir na UI */
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
  /** Médias com Overall base (visível) */
  teamAverages: Record<TeamLabel, number>
  assignments: DrawAssignment[]
  /** Assinatura presença+modo que gerou este sorteio */
  configSignature?: string
  /** Numeração sequencial desde o início do app (Jogo 1, 2, …) */
  gameNumber?: number
  /** Candidatos à votação (snapshot de nomes) */
  candidates?: PlayerSnapshot[]
}

export interface VoteRecord {
  drawId: string
  playerId: PlayerId
  deviceId: string
  votedAt: string
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
  candidates: PlayerSnapshot[]
  voteCount: number
}

/** Passos do fluxo Novo Racha (modalidade vive dentro de presença) */
export type RachaStep = 'presenca' | 'sorteio' | 'resumo'

export interface PlayerInput {
  name: string
  overall: number
}

export interface RachaSession {
  presentIds: PlayerId[]
  mode: GameMode
  currentDraw: DrawResult | null
  /** ID do sorteio cuja revelação pack opening já foi concluída/pulada */
  packOpeningCompletedDrawId: string | null
}

export interface RachaLayout {
  presentCount: number
  teamSize: number
  teamCount: number
  proximosCount: number
  teamLabels: TeamLabel[]
}
