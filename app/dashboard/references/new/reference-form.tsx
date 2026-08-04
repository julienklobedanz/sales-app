'use client'

import type { ComponentProps } from 'react'
import {
  ReferenceForm as ReferenceFormBase,
} from '@/lib/references/reference-form/reference-form'
import { searchCompanySuggestions } from './actions'

export type {
  ContactPerson,
  ExternalContactDisplay,
  ReferenceFormInitialData,
} from '@/lib/references/reference-form/reference-form-types'

/** Dashboard-Adapter: injiziert Org-Suche; Lib bleibt von Actions entkoppelt. */
export function ReferenceForm(
  props: Omit<ComponentProps<typeof ReferenceFormBase>, 'searchCompanies'> & {
    searchCompanies?: ComponentProps<typeof ReferenceFormBase>['searchCompanies']
  }
) {
  return (
    <ReferenceFormBase
      {...props}
      searchCompanies={props.searchCompanies ?? searchCompanySuggestions}
    />
  )
}
