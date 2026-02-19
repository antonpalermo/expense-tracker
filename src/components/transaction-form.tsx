import z from "zod"
import { useForm } from "@tanstack/react-form"

import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { insertTransactionSchema } from "@/database/schema"

export type TransactionField = z.infer<typeof insertTransactionSchema>

export default function TransactionForm() {
  const defaultValues: TransactionField = {
    name: "",
    amount: 0
  }

  const form = useForm({
    defaultValues,
    validators: {
      onBlur: insertTransactionSchema
    },
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
                onChange={e => field.handleChange(e.target.valueAsNumber)}
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
