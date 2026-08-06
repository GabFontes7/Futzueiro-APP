/** LocalStorage: APENAS Device ID (voto único). Domínio = Supabase. */

const DEVICE_KEY = 'futzueiro:device-id'

export function readDeviceId(): string | null {
  try {
    const raw = localStorage.getItem(DEVICE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return typeof parsed === 'string' ? parsed : null
  } catch {
    return null
  }
}

export function writeDeviceId(id: string): void {
  localStorage.setItem(DEVICE_KEY, JSON.stringify(id))
}
