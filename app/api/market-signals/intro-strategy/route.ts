import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'

import {
  buildHeuristicOutreachDraft,
  normalizeOutreachDraftText,
  type IntroTone,
} from '@/lib/market-signals/outreach-draft'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const BodySchema = z.object({
  headline: z.string().max(500),
  signalKind: z.enum(['exec', 'news']),
  companyName: z.string().max(300),
  introTone: z.enum(['challenging', 'advisory', 'concise']),
  summarySnippet: z.string().max(1200),
  referenceTitles: z.array(z.string()).max(4),
  recipientFullName: z.string().max(200).optional().nullable(),
  senderFullName: z.string().max(200).optional().nullable(),
})

function toneLabel(introTone: IntroTone): string {
  if (introTone === 'challenging') return 'herausfordernd, mit klarer Hypothese'
  if (introTone === 'concise') return 'kurz und knapp, maximal 3 kurze Absätze im Body'
  return 'beratend, nutzenorientiert mit einem konkreten nächsten Schritt'
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const senderFullName =
    parsed.data.senderFullName?.trim() ||
    String((profile as { full_name?: string | null } | null)?.full_name ?? '').trim() ||
    '[Ihr Name]'

  const draftInput = {
    ...parsed.data,
    senderFullName,
  }

  let strategy = buildHeuristicOutreachDraft(draftInput)
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
            content: [
              'Du bist Senior Sales Strategist (B2B IT/SaaS) und schreibst einen personalisierten Erstansprache-Entwurf auf Deutsch.',
              'Antworte NUR mit dem fertigen E-Mail-Text in exakt dieser Struktur (Plain Text):',
              '1) Eine Begrüßungszeile mit Komma (z. B. "Guten Tag Herr/Frau Nachname," oder "Guten Tag [Name]," wenn unbekannt)',
              '2) Genau EINE Leerzeile',
              '3) Body: 2–4 kurze Absätze, bezogen auf das Signal und den Account. Keine Floskeln. Noch KEINE konkreten Referenz-/Case-Namen einbauen — die hängt der Nutzer später an.',
              '4) Genau ZWEI Leerzeilen',
              '5) Abschlusszeile mit Komma (z. B. "Vielen Dank im Voraus und beste Grüße,")',
              '6) Direkt darunter Vor- und Nachname des Absenders (eine Zeile, keine Leerzeile dazwischen)',
              'Keine Betreffzeile, kein Markdown, keine Anführungszeichen um die Mail.',
            ].join(' '),
          },
          {
            role: 'user',
            content: [
              `Signal-Überschrift: ${parsed.data.headline}`,
              `Account: ${parsed.data.companyName}`,
              `Signal-Art: ${parsed.data.signalKind === 'exec' ? 'Executive Update' : 'Company Update'}`,
              `Kontext / Warum jetzt: ${parsed.data.summarySnippet}`,
              `Empfänger: ${parsed.data.recipientFullName?.trim() || 'unbekannt — Platzhalter [Name] nutzen'}`,
              `Referenzen: werden separat angehängt — hier nicht nennen`,
              `Tonalität: ${toneLabel(parsed.data.introTone)}`,
              `Absender (Signatur): ${senderFullName}`,
            ].join('\n'),
          },
        ],
        max_tokens: 650,
        temperature: 0.5,
      })
      const text = completion.choices[0]?.message?.content?.trim()
      if (text) {
        strategy = normalizeOutreachDraftText(text, draftInput)
        source = 'openai'
      }
    } catch {
      /* heuristic bleibt */
    }
  }

  return NextResponse.json({ strategy, source })
}
