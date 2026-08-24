import { json, request } from '@/apis/http'
import type { EntriesPage, EntriesQuery, EntryPayload, EntryRow } from '@/types'

function buildEntriesQueryString(query: EntriesQuery) {
    const params = new URLSearchParams()

    if (query.q) params.set('q', query.q)
    if (query.sort) params.set('sort', query.sort)
    if (query.order) params.set('order', query.order)
    if (query.authorIds && query.authorIds.length > 0) {
        params.set('authorIds', JSON.stringify(query.authorIds))
    }
    if (query.page) params.set('page', String(query.page))

    const search = params.toString()
    return search ? `?${search}` : ''
}

export async function getEntries(ledgerId: string, query: EntriesQuery) {
    return await request<EntriesPage>(
        `/api/ledgers/${ledgerId}/entries${buildEntriesQueryString(query)}`
    )
}

export async function createEntry(ledgerId: string, value: EntryPayload) {
    return await request<EntryRow>(
        `/api/ledgers/${ledgerId}/entries`,
        json('POST', value)
    )
}

export async function updateEntry(
    ledgerId: string,
    id: string,
    value: Partial<EntryPayload>
) {
    return await request<EntryRow>(
        `/api/ledgers/${ledgerId}/entries/${id}`,
        json('PATCH', value)
    )
}

export async function removeEntry(ledgerId: string, id: string) {
    return await request<{ msg: string }>(
        `/api/ledgers/${ledgerId}/entries/${id}`,
        json('DELETE')
    )
}
