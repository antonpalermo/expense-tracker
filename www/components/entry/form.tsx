import { useForm } from "@tanstack/react-form"

import { insertEntrySchema } from "@workers/database/schemas"
import React from "react"
import type z from "zod"

type Entry = z.infer<typeof insertEntrySchema>

export default function EntryForm() {
  const defaultValues: Pick<Entry, "name"> = {
    name: ""
  }

  const form = useForm({
    defaultValues,
    validators: {
      onBlur: insertEntrySchema
    },
    onSubmit: async ({ value }) => {
      console.log(value)
    }
  })

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        e.stopPropagation()

        form.handleSubmit()
      }}
    >
      <form.Field
        name="name"
        children={field => (
          <React.Fragment>
            <label htmlFor={field.name}>Name</label>
            <input
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={e => field.handleChange(e.target.value)}
            />
          </React.Fragment>
        )}
      />
      <form.Subscribe
        selector={state => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit, isSubmitting]) => (
          <React.Fragment>
            <button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "..." : "Submit"}
            </button>
            <button
              type="reset"
              onClick={e => {
                // Avoid unexpected resets of form elements (especially <select> elements)
                e.preventDefault()
                form.reset()
              }}
            >
              Reset
            </button>
          </React.Fragment>
        )}
      />
    </form>
  )
}
