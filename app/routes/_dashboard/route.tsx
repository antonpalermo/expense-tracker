import { createFileRoute, Outlet } from '@tanstack/react-router'
import LedgerFormDialog from '@/components/ledgers/dialog'
import Nav from '@/components/nav'

export const Route = createFileRoute('/_dashboard')({
    component: RouteComponent
})

function RouteComponent() {
    return (
        <>
            <Nav />
            <LedgerFormDialog />
            <Outlet />
        </>
    )
}
