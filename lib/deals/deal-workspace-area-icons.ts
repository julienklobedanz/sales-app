import {
  Alert01Icon,
  Certificate01Icon,
  Database01Icon,
  File02Icon,
  FileText,
  CheckListIcon,
  NoteEditIcon,
} from '@hugeicons/core-free-icons'

import type { DealWorkspaceArea } from '@/lib/deals/deal-workspace-areas'

export const DEAL_WORKSPACE_AREA_ICONS: Record<DealWorkspaceArea, typeof File02Icon> = {
  steckbrief: FileText,
  dokumente: File02Icon,
  stammdaten: Database01Icon,
  anforderungen: CheckListIcon,
  eignung: Certificate01Icon,
  risiken: Alert01Icon,
  entwuerfe: NoteEditIcon,
}
