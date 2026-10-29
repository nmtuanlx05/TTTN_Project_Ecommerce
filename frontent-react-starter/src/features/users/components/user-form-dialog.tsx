import { useId } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Controller,
  useForm,
  useWatch,
  type UseFormSetError,
} from "react-hook-form";
import {
  FormDialog,
  FormDialogBody,
  FormDialogFooter,
} from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import type { ApiError } from "@/lib/api-error";
import { PASSWORD_HINT } from "@/lib/password-rules";
import type { CreateUserInput, UpdateUserInput } from "../types";
import type { User } from "@/types/user";
import { ROLE_DESCRIPTION, ROLE_LABEL, ROLES } from "../constants";
import { useCreateUser, useUpdateUser } from "../queries";
import {
  createUserSchema,
  updateUserSchema,
  type UserFormValues,
} from "../schemas";
import { PasswordInput } from "@/components/shared/password-input";

const ROLE_ITEMS = ROLES.map((role) => ({
  value: role,
  label: ROLE_LABEL[role],
}));

const EMAIL_TAKEN =
  "Email này đã được dùng cho tài khoản khác. Nhập email khác, hoặc tìm tài khoản đó trong danh sách.";

/** Các trường người dùng nhìn thấy trong từng chế độ; lỗi của trường khác đi vào toast. */
const CREATE_FIELDS = ["email", "name", "phone", "password", "role"] as const;
const EDIT_FIELDS = ["name", "phone", "role"] as const;

function isFormField(
  fields: readonly string[],
  field: string,
): field is keyof UserFormValues {
  return fields.includes(field);
}

/** Chỉ gửi những trường thật sự đổi; xóa trống số điện thoại thì gửi `null`. */
function buildUpdateInput(user: User, values: UserFormValues): UpdateUserInput {
  const input: UpdateUserInput = {};
  if (values.name !== (user.name ?? "")) input.name = values.name;
  if (values.phone !== (user.phone ?? "")) input.phone = values.phone || null;
  if (values.role !== user.role) input.role = values.role;
  return input;
}

function buildCreateInput(values: UserFormValues): CreateUserInput {
  return {
    email: values.email,
    password: values.password,
    name: values.name,
    phone: values.phone || undefined,
    role: values.role,
  };
}

/**
 * Hộp thoại Thêm (`user === null`) và Sửa (`user` có giá trị) người dùng.
 * Hai mutation nằm ở đây, không nằm trong form: hộp thoại cần biết đang gọi API
 * để khóa việc đóng, còn form bên trong mount lại (reset sạch) mỗi lần mở.
 */
function UserFormDialog({
  open,
  user,
  onOpenChange,
}: {
  open: boolean;
  user: User | null;
  onOpenChange: (open: boolean) => void;
}) {
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const toast = useToast();
  const mode = user ? "edit" : "create";
  const busy = createMutation.isPending || updateMutation.isPending;

  function handleOpenChange(next: boolean) {
    if (!next) {
      // Xóa mật khẩu khỏi `variables` của mutation, không để nó nằm lại trong bộ nhớ.
      createMutation.reset();
      updateMutation.reset();
    }
    onOpenChange(next);
  }

  /** Lỗi từ server: 409 vào ô email, mảng `errors` vào đúng ô, còn lại là toast. */
  function handleError(
    error: ApiError,
    setError: UseFormSetError<UserFormValues>,
  ) {
    const fields = mode === "create" ? CREATE_FIELDS : EDIT_FIELDS;

    if (mode === "create" && error.statusCode === 409) {
      setError("email", { message: EMAIL_TAKEN }, { shouldFocus: true });
      return;
    }

    if (error.statusCode === 404 && user) {
      toast.add({
        title: "Không tìm thấy người dùng này",
        description: "Tài khoản có thể đã bị xóa. Danh sách đã được làm mới.",
        data: { tone: "danger" },
      });
      handleOpenChange(false);
      return;
    }

    const unmapped: string[] = [];
    let focused = false;
    for (const [field, message] of Object.entries(error.fieldErrors)) {
      if (isFormField(fields, field)) {
        setError(field, { message }, { shouldFocus: !focused });
        focused = true;
      } else {
        unmapped.push(message);
      }
    }

    // Còn lỗi không gắn được vào ô nào, hoặc không có lỗi theo ô: hiện toast.
    if (unmapped.length > 0 || !focused) {
      toast.add({
        title:
          mode === "create"
            ? "Chưa thêm được người dùng"
            : "Chưa lưu được thay đổi",
        description: unmapped.length > 0 ? unmapped.join(" ") : error.message,
        data: { tone: "danger" },
      });
    }
  }

  function submit(
    values: UserFormValues,
    setError: UseFormSetError<UserFormValues>,
  ) {
    if (user) {
      const input = buildUpdateInput(user, values);
      if (Object.keys(input).length === 0) {
        handleOpenChange(false);
        return;
      }
      updateMutation.mutate(
        { id: user.id, input },
        {
          onSuccess: (saved) => {
            toast.add({
              title: "Đã lưu thay đổi",
              description: saved.name ?? saved.email,
              data: { tone: "success" },
            });
            handleOpenChange(false);
          },
          onError: (error) => handleError(error, setError),
        },
      );
      return;
    }

    createMutation.mutate(buildCreateInput(values), {
      onSuccess: (created) => {
        toast.add({
          title: "Đã thêm người dùng",
          description: `${created.name ?? created.email} (${created.email})`,
          data: { tone: "success" },
        });
        handleOpenChange(false);
      },
      onError: (error) => handleError(error, setError),
    });
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      busy={busy}
      title={mode === "create" ? "Thêm người dùng" : "Sửa người dùng"}
      description={
        mode === "create"
          ? "Tạo tài khoản đăng nhập cho nhân viên hoặc khách hàng."
          : "Cập nhật họ tên, số điện thoại và vai trò."
      }
    >
      <UserForm
        user={user}
        busy={busy}
        onCancel={() => handleOpenChange(false)}
        onSubmit={submit}
      />
    </FormDialog>
  );
}

