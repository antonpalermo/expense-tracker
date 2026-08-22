import { json, request } from '@/apis/http'
import type { AssignableRole } from '@/lib/roles'
import type { LedgerMember } from '@/types'

export async function getMembers(ledgerId: string) {
    return await request<LedgerMember[]>(`/api/ledgers/${ledgerId}/members`)
}

export async function updateMemberRole(
    ledgerId: string,
    memberId: string,
    role: AssignableRole
) {
    return await request<LedgerMember>(
        `/api/ledgers/${ledgerId}/members/${memberId}`,
        json('PATCH', { role })
    )
}

export async function removeMember(ledgerId: string, memberId: string) {
    return await request<{ msg: string }>(
        `/api/ledgers/${ledgerId}/members/${memberId}`,
        json('DELETE')
    )
}

export async function resendInvite(ledgerId: string, memberId: string) {
    return await request<{ msg: string }>(
        `/api/ledgers/${ledgerId}/members/${memberId}/resend`,
        json('POST')
    )
}
