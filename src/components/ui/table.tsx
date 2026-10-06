import * as React from "react"

import { cn } from "@/lib/utils"
import { useIngredientColumnWidth } from '../useIngredientColumnWidth'
import './table.css'

function Table({ className, ref: forwardedRef, ...props }: React.ComponentProps<"table">) {
  const tableRef = useIngredientColumnWidth()
  React.useImperativeHandle(forwardedRef, () => tableRef.current!)
  return (
    <div
      data-slot="table-container"
      className="site-table-frame relative w-full min-w-0 overflow-x-auto"
    >
      <table
        data-slot="table"
        ref={tableRef}
        className={cn("site-table w-full table-fixed caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, tone = 'default', ...props }: React.ComponentProps<"tr"> & { tone?: 'default' | 'total' }) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors  has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        (tone === 'total' || className?.split(' ').includes('recipe-table__total')) && 'table-row--total',
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-normal break-words text-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, children, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-normal break-words [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    ><div className="table-cell-content">{children}</div></td>
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