function UserForm({
  user,
  busy,
  onCancel,
  onSubmit,
}: {
  user: User | null;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (
    values: UserFormValues,
    setError: UseFormSetError<UserFormValues>,
  ) => void;
}) {
  const mode = user ? "edit" : "create";
  const id = useId();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<UserFormValues>({
    resolver: zodResolver(
      mode === "create" ? createUserSchema : updateUserSchema,
    ),
    defaultValues: {
      email: user?.email ?? "",
      name: user?.name ?? "",
      phone: user?.phone ?? "",
      password: "",
      role: user?.role ?? "CUSTOMER",
    },
  });
  const role = useWatch({ control, name: "role" });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => onSubmit(values, setError))}
      className="flex min-h-0 flex-1 flex-col"
    >
      <FormDialogBody>
        {user ? (
          <div className="flex flex-col gap-1.5">
            <p className="text-body-sm font-medium text-ink">Email</p>
            <p className="text-body-sm text-ink">{user.email}</p>
            <p className="text-caption text-ink-muted">
              Email dùng để đăng nhập nên không đổi được.
            </p>
          </div>
        ) : (
          <Field
            label="Email"
            htmlFor={`${id}-email`}
            required
            error={errors.email?.message}
          >
            <Input type="email" autoComplete="off" {...register("email")} />
          </Field>
        )}

        <Field
          label="Họ tên"
          htmlFor={`${id}-name`}
          required
          error={errors.name?.message}
        >
          <Input autoComplete="off" {...register("name")} />
        </Field>

        <Field
          label="Số điện thoại"
          htmlFor={`${id}-phone`}
          error={errors.phone?.message}
          description="Số di động Việt Nam, ví dụ 0912345678. Có thể để trống."
        >
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="off"
            {...register("phone")}
          />
        </Field>

        {mode === "create" ? (
          <Field
            label="Mật khẩu"
            htmlFor={`${id}-password`}
            required
            error={errors.password?.message}
            description={PASSWORD_HINT}
          >
            <PasswordInput {...register("password")} />
          </Field>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-role`}>Vai trò</Label>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <Select
                items={ROLE_ITEMS}
                value={field.value}
                onValueChange={(next) => field.onChange(next)}
              >
                <SelectTrigger
                  id={`${id}-role`}
                  aria-describedby={`${id}-role-description`}
                  aria-invalid={errors.role ? true : undefined}
                  onBlur={field.onBlur}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p
            id={`${id}-role-description`}
            className="text-caption text-ink-muted"
          >
            {errors.role?.message ?? ROLE_DESCRIPTION[role]}
          </p>
        </div>
      </FormDialogBody>

      <FormDialogFooter>
        <Button
          className="cursor-pointer"
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={onCancel}
        >
          Hủy bỏ
        </Button>
        <Button
          className="cursor-pointer"
          type="submit"
          loading={busy}
          disabled={mode === "edit" && !isDirty}
        >
          {mode === "create" ? "Thêm người dùng" : "Lưu thay đổi"}
        </Button>
      </FormDialogFooter>
    </form>
  );
}

export { UserFormDialog };
