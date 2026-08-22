import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ChevronsUpDown, Plus } from 'lucide-react'
import { getLedgers } from '@/apis/ledgers'
import { ledgerHandler } from '@/components/dialog-handlers'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { ledgersKeys } from '@/query-keys'

// Built on the existing dropdown-menu primitive rather than a sidebar, which
// keeps the switcher to one small component.
export default function LedgerSwitcher({
    activeLedgerId,
    activeLedgerName
}: {
    activeLedgerId: string
    activeLedgerName: string
}) {
    const { data: ledgers } = useQuery({
        queryKey: ledgersKeys.all,
        queryFn: getLedgers
    })

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button variant="ghost" className="gap-2">
                        {activeLedgerName}
                        <ChevronsUpDown className="size-4 opacity-60" />
                    </Button>
                }
            />
            <DropdownMenuContent className="min-w-56">
                <DropdownMenuLabel>Ledgers</DropdownMenuLabel>
                <DropdownMenuGroup>
                    {ledgers?.map(ledger => (
                        <DropdownMenuItem
                            key={ledger.id}
                            render={
                                <Link
                                    className="w-full"
                                    to="/ledgers/$ledgerId"
                                    params={{ ledgerId: ledger.id }}
                                />
                            }
                        >
                            <span
                                className={
                                    ledger.id === activeLedgerId
                                        ? 'font-medium'
                                        : undefined
                                }
                            >
                                {ledger.name}
                            </span>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    render={<Link className="w-full" to="/ledgers" />}
                >
                    All ledgers
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() =>
                        ledgerHandler.openWithPayload({ type: 'create' })
                    }
                >
                    <Plus className="size-4" />
                    New ledger
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
