"use client"

import { AppDataTable, type AppDataTableProps } from "@/components/ui/app-data-table"

/** Referenzen-Liste: gleiche Basis wie {@link AppDataTable}, mit Referenzen-Kontextmenü. */
export function ReferenceDataTable<TData, TValue>(
  props: Omit<AppDataTableProps<TData, TValue>, "tableVariant">,
) {
  return <AppDataTable {...props} tableVariant="references" />
}
