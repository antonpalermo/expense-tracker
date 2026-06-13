import type { InsertEntry } from "../types"

export async function getEntries() {
    const request = await fetch("/api/entries")
    if (!request.ok) {
        throw new Error("unable to fetch entries")
    }
    return await request.json()
}

export async function createEntry(value: InsertEntry) {
    const request = await fetch("/api/entries", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(value)
    })

    if (!request) {
        throw new Error("unable to create tasks")
    }

    return await request.json()
}
