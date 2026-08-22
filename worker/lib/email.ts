import { env } from 'cloudflare:workers'

/**
 * Delivery seam for ledger invitations, backed by Plunk's transactional
 * send API (https://docs.useplunk.com/api-reference/transactional/send).
 * Raw fetch rather than the Plunk SDK, to keep this a one-file dependency
 * and the Worker bundle small.
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

const PLUNK_SEND_URL = 'https://api.useplunk.com/v1/send'

export async function sendLedgerInvite(payload: LedgerInviteEmail) {
    const subject =
        payload.kind === 'join'
            ? `${payload.inviterName} added you to ${payload.ledgerName}`
            : `${payload.inviterName} invited you to ${payload.ledgerName}`

    const lede =
        payload.kind === 'join'
            ? `added you to <strong>${escapeHtml(payload.ledgerName)}</strong>. Sign in with Google to get started.`
            : `invited you to join <strong>${escapeHtml(payload.ledgerName)}</strong>. Accept or decline below.`

    const cta = payload.kind === 'join' ? 'Sign in' : 'Review invitation'

    const body = [
        `<p>${escapeHtml(payload.inviterName)} ${lede}</p>`,
        `<p><a href="${payload.url}">${cta}</a></p>`
    ].join('\n')

    const response = await fetch(PLUNK_SEND_URL, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${env.PLUNK_SECRET_KEY}`
        },
        body: JSON.stringify({
            to: payload.to,
            subject,
            body
        })
    })

    if (!response.ok) {
        throw new Error(
            `plunk send failed: ${response.status} ${await response.text()}`
        )
    }
}

function escapeHtml(value: string) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
}
