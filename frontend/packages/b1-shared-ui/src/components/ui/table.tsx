"use client"

import * as React from "react"
import { createContext, useContext } from "react"

import { cn } from "cn"

/** 表格密度类型 */
type TableDensity = "compact" | "default" | "comfortable"

/** 密度 → TableHead / TableCell 间距映射 */
const densityStyles: Record<TableDensity, { head: string; cell: string }> = {
  compact:     { head: "h-8 px-4", cell: "py-1.5 px-4" },
  default:     { head: "h-10 px-4", cell: "py-2 px-4" },
  comfortable: { head: "h-12 px-4", cell: "py-3 px-4" },
}

const TableDensityContext = createContext<TableDensity>("default")

export function useTableDensity() {
  return useContext(TableDensityContext)
}

function Table({ className, density = "default", ...props }: React.ComponentProps<"table"> & { density?: TableDensity }) {
  return (
    <TableDensityContext.Provider value={density}>
      <div
        data-slot="table-container"
        className="relative w-full overflow-x-auto"
      >
        <table
          data-slot="table"
          data-density={density}
          className={cn("w-full caption-bottom text-sm", className)}
          {...props}
        />
      </div>
    </TableDensityContext.Provider>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b bg-muted/30", className)}
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

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  const density = useTableDensity()
  const style = densityStyles[density]

  return (
    <th
      data-slot="table-head"
      className={cn(
        style.head,
        "text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  const density = useTableDensity()
  const style = densityStyles[density]

  return (
    <td
      data-slot="table-cell"
      className={cn(
        style.cell,
        "align-middle whitespace-nowrap min-h-[80px] [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
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

export type { TableDensity }
