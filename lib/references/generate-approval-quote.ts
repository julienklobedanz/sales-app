import { suggestApprovalQuote } from '@/lib/references/suggest-approval-quote'

const MODEL = 'gpt-4o-mini'
const REQUEST_TIMEOUT_MS = 12_000

export type ApprovalQuoteLanguage = 'de' | 'en'

export function detectReferenceContentLanguage(
  ...texts: Array<string | null | undefined>
): ApprovalQuoteLanguage {
  const hay = texts
    .filter((t): t is string => Boolean(t?.trim()))
    .join(' ')
    .toLowerCase()
  if (!hay.trim()) return 'de'

  const germanHints =
    (
      hay.match(
        /\b(und|der|die|das|mit|für|wir|sie|nicht|auch|eine|einen|wurde|werden|durch|unser|ihre|beim|sowie|bereits)\b/g,
      ) ?? []
    ).length +
    (hay.match(/[äöüß]/g) ?? []).length * 2
  const englishHints = (
    hay.match(
      /\b(the|and|with|for|our|their|was|were|have|has|been|through|solution|company|project|customer|helped|delivered)\b/g,
    ) ?? []
  ).length

  return englishHints > germanHints + 1 ? 'en' : 'de'
}

function normalizeQuote(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["'„«»]+|["'„«»]+$/g, '')
}

function sentenceCount(text: string): number {
  return text.split(/(?<=[.!?])\s+/).filter((part) => part.trim().length > 0).length
}

export async function generateApprovalQuoteWithLlm(input: {
  orgName: string
  referenceTitle?: string | null
  summary?: string | null
  customerChallenge?: string | null
  ourSolution?: string | null
  language: ApprovalQuoteLanguage
}): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null

  const org = input.orgName.trim() || 'our partner'
  const referenceContext = [
    input.referenceTitle?.trim(),
    input.summary?.trim(),
    input.customerChallenge?.trim(),
    input.ourSolution?.trim(),
  ]
    .filter(Boolean)
    .join('\n\n')

  if (!referenceContext.trim()) return null

  const languageInstruction =
    input.language === 'en' ? 'Write in English.' : 'Schreibe auf Deutsch.'

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        max_tokens: 180,
        messages: [
          {
            role: 'system',
            content:
              'You write short customer testimonials for B2B reference approvals. Output exactly 1-2 complete sentences in first-person plural (we/our team) or first-person singular as a natural executive quote. No bullet points, no labels, no quotation marks around the full text.',
          },
          {
            role: 'user',
            content: `${languageInstruction}

Partner/vendor: ${org}

Reference content:
${referenceContext}

Write a concise testimonial (1-2 sentences) the customer could approve for public use.`,
          },
        ],
      }),
    })

    if (!res.ok) return null

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>
    }
    const raw = json.choices?.[0]?.message?.content?.trim()
    if (!raw) return null

    const quote = normalizeQuote(raw)
    if (quote.length < 20 || quote.length > 420) return null
    if (sentenceCount(quote) > 3) return null
    return quote
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function resolveApprovalQuoteSuggestion(input: {
  orgName: string
  referenceTitle?: string | null
  proposedQuote?: string | null
  savedQuote?: string | null
  summary?: string | null
  customerChallenge?: string | null
  ourSolution?: string | null
}): Promise<string> {
  const saved = input.savedQuote?.trim()
  if (saved) return saved

  const language = detectReferenceContentLanguage(
    input.summary,
    input.customerChallenge,
    input.ourSolution,
    input.referenceTitle,
  )

  const generated = await generateApprovalQuoteWithLlm({
    orgName: input.orgName,
    referenceTitle: input.referenceTitle,
    summary: input.summary,
    customerChallenge: input.customerChallenge,
    ourSolution: input.ourSolution,
    language,
  })
  if (generated) return generated

  const proposed = input.proposedQuote?.trim()
  if (proposed) return proposed

  return suggestApprovalQuote({
    orgName: input.orgName,
    proposedQuote: null,
    summary: input.summary,
    customerChallenge: input.customerChallenge,
    ourSolution: input.ourSolution,
  })
}
