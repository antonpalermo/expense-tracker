import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAppForm } from '@/hooks/form'
import { resetPassword } from '@/lib/auth'

const schema = z.object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters')
})

export const Route = createFileRoute('/_auth/reset-password')({
    validateSearch: z.object({
        token: z.string().optional(),
        error: z.string().optional()
    }),
    component: RouteComponent
})

function RouteComponent() {
    const navigate = useNavigate()
    const { token, error } = Route.useSearch()

    const form = useAppForm({
        defaultValues: { newPassword: '' },
        validators: { onSubmit: schema },
        onSubmit: async ({ value }) => {
            if (!token) {
                return
            }

            await resetPassword({
                newPassword: value.newPassword,
                token,
                fetchOptions: {
                    onSuccess: async () => {
                        toast.success(
                            'Password reset. Sign in with your new password.'
                        )
                        await navigate({ to: '/sign-in' })
                    },
                    onError: ctx => {
                        toast.error(ctx.error.message)
                    }
                }
            })
        }
    })

    if (!token || error) {
        return (
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Link expired</h1>
                <p className="text-sm text-balance text-muted-foreground">
                    This password reset link is invalid or has expired. Request
                    a new one from the sign-in page.
                </p>
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
                        <h1 className="text-2xl font-bold">Reset password</h1>
                        <p className="text-sm text-balance text-muted-foreground">
                            Enter a new password for your account
                        </p>
                    </div>
                    <form.Field name="newPassword">
                        {field => {
                            const isInvalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid

                            return (
                                <Field data-invalid={isInvalid}>
                                    <FieldLabel htmlFor={field.name}>
                                        New password
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
                        <Button type="submit">Reset password</Button>
                    </Field>
                </FieldGroup>
            </form>
        </div>
    )
}
