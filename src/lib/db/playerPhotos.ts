import { getSupabase } from '@/lib/supabase'

export const PLAYER_PHOTOS_BUCKET = 'player-photos'

const MAX_EDGE = 1024
const JPEG_QUALITY = 0.82

function extensionForMime(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

/** Redimensiona/comprime no cliente antes do upload. */
export async function preparePlayerPhotoFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Arquivo inválido. Escolha uma imagem.')
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), 'image/jpeg', JPEG_QUALITY)
  })
  if (!blob) return file

  const base = file.name.replace(/\.[^.]+$/, '') || 'foto'
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' })
}

export async function uploadPlayerPhoto(
  playerId: string,
  file: File,
): Promise<string | null> {
  const sb = getSupabase()
  if (!sb) return null

  const prepared = await preparePlayerPhotoFile(file)
  const ext = extensionForMime(prepared.type)
  const path = `${playerId}/photo.${ext}`

  const { error } = await sb.storage.from(PLAYER_PHOTOS_BUCKET).upload(path, prepared, {
    upsert: true,
    contentType: prepared.type,
    cacheControl: '3600',
  })
  if (error) {
    console.error('uploadPlayerPhoto', error.message)
    return null
  }

  const { data } = sb.storage.from(PLAYER_PHOTOS_BUCKET).getPublicUrl(path)
  // cache-bust so the card refreshes after replace
  const url = data.publicUrl
  return `${url}?v=${Date.now()}`
}

export async function deletePlayerPhoto(playerId: string): Promise<void> {
  const sb = getSupabase()
  if (!sb) return

  const { data } = await sb.storage.from(PLAYER_PHOTOS_BUCKET).list(playerId)
  if (!data?.length) return

  const paths = data.map((item) => `${playerId}/${item.name}`)
  await sb.storage.from(PLAYER_PHOTOS_BUCKET).remove(paths)
}
