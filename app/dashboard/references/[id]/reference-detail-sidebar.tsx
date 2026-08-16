import {
  ReferenceDetailApprovalCard,
  type ReferenceDetailApprovalCardProps,
} from './reference-detail-approval-card'

export type ReferenceDetailSidebarProps = ReferenceDetailApprovalCardProps

export function ReferenceDetailSidebar(props: ReferenceDetailSidebarProps) {
  return (
    <div className="h-fit space-y-4 lg:sticky lg:top-6">
      <ReferenceDetailApprovalCard {...props} />
    </div>
  )
}
