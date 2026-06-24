import { createColumnHelper } from "@tanstack/react-table"
import { EllipsisVertical } from "lucide-react"

import type { Entry } from "@/types"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

const columnHelper = createColumnHelper<Entry>()

const parseDate = (input: Date) => {
    const date = new Date(input)
    return Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium"
    }).format(date)
}

export const columns = [
    columnHelper.display({
        id: "select",
        header: () => <Checkbox />,
        cell: () => <Checkbox />
    }),
    columnHelper.accessor("name", {
        header: "Name"
    }),
    columnHelper.accessor("description", {
        header: "Description"
    }),
    columnHelper.accessor("amount", {
        header: "Amount"
    }),
    columnHelper.accessor("createdAt", {
        header: "Date Created",
        cell: ({ row }) => {
            const date = parseDate(row.original.createdAt)
            return <span>{date}</span>
        }
    }),
    columnHelper.display({
        id: "action",
        cell: ({ row }) => (
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <EllipsisVertical className="h-4 w-4" />
                        </Button>
                    }
                ></DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuGroup>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={() =>
                                navigator.clipboard.writeText(row.original.id)
                            }
                        >
                            Copy payment ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Delete</DropdownMenuItem>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        )
    })
]
