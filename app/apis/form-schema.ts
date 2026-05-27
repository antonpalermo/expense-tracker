export async function getFormSchema() {
    const request = await fetch("/api/forms/schema")

    if (!request) {
        throw new Error("unable to fetch form schema")
    }

    return await request.json()
}
