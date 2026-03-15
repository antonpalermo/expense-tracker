import { toast } from "sonner"
import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { Input } from "@client/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@client/components/ui/field"
import { createLedgerDialogHandle } from "./dialog-registry"

export default function LedgerForm() {
  const defaultData = {
    name: ""
  }
  const queryClient = useQueryClient()
  const createLedger = useMutation({
    mutationFn: async (ledger: { name: string }) => {
      toast.promise(
        async () => {
          const request = await fetch("/api/ledgers", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(ledger)
          })

          if (!request.ok) {
            throw new Error("unable to create ledger")
          }

          return await request.json()
        },
        {
          loading: "creating new ledger...",
          success: data => {
            createLedgerDialogHandle.close()
            return `${data.name} ledger successfully created`
          },
          error: "Unable to create new ledger."
        }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ledgers"] })
    }
  })

  const form = useForm({
    defaultValues: defaultData,
    onSubmit: async ({ value }) => {
      await createLedger.mutateAsync(value)
    }
  })

  return (
    <form
      id="ledger-form"
      onSubmit={e => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
    >
      <FieldGroup>
        <form.Field
          name="name"
          children={field => (
            <Field>
              <FieldLabel htmlFor={field.name}>Name</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={e => field.handleChange(e.target.value)}
                placeholder="Daily expense"
                autoComplete="off"
              />
            </Field>
          )}
        />
      </FieldGroup>
    </form>
  )
}
