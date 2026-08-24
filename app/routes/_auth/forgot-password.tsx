import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAppForm } from '@/hooks/form'
import { requestPasswordReset } from '@/lib/auth'

const schema = z.object({
    email: z.email('Enter a valid email')
})

export const Route = createFileRoute('/_auth/forgot-password')({
    component: RouteComponent
})

function RouteComponent() {
    const [submitted, setSubmitted] = useState(false)

    const form = useAppForm({
        defaultValues: { email: '' },
        validators: { onSubmit: schema },
        onSubmit: async ({ value }) => {
            await requestPasswordReset({
                email: value.email,
                redirectTo: '/reset-password',
                fetchOptions: {
                    onSuccess: () => setSubmitted(true),
                    onError: ctx => {
                        toast.error(ctx.error.message)
                    }
                }
            })
        }
    })

    if (submitted) {
        return (
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Check your email</h1>
                <p className="text-sm text-balance text-muted-foreground">
                    If that email has an account, we sent a link to reset your
                    password.
                </p>
                <Link
                    to="/sign-in"
                    className="text-sm underline underline-offset-4"
                >
                    Back to sign in
                </Link>
            </div>
        )
    }

    return (
        <div>
            <form
                onSubmit={e => {
                    e.preventDefault()
                    form.handleSubmit()
                }}
            >
                <FieldGroup>
                    <div className="flex flex-col items-center gap-1 text-center">
                        <h1 className="text-2xl font-bold">Forgot password</h1>
                        <p className="text-sm text-balance text-muted-foreground">
                            Enter your email and we&apos;ll send you a reset
                            link
                        </p>
                    </div>
                    <form.Field name="email">
                        {field => {
                            const isInvalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid

                            return (
                                <Field data-invalid={isInvalid}>
                                    <FieldLabel htmlFor={field.name}>
                                        Email
                                    </FieldLabel>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        type="email"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={e =>
                                            field.handleChange(
                                                e.currentTarget.value
                                            )
                                        }
                                        aria-invalid={isInvalid}
                                        placeholder="m@example.com"
                                    />
                                    {isInvalid && (
                                        <FieldError
                                            errors={field.state.meta.errors}
                                        />
                                    )}
                                </Field>
                            )
                        }}
                    </form.Field>
                    <Field>
                        <Button type="submit">Send reset link</Button>
                    </Field>
                    <FieldDescription className="text-center">
                        <Link
                            to="/sign-in"
                            className="underline underline-offset-4"
                        >
                            Back to sign in
                        </Link>
                    </FieldDescription>
                </FieldGroup>
            </form>
        </div>
    )
}
