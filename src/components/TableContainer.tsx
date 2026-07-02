import type { CSSProperties, ReactNode } from 'react'

type TableContainerProps = {
  children: ReactNode
  style?: CSSProperties
}

export function TableContainer({ children, style }: TableContainerProps) {
  return <div className="table-container" style={style}>{children}</div>
}
