import { json, request } from '@/apis/http'
import type { LedgerPayload, LedgerWithRole } from '@/types'

export async function getLedgers() {
    return await request<LedgerWithRole[]>('/api/ledgers')
}

export async function getLedger(ledgerId: string) {
    return await request<LedgerWithRole>(`/api/ledgers/${ledgerId}`)
}

export async function createLedger(value: LedgerPayload) {
    return await request<LedgerWithRole>('/api/ledgers', json('POST', value))
}

export async function updateLedger(ledgerId: string, value: LedgerPayload) {
    return await request<LedgerWithRole>(
        `/api/ledgers/${ledgerId}`,
        json('PATCH', value)
    )
}

export async function removeLedger(ledgerId: string) {
    return await request<{ msg: string }>(
        `/api/ledgers/${ledgerId}`,
        json('DELETE')
    )
}

export async function leaveLedger(ledgerId: string) {
    return await request<{ msg: string }>(
        `/api/ledgers/${ledgerId}/leave`,
        json('POST')
    )
}

export async function transferOwnership(ledgerId: string, userId: string) {
    return await request<{ msg: string }>(
        `/api/ledgers/${ledgerId}/transfer`,
        json('POST', { userId })
    )
}
