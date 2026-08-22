import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { createInvitation } from '@/apis/invitations'
import { Button } from '@/components/ui/button'
import {
    Field,
    FieldDescription,
    FieldError,
    FieldLabel
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { AssignableRole, LedgerRole } from '@/lib/roles'
import { ledgersKeys, myInvitationsKeys } from '@/query-keys'
import type { InvitePayload } from '@/types'
import RoleSelect from './role-select'

const emailSchema = z
    .string()
    .trim()
    .min(1, 'Email is required')
    .pipe(z.email('Enter a valid email address'))

export default function InviteForm({
    ledgerId,
    actorRole,
    onDone
}: {
    ledgerId: string
    actorRole: LedgerRole
    onDone?: () => void
}) {
    const queryClient = useQueryClient()
    const [email, setEmail] = useState('')
    const [role, setRole] = useState<AssignableRole>('member')
    const [error, setError] = useState<string | null>(null)

    const mutation = useMutation({
        mutationFn: (value: InvitePayload) => createInvitation(ledgerId, value),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: ledgersKeys.members(ledgerId)
                }),
                queryClient.invalidateQueries({
                    queryKey: ledgersKeys.invitations(ledgerId)
                }),
                queryClient.invalidateQueries({
                    queryKey: myInvitationsKeys.all
                })
            ])
        }
    })

    return (
        <form
            className="flex flex-col gap-3 sm:flex-row sm:items-start"
            onSubmit={e => {
                e.preventDefault()

                const parsed = emailSchema.safeParse(email)

                if (!parsed.success) {
                    setError(parsed.error.issues[0]?.message ?? 'Invalid email')
                    return
                }

                setError(null)

                toast.promise(
                    mutation.mutateAsync({ email: parsed.data, role }),
                    {
                        loading: 'Inviting...',
                        success: result => {
                            setEmail('')
                            onDone?.()

                            // Two outcomes: an unregistered address is added
                            // straight away, an existing account gets a
                            // pending invitation to accept.
                            return result.kind === 'joined'
                                ? `${parsed.data} was added — they'll see the ledger when they sign in`
                                : `Invitation sent to ${parsed.data}`
                        },
                        error: err => (err as Error).message
                    }
                )
            }}
        >
            <Field className="flex-1" data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="invite-email">Email address</FieldLabel>
                <Input
                    id="invite-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.currentTarget.value)}
                    aria-invalid={Boolean(error)}
                    placeholder="someone@example.com"
                    autoComplete="off"
                />
                {error ? (
                    <FieldError errors={[{ message: error }]} />
                ) : (
                    <FieldDescription>
                        They don’t need an account yet — we’ll add them and
                        they’ll join when they first sign in.
                    </FieldDescription>
                )}
            </Field>
            <Field className="sm:w-auto">
                <FieldLabel htmlFor="invite-role">Role</FieldLabel>
                <RoleSelect
                    value={role}
                    onChange={setRole}
                    actorRole={actorRole}
                />
            </Field>
            <Button
                type="submit"
                className="sm:mt-6"
                disabled={mutation.isPending}
            >
                Invite
            </Button>
        </form>
    )
}
