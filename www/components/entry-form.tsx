import { useForm } from "@tanstack/react-form"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "./ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea
} from "./ui/input-group"
import { IconCurrencyPeso } from "@tabler/icons-react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { createEntryDialogHandle } from "./dialog-registry"
import useLedgers from "@client/hooks/use-ledgers"

export default function EntryForm() {
  const { data } = useLedgers()

  const createEntryMutation = useMutation({
    mutationFn: async (details: {
      ledgerId: string
      entry: { amount: string; description: string }
    }) => {
      const request = await fetch(`/api/ledgers/${data?.default}/entries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(details.entry)
      })

      if (!request.ok) {
        throw new Error("unable to create ledger entries")
      }
    }
  })

  const form = useForm({
    defaultValues: {
      amount: "",
      description: ""
    },
    onSubmit: async ({ value }) => {
      toast.promise(
        async () => {
          await createEntryMutation.mutateAsync({
            ledgerId: "",
            entry: value
          })
        },
        {
          loading: "creating ledger entry...",
          success: () => {
            createEntryDialogHandle.close()
            return "ledger entry created"
          },
          error: "unable to create ledger entry"
        }
      )
    }
  })

  return (
    <form
      id="entry-form"
      onSubmit={e => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
    >
      <FieldGroup>
        <form.Field
          name="amount"
          children={field => (
            <Field>
              <FieldLabel>Amount</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <IconCurrencyPeso />
                </InputGroupAddon>
                <InputGroupInput
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                  autoComplete="off"
                  placeholder="100.00"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>PHP</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </Field>
          )}
        />
        <form.Field
          name="description"
          children={field => (
            <Field>
              <FieldLabel>Description</FieldLabel>
              <InputGroup>
                <InputGroupTextarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                  rows={6}
                  className="min-h-24 resize-none"
                  placeholder="Groceries"
                />
                <InputGroupAddon align="block-end">
                  <InputGroupText className="tabular-nums">
                    {field.state.value.length}/100 characters
                  </InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>
                Describe what this entry is about to efficiently track expenses.
              </FieldDescription>
            </Field>
          )}
        />
      </FieldGroup>
    </form>
  )
}
