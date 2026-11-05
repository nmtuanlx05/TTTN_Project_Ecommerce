import { useId } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { FormDialogBody, FormDialogFooter } from "@/components/shared/form-dialog"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { REASON_MAX_LENGTH } from "../constants"
import { cancelOrderSchema, type CancelOrderValues } from "../schemas"

/** Form lý do hủy đơn (bắt buộc, tối đa 500 ký tự). Nút gửi khóa khi đang gửi nên không bấm đúp được. */
function CancelOrderForm({
  busy,
  formError,
  onCancel,
  onSubmit,
}: {
  busy: boolean
  formError: string | null
  onCancel: () => void
  onSubmit: (reason: string) => void
}) {
  const id = useId()
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CancelOrderValues>({
    resolver: zodResolver(cancelOrderSchema),
    defaultValues: { reason: "" },
  })
  const length = useWatch({ control, name: "reason" }).length

  return (
    <form noValidate onSubmit={handleSubmit((values) => onSubmit(values.reason))} className="flex min-h-0 flex-1 flex-col">
      <FormDialogBody>
        {formError ? <Alert variant="danger">{formError}</Alert> : null}
        <Field
          label="Lý do hủy đơn"
          htmlFor={`${id}-reason`}
          required
          error={errors.reason?.message}
          description={`Khách và nhân viên khác sẽ thấy lý do này. ${length}/${REASON_MAX_LENGTH} ký tự.`}
        >
          <Textarea rows={3} {...register("reason")} />
        </Field>
      </FormDialogBody>
      <FormDialogFooter>
        <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
          Giữ đơn
        </Button>
        <Button type="submit" variant="destructive" loading={busy}>
          Hủy đơn
        </Button>
      </FormDialogFooter>
    </form>
  )
}

export { CancelOrderForm }
