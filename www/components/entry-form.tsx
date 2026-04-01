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

export default function EntryForm() {
  const form = useForm({
    defaultValues: {
      description: "",
      amount: ""
    }
  })

  return (
    <form id="entry-form">
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
