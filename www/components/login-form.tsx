import { useForm } from "@tanstack/react-form"
import {
  IconBrandFacebookFilled,
  IconBrandGoogleFilled
} from "@tabler/icons-react"

import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator
} from "@client/components/ui/field"
import { Input } from "@client/components/ui/input"
import { Button } from "@client/components/ui/button"

import { socialLogin } from "@client/lib/auth-client"

export default function LoginForm() {
  const defaultData = {
    email: ""
  }

  const form = useForm({
    defaultValues: defaultData,
    onSubmit: async ({ value }) => {
      console.log(value)
    }
  })

  const socials = [
    {
      name: "google",
      icon: IconBrandGoogleFilled
    },
    {
      name: "facebook",
      icon: IconBrandFacebookFilled
    }
  ]

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
    >
      <FieldGroup>
        <form.Field
          name="email"
          children={field => (
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={e => field.handleChange(e.target.value)}
                placeholder="jane@example.com"
                autoComplete="off"
              />
            </Field>
          )}
        />
        <Field>
          <Button type="submit">Sign in with Email</Button>
        </Field>
        <FieldSeparator>or continue with</FieldSeparator>
        <Field className="grid grid-cols-2 gap-4">
          {socials.map(btn => (
            <Button
              key={btn.name}
              variant="outline"
              onClick={() => socialLogin({ provider: btn.name })}
            >
              <btn.icon />
            </Button>
          ))}
        </Field>
      </FieldGroup>
    </form>
  )
}
