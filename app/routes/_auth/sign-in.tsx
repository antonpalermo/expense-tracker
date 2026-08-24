import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
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
import { sendVerificationEmail, signIn } from '@/lib/auth'

const schema = z.object({
    email: z.email('Enter a valid email'),
    password: z.string().min(1, 'Password is required')
})

export const Route = createFileRoute('/_auth/sign-in')({
    validateSearch: z.object({ redirect: z.string().optional() }),
    component: RouteComponent
})

function RouteComponent() {
    const navigate = useNavigate()
    const { redirect } = Route.useSearch()
    const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)

    const form = useAppForm({
        defaultValues: { email: '', password: '' },
        validators: { onSubmit: schema },
        onSubmit: async ({ value }) => {
            setUnverifiedEmail(null)

            await signIn.email({
                email: value.email,
                password: value.password,
                fetchOptions: {
                    onSuccess: async () => {
                        if (redirect) {
                            await navigate({ href: redirect })
                        } else {
                            await navigate({ to: '/' })
                        }
                    },
                    onError: ctx => {
                        if (ctx.error.status === 403) {
                            setUnverifiedEmail(value.email)
                            return
                        }
                        toast.error(ctx.error.message)
                    }
                }
            })
        }
    })

    const resendVerification = async () => {
        if (!unverifiedEmail) {
            return
        }

        await sendVerificationEmail({
            email: unverifiedEmail,
            callbackURL: '/verify-email',
            fetchOptions: {
                onSuccess: () => {
                    toast.success('Verification email sent')
                },
                onError: ctx => {
                    toast.error(ctx.error.message)
                }
            }
        })
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
                        <h1 className="text-2xl font-bold">Sign In</h1>
                        <p className="text-sm text-balance text-muted-foreground">
                            Enter your email below to sign in to your account
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
                    <form.Field name="password">
                        {field => {
                            const isInvalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid

                            return (
                                <Field data-invalid={isInvalid}>
                                    <div className="flex items-center">
                                        <FieldLabel htmlFor={field.name}>
                                            Password
                                        </FieldLabel>
                                        <Link
                                            to="/forgot-password"
                                            className="ml-auto text-sm underline-offset-4 hover:underline"
                                        >
                                            Forgot your password?
                                        </Link>
                                    </div>
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
                    {unverifiedEmail && (
                        <Field>
                            <FieldDescription>
                                Your email isn&apos;t verified yet.{' '}
                                <button
                                    type="button"
                                    onClick={resendVerification}
                                    className="underline underline-offset-4"
                                >
                                    Resend verification email
                                </button>
                            </FieldDescription>
                        </Field>
                    )}
                    <Field>
                        <Button type="submit">Sign in</Button>
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
                            Sign in with Google
                        </Button>
                        <FieldDescription className="text-center">
                            Don&apos;t have an account?{' '}
                            <Link
                                to="/sign-up"
                                className="underline underline-offset-4"
                            >
                                Sign up
                            </Link>
                        </FieldDescription>
                    </Field>
                </FieldGroup>
            </form>
        </div>
    )
}
