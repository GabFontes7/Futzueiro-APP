export const DEFAULT_CARD_IMAGE = '/cartas/default.png'

export function clampOverall(value: number): number {
  return Math.min(99, Math.max(50, Math.round(value)))
}

export function getCardTier(overall: number): 'gold' | 'silver' | 'bronze' {
  if (overall >= 80) return 'gold'
  if (overall >= 70) return 'silver'
  return 'bronze'
}

/**
 * Normaliza o nome para bater com o arquivo em /public/cartas/.
 * Ex.: "João Silva" → "joao silva"
 */
export function sanitizePlayerImageKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/** Nome do arquivo esperado, ex.: "joao silva.png" */
export function getPlayerImageFileName(name: string): string {
  const key = sanitizePlayerImageKey(name)
  return key.length > 0 ? `${key}.png` : 'default.png'
}

/**
 * Caminho público da cartinha derivado do nome do jogador.
 * Ex.: "João Silva" → "/cartas/joao%20silva.png"
 */
export function getPlayerImageSrcFromName(name: string): string {
  const fileName = getPlayerImageFileName(name)
  if (fileName === 'default.png') return DEFAULT_CARD_IMAGE
  return `/cartas/${encodeURIComponent(fileName)}`
}

/**
 * Resolve a arte da cartinha:
 * 1) photoUrl do Supabase (upload do jogador)
 * 2) /cartas/{nome}.png (legado estático)
 * 3) onError no card → default.png
 */
export function resolvePlayerImageSrc(
  name: string,
  photoUrl?: string | null,
): string {
  const remote = photoUrl?.trim()
  if (remote) return remote
  return getPlayerImageSrcFromName(name)
}

export function sortPlayersByName<T extends { name: string }>(players: T[]): T[] {
  return [...players].sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
  )
}
