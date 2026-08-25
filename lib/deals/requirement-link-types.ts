export type RequirementLinkPickDoc = {
  id: string
  title: string
  documentType: string
  validUntil: string | null
}

export type RequirementLinkedDocument = {
  requirementId: string
  documentId: string
  title: string
  documentType: string
  validUntil: string | null
}
