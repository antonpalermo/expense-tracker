import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { z } from 'zod'

export const Route = createFileRoute('/_auth/verify-email')({
    validateSearch: z.object({ error: z.string().optional() }),
    component: RouteComponent
})

function RouteComponent() {
    const navigate = useNavigate()
    const { error } = Route.useSearch()

    useEffect(() => {
        if (error) {
            return
        }

        const timeout = setTimeout(() => {
            navigate({ to: '/' })
        }, 1500)

        return () => clearTimeout(timeout)
    }, [error, navigate])

    if (error) {
        return (
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Verification failed</h1>
                <p className="text-sm text-balance text-muted-foreground">
                    This verification link is invalid or has expired. Sign in
                    and use &quot;Resend verification email&quot; to get a new
                    one.
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
        <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold">Email verified</h1>
            <p className="text-sm text-balance text-muted-foreground">
                Taking you to your dashboard...
            </p>
        </div>
    )
}
