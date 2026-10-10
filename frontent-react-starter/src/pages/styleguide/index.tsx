import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  createSortedRowModel,
  flexRender,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowUpDown, PackageOpen, Plus } from "lucide-react"

import { TablePagination } from "@/components/admin/table-pagination"
import { ThemeToggle } from "@/components/admin/theme-toggle"
import { useTheme } from "@/hooks/use-theme"
import { Alert } from "@/components/ui/alert"
import {
  Badge,
  OrderStatusBadge,
  PaymentStatusBadge,
  type OrderStatus,
  type PaymentStatus,
} from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { EmptyState } from "@/components/ui/empty-state"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { ToastProvider, ToastViewport, useToast } from "@/components/ui/toast"
import { formatDateTime, formatVnd } from "@/lib/format"
import {
  BASE_CONTRAST,
  BASE_SWATCHES,
  DIACRITIC_PROBE,
  FEEDBACK_SWATCHES,
  ORDER_SWATCHES,
  PAYMENT_SWATCHES,
  TYPE_SCALE,
} from "./color-data"

/* -------------------------------------------------------------------------- */

function Section({
  id,
  title,
  lead,
  children,
}: {
  id: string
  title: string
  lead?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-border-subtle pt-8">
      <h2 className="font-display text-h2 text-ink">{title}</h2>
      {lead ? (
        <p className="mt-2 max-w-prose text-body-sm text-ink-muted">{lead}</p>
      ) : null}
      <div className="mt-stack">{children}</div>
    </section>
  )
}

function Ratio({ value }: { value: number | null }) {
  if (value === null) return <span className="text-ink-subtle">—</span>
  const pass = value >= 4.5
  return (
    <span
      data-numeric
      className={pass ? "text-ink" : "text-danger-fg font-semibold"}
    >
      {value.toFixed(2)}
    </span>
  )
}

/* ------------------------------- 1. Màu sắc ------------------------------- */

