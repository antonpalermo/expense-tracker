import { Link } from '@tanstack/react-router'
import { EllipsisVertical } from 'lucide-react'
import RoleGate from '@/components/role-gate'
import { AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { DialogTrigger } from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import type { LedgerWithRole } from '@/types'
import {
    deleteLedgerHandler,
    leaveLedgerHandler,
    ledgerHandler
} from '../dialog-handlers'

export default function LedgerActions({ ledger }: { ledger: LedgerWithRole }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <EllipsisVertical className="h-4 w-4" />
                    </Button>
                }
            />
            <DropdownMenuContent className="min-w-44">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                        render={
                            <Link
                                className="w-full"
                                to="/ledgers/$ledgerId/members"
                                params={{ ledgerId: ledger.id }}
                            />
                        }
                    >
                        Members
                    </DropdownMenuItem>
                    <RoleGate role={ledger.role} required="admin">
                        <DropdownMenuItem
                            render={
                                <DialogTrigger
                                    className="w-full"
                                    handle={ledgerHandler}
                                    payload={{
                                        type: 'edit',
                                        id: ledger.id,
                                        data: {
                                            name: ledger.name,
                                            description: ledger.description
                                        }
                                    }}
                                />
                            }
                        >
                            Rename
                        </DropdownMenuItem>
                    </RoleGate>
                    <DropdownMenuSeparator />
                    {ledger.role === 'owner' ? (
                        <DropdownMenuItem
                            render={
                                <AlertDialogTrigger
                                    className="w-full"
                                    handle={deleteLedgerHandler}
                                    payload={{
                                        id: ledger.id,
                                        name: ledger.name
                                    }}
                                />
                            }
                        >
                            Delete ledger
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem
                            render={
                                <AlertDialogTrigger
                                    className="w-full"
                                    handle={leaveLedgerHandler}
                                    payload={{
                                        id: ledger.id,
                                        name: ledger.name
                                    }}
                                />
                            }
                        >
                            Leave ledger
                        </DropdownMenuItem>
                    )}
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
