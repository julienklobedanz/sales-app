import { parseGermanEmployeeCountInput } from '@/lib/format'
import type {
  ExternalContactDisplay,
  ReferenceFormInitialData,
} from '@/lib/references/reference-form/reference-form-types'

export type ReferenceFormSharedFieldState = {
  title: string
  summary: string
  industry: string
  country: string
  employeeCount: string
  website: string
  headquarters: string
  brandfetchLogoUrl: string
  customerChallenge: string
  ourSolution: string
  contactId: string
  customer_contact_id: string
  displayCustomerContacts: ExternalContactDisplay[]
  projectStatus: string
  projectStart: string
  projectEnd: string
  volumeEur: string
  volumeCurrency: string
  contractType: string
  incumbentProvider: string
  competitors: string
  status: ReferenceFormInitialData['status']
  ndaDeal: boolean
  tags: string[]
}

export function appendSharedReferenceFields(
  fd: FormData,
  state: ReferenceFormSharedFieldState,
) {
  fd.set('title', state.title.trim())
  fd.set('summary', state.summary.trim())
  fd.set('industry', state.industry)
  fd.set('country', state.country)
  const ec = parseGermanEmployeeCountInput(state.employeeCount)
  fd.set('employee_count', ec != null ? String(ec) : '')
  fd.set('website', state.website.trim())
  fd.set('company_headquarters', state.headquarters.trim())
  fd.set('company_logo_url', state.brandfetchLogoUrl.trim())
  fd.set('customer_challenge', state.customerChallenge)
  fd.set('our_solution', state.ourSolution)
  fd.set('contactId', state.contactId === '__none__' ? '' : state.contactId)
  fd.set(
    'customer_contact_id',
    state.customer_contact_id === '__none__' ? '' : state.customer_contact_id,
  )
  const selectedCustomer = state.displayCustomerContacts.find(
    (c) => c.id === state.customer_contact_id,
  )
  const customerDisplay = selectedCustomer
    ? [selectedCustomer.first_name, selectedCustomer.last_name]
        .filter(Boolean)
        .join(' ') + (selectedCustomer.role ? `, ${selectedCustomer.role}` : '')
    : ''
  fd.set('customer_contact', customerDisplay)
  fd.set('project_status', state.projectStatus === '__none__' ? '' : state.projectStatus)
  fd.set('project_start', state.projectStart)
  fd.set('project_end', state.projectStatus === 'active' ? '' : state.projectEnd)
  if (state.volumeEur) {
    fd.set('volume_eur', `${state.volumeCurrency} ${state.volumeEur.replace(/\./g, '')}`)
  }
  fd.set('contract_type', state.contractType)
  fd.set('incumbent_provider', state.incumbentProvider)
  fd.set('competitors', state.competitors)
  fd.set('status', state.status)
  fd.set('nda_deal', state.ndaDeal ? '1' : '0')
  fd.set('tags', state.tags.join(','))
}

export function buildFormDataCreate(
  shared: ReferenceFormSharedFieldState,
  companyId: string,
  newCompanyName: string,
): FormData {
  const fd = new FormData()
  appendSharedReferenceFields(fd, shared)
  fd.set('companyId', companyId)
  fd.set('newCompanyName', newCompanyName.trim())
  return fd
}

export function buildFormDataEdit(
  shared: ReferenceFormSharedFieldState,
  editCompanyName: string,
): FormData {
  const fd = new FormData()
  appendSharedReferenceFields(fd, shared)
  fd.set('company_name', editCompanyName.trim())
  return fd
}
