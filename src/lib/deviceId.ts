import { writeDeviceId, readDeviceId } from '@/lib/storage'

export function getDeviceId(): string {
  const existing = readDeviceId()
  if (existing && existing.length > 0) return existing

  const id = crypto.randomUUID()
  writeDeviceId(id)
  return id
}
