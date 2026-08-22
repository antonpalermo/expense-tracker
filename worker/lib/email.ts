/**
 * Delivery seam for ledger invitations.
 *
 * No provider is configured yet, so this logs instead of sending. Swapping in a
 * real provider (Resend via raw fetch keeps the Worker bundle small) is a
 * change to this file only.
 *
 * Callers must never let a send failure fail the request: the membership or
 * invitation row is already committed and the invite works without the email.
 */
type LedgerInviteEmail = {
    to: string
    ledgerName: string
    inviterName: string
    url: string
    /**
     * 'join' — the address had no account, a membership was created for it and
     * signing in with Google claims it.
     * 'review' — the address already has an account and a pending invitation is
     * waiting to be accepted or declined.
     */
    kind: 'join' | 'review'
}

export async function sendLedgerInvite(payload: LedgerInviteEmail) {
    const subject =
        payload.kind === 'join'
            ? `${payload.inviterName} added you to ${payload.ledgerName}`
            : `${payload.inviterName} invited you to ${payload.ledgerName}`

    // TODO: replace with a real provider.
    console.log('[email]', { subject, ...payload })
}
