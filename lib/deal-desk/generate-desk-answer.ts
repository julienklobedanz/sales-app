import 'server-only'

const MODEL = 'gpt-4o-mini'

export async function generateDealDeskAnswerForRequirement(
  apiKey: string,
  input: {
    projectName: string
    requirementText: string
    referenceTitle: string
    companyName: string | null
    matchPercent: number
  }
): Promise<{ text: string } | { error: string }> {
  const refLabel = input.companyName
    ? `${input.referenceTitle} (${input.companyName})`
    : input.referenceTitle

  const prompt = `Du schreibst einen kurzen RFP-Antwortabsatz auf Deutsch (3-5 Sätze, sachlich, kein Markdown).

Projekt: ${input.projectName}
Kundenanforderung: ${input.requirementText.slice(0, 600)}
Interne Referenz (${input.matchPercent}% Match): ${refLabel}

Regeln:
- Nur diese Referenz nennen, keine erfundenen anderen Kunden.
- Wenn die Referenz nur teilweise passt, transparent benennen.
- Keine übertriebenen Garantien.`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.35,
        max_tokens: 400,
      }),
    })

    if (!res.ok) {
      const t = await res.text()
      return { error: t.slice(0, 200) }
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const text = json?.choices?.[0]?.message?.content?.trim() ?? ''
    if (!text) return { error: 'Leere Antwort.' }
    return { text }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Antwort fehlgeschlagen.' }
  }
}
