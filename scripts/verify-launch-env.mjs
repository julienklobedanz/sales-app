#!/usr/bin/env node

const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_APP_URL',
  'RESEND_API_KEY',
  'RESEND_FROM',
]

const OPTIONAL_BY_SCOPE = [
  'OPENAI_API_KEY',
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT',
  'STRIPE_SECRET_KEY',
  'STRIPE_PRICE_ID_PRO',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_BILLING_RETURN_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CRON_SECRET',
]

function isSet(name) {
  const value = process.env[name]
  return typeof value === 'string' && value.trim().length > 0
}

function printGroup(title, names) {
  console.log(`\n${title}`)
  for (const key of names) {
    const ok = isSet(key)
    console.log(`- ${ok ? 'OK ' : 'MISSING '} ${key}`)
  }
}

printGroup('Required for launch baseline', REQUIRED)
printGroup('Optional depending on enabled features', OPTIONAL_BY_SCOPE)

const missingRequired = REQUIRED.filter((key) => !isSet(key))
if (missingRequired.length > 0) {
  console.error('\nMissing required launch environment variables:')
  for (const key of missingRequired) console.error(`- ${key}`)
  process.exit(1)
}

console.log('\nEnvironment baseline looks good.')
