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
    FieldLabel,
    FieldSeparator
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAppForm } from '@/hooks/form'
import { signIn, signUp } from '@/lib/auth'

const schema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(80),
    email: z.email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters')
})

export const Route = createFileRoute('/_auth/sign-up')({
    component: RouteComponent
})

function RouteComponent() {
    const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

    const form = useAppForm({
        defaultValues: { name: '', email: '', password: '' },
        validators: { onSubmit: schema },
        onSubmit: async ({ value }) => {
            await signUp.email({
                name: value.name,
                email: value.email,
                password: value.password,
                callbackURL: '/verify-email',
                fetchOptions: {
                    onSuccess: () => setSubmittedEmail(value.email),
                    onError: ctx => {
                        toast.error(ctx.error.message)
                    }
                }
            })
        }
    })

    if (submittedEmail) {
        return (
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Check your email</h1>
                <p className="text-sm text-balance text-muted-foreground">
                    We sent a verification link to {submittedEmail}. Click it to
                    finish setting up your account. Open it on this same device
                    and browser, or your password won't be attached to the
                    account.
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
                        <h1 className="text-2xl font-bold">Sign Up</h1>
                        <p className="text-sm text-balance text-muted-foreground">
                            Enter your email below to create your account
                        </p>
                    </div>
                    <form.Field name="name">
                        {field => {
                            const isInvalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid

                            return (
                                <Field data-invalid={isInvalid}>
                                    <FieldLabel htmlFor={field.name}>
                                        Name
                                    </FieldLabel>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={e =>
                                            field.handleChange(
                                                e.currentTarget.value
                                            )
                                        }
                                        aria-invalid={isInvalid}
                                        placeholder="Jane Doe"
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
                    <form.Field name="password">
                        {field => {
                            const isInvalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid

                            return (
                                <Field data-invalid={isInvalid}>
                                    <FieldLabel htmlFor={field.name}>
                                        Password
                                    </FieldLabel>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        type="password"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={e =>
                                            field.handleChange(
                                                e.currentTarget.value
                                            )
                                        }
                                        aria-invalid={isInvalid}
                                        placeholder="Password"
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
                        <Button type="submit">Sign up</Button>
                    </Field>
                    <FieldSeparator>Or continue with</FieldSeparator>
                    <Field>
                        <Button
                            variant="outline"
                            type="button"
                            onClick={async () =>
                                await signIn.social({ provider: 'google' })
                            }
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                                    fill="currentColor"
                                />
                            </svg>
                            Sign up with Google
                        </Button>
                        <FieldDescription className="text-center">
                            Already have an account?{' '}
                            <Link
                                to="/sign-in"
                                className="underline underline-offset-4"
                            >
                                Sign In
                            </Link>
                        </FieldDescription>
                    </Field>
                </FieldGroup>
            </form>
        </div>
    )
}
