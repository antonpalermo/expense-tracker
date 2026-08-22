/**
 * Single fetch wrapper for every API call.
 *
 * The worker returns `{ msg }` on error, so surfacing that here is what makes
 * `toast.promise`'s error branch show a real message ("this action requires the
 * admin role") instead of a generic failure.
 */
export async function request<T>(
    input: string,
    init?: RequestInit
): Promise<T> {
    const response = await fetch(input, {
        ...init,
        headers: init?.body
            ? { 'Content-Type': 'application/json', ...init.headers }
            : init?.headers
    })

    if (!response.ok) {
        // A bodiless response would otherwise throw inside the error path.
        const body = (await response.json().catch(() => null)) as {
            msg?: string
        } | null

        throw new Error(body?.msg ?? response.statusText)
    }

    return (await response.json()) as T
}

export function json(method: string, body?: unknown): RequestInit {
    return {
        method,
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
    }
}
