import { createFileRoute, redirect } from '@tanstack/react-router'
import { LAST_LEDGER_KEY } from '@/lib/last-ledger'

export const Route = createFileRoute('/_dashboard/')({
    beforeLoad: () => {
        // Only a hint — the route param stays the source of truth. If the
        // ledger is gone, /ledgers/$ledgerId 404s and the user can pick another.
        const lastLedgerId = localStorage.getItem(LAST_LEDGER_KEY)

        throw lastLedgerId
            ? redirect({
                  to: '/ledgers/$ledgerId',
                  params: { ledgerId: lastLedgerId }
              })
            : redirect({ to: '/ledgers' })
    }
})
