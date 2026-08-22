import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { getMyInvitations } from '@/apis/invitations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/auth'
import { myInvitationsKeys } from '@/query-keys'

export default function Nav() {
    const navigate = useNavigate()
    const { data: invitations } = useQuery({
        queryKey: myInvitationsKeys.all,
        queryFn: getMyInvitations
    })

    const pending = invitations?.length ?? 0

    return (
        <nav className="border-b py-2">
            <div className="container mx-auto px-5">
                <div className="flex w-full flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link to="/ledgers" className="font-semibold">
                            xpens
                        </Link>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            render={<Link to="/invitations" />}
                        >
                            Invitations
                            {pending > 0 && (
                                <Badge variant="default" className="ml-2">
                                    {pending}
                                </Badge>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={async () =>
                                await signOut({
                                    fetchOptions: {
                                        onSuccess: () => {
                                            navigate({ to: '/sign-in' })
                                        }
                                    }
                                })
                            }
                        >
                            Sign Out
                        </Button>
                    </div>
                </div>
            </div>
        </nav>
    )
}
