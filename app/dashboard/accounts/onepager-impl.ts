import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatIndustryDisplay } from '@/lib/constants/industries'
import type { CompanyRefRow } from './account-action-types'
import { getReferencesByCompanyIdImpl } from './account-match-impl'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** One-Pager HTML für Druck/PDF: Strategy + Stakeholder-Prioritäten + Referenzen. */
export async function generateOnePagerHtmlImpl(
  companyId: string,
): Promise<{ success: boolean; html?: string; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const [{ data: company }, { data: strategy }, { data: stakeholders }, refs] =
    await Promise.all([
      supabase.from('companies').select('name, industry').eq('id', companyId).single(),
      supabase
        .from('company_strategies')
        .select(
          'company_goals:main_goals, red_flags, next_steps, value_proposition',
        )
        .eq('company_id', companyId)
        .maybeSingle(),
      supabase
        .from('stakeholders')
        .select('name, title, role, priorities_topics')
        .eq('company_id', companyId),
      getReferencesByCompanyIdImpl(companyId),
    ])
  if (!company) return { success: false, error: 'Unternehmen nicht gefunden.' }
  const goals = strategy?.company_goals ?? ''
  const challenges = strategy?.red_flags ?? ''
  const valueProp = strategy?.value_proposition ?? ''
  const nextSteps = strategy?.next_steps ?? ''
  type StakeholderData = {
    name: string
    title?: string | null
    role: string | null
    priorities_topics?: string | null
  }
  const stakeholderList: StakeholderData[] = (stakeholders ?? []).map((s) => ({
    name: s.name,
    title: s.title,
    role: s.role,
    priorities_topics: s.priorities_topics,
  }))
  const execSummary = stakeholderList
    .map(
      (s: StakeholderData) =>
        `${s.name}${s.title ? ` (${s.title})` : ''}: ${(s.priorities_topics ?? '').trim() || '—'}`,
    )
    .join('\n')
  const refList = refs.map((r: CompanyRefRow) => r.title).join(', ') || '—'
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>One-Pager ${escapeHtml(company.name)}</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.5;} h1{font-size:1.5rem;} h2{font-size:1.1rem;margin-top:1.5rem;} ul{margin:0.25rem 0;} .meta{color:#666;font-size:0.9rem;}</style></head><body>
<h1>${escapeHtml(company.name)}</h1>
<p class="meta">${escapeHtml(formatIndustryDisplay(company.industry) || '')}</p>
<h2>Unternehmensziele</h2>
<p>${escapeHtml(goals) || '—'}</p>
<h2>Value Proposition (Warum gewinnen wir hier?)</h2>
<p>${escapeHtml(valueProp) || '—'}</p>
<h2>Herausforderungen / Red Flags</h2>
<p>${escapeHtml(challenges) || '—'}</p>
<h2>Entscheider & Prioritäten</h2>
<pre style="white-space:pre-wrap;font-size:0.9rem;">${escapeHtml(execSummary) || '—'}</pre>
<h2>Nächste Schritte</h2>
<p>${escapeHtml(nextSteps) || '—'}</p>
<h2>Referenzen / Proof Points</h2>
<p>${escapeHtml(refList)}</p>
<p class="meta" style="margin-top:2rem;">Erstellt mit Client Intelligence · ${new Date().toLocaleDateString('de-DE')}</p>
</body></html>`
  return { success: true, html }
}
