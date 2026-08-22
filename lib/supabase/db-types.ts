import type { Database, Json } from '@/lib/database.types'

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

type DbEnums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]

export type ReferenceStatus = DbEnums<'reference_status'>

export function asReferenceStatus(value: string): ReferenceStatus {
  return value as ReferenceStatus
}

export function asJson(value: unknown): Json {
  return value as Json
}

/** Insert/Update: DB null → TS undefined für optionale Felder. */
export function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value
}

/** Row-Insert mit optionalen Spalten (Schema-Lag / Dual-Path-Upserts). */
export function asTableInsert<T extends keyof Database['public']['Tables']>(
  row: Record<string, unknown>,
): TablesInsert<T> {
  return row as unknown as TablesInsert<T>
}

/** Row-Update mit optionalen Spalten (Schema-Lag / Dual-Path-Updates). */
export function asTableUpdate<T extends keyof Database['public']['Tables']>(
  row: Record<string, unknown>,
): TablesUpdate<T> {
  return row as unknown as TablesUpdate<T>
}
