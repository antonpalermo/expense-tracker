import { useForm } from "@tanstack/react-form"

import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { type Transaction } from "@/database/schema"

export default function TransactionForm() {
  const defaultValues: Pick<Transaction, "name" | "amount"> = {
    name: "",
    amount: ""
  }

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const request = await fetch("/api/ledgers/transactions", {
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
    <form
      id="transaction-form"
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
                placeholder="Apples"
                autoComplete="off"
              />
              {field.state.meta.isTouched && !field.state.meta.isValid && (
                <FieldError errors={field.state.meta.errors} />
              )}
            </Field>
          )}
        />
        <form.Field
          name="amount"
          children={field => (
            <Field
              data-invalid={
                field.state.meta.isTouched && !field.state.meta.isValid
              }
            >
              <FieldLabel htmlFor={field.name}>Amount</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={e => field.handleChange(e.target.value)}
                aria-invalid={
                  field.state.meta.isTouched && !field.state.meta.isValid
                }
                type="number"
                placeholder="0"
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
  )
}
