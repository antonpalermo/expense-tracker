import * as React from "react"

import { useForm } from "@tanstack/react-form"
import { insertEntrySchema } from "@workers/database/schemas"

export default function EntryForm() {
  const [result, setResult] = React.useState()
  const defaultValues = {
    name: ""
  }

  const form = useForm({
    defaultValues,
    validators: {
      onChange: insertEntrySchema.omit({ userId: true })
    },
    onSubmit: async ({ value }) => {
      const request = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(value)
      })

      if (!request.ok) {
        throw new Error("Unable to create new entry!")
      }

      setResult(await request.json())
    }
  })

  return (
    <React.Fragment>
      {JSON.stringify(result)}
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
    </React.Fragment>
  )
}
