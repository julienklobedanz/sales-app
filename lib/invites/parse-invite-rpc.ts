import type { Json } from '@/lib/database.types'

/** Fields returned by invite RPCs (`get_invite_by_token`, resend/pending helpers). */
export type InviteRpcFields = {
  id?: string
  email?: string | null
  token?: string | null
  organization_id?: string
  organization_name?: string
  system_role?: string | null
  function_role?: string | null
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function optionalNullableString(value: unknown): string | null | undefined {
  if (value === null) return null
  return typeof value === 'string' ? value : undefined
}

/** Narrow invite RPC `Json` without row-shaped casts. */
export function parseInviteRpcJson(data: Json | null | undefined): InviteRpcFields | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const obj = data as Record<string, unknown>
  return {
    id: optionalString(obj.id),
    email: optionalNullableString(obj.email),
    token: optionalNullableString(obj.token),
    organization_id: optionalString(obj.organization_id),
    organization_name: optionalString(obj.organization_name),
    system_role: optionalNullableString(obj.system_role),
    function_role: optionalNullableString(obj.function_role),
  }
}

export function parseInviteRpcRows(data: Json | null | undefined): InviteRpcFields[] {
  if (!Array.isArray(data)) return []
  return data
    .map((row) => parseInviteRpcJson(row))
    .filter((row): row is InviteRpcFields => Boolean(row?.id))
}
