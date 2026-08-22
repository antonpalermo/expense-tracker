import type { ReactNode } from 'react'
import { hasRole, type LedgerRole } from '@/lib/roles'

/**
 * Presentation only. Every action behind this is re-checked server-side, so
 * hiding it is a convenience, not the security boundary.
 */
export default function RoleGate({
    role,
    required,
    children,
    fallback = null
}: {
    role: LedgerRole | undefined
    required: LedgerRole
    children: ReactNode
    fallback?: ReactNode
}) {
    if (!role || !hasRole(role, required)) {
        return fallback
    }

    return children
}
