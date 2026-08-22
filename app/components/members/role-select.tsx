import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import {
    ASSIGNABLE_ROLES,
    type AssignableRole,
    type LedgerRole,
    outranks,
    ROLE_DESCRIPTION,
    ROLE_LABEL
} from '@/lib/roles'

/**
 * Only offers roles strictly below the actor's own rank, mirroring the rule the
 * server enforces — an admin cannot mint another admin.
 */
export default function RoleSelect({
    value,
    onChange,
    actorRole,
    disabled
}: {
    value: AssignableRole
    onChange: (role: AssignableRole) => void
    actorRole: LedgerRole
    disabled?: boolean
}) {
    const options = ASSIGNABLE_ROLES.filter(role => outranks(actorRole, role))

    return (
        <Select
            value={value}
            onValueChange={next => onChange(next as AssignableRole)}
            disabled={disabled}
        >
            <SelectTrigger className="w-40">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {options.map(role => (
                    <SelectItem key={role} value={role}>
                        <div className="flex flex-col">
                            <span>{ROLE_LABEL[role]}</span>
                            <span className="text-muted-foreground text-xs">
                                {ROLE_DESCRIPTION[role]}
                            </span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
