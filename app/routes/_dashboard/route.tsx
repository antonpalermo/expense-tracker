import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import LedgerFormDialog from '@/components/ledgers/dialog'
import Nav from '@/components/nav'
import { authClient } from '@/lib/auth'

export const Route = createFileRoute('/_dashboard')({
    component: RouteComponent,
    beforeLoad: async ({ location }) => {
        const session = await authClient.getSession()

        if (!session.data) {
            throw redirect({
                to: '/sign-in',
                search: {
                    redirect: location.href
                }
            })
        }

        // The guard already fetched this, so putting it in route context is
        // free and saves every child from refetching it.
        return { user: session.data.user }
    }
})

function RouteComponent() {
    return (
        <>
            <Nav />
            {/* Mounted here so the create action works from any dashboard page. */}
            <LedgerFormDialog />
            <Outlet />
        </>
    )
}
