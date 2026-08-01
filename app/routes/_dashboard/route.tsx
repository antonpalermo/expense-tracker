import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { createAuthClient } from 'better-auth/client'

const auth = createAuthClient()

export const Route = createFileRoute('/_dashboard')({
    component: RouteComponent,
    beforeLoad: async ({ location }) => {
        const session = await auth.getSession()

        if (!session.data) {
            throw redirect({
                to: '/sign-in',
                search: {
                    redirect: location.href
                }
            })
        }
    }
})

function RouteComponent() {
    return <Outlet />
}
