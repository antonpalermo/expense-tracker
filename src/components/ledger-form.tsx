import { useForm } from "@tanstack/react-form"

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { insertLedgerSchema, type InsertLedgerRequest } from "@/database/schema"

export default function LedgerForm() {
  const defaultValues: Pick<InsertLedgerRequest, "name"> = {
    name: ""
  }

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: insertLedgerSchema
    },
    onSubmit: async ({ value }) => {
      const request = await fetch("/api/ledgers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(value)
      })

      if (!request.ok) {
        console.log("unable to create ledger atm!")
      }

      console.log(await request.json())
    }
  })

  return (
    <div>
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
              <Field
                data-invalid={
                  field.state.meta.isTouched && !field.state.meta.isValid
                }
              >
                <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                  aria-invalid={
                    field.state.meta.isTouched && !field.state.meta.isValid
                  }
                  placeholder="Personal Ledger"
                  autoComplete="off"
                />
                {field.state.meta.isTouched && !field.state.meta.isValid && (
                  <FieldError errors={field.state.meta.errors} />
                )}
              </Field>
            )}
          />
        </FieldGroup>
      </form>
    </div>
  )
}
