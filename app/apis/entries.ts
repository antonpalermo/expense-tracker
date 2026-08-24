import { json, request } from '@/apis/http'
import type { Entry, EntryPayload, EntryRow } from '@/types'

export async function getEntries(ledgerId: string) {
    return await request<Entry[]>(`/api/ledgers/${ledgerId}/entries`)
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
