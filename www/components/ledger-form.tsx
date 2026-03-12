import { useForm } from "@tanstack/react-form"

import { Input } from "@client/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@client/components/ui/field"

export default function LedgerForm() {
  const defaultData = {
    name: ""
  }

  const form = useForm({
    defaultValues: defaultData,
    onSubmit: async ({ value }) => {
      console.log(value)
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
