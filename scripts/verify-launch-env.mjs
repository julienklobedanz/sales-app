#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Lädt `.env` und `.env.local` (wie Next.js lokal), ohne Shell-Env zu überschreiben. */
function loadEnvFiles() {
  for (const filename of ['.env', '.env.local']) {
    const filePath = path.join(ROOT, filename)
    if (!fs.existsSync(filePath)) continue

    const lines = fs.readFileSync(filePath, 'utf8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const eq = trimmed.indexOf('=')
      if (eq <= 0) continue

      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      if (process.env[key] === undefined) {
        process.env[key] = value
      }
    }
  }
}

loadEnvFiles()

const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_APP_URL',
  'RESEND_API_KEY',
  'RESEND_FROM',
]

const RECOMMENDED = ['REFERENCE_MANAGER_EMAIL', 'SUPABASE_SERVICE_ROLE_KEY']

const OPTIONAL_BY_SCOPE = [
  'OPENAI_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_PRICE_ID_PRO',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_BILLING_RETURN_URL',
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
printGroup('Recommended for core product flows', RECOMMENDED)
printGroup('Optional depending on enabled features', OPTIONAL_BY_SCOPE)

const missingRequired = REQUIRED.filter((key) => !isSet(key))
if (missingRequired.length > 0) {
  console.error('\nMissing required launch environment variables:')
  for (const key of missingRequired) console.error(`- ${key}`)
  process.exit(1)
}

console.log('\nEnvironment baseline looks good.')
console.log('(Quelle: Shell-Env + .env + .env.local)')
