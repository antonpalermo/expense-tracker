import { json, request } from '@/apis/http'
import type { AssignableRole } from '@/lib/roles'
import type {
    InvitePayload,
    InviteResult,
    LedgerInvitation,
    MyInvitation
} from '@/types'

export async function createInvitation(ledgerId: string, value: InvitePayload) {
    return await request<InviteResult>(
        `/api/ledgers/${ledgerId}/invitations`,
        json('POST', value)
    )
}

export async function getLedgerInvitations(ledgerId: string) {
    return await request<LedgerInvitation[]>(
        `/api/ledgers/${ledgerId}/invitations`
    )
}

export async function revokeInvitation(ledgerId: string, invitationId: string) {
    return await request<{ msg: string }>(
        `/api/ledgers/${ledgerId}/invitations/${invitationId}`,
        json('DELETE')
    )
}

export async function getMyInvitations() {
    return await request<MyInvitation[]>('/api/invitations')
}

export async function acceptInvitation(invitationId: string) {
    return await request<{
        ledgerId: string
        role: AssignableRole
        alreadyMember: boolean
    }>(`/api/invitations/${invitationId}/accept`, json('POST'))
}

export async function declineInvitation(invitationId: string) {
    return await request<{ msg: string }>(
        `/api/invitations/${invitationId}/decline`,
        json('POST')
    )
}
