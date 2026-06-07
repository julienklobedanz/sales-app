import React from 'react'
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { PublicReference } from '@/app/p/actions'
import { formatReferenceVolume } from '@/lib/format'
import { formatContractTypeDisplay } from '@/lib/references/contract-type'
import {
  computePublicPortfolioPdfLayout,
  kpisForPublicReference,
} from '@/lib/public-portfolio/kpis-for-reference'

const NOT_IN = 'In dieser Freigabe nicht enthalten'

const baseStyles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: 'Helvetica',
    color: '#0f172a',
  },
  scaleShell: {
    padding: 22,
  },
  brand: { fontSize: 11, fontWeight: 700, marginBottom: 2 },
  sub: { fontSize: 8, color: '#475569', marginBottom: 10 },
  refBlock: { marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #e2e8f0' },
  refTitle: { fontSize: 10, fontWeight: 700 },
  refMeta: { fontSize: 7, color: '#64748b', marginBottom: 4 },
  label: { fontSize: 7, textTransform: 'uppercase', color: '#64748b', marginTop: 3, marginBottom: 1 },
  body: { fontSize: 7.5, lineHeight: 1.35, color: '#334155' },
  row: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  chip: {
    border: '1px solid #cbd5e1',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 5,
    fontSize: 6.5,
    color: '#475569',
    marginRight: 4,
    marginBottom: 4,
  },
  kpiRow: { flexDirection: 'row', marginTop: 5, justifyContent: 'space-between' },
  kpiCell: {
    width: '31.5%',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 6,
    backgroundColor: '#f8fafc',
  },
  kpiLabel: { fontSize: 6, color: '#64748b', marginBottom: 2, textTransform: 'uppercase' },
  kpiValue: { fontSize: 8, fontWeight: 700, color: '#0f172a' },
  foot: {
    marginTop: 8,
    paddingTop: 6,
    borderTop: '1px solid #e2e8f0',
    fontSize: 6.5,
    color: '#64748b',
    lineHeight: 1.35,
  },
})

function clip(s: string, max: number) {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function factValue(v: string | null | undefined): string {
  const raw = v != null ? String(v).trim() : ''
  if (!raw) return NOT_IN
  return raw
}

export function PublicPortfolioOnePagerDocument({
  workspaceName,
  headerSubtitle,
  primaryColor,
  references,
  contactLine,
}: {
  workspaceName: string
  headerSubtitle: string
  primaryColor: string
  references: PublicReference[]
  contactLine: string
}) {
  const layout = computePublicPortfolioPdfLayout(references)

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <View
          style={{
            width: layout.canvasWidthPt,
            transform: `scale(${layout.scale})`,
            transformOrigin: '0 0',
          }}
        >
          <View style={baseStyles.scaleShell}>
            <Text style={[baseStyles.brand, { color: primaryColor }]}>
              {`Referenzportfolio — ${workspaceName}`}
            </Text>
            <Text style={baseStyles.sub}>{headerSubtitle}</Text>
            {references.map((ref) => {
              const tags = String(ref.tags ?? '')
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
                .slice(0, layout.tagLimit)
              const kpis = kpisForPublicReference(ref, { max: 3 })
              return (
                <View key={ref.id} style={baseStyles.refBlock} wrap={false}>
                  <Text style={baseStyles.refTitle}>{clip(ref.title, layout.titleMax)}</Text>
                  <Text style={baseStyles.refMeta}>
                    {[ref.company_name, ref.industry, ref.country].filter(Boolean).join(' · ')}
                  </Text>
                  {tags.length ? (
                    <View style={baseStyles.row}>
                      {tags.map((tag) => (
                        <Text key={tag} style={baseStyles.chip}>
                          {tag}
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  {kpis.length ? (
                    <View style={baseStyles.kpiRow}>
                      {kpis.map((kpi) => (
                        <View key={kpi.label} style={baseStyles.kpiCell}>
                          <Text style={baseStyles.kpiLabel}>{kpi.label}</Text>
                          <Text style={baseStyles.kpiValue}>{clip(kpi.value, 42)}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {ref.summary?.trim() ? (
                    <View>
                      <Text style={baseStyles.label}>Zusammenfassung</Text>
                      <Text style={baseStyles.body}>{clip(ref.summary.trim(), layout.summaryMax)}</Text>
                    </View>
                  ) : null}
                  {ref.customer_challenge?.trim() ? (
                    <View>
                      <Text style={baseStyles.label}>Herausforderung</Text>
                      <Text style={baseStyles.body}>
                        {clip(ref.customer_challenge.trim(), layout.challengeMax)}
                      </Text>
                    </View>
                  ) : null}
                  {ref.our_solution?.trim() ? (
                    <View>
                      <Text style={baseStyles.label}>Unsere Lösung</Text>
                      <Text style={baseStyles.body}>
                        {clip(ref.our_solution.trim(), layout.solutionMax)}
                      </Text>
                    </View>
                  ) : null}
                  {ref.approval_quote_approved?.trim() || ref.approval_reference_giver_name?.trim() ? (
                    <View>
                      <Text style={baseStyles.label}>Stimme zur Zusammenarbeit</Text>
                      <Text style={[baseStyles.body, { fontStyle: 'italic' }]}>
                        {ref.approval_quote_approved?.trim()
                          ? `„${clip(ref.approval_quote_approved.trim(), layout.quoteMax)}“`
                          : ''}
                      </Text>
                      {ref.approval_reference_giver_name?.trim() ? (
                        <Text style={[baseStyles.body, { marginTop: 2, fontWeight: 700 }]}>
                          {ref.approval_reference_giver_name.trim()}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={{ marginTop: 4, flexDirection: 'row', flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 6, color: '#94a3b8', marginRight: 12 }}>
                      Volumen: {formatReferenceVolume(ref.volume_eur) || NOT_IN}
                    </Text>
                    <Text style={{ fontSize: 6, color: '#94a3b8', marginRight: 12 }}>
                      Vertrag: {factValue(formatContractTypeDisplay(ref.contract_type))}
                    </Text>
                    <Text style={{ fontSize: 6, color: '#94a3b8' }}>
                      Website: {factValue(ref.website)}
                    </Text>
                  </View>
                </View>
              )
            })}
            <Text style={baseStyles.foot}>{contactLine}</Text>
            <Text style={[baseStyles.foot, { marginTop: 4, fontSize: 6, color: '#94a3b8' }]}>
              Ein-Seiten-Übersicht (skaliert); gekürzte Texte. Vollständige Kundenansicht im Browser.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
