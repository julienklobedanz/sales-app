import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const BodySchema = z.object({
  headline: z.string().max(500),
  signalKind: z.enum(['exec', 'news']),
  companyName: z.string().max(300),
  introTone: z.enum(['challenging', 'advisory', 'concise']),
  summarySnippet: z.string().max(1200),
  referenceTitles: z.array(z.string()).max(4),
})

function heuristicStrategy(body: z.infer<typeof BodySchema>): string {
  const { signalKind, companyName, introTone, summarySnippet, referenceTitles } = body
  const low = summarySnippet.toLowerCase()
  let angle = ''
  if (/budget|kost|einspar|effizienz|spar|kosten/.test(low)) {
    angle = 'Dieses Signal deutet auf Budget- und Effizienzthemen hin'
  } else if (/cloud|migration|modernis|digital|transformation/.test(low)) {
    angle = 'Modernisierung und Plattform-/Cloud-Themen stehen im Fokus'
  } else if (/security|cyber|ciso|risiko|compliance/.test(low)) {
    angle = 'Security-, Risiko- und Compliance-Agenda ist erkennbar'
  } else if (/expansion|wachstum|m&a|übernahme|neue märkte|expansion/.test(low)) {
    angle = 'Wachstum und Expansion prägen das Umfeld'
  } else if (signalKind === 'exec') {
    angle =
      'Neuer Entscheider: 90-Tage-Fenster für IT-Infrastruktur und Anbieterwechsel vor Budget-Freeze'
  } else {
    angle = 'Operativer Veränderungsbedarf beim Account ist das Leitmotiv'
  }

  const ref = referenceTitles[0]
  const toneHint =
    introTone === 'challenging'
      ? 'Formuliere eine klare Hypothese und lade zum Gegenargument ein.'
      : introTone === 'concise'
        ? 'Bleib in den ersten Sätzen extrem knapp; ein Beleg pro Aussage.'
        : 'Arbeite beratend mit klarer Nutzen-Linie und einem konkreten nächsten Schritt.'

  if (ref) {
    return `${angle}. Nutze die Referenz „${ref}“, um die Story glaubwürdig zu machen. ${toneHint}`
  }
  return `${angle}. Ergänze schnell eine passende Referenz aus dem Pool, bevor du den Entwurf finalisierst. ${toneHint}`
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 })
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Parameter.' }, { status: 400 })
  }

  const base = heuristicStrategy(parsed.data)
  let strategy = base
  let source: 'heuristic' | 'openai' = 'heuristic'

  const apiKey = process.env.OPENAI_API_KEY
  if (apiKey) {
    try {
      const openai = new OpenAI({ apiKey })
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Du bist Senior Sales Strategist (B2B IT/SaaS). Antworte auf Deutsch mit GENAU einem oder zwei kurzen Sätzen (max. 320 Zeichen). Keine Floskeln (kein „Momentum“, „lösungsorientiert“, „natürlicher Einstieg“). Fokus: Budget-Fenster, 90-Tage-Phase neuer Entscheider, Anbieterwechsel. Nutze die Basis-Empfehlung als Anker.',
          },
          {
            role: 'user',
            content: `Signal: ${parsed.data.headline}\nAccount: ${parsed.data.companyName}\nArt: ${parsed.data.signalKind}\nKontext: ${parsed.data.summarySnippet}\nReferenzen (Titel): ${parsed.data.referenceTitles.join(' | ') || '—'}\nTon für Draft: ${parsed.data.introTone}\nBasis-Empfehlung: ${base}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.45,
      })
      const text = completion.choices[0]?.message?.content?.trim()
      if (text) {
        strategy = text
        source = 'openai'
      }
    } catch {
      /* heuristic bleibt */
    }
  }

  return NextResponse.json({ strategy, source })
}
