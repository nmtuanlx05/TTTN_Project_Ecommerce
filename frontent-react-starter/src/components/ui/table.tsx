import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Bảng dùng chung cho cả hai khu vực. Padding dọc lấy từ --sp-row nên bảng
 * tự thắt lại khi nằm trong .density-admin (16px → 8px) mà không cần biến thể.
 * Phân tách giữa các dòng chỉ bằng hairline, không sọc nền — bảng nhiều dòng
 * vẫn quét mắt được nhờ khoảng cách đều và cột tiền căn phải.
 */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="w-full overflow-x-auto rounded-md border border-border-subtle"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom border-collapse text-body-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-surface-sunken", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={className} {...props} />
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t border-border-default bg-surface-sunken font-medium",
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
        "border-b border-border-subtle transition-colors last:border-b-0",
        "hover:bg-surface-hover data-[selected=true]:bg-surface-hover",
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
      // ink-muted chứ không phải ink-subtle: trên surface-sunken thì
      // ink-subtle chỉ đạt 4.24, dưới ngưỡng AA
      className={cn(
        "px-3 py-row text-left align-middle text-caption font-semibold",
        "whitespace-nowrap text-ink-muted",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-3 py-row align-middle text-ink", className)}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-stack text-caption text-ink-muted", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
}
