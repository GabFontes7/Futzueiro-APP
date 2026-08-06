import { getSupabase } from '@/lib/supabase'
import { clampOverall, sortPlayersByName } from '@/lib/players'
import type { Player, PlayerId, PlayerInput } from '@/types'

interface PlayerRow {
  id: string
  name: string
  overall: number
  created_at: string
  updated_at: string
}

function mapRow(row: PlayerRow): Player {
  return {
    id: row.id,
    name: row.name,
    overall: row.overall,
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

  const { data, error } = await sb
    .from('players')
    .insert({
      name: input.name.trim(),
      overall: clampOverall(input.overall),
    })
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

  const { data, error } = await sb
    .from('players')
    .update({
      name: input.name.trim(),
      overall: clampOverall(input.overall),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) return null
  return mapRow(data as PlayerRow)
}

export async function deletePlayerRemote(id: PlayerId): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false

  const { error } = await sb.from('players').delete().eq('id', id)
  return !error
}
