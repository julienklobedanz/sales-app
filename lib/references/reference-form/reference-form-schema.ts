import { z } from 'zod'
import { REFERENCE_NARRATIVE_MAX_CHARS } from '@/lib/references/reference-narrative-limits'
import { formatZodError } from '@/lib/references/reference-form/reference-form-pure'

export { formatZodError }

const narrativeMaxMsg = (label: string) =>
  `${label}: höchstens ${REFERENCE_NARRATIVE_MAX_CHARS} Zeichen.`

export const requiredSchema = z
  .object({
    title: z.string().trim().min(1, 'Titel ist ein Pflichtfeld.'),
    companyId: z.string().optional(),
    newCompanyName: z.string().optional(),
    summary: z
      .string()
      .max(REFERENCE_NARRATIVE_MAX_CHARS, narrativeMaxMsg('Zusammenfassung')),
    customerChallenge: z
      .string()
      .trim()
      .min(1, 'Herausforderung ist ein Pflichtfeld.')
      .max(REFERENCE_NARRATIVE_MAX_CHARS, narrativeMaxMsg('Herausforderung')),
    ourSolution: z
      .string()
      .trim()
      .min(1, 'Lösung ist ein Pflichtfeld.')
      .max(REFERENCE_NARRATIVE_MAX_CHARS, narrativeMaxMsg('Lösung')),
  })
  .superRefine((val, ctx) => {
    const hasCompany =
      Boolean((val.companyId ?? '').trim()) || Boolean((val.newCompanyName ?? '').trim())
    if (!hasCompany) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Unternehmen ist ein Pflichtfeld.',
        path: ['companyId'],
      })
    }
  })

export const editRequiredSchema = z.object({
  title: z.string().trim().min(1, 'Titel ist ein Pflichtfeld.'),
  editCompanyName: z.string().trim().min(1, 'Unternehmen ist ein Pflichtfeld.'),
  summary: z
    .string()
    .max(REFERENCE_NARRATIVE_MAX_CHARS, narrativeMaxMsg('Zusammenfassung')),
  customerChallenge: z
    .string()
    .trim()
    .min(1, 'Herausforderung ist ein Pflichtfeld.')
    .max(REFERENCE_NARRATIVE_MAX_CHARS, narrativeMaxMsg('Herausforderung')),
  ourSolution: z
    .string()
    .trim()
    .min(1, 'Lösung ist ein Pflichtfeld.')
    .max(REFERENCE_NARRATIVE_MAX_CHARS, narrativeMaxMsg('Lösung')),
})
