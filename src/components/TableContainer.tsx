import type { ReactNode } from 'react'

type TableContainerProps = {
  children: ReactNode
}

export function TableContainer({ children }: TableContainerProps) {
  return <div className="table-container">{children}</div>
}
