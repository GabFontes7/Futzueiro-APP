import type { DrawResult, PlayerId, TeamLabel } from '@/types'

export type RevealDestination = TeamLabel | 'proximos'

export interface RevealCard {
  playerId: PlayerId
  destination: RevealDestination
}

function shuffleInPlace<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Fila de revelação: Time A → B → C… → Próximos.
 * Dentro de cada grupo a ordem é embaralhada.
 */
export function buildRevealQueue(draw: DrawResult): RevealCard[] {
  const queue: RevealCard[] = []
  const teamLabels = Object.keys(draw.teams).sort()

  for (const label of teamLabels) {
    const roster = shuffleInPlace(draw.teams[label] ?? [])
    for (const playerId of roster) {
      queue.push({ playerId, destination: label })
    }
  }

  for (const playerId of shuffleInPlace(draw.proximos)) {
    queue.push({ playerId, destination: 'proximos' })
  }

  return queue
}

export function firePackConfetti(): void {
  void import('canvas-confetti').then(({ default: confetti }) => {
    const gold = '#f5c518'
    const cream = '#f5f2ea'
    const dark = '#1a1a26'

    confetti({
      particleCount: 72,
      spread: 68,
      startVelocity: 38,
      origin: { y: 0.62 },
      colors: [gold, cream, dark, '#d4af37'],
      disableForReducedMotion: true,
    })

    confetti({
      particleCount: 36,
      angle: 60,
      spread: 48,
      origin: { x: 0, y: 0.7 },
      colors: [gold, cream],
      disableForReducedMotion: true,
    })

    confetti({
      particleCount: 36,
      angle: 120,
      spread: 48,
      origin: { x: 1, y: 0.7 },
      colors: [gold, cream],
      disableForReducedMotion: true,
    })
  })
}
