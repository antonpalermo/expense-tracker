import { env } from 'cloudflare:workers'

/**
 * Delivery seam for transactional email, backed by Plunk's transactional
 * send API (https://docs.useplunk.com/api-reference/transactional/send).
 * Raw fetch rather than the Plunk SDK, to keep this a one-file dependency
 * and the Worker bundle small.
 *
 * Callers must never let a send failure fail the request: whatever the send
 * is attached to (a membership row, a new account, a reset token) is already
 * committed and usable without the email arriving.
 */

const PLUNK_SEND_URL = 'https://api.useplunk.com/v1/send'

async function sendPlunkEmail(payload: {
    to: string
    subject: string
    body: string
}) {
    const response = await fetch(PLUNK_SEND_URL, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${env.PLUNK_SECRET_KEY}`
        },
        body: JSON.stringify(payload)
    })

    if (!response.ok) {
        throw new Error(
            `plunk send failed: ${response.status} ${await response.text()}`
        )
    }
}

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

    const lede =
        payload.kind === 'join'
            ? `added you to <strong>${escapeHtml(payload.ledgerName)}</strong>. Sign in with Google to get started.`
            : `invited you to join <strong>${escapeHtml(payload.ledgerName)}</strong>. Accept or decline below.`

    const cta = payload.kind === 'join' ? 'Sign in' : 'Review invitation'

    await sendPlunkEmail({
        to: payload.to,
        subject,
        body: [
            `<p>${escapeHtml(payload.inviterName)} ${lede}</p>`,
            `<p><a href="${payload.url}">${cta}</a></p>`
        ].join('\n')
    })
}

type VerificationEmail = {
    to: string
    url: string
}

export async function sendVerificationEmail(payload: VerificationEmail) {
    await sendPlunkEmail({
        to: payload.to,
        subject: 'Verify your email',
        body: [
            '<p>Confirm your email address to finish setting up your xpens account.</p>',
            `<p><a href="${payload.url}">Verify email</a></p>`
        ].join('\n')
    })
}

type PasswordResetEmail = {
    to: string
    url: string
}

export async function sendPasswordResetEmail(payload: PasswordResetEmail) {
    await sendPlunkEmail({
        to: payload.to,
        subject: 'Reset your password',
        body: [
            '<p>Reset your xpens password. This link expires in 1 hour.</p>',
            `<p><a href="${payload.url}">Reset password</a></p>`
        ].join('\n')
    })
}

function escapeHtml(value: string) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
}
