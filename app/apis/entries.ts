export async function getEntries() {
    const request = await fetch("/api/entries")
    if (!request.ok) {
        throw new Error("unable to fetch entries")
    }
    return await request.json()
}

export async function createEntry(value: unknown) {
    const data = {
        formId: "jTIgiBp1Jz74oKtnJxNo", // TODO: need to be based on the user's form
        data: value
    }
    const request = await fetch("/api/entries", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    })

    if (!request) {
        throw new Error("unable to create tasks")
    }

    return await request.json()
}
