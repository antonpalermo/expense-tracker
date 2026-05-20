import * as React from "react"

export default function DataTable({ data }: { data: [] }) {
    const column = React.useMemo(() => {
        if (!data.length) return []
    }, [data])

    return (
        <div>
            <h2>Entries</h2>
            {JSON.stringify(column)}
        </div>
    )
}
