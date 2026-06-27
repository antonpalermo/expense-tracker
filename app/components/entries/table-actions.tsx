import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "../ui/dropdown-menu"
import { Button } from "../ui/button"
import { EllipsisVertical } from "lucide-react"
import type { CellContext } from "@tanstack/react-table"
import type { Entry } from "@/types"
import { deleteEntryHandler } from "../dialog-handlers"
import { AlertDialogTrigger } from "../ui/alert-dialog"

export default function TableActions({
    context
}: {
    context: CellContext<Entry, unknown>
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <EllipsisVertical className="h-4 w-4" />
                    </Button>
                }
            ></DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-40">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                        onClick={() =>
                            navigator.clipboard.writeText(
                                context.row.original.id
                            )
                        }
                    >
                        Copy payment ID
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem
                        render={
                            <AlertDialogTrigger
                                className="w-full"
                                handle={deleteEntryHandler}
                                payload={{ id: context.row.original.id }}
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
