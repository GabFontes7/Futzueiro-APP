import type { Player, PlayerSnapshot } from '@/types'

export function formatGameLabel(gameNumber: number, isoDate: string): string {
  const date = new Date(isoDate)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `Jogo ${gameNumber} · ${day}/${month}/${year}`
}

export function buildCandidatesSnapshot(players: Player[]): PlayerSnapshot[] {
  return [...players]
    .sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
    )
    .map((p) => ({ id: p.id, name: p.name }))
}
