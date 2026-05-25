"use client"

import * as React from "react"

import { useQuery } from "@tanstack/react-query"
import DynamicForm from "./form"
import DataTable from "./data-table"

const getEntries = async () => {
    const request = await fetch("/api/entries")
    if (!request.ok) {
        throw new Error("unable to fetch all entries")
    }
    return await request.json()
}

type DynamicData = Record<string, unknown>

export default function Entries() {
    const { data, isError, isPending } = useQuery<DynamicData[]>({
        queryKey: ["entries"],
        queryFn: getEntries
    })

    const columns = React.useMemo(() => {
        if (!data || data.length === 0) return []

        const columnShape = Object.keys(data[data.length - 1])

        return columnShape.map(key => ({
            accessorKey: key,
            header: key.charAt(0).toUpperCase() + key.slice(1),
            cell: (info: { getValue: () => void }) => {
                const value = info.getValue()
                if (typeof value === "object" && value !== null) {
                    return JSON.stringify(value)
                }
                return value !== null && value !== undefined
                    ? String(value)
                    : "-"
            }
        }))
    }, [data])

    if (isError) {
        return <span>Error</span>
    }

    if (isPending || (data === undefined && !isError)) {
        return <span>loading</span>
    }

    return (
        <div>
            <h1>Application Entries</h1>
            <DynamicForm />
            <DataTable columns={columns} data={data} />
        </div>
    )
}
