import { useId } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { FormDialogBody, FormDialogFooter } from "@/components/shared/form-dialog"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { NOTE_MAX_LENGTH } from "../constants"
import { paymentNoteSchema, type PaymentNoteValues } from "../schemas"

/** Form ghi chú khi đánh dấu giao dịch đã xử lý ngoài hệ thống (bắt buộc). */
function ResolveForm({
  busy,
  formError,
  onCancel,
  onSubmit,
}: {
  busy: boolean
  formError: string | null
  onCancel: () => void
  onSubmit: (note: string) => void
}) {
  const id = useId()
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentNoteValues>({ resolver: zodResolver(paymentNoteSchema), defaultValues: { note: "" } })
  const length = useWatch({ control, name: "note" }).length

  return (
    <form noValidate onSubmit={handleSubmit((values) => onSubmit(values.note))} className="flex min-h-0 flex-1 flex-col">
      <FormDialogBody>
        {formError ? <Alert variant="danger">{formError}</Alert> : null}
        <Field
          label="Ghi chú xử lý"
          htmlFor={`${id}-note`}
          required
          error={errors.note?.message}
          description={`Ví dụ: đã hoàn 100.000đ cho khách qua ngân hàng. ${length}/${NOTE_MAX_LENGTH} ký tự.`}
        >
          <Textarea rows={3} {...register("note")} />
        </Field>
      </FormDialogBody>
      <FormDialogFooter>
        <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
          Hủy bỏ
        </Button>
        <Button type="submit" loading={busy}>
          Đánh dấu đã xử lý
        </Button>
      </FormDialogFooter>
    </form>
  )
}

export { ResolveForm }