function ColorSection() {
  const { resolved } = useTheme()
  const isDark = resolved === "dark"

  return (
    <div className="flex flex-col gap-section">
      <div>
        <h3 className="font-display text-h3 text-ink">Nền tảng</h3>
        <div className="mt-stack grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BASE_SWATCHES.map((swatch) => (
            <div
              key={swatch.token}
              className="flex items-center gap-inline rounded-md border border-border-subtle bg-surface p-3"
            >
              <div
                className="size-11 shrink-0 rounded-xs border border-border-control"
                style={{ background: isDark ? swatch.dark : swatch.light }}
              />
              <div className="min-w-0">
                <p className="truncate font-mono text-caption text-ink">
                  {swatch.token}
                </p>
                <p className="text-caption text-ink-muted">
                  <span data-numeric>{isDark ? swatch.dark : swatch.light}</span>
                  {swatch.note ? ` · ${swatch.note}` : null}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-display text-h3 text-ink">Tỉ lệ tương phản</h3>
        <p className="mt-2 max-w-prose text-body-sm text-ink-muted">
          Tính bằng công thức WCAG 2.x. Ngưỡng cho chữ là 4.5, cho ranh giới
          control là 3.0.
        </p>
        <div className="mt-stack density-admin">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cặp màu</TableHead>
                <TableHead className="text-right">Sáng</TableHead>
                <TableHead className="text-right">Tối</TableHead>
                <TableHead>Ghi chú</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {BASE_CONTRAST.map((row) => (
                <TableRow key={row.pair}>
                  <TableCell>{row.pair}</TableCell>
                  <TableCell className="text-right">
                    <Ratio value={row.light} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Ratio value={row.dark} />
                  </TableCell>
                  <TableCell className="text-ink-muted">{row.note ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <h3 className="font-display text-h3 text-ink">Màu phản hồi</h3>
        <div className="mt-stack grid gap-3 sm:grid-cols-2">
          {FEEDBACK_SWATCHES.map((tone) => (
            <div
              key={tone.name}
              className="rounded-md border p-card"
              style={{
                background: isDark ? tone.darkTint : tone.lightTint,
                borderColor: isDark ? tone.darkFg : tone.lightFg,
                color: isDark ? tone.darkFg : tone.lightFg,
              }}
            >
              <p className="text-body-sm font-semibold">{tone.label}</p>
              <p className="mt-1 font-mono text-caption">
                {isDark ? tone.darkFg : tone.lightFg} · tương phản{" "}
                {(isDark ? tone.darkRatio : tone.lightRatio).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------ 2. Thang chữ ------------------------------ */

function TypeSection() {
  return (
    <div className="flex flex-col gap-section">
      <Alert variant="info" title="Kiểm chứng dấu tiếng Việt">
        Chuỗi dưới đây có dấu mũ chồng dấu thanh ở cả cỡ lớn nhất và nhỏ nhất.
        Nếu dấu bị cắt ngọn hoặc chạm dòng trên thì thang chữ sai.
      </Alert>

      <div className="rounded-md border border-border-subtle bg-surface p-card">
        <p className="font-display text-display uppercase text-ink">
          {DIACRITIC_PROBE}
        </p>
        <p className="mt-stack text-overline uppercase text-ink-muted">
          {DIACRITIC_PROBE}
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {TYPE_SCALE.map((step) => (
          <div
            key={step.name}
            className="border-t border-border-subtle pt-4 first:border-t-0 first:pt-0"
          >
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <code className="font-mono text-caption font-semibold text-ink">
                {step.name}
              </code>
              <span className="text-caption text-ink-muted">
                storefront {step.storefront} · admin {step.admin} · line-height{" "}
                {step.lineHeight} · letter-spacing {step.letterSpacing} · weight{" "}
                {step.weight}
              </span>
            </div>
            <p className={`mt-2 text-ink ${step.className}`}>{step.sample}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* --------------------------------- 3. Nút --------------------------------- */

const BUTTON_VARIANTS = [
  { variant: "primary" as const, label: "Đặt hàng", note: "Một nút mỗi màn" },
  { variant: "secondary" as const, label: "Tiếp tục mua", note: "Viền 1px" },
  { variant: "ghost" as const, label: "Bỏ qua", note: "Chỉ đổi nền khi hover" },
  { variant: "destructive" as const, label: "Hủy đơn", note: "Chỉ cho xóa/hủy" },
]

function ButtonSection() {
  return (
    <div className="density-admin">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cấp</TableHead>
            <TableHead>Mặc định</TableHead>
            <TableHead>Khóa</TableHead>
            <TableHead>Đang xử lý</TableHead>
            <TableHead>Ghi chú</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {BUTTON_VARIANTS.map((item) => (
            <TableRow key={item.variant}>
              <TableCell>
                <code className="font-mono text-caption">{item.variant}</code>
              </TableCell>
              <TableCell>
                <Button variant={item.variant}>{item.label}</Button>
              </TableCell>
              <TableCell>
                <Button variant={item.variant} disabled>
                  {item.label}
                </Button>
              </TableCell>
              <TableCell>
                <Button variant={item.variant} loading>
                  {item.label}
                </Button>
              </TableCell>
              <TableCell className="text-ink-muted">{item.note}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="mt-stack text-body-sm text-ink-muted">
        Hover và active không chụp lại được trong bảng — rê chuột lên từng nút để
        xem. Nhấn Tab để kiểm tra vòng focus: viền 2px, cách mép 2px, hiện rõ ở
        cả hai chế độ.
      </p>
    </div>
  )
}

/* -------------------------------- 4. Badge -------------------------------- */

function BadgeSection() {
  const { resolved } = useTheme()
  const isDark = resolved === "dark"

  return (
    <div className="flex flex-col gap-section">
      <div className="density-admin">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trạng thái đơn</TableHead>
              <TableHead>Badge</TableHead>
              <TableHead>Nền</TableHead>
              <TableHead>Chữ</TableHead>
              <TableHead className="text-right">Tương phản</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ORDER_SWATCHES.map((item) => (
              <TableRow key={item.status}>
                <TableCell>
                  <code className="font-mono text-caption">{item.status}</code>
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={item.status as OrderStatus} />
                </TableCell>
                <TableCell data-numeric className="text-ink-muted">
                  {item.outlined ? "trong suốt" : isDark ? item.darkBg : item.lightBg}
                </TableCell>
                <TableCell data-numeric className="text-ink-muted">
                  {isDark ? item.darkFg : item.lightFg}
                </TableCell>
                <TableCell className="text-right">
                  <Ratio value={isDark ? item.darkRatio : item.lightRatio} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Alert variant="info" title="Vì sao badge đậm dần">
        Độ đậm của mực tăng theo tiến độ đơn hàng, nên bảy trạng thái phân biệt
        được cả khi in đen trắng chứ không chỉ khác nhau về sắc độ. Hai nhánh phụ
        tách khỏi thang bằng hình thức: đơn đã hủy là badge rỗng, chỉ có viền.
      </Alert>

      <div className="density-admin">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thanh toán</TableHead>
              <TableHead>Badge</TableHead>
              <TableHead className="text-right">Tương phản</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PAYMENT_SWATCHES.map((item) => (
              <TableRow key={item.status}>
                <TableCell>
                  <code className="font-mono text-caption">{item.status}</code>
                </TableCell>
                <TableCell>
                  <PaymentStatusBadge status={item.status as PaymentStatus} />
                </TableCell>
                <TableCell className="text-right">
                  <Ratio value={isDark ? item.darkRatio : item.lightRatio} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="neutral">Trung tính</Badge>
        <Badge variant="outline">Viền</Badge>
        <Badge variant="solid">Đặc</Badge>
      </div>
    </div>
  )
}

/* -------------------------------- 5. Form --------------------------------- */

const voucherSchema = z.object({
  code: z
    .string()
    .min(3, "Mã giảm giá phải có ít nhất 3 ký tự")
    .regex(/^[A-Z0-9]+$/, "Mã chỉ gồm chữ in hoa không dấu và số"),
  discount: z.coerce
    .number()
    .int("Số tiền giảm phải là số nguyên")
    .positive("Số tiền giảm phải lớn hơn 0"),
  scope: z.string().min(1, "Chọn phạm vi áp dụng"),
  note: z.string().max(200, "Ghi chú tối đa 200 ký tự").optional(),
  confirmed: z
    .boolean()
    .refine((value) => value, "Bạn phải xác nhận trước khi lưu"),
})

type VoucherForm = z.input<typeof voucherSchema>

function FormSection() {
  const toast = useToast()
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<VoucherForm>({
    resolver: zodResolver(voucherSchema),
    defaultValues: { code: "", discount: 0, scope: "", note: "", confirmed: false },
  })

  // useWatch thay cho watch(): watch() trả về hàm không memo được nên
  // React Compiler bỏ qua cả component.
  const scope = useWatch({ control, name: "scope" })
  const confirmed = useWatch({ control, name: "confirmed" })

  const onSubmit = handleSubmit(async () => {
    await new Promise((resolve) => setTimeout(resolve, 700))
    toast.add({
      title: "Đã lưu mã giảm giá",
      description: "Mã có hiệu lực ngay cho đơn mới.",
      data: { tone: "success" },
    })
  })

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex max-w-xl flex-col gap-stack rounded-md border border-border-subtle bg-surface p-card"
    >
      <Field
        label="Mã giảm giá"
        htmlFor="code"
        required
        description="Chữ in hoa không dấu và số, ví dụ THANG10."
        error={errors.code?.message}
      >
        <Input placeholder="THANG10" {...register("code")} />
      </Field>

      <Field
        label="Số tiền giảm"
        htmlFor="discount"
        required
        description="Tiền VND, số nguyên. Không giảm quá tạm tính của đơn."
        error={errors.discount?.message}
      >
        <Input type="number" inputMode="numeric" {...register("discount")} />
      </Field>

      <Field
        label="Phạm vi áp dụng"
        htmlFor="scope"
        required
        error={errors.scope?.message}
      >
        <Select
          value={scope}
          onValueChange={(value) =>
            setValue("scope", String(value ?? ""), { shouldValidate: true })
          }
        >
          <SelectTrigger id="scope" aria-invalid={errors.scope ? true : undefined}>
            <SelectValue placeholder="Chọn phạm vi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toàn bộ sản phẩm</SelectItem>
            <SelectItem value="category">Theo danh mục</SelectItem>
            <SelectItem value="product">Theo sản phẩm</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field
        label="Ghi chú nội bộ"
        htmlFor="note"
        description="Chỉ nhân viên nhìn thấy."
        error={errors.note?.message}
      >
        <Textarea placeholder="Áp dụng cho chiến dịch cuối năm…" {...register("note")} />
      </Field>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-inline">
          <Checkbox
            id="confirmed"
            checked={Boolean(confirmed)}
            onCheckedChange={(value) =>
              setValue("confirmed", value, { shouldValidate: true })
            }
            aria-invalid={errors.confirmed ? true : undefined}
            aria-describedby={errors.confirmed ? "confirmed-error" : undefined}
          />
          <Label htmlFor="confirmed">Tôi đã kiểm tra lại điều kiện áp dụng</Label>
        </div>
        {errors.confirmed ? (
          <p id="confirmed-error" role="alert" className="text-caption text-danger-fg">
            {errors.confirmed.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-inline">
        <Button type="submit" loading={isSubmitting}>
          Lưu mã giảm giá
        </Button>
        <Button type="reset" variant="ghost">
          Xóa hết
        </Button>
      </div>

      <p className="text-caption text-ink-muted">
        Bấm Lưu khi đang để trống để xem toàn bộ trạng thái lỗi.
      </p>
    </form>
  )
}

/* -------------------------------- 6. Bảng --------------------------------- */

type OrderRow = {
  id: string
  customer: string
  placedAt: string
  total: number
  status: OrderStatus
  payment: PaymentStatus
}

const ORDERS: OrderRow[] = [
  {
    id: "DH-20261005-0148",
    customer: "Nguyễn Mạnh Tuấn",
    placedAt: "2026-10-05T07:12:00Z",
    total: 1290000,
    status: "PENDING",
    payment: "UNPAID",
  },
  {
    id: "DH-20261005-0147",
    customer: "Trần Thị Mỹ Dung",
    placedAt: "2026-10-05T06:48:00Z",
    total: 785000,
    status: "CONFIRMED",
    payment: "PAID",
  },
  {
    id: "DH-20261004-0139",
    customer: "Lê Hoàng Phúc",
    placedAt: "2026-10-04T15:03:00Z",
    total: 2430000,
    status: "PACKING",
    payment: "PAID",
  },
  {
    id: "DH-20261004-0131",
    customer: "Phạm Khánh Vy",
    placedAt: "2026-10-04T09:21:00Z",
    total: 559000,
    status: "SHIPPING",
    payment: "PAID",
  },
  {
    id: "DH-20261003-0122",
    customer: "Đặng Quốc Việt",
    placedAt: "2026-10-03T11:40:00Z",
    total: 3180000,
    status: "COMPLETED",
    payment: "PAID",
  },
  {
    id: "DH-20261003-0119",
    customer: "Vũ Thị Ánh Nguyệt",
    placedAt: "2026-10-03T08:05:00Z",
    total: 940000,
    status: "CANCELLED",
    payment: "UNPAID",
  },
  {
    id: "DH-20261002-0108",
    customer: "Bùi Thanh Hưởng",
    placedAt: "2026-10-02T13:27:00Z",
    total: 1675000,
    status: "RETURNED",
    payment: "REFUNDED",
  },
]

const orderTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    text: sortFn_text,
  },
})

type OrderTableFeatures = typeof orderTableFeatures

const columns: ColumnDef<OrderTableFeatures, OrderRow>[] = [
  {
    accessorKey: "id",
    header: "Mã đơn",
    cell: ({ row }) => (
      <span data-numeric className="text-ink">
        {row.original.id}
      </span>
    ),
  },
  { accessorKey: "customer", header: "Khách hàng" },
  {
    accessorKey: "placedAt",
    header: "Đặt lúc (GMT+7)",
    cell: ({ row }) => (
      <span data-numeric className="text-ink-muted">
        {formatDateTime(row.original.placedAt)}
      </span>
    ),
  },
  {
    accessorKey: "total",
    header: "Tổng cộng",
    cell: ({ row }) => (
      <span data-numeric className="block text-right">
        {formatVnd(row.original.total)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "payment",
    header: "Thanh toán",
    cell: ({ row }) => <PaymentStatusBadge status={row.original.payment} />,
  },
]

function TableSection() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [page, setPage] = useState(1)
  const table = useTable({
    features: orderTableFeatures,
    data: ORDERS,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
  })

  return (
    <div className="density-admin">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => {
                const sortable = header.column.getCanSort()
                return (
                  <TableHead
                    key={header.id}
                    className={header.column.id === "total" ? "text-right" : undefined}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 rounded-xs text-inherit outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring hover:text-ink"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        <ArrowUpDown className="size-3" aria-hidden="true" />
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getAllCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-stack">
        <TablePagination
          meta={{ page, limit: 10, total: 25, totalPages: 3 }}
          itemCount={page === 3 ? 5 : 10}
          noun="đơn hàng"
          onPageChange={setPage}
        />
      </div>
      <p className="mt-stack text-caption text-ink-muted">
        Mật độ admin: dòng cao 8px đệm dọc, chữ 13–14px. Cùng component này đặt
        ngoài <code className="font-mono">.density-admin</code> sẽ tự giãn ra theo
        mật độ storefront.
      </p>
    </div>
  )
}

/* ------------------------- 7. Rỗng, skeleton, toast ------------------------ */

function StateSection() {
  const toast = useToast()

  return (
    <div className="flex flex-col gap-section">
      <div>
        <h3 className="font-display text-h3 text-ink">Trạng thái rỗng</h3>
        <div className="mt-stack">
          <EmptyState
            icon={PackageOpen}
            title="Chưa có đơn nào cần xử lý"
            description="Đơn mới sẽ hiện ở đây ngay khi khách đặt. Trong lúc chờ, bạn có thể kiểm tra tồn kho."
            action={
              <Button variant="secondary">
                <Plus />
                Nhập kho
              </Button>
            }
          />
        </div>
      </div>

      <div>
        <h3 className="font-display text-h3 text-ink">Skeleton</h3>
        <div className="mt-stack flex flex-col gap-3 rounded-md border border-border-subtle bg-surface p-card">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-3">
            <Skeleton className="size-16" />
            <Skeleton className="size-16" />
            <Skeleton className="size-16" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-display text-h3 text-ink">Toast</h3>
        <div className="mt-stack flex flex-wrap gap-inline">
          <Button
            variant="secondary"
            onClick={() =>
              toast.add({
                title: "Đã xác nhận đơn",
                description: "Đơn DH-20261005-0147 chuyển sang đóng gói.",
                data: { tone: "success" },
              })
            }
          >
            Thành công
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast.add({
                title: "Sắp hết hàng",
                description: "Áo thun bo cổ — size M còn 2 cái khả dụng.",
                data: { tone: "warning" },
              })
            }
          >
            Cảnh báo
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast.add({
                title: "Không lưu được",
                description: "Mã giảm giá đã tồn tại. Đổi mã khác rồi lưu lại.",
                data: { tone: "danger" },
              })
            }
          >
            Lỗi
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast.add({
                title: "Đơn tự hủy sau 30 phút",
                description: "Đơn chưa thanh toán sẽ nhả lại hàng đang giữ.",
                data: { tone: "info" },
              })
            }
          >
            Thông tin
          </Button>
        </div>
      </div>
    </div>
  )
}

/* --------------------------------- Trang ---------------------------------- */

const NAV = [
  { id: "mau", label: "Màu" },
  { id: "chu", label: "Chữ" },
  { id: "nut", label: "Nút" },
  { id: "badge", label: "Badge" },
  { id: "form", label: "Form" },
  { id: "bang", label: "Bảng" },
  { id: "trang-thai", label: "Trạng thái" },
]

function StyleguideContent() {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-inline px-gutter py-4">
          <div>
            <p className="text-overline uppercase text-ink-muted">Hệ thống thiết kế</p>
            <p className="font-display text-h3 text-ink">Thời trang — nội bộ</p>
          </div>
          <ThemeToggle />
        </div>
        <nav
          aria-label="Mục lục"
          className="mx-auto flex max-w-6xl gap-4 overflow-x-auto px-gutter pb-3"
        >
          {NAV.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="rounded-xs text-body-sm whitespace-nowrap text-ink-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-section px-gutter py-section">
        <div>
          <h1 className="font-display text-display uppercase text-ink">
            Kiểm kê kho
          </h1>
          <p className="mt-stack max-w-prose text-body-lg text-ink-muted">
            Trang này trình bày toàn bộ token của hệ thống để duyệt trước khi dựng
            trang nghiệp vụ. Mọi màu, cỡ chữ và khoảng cách trên đây đều đọc từ
            token, không có giá trị rời nào viết thẳng trong component.
          </p>
        </div>

        <Section
          id="mau"
          title="Màu"
          lead="Gần đơn sắc. Màu ngữ nghĩa được xám hóa để không tranh chỗ với ảnh sản phẩm."
        >
          <ColorSection />
        </Section>

        <Section
          id="chu"
          title="Chữ"
          lead="Archivo cho display, Be Vietnam Pro cho body, Geist Mono cho số liệu. Nhịp điệu đến từ tương phản cỡ chữ."
        >
          <TypeSection />
        </Section>

        <Section
          id="nut"
          title="Nút"
          lead="Bốn cấp, vẫn đơn sắc. Mỗi màn chỉ có một nút primary."
        >
          <ButtonSection />
        </Section>

        <Section
          id="badge"
          title="Badge trạng thái"
          lead="Bảy trạng thái đơn và ba trạng thái thanh toán."
        >
          <BadgeSection />
        </Section>

        <Section
          id="form"
          title="Form"
          lead="react-hook-form + zod. Chữ báo lỗi nói rõ sai ở đâu và sửa thế nào."
        >
          <FormSection />
        </Section>

        <Section
          id="bang"
          title="Bảng ở mật độ admin"
          lead="Cùng component Table, chỉ khác lớp bọc .density-admin."
        >
          <TableSection />
        </Section>

        <Section
          id="trang-thai"
          title="Rỗng, đang tải, thông báo"
          lead="Màn hình rỗng là lời mời hành động, không phải lời xin lỗi."
        >
          <StateSection />
        </Section>
      </main>

      <footer className="border-t border-border-subtle">
        <div className="mx-auto max-w-6xl px-gutter py-8">
          <p className="text-caption text-ink-muted">
            Tiền VND · ngày giờ GMT+7 · giao diện tiếng Việt
          </p>
        </div>
      </footer>

      <ToastViewport />
    </div>
  )
}

export default function StyleguidePage() {
  return (
    <ToastProvider>
      <StyleguideContent />
    </ToastProvider>
  )
}
