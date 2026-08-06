import type { DrawResult, Player, PlayerId, TeamLabel } from '@/types'

const TEAM_EMOJI: Record<string, string> = {
  A: '🟡',
  B: '🔵',
  C: '🟢',
  D: '🟠',
  E: '🟣',
  F: '🔴',
  G: '⚪',
  H: '🟤',
}

export function getTeamEmoji(label: TeamLabel): string {
  return TEAM_EMOJI[label] ?? '⚪'
}

export function formatTeamAverage(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function buildWhatsAppShareText(
  draw: DrawResult,
  playersById: Map<PlayerId, Player>,
): string {
  const header =
    draw.gameNumber != null
      ? `⚽ FUTZUEIRO-APP — Jogo ${draw.gameNumber} · ${draw.mode}`
      : `⚽ FUTZUEIRO-APP — ${draw.mode}`

  const lines: string[] = [header, '']

  const teamLabels = Object.keys(draw.teams).sort()

  for (const label of teamLabels) {
    const roster = draw.teams[label] ?? []
    const avg = formatTeamAverage(draw.teamAverages[label] ?? 0)
    lines.push(`${getTeamEmoji(label)} TIME ${label} (Média: ${avg})`)

    for (const id of roster) {
      const player = playersById.get(id)
      if (!player) continue
      lines.push(`- ${player.name} (${player.overall})`)
    }

    lines.push('')
  }

  if (draw.proximos.length > 0) {
    lines.push('⏳ PRÓXIMOS (Fila de Espera)')
    for (const id of draw.proximos) {
      const player = playersById.get(id)
      if (!player) continue
      lines.push(`- ${player.name} (${player.overall})`)
    }
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}
