import { getSupabase } from '@/lib/supabase'
import { clampOverall, sortPlayersByName } from '@/lib/players'
import { deletePlayerPhoto } from '@/lib/db/playerPhotos'
import type { Player, PlayerId, PlayerInput } from '@/types'

interface PlayerRow {
  id: string
  name: string
  overall: number
  photo_url: string | null
  created_at: string
  updated_at: string
}

function mapRow(row: PlayerRow): Player {
  return {
    id: row.id,
    name: row.name,
    overall: row.overall,
    photoUrl: row.photo_url ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function fetchPlayers(): Promise<Player[]> {
  const sb = getSupabase()
  if (!sb) return []

  const { data, error } = await sb
    .from('players')
    .select('*')
    .order('name', { ascending: true })

  if (error || !data) return []
  return sortPlayersByName((data as PlayerRow[]).map(mapRow))
}

export async function insertPlayer(input: PlayerInput): Promise<Player | null> {
  const sb = getSupabase()
  if (!sb) return null

  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    overall: clampOverall(input.overall),
  }
  if (input.photoUrl !== undefined) {
    payload.photo_url = input.photoUrl
  }

  const { data, error } = await sb
    .from('players')
    .insert(payload)
    .select('*')
    .single()

  if (error || !data) return null
  return mapRow(data as PlayerRow)
}

export async function updatePlayerRemote(
  id: PlayerId,
  input: PlayerInput,
): Promise<Player | null> {
  const sb = getSupabase()
  if (!sb) return null

  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    overall: clampOverall(input.overall),
    updated_at: new Date().toISOString(),
  }
  if (input.photoUrl !== undefined) {
    payload.photo_url = input.photoUrl
  }

  const { data, error } = await sb
    .from('players')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) return null
  return mapRow(data as PlayerRow)
}

export async function deletePlayerRemote(id: PlayerId): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false

  await deletePlayerPhoto(id)
  const { error } = await sb.from('players').delete().eq('id', id)
  return !error
}
