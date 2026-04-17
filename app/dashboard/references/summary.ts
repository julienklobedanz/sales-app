'use server'

import { logEventForCurrentOrg } from '@/lib/events/log-event'

export type GenerateSummaryResult =
  | { success: true; summary: string }
  | { success: false; error: string }

export async function generateSummaryFromStoryImpl(
  customerChallenge: string | null,
  ourSolution: string | null,
  referenceId?: string | null
): Promise<GenerateSummaryResult> {
  const challenge = customerChallenge?.trim() ?? ''
  const solution = ourSolution?.trim() ?? ''
  if (!challenge && !solution) {
    return { success: false, error: 'Keine Inhalte für Herausforderung oder Lösung angegeben.' }
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { success: false, error: 'OpenAI API ist nicht konfiguriert (OPENAI_API_KEY).' }
  }

  const prompt = `Du bist ein Vertriebs-Assistent. Erstelle aus den folgenden Angaben eine prägnante, vertriebsorientierte Zusammenfassung in 3–4 Sätzen auf Deutsch. Betone den Mehrwert und das Ergebnis für den Kunden. Schreibe nur die Zusammenfassung, ohne Überschriften oder Bullet-Points.

Herausforderung des Kunden:
${challenge}

Unsere Lösung:
${solution}

Zusammenfassung:`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 300,
      }),
    })

    if (!response.ok) {
      const status = response.status
      const raw = await response.text()
      if (status === 429) {
        console.error('generateSummaryFromStory: OpenAI 429', raw)
        return {
          success: false,
          error:
            'Das KI-Kontingent ist aktuell ausgeschöpft. Bitte später erneut versuchen oder die Zusammenfassung manuell formulieren.',
        }
      }
      return {
        success: false,
        error: `OpenAI-Fehler (${status}). Bitte später erneut versuchen.`,
      }
    }

    const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const summary = json?.choices?.[0]?.message?.content?.trim()
    if (!summary) {
      return { success: false, error: 'Keine Antwort von der KI erhalten.' }
    }
    if (referenceId) {
      void logEventForCurrentOrg({
        eventType: 'ki_entwurf_generated',
        referenceId,
        payload: {},
      })
    }
    return { success: true, summary }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unbekannter Fehler'
    return { success: false, error: message }
  }
}

