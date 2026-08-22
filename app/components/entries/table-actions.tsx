import type { CellContext } from '@tanstack/react-table'
import { EllipsisVertical } from 'lucide-react'
import type { Entry } from '@/types'
import { deleteEntryHandler, entryHandler } from '../dialog-handlers'
import { AlertDialogTrigger } from '../ui/alert-dialog'
import { Button } from '../ui/button'
import { DialogTrigger } from '../ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '../ui/dropdown-menu'

export default function TableActions({
    context,
    ledgerId
}: {
    context: CellContext<Entry, unknown>
    ledgerId: string
}) {
    const entry = context.row.original

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
            <DropdownMenuContent className="min-w-40">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                        onClick={() => navigator.clipboard.writeText(entry.id)}
                    >
                        Copy entry ID
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        render={
                            <DialogTrigger
                                className="w-full"
                                handle={entryHandler}
                                payload={{
                                    type: 'edit',
                                    ledgerId,
                                    id: entry.id,
                                    data: {
                                        name: entry.name,
                                        description: entry.description,
                                        amount: entry.amount
                                    }
                                }}
                            />
                        }
                    >
                        Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        render={
                            <AlertDialogTrigger
                                className="w-full"
                                handle={deleteEntryHandler}
                                payload={{
                                    ledgerId,
                                    id: entry.id,
                                    name: entry.name
                                }}
                            />
                        }
                    >
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
