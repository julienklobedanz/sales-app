'use server'

/**
 * RFP-Response-Baustein: kurzer Antworttext aus Anforderungen + besten Referenz-Treffern (Epic 4 / Wireframe §13).
 */
export async function generateRfpResponseBlockAction(input: {
  dealTitle: string
  coverage: Array<{
    requirementId: string
    requirementText: string
    matches: Array<{ title: string; similarity: number; companyName?: string | null }>
  }>
}): Promise<{ success: true; text: string } | { success: false; error: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { success: false, error: 'OpenAI API ist nicht konfiguriert (OPENAI_API_KEY).' }
  }

  const lines = input.coverage.map((row) => {
    const best = row.matches[0]
    const score = best ? `${Math.round(best.similarity * 100)}%` : '—'
    const ref = best
      ? `${best.title}${best.companyName ? ` (${best.companyName})` : ''}`
      : 'keine passende Referenz'
    return `- Anforderung: ${row.requirementText.slice(0, 400)}\n  Beste Referenz: ${ref}, Score: ${score}`
  })

  const prompt = `Du bist Vertriebs-Assistent. Erstelle einen strukturierten RFP-Antwort-Baustein auf Deutsch (Fließtext mit klaren Absätzen, keine Markdown-Überschriften mit #).

Deal: ${input.dealTitle}

Anforderungen und Abgleich mit internen Referenzen:
${lines.join('\n\n')}

Aufgabe:
1. Kurze Einleitung (1–2 Sätze) zur Passung unserer Leistungen.
2. Pro wesentlicher Anforderung: wie wir sie adressieren und welche Referenz das stützt (Name + Relevanz).
3. Optional: Lücken oder Annahmen transparent benennen.

Antwort-Baustein:`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.35,
        max_tokens: 1800,
      }),
    })

    if (!res.ok) {
      return { success: false, error: `OpenAI-Fehler (${res.status}).` }
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const text = json?.choices?.[0]?.message?.content?.trim()
    if (!text) {
      return { success: false, error: 'Keine Antwort von der KI erhalten.' }
    }
    return { success: true, text }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unbekannter Fehler'
    return { success: false, error: message }
  }
}
