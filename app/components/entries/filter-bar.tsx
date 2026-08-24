import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import type { LedgerMember } from '@/types'

type EntriesFilterBarProps = {
    search: string | undefined
    onSearchChange: (value: string) => void
    members: LedgerMember[]
    authorIds: string[]
    onAuthorIdsChange: (authorIds: string[]) => void
}

export default function EntriesFilterBar({
    search,
    onSearchChange,
    members,
    authorIds,
    onAuthorIdsChange
}: EntriesFilterBarProps) {
    const [inputValue, setInputValue] = useState(search ?? '')
    const [prevSearch, setPrevSearch] = useState(search)

    // Adjust local input state during render when the URL-derived `search`
    // prop changes externally (e.g. browser back/forward) — React's
    // documented alternative to a resync effect: calling setState
    // conditionally mid-render lets React re-render before committing,
    // avoiding the extra effect-triggered render pass (and the
    // react-hooks/set-state-in-effect lint rule this used to trip).
    if (search !== prevSearch) {
        setPrevSearch(search)
        setInputValue(search ?? '')
    }

    const debouncedValue = useDebouncedValue(inputValue, 300)

    useEffect(() => {
        if (debouncedValue !== (search ?? '')) {
            onSearchChange(debouncedValue)
        }
        // Only the debounced keystroke value should trigger a URL update —
        // `search`/`onSearchChange` are read, not depended on, to avoid
        // re-firing when the URL sync effect above updates `inputValue`.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedValue])

    const toggleAuthor = (userId: string) => {
        onAuthorIdsChange(
            authorIds.includes(userId)
                ? authorIds.filter(id => id !== userId)
                : [...authorIds, userId]
        )
    }

    return (
        <div className="flex items-center gap-2">
            <Input
                value={inputValue}
                onChange={event => setInputValue(event.target.value)}
                placeholder="Search entries..."
                className="max-w-sm"
            />

            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button variant="outline" className="gap-1.5">
                            Author
                            {authorIds.length > 0 && (
                                <span className="rounded-full bg-muted px-1.5 text-xs">
                                    {authorIds.length}
                                </span>
                            )}
                        </Button>
                    }
                />
                <DropdownMenuContent className="min-w-48">
                    {members.map(member => (
                        <DropdownMenuCheckboxItem
                            key={member.id}
                            checked={authorIds.includes(member.userId)}
                            onCheckedChange={() => toggleAuthor(member.userId)}
                        >
                            {member.name}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
