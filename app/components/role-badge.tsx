import { Badge } from '@/components/ui/badge'
import { type LedgerRole, ROLE_LABEL } from '@/lib/roles'

const VARIANT: Record<
    LedgerRole,
    'default' | 'secondary' | 'outline' | 'destructive'
> = {
    owner: 'default',
    admin: 'secondary',
    member: 'outline',
    viewer: 'outline'
}

export default function RoleBadge({ role }: { role: LedgerRole }) {
    return <Badge variant={VARIANT[role]}>{ROLE_LABEL[role]}</Badge>
}
