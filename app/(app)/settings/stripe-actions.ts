'use server'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { getAppOrigin } from '@/lib/env/app-origin'

type CheckoutResult = { success: true; url: string } | { success: false; error: string }

type PortalResult = { success: true; url: string } | { success: false; error: string }

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_PRICE_ID_PRO = process.env.STRIPE_PRICE_ID_PRO

function stripeReturnUrl(): string {
  const overridden = process.env.STRIPE_BILLING_RETURN_URL?.trim()
  if (overridden) return overridden
  return `${getAppOrigin()}${ROUTES.settings}`
}

function stripeNotConfigured(): string | null {
  if (!STRIPE_SECRET_KEY)
    return 'Stripe Secret Key (STRIPE_SECRET_KEY) ist nicht gesetzt.'
  if (!STRIPE_PRICE_ID_PRO)
    return 'Stripe Preis-ID (STRIPE_PRICE_ID_PRO) ist nicht gesetzt.'
  return null
}

export async function createCheckoutSession(): Promise<CheckoutResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const organizationId = profile?.organization_id
  if (!organizationId) {
    return { success: false, error: 'Kein Arbeitsbereich zugeordnet.' }
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', organizationId)
    .single()

  const configError = stripeNotConfigured()
  if (configError) {
    return { success: false, error: configError }
  }

  try {
    const returnUrl = stripeReturnUrl()
    const body = new URLSearchParams()
    body.set('mode', 'subscription')
    body.set('success_url', returnUrl)
    body.set('cancel_url', returnUrl)
    body.append('line_items[0][price]', STRIPE_PRICE_ID_PRO!)
    body.append('line_items[0][quantity]', '1')
    if (org?.stripe_customer_id) {
      body.set('customer', org.stripe_customer_id)
    }

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    const json = (await response.json()) as { url?: string; error?: { message?: string } }
    if (!response.ok || !json.url) {
      return {
        success: false,
        error:
          json.error?.message ||
          `Stripe-Checkout konnte nicht erstellt werden (${response.status}).`,
      }
    }

    return { success: true, url: json.url }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unbekannter Fehler bei Stripe.'
    return { success: false, error: message }
  }
}

export async function createPortalSession(): Promise<PortalResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const organizationId = profile?.organization_id
  if (!organizationId) {
    return { success: false, error: 'Kein Arbeitsbereich zugeordnet.' }
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', organizationId)
    .single()

  if (!org?.stripe_customer_id) {
    return {
      success: false,
      error: 'Für diesen Arbeitsbereich ist noch kein Stripe-Kunde hinterlegt.',
    }
  }

  if (!STRIPE_SECRET_KEY) {
    return {
      success: false,
      error: 'Stripe Secret Key (STRIPE_SECRET_KEY) ist nicht gesetzt.',
    }
  }

  try {
    const returnUrl = stripeReturnUrl()
    const body = new URLSearchParams()
    body.set('customer', org.stripe_customer_id)
    body.set('return_url', returnUrl)

    const response = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    const json = (await response.json()) as { url?: string; error?: { message?: string } }
    if (!response.ok || !json.url) {
      return {
        success: false,
        error:
          json.error?.message ||
          `Stripe-Portal konnte nicht erstellt werden (${response.status}).`,
      }
    }

    return { success: true, url: json.url }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unbekannter Fehler bei Stripe.'
    return { success: false, error: message }
  }
}
