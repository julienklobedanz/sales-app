import type * as React from 'react'

export function columnWidthStyle(width: number): React.CSSProperties {
  return { width, minWidth: width, maxWidth: width }
}
