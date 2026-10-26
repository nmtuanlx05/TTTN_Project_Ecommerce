import { Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { UserFormDialog } from "@/features/users/components/user-form-dialog";
import { UserStatusDialog } from "@/features/users/components/user-status-dialog";
import { UsersContent } from "@/features/users/components/users-content";
import { UsersToolbar } from "@/features/users/components/users-toolbar";
import type { User } from "@/types/user";
import { useUserStatusAction } from "@/features/users/use-user-status-action";
import { useUsersSearchParams } from "@/features/users/use-users-search-params";
import { useDialogTarget } from "@/hooks/use-dialog-target";

function UsersPage() {
  const search = useUsersSearchParams();
  const form = useDialogTarget<User>();
  const status = useUserStatusAction();

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        title="Người dùng"
        description="Tài khoản khách hàng và nhân viên."
        actions={
          <Button className="cursor-pointer" onClick={() => form.show(null)}>
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
        <UsersContent
          search={search}
          togglingId={status.togglingId}
          onEdit={form.show}
          onToggleStatus={status.request}
        />
      </div>

      <UserFormDialog {...form.dialogProps} user={form.target} />
      <UserStatusDialog {...status.dialogProps} />
    </div>
  );
}

export default UsersPage;
