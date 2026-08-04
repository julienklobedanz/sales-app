import { afterEach, describe, expect, it } from 'vitest'

import {
  buildSalesforceOpportunityUrl,
  buildSalesforceTaskUrl,
  getSalesforceInstanceUrl,
} from './salesforce'

describe('getSalesforceInstanceUrl', () => {
  const prevPublic = process.env.NEXT_PUBLIC_SALESFORCE_INSTANCE_URL
  const prevServer = process.env.SALESFORCE_INSTANCE_URL

  afterEach(() => {
    if (prevPublic === undefined) delete process.env.NEXT_PUBLIC_SALESFORCE_INSTANCE_URL
    else process.env.NEXT_PUBLIC_SALESFORCE_INSTANCE_URL = prevPublic
    if (prevServer === undefined) delete process.env.SALESFORCE_INSTANCE_URL
    else process.env.SALESFORCE_INSTANCE_URL = prevServer
  })

  it('falls back to login when unset', () => {
    delete process.env.NEXT_PUBLIC_SALESFORCE_INSTANCE_URL
    delete process.env.SALESFORCE_INSTANCE_URL
    expect(getSalesforceInstanceUrl()).toBe('https://login.salesforce.com')
  })

  it('normalizes instance host', () => {
    process.env.NEXT_PUBLIC_SALESFORCE_INSTANCE_URL = 'acme.my.salesforce.com'
    expect(getSalesforceInstanceUrl()).toBe('https://acme.my.salesforce.com')
  })
})

describe('buildSalesforceTaskUrl', () => {
  it('opens task list without draft fields', () => {
    delete process.env.NEXT_PUBLIC_SALESFORCE_INSTANCE_URL
    expect(buildSalesforceTaskUrl()).toBe(
      'https://login.salesforce.com/lightning/o/Task/list',
    )
  })
})

describe('buildSalesforceOpportunityUrl', () => {
  it('returns null without opportunity id', () => {
    expect(buildSalesforceOpportunityUrl({ opportunityId: null })).toBeNull()
  })

  it('builds lightning view url with instance', () => {
    process.env.NEXT_PUBLIC_SALESFORCE_INSTANCE_URL = 'https://acme.my.salesforce.com'
    expect(buildSalesforceOpportunityUrl({ opportunityId: '006ABC' })).toBe(
      'https://acme.my.salesforce.com/lightning/r/Opportunity/006ABC/view',
    )
  })
})
