import type { GameMode, RachaLayout, TeamLabel } from '@/types'

export function getTeamSize(mode: GameMode): number {
  return mode === '6x6' ? 6 : 5
}

export function getTeamLabels(teamCount: number): TeamLabel[] {
  const labels: TeamLabel[] = []
  for (let i = 0; i < teamCount; i += 1) {
    labels.push(String.fromCharCode(65 + i)) // A, B, C...
  }
  return labels
}

/**
 * Quantidade de times = floor(presentes / tamanho).
 * Sobras = fila de Próximos.
 */
export function calculateRachaLayout(
  presentCount: number,
  mode: GameMode,
): RachaLayout {
  const teamSize = getTeamSize(mode)
  const teamCount = Math.floor(presentCount / teamSize)
  const proximosCount = presentCount % teamSize

  return {
    presentCount,
    teamSize,
    teamCount,
    proximosCount,
    teamLabels: getTeamLabels(teamCount),
  }
}

export const DEFAULT_RACHA_SESSION = {
  presentIds: [] as string[],
  mode: '5x5' as GameMode,
  currentDraw: null,
  packOpeningCompletedDrawId: null as string | null,
}


