import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import RoleBadge from '@/components/role-badge'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardAction,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card'
import type { LedgerWithRole } from '@/types'
import { ledgerHandler } from '../dialog-handlers'
import LedgerActions from './table-actions'

export default function LedgerList({ ledgers }: { ledgers: LedgerWithRole[] }) {
    if (ledgers.length === 0) {
        return (
            <Card className="items-center py-10 text-center">
                <CardHeader className="w-full">
                    <CardTitle>No ledgers yet</CardTitle>
                    <CardDescription>
                        Create a ledger to start tracking expenses, then invite
                        the people you share them with.
                    </CardDescription>
                </CardHeader>
                <Button
                    onClick={() =>
                        ledgerHandler.openWithPayload({ type: 'create' })
                    }
                >
                    <Plus className="size-4" />
                    Create a ledger
                </Button>
            </Card>
        )
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ledgers.map(ledger => (
                <Card key={ledger.id} className="gap-3">
                    <CardHeader>
                        <CardTitle>
                            <Link
                                to="/ledgers/$ledgerId"
                                params={{ ledgerId: ledger.id }}
                                className="hover:underline"
                            >
                                {ledger.name}
                            </Link>
                        </CardTitle>
                        <CardDescription>
                            {ledger.description || 'No description'}
                        </CardDescription>
                        <CardAction>
                            <div className="flex items-center gap-2">
                                <RoleBadge role={ledger.role} />
                                <LedgerActions ledger={ledger} />
                            </div>
                        </CardAction>
                    </CardHeader>
                </Card>
            ))}
        </div>
    )
}
