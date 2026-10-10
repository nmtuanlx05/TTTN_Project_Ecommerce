import { useEffect, useState } from "react"
import { SearchX, UserRoundX, Plus, RotateCw } from "lucide-react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { PageHeader } from "@/components/admin/page-header"
import { TablePagination } from "@/components/admin/table-pagination"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { useToast } from "@/components/ui/toast"
import { UserFormDialog } from "@/features/users/components/user-form-dialog"
import { UsersTable, UsersTableSkeleton } from "@/features/users/components/users-table"
import { UsersToolbar } from "@/features/users/components/users-toolbar"
import { useToggleUserStatus, useUsers } from "@/features/users/queries"
import { useUsersSearchParams } from "@/features/users/use-users-search-params"
import type { User } from "@/types/user"

function displayName(user: User): string {
  return user.name ?? user.email
}

function UsersPage() {
  const search = useUsersSearchParams()
  const { data, error, isPending, isError, isPlaceholderData, isFetching, refetch } =
    useUsers(search.params)
  const toggleStatus = useToggleUserStatus()
  const toast = useToast()
  // Giữ `user` của hộp thoại khi đang đóng để nội dung không đổi giữa lúc mờ dần.
  const [formDialog, setFormDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  })
  const [statusDialog, setStatusDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  })
  const statusTarget = statusDialog.user

  const { page, setPage } = search
  const totalPages = data?.meta.totalPages ?? 0
  const itemCount = data?.items.length ?? 0

  // Trang trên URL vượt quá tổng số trang (xóa bớt, hoặc tự gõ URL): về trang cuối.
  useEffect(() => {
    if (isPlaceholderData || !data) return
    if (itemCount === 0 && totalPages > 0 && page > totalPages) setPage(totalPages, true)
  }, [data, isPlaceholderData, itemCount, totalPages, page, setPage])

  function runToggle(user: User, isActive: boolean) {
    toggleStatus.mutate(
      { id: user.id, isActive },
      {
        onSuccess: () => {
          setStatusDialog((current) => ({ ...current, open: false }))
          toast.add({
            title: isActive ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản",
            description: displayName(user),
            data: { tone: "success" },
          })
        },
        onError: (apiError) =>
          toast.add({
            title: isActive ? "Không mở khóa được" : "Không khóa được",
            description: apiError.message,
            data: { tone: "danger" },
          }),
      },
    )
  }

  // Cả khóa lẫn mở khóa đều phải qua hộp xác nhận.
  function handleToggle(user: User) {
    setStatusDialog({ open: true, user })
  }

  const togglingId = toggleStatus.isPending ? toggleStatus.variables?.id : undefined

  let content
  if (isPending) {
    content = <UsersTableSkeleton />
  } else if (isError) {
    content = (
      <Alert variant="danger" title="Không tải được danh sách người dùng">
        <p>{error.message}</p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-2"
          loading={isFetching}
          onClick={() => refetch()}
        >
          <RotateCw />
          Thử lại
        </Button>
      </Alert>
    )
  } else if (data.items.length === 0 && data.meta.total === 0) {
    content = search.hasFilters ? (
      <EmptyState
        icon={SearchX}
        title="Không có kết quả khớp"
        description="Không có người dùng nào khớp với từ khóa hoặc bộ lọc hiện tại. Thử bỏ bớt điều kiện."
        action={
          <Button variant="secondary" onClick={search.clearFilters}>
            Xóa bộ lọc
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={UserRoundX}
        title="Chưa có người dùng nào"
        description="Tài khoản khách hàng và nhân viên sẽ hiện ở đây sau khi được tạo."
      />
    )
  } else if (data.items.length > 0) {
    content = (
      <div className="flex flex-col gap-stack">
        <div
          aria-busy={isPlaceholderData}
          className={isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}
        >
          <UsersTable
            users={data.items}
            sortBy={search.sortBy}
            order={search.order}
            togglingId={togglingId}
            onSort={search.toggleSort}
            onEdit={(user) => setFormDialog({ open: true, user })}
            onToggleStatus={handleToggle}
          />
        </div>
        <TablePagination
          meta={data.meta}
          itemCount={itemCount}
          noun="người dùng"
          disabled={isPlaceholderData}
          onPageChange={(next) => search.setPage(next)}
        />
      </div>
    )
  } else {
    // Trang vượt tổng số trang: effect phía trên đang chuyển về trang cuối.
    content = <UsersTableSkeleton />
  }

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        title="Người dùng"
        description="Tài khoản khách hàng và nhân viên."
        actions={
          <Button onClick={() => setFormDialog({ open: true, user: null })}>
            <Plus />
            Thêm người dùng
          </Button>
        }
      />

      <div className="flex flex-col gap-stack">
        <UsersToolbar
          q={search.q}
          role={search.role}
          isActive={search.isActive}
          hasFilters={search.hasFilters}
          onSearch={search.setQuery}
          onRoleChange={search.setRole}
          onActiveChange={search.setActive}
          onClear={search.clearFilters}
        />
        {content}
      </div>

      <UserFormDialog
        open={formDialog.open}
        user={formDialog.user}
        onOpenChange={(open) => setFormDialog((current) => ({ ...current, open }))}
      />

      <ConfirmDialog
        open={statusDialog.open}
        onOpenChange={(open) => setStatusDialog((current) => ({ ...current, open }))}
        title={statusTarget?.isActive === false ? "Mở khóa tài khoản này?" : "Khóa tài khoản này?"}
        description={
          statusTarget ? (
            <>
              <strong className="font-semibold text-ink">{displayName(statusTarget)}</strong>
              {statusTarget.name ? ` (${statusTarget.email})` : null}{" "}
              {statusTarget.isActive
                ? "sẽ không đăng nhập được nữa. Dữ liệu và lịch sử đơn hàng vẫn được giữ, bạn có thể mở khóa lại bất cứ lúc nào."
                : "sẽ đăng nhập và dùng tài khoản được trở lại như trước. Dữ liệu và lịch sử đơn hàng không bị thay đổi."}
            </>
          ) : null
        }
        confirmLabel={statusTarget?.isActive === false ? "Mở khóa tài khoản" : "Khóa tài khoản"}
        destructive={statusTarget?.isActive !== false}
        loading={toggleStatus.isPending}
        onConfirm={() =>
          statusTarget && runToggle(statusTarget, statusTarget.isActive === false)
        }
      />
    </div>
  )
}

export default UsersPage
