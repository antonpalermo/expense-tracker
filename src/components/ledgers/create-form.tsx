import { useForm } from "@tanstack/react-form"
import type { Ledger } from "@/database/schema"
import { Button } from "@/components/ui/button"

export default function LedgerCreateForm() {
  const defaultValues: Omit<Ledger, "userId"> = {
    name: ""
  }

  const form = useForm({
    defaultValues,
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
        onSubmit={e => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
      >
        <form.Field
          name="name"
          children={field => (
            <input
              type="text"
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={e => field.handleChange(e.target.value)}
            />
          )}
        />
        <form.Subscribe
          selector={selector => [selector.canSubmit, selector.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "..." : "Submit"}
            </Button>
          )}
        />
      </form>
    </div>
  )
}
