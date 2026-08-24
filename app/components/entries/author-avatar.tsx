import { User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger
} from '@/components/ui/tooltip'

type AuthorAvatarProps = {
    name: string | null
    image: string | null
}

/**
 * `entries.user_id` is nullable on purpose, so a null name is a normal state
 * (the author's account was deleted), not an error to guard against.
 *
 * The name is shown only on hover, so it is also rendered `sr-only`: a tooltip
 * is a pointer affordance, and must not be the sole carrier of who wrote the
 * entry. The image is `alt=""` so the name is not announced twice.
 */
export default function AuthorAvatar({ name, image }: AuthorAvatarProps) {
    const label = name ?? 'Unknown'

    return (
        <Tooltip>
            <TooltipTrigger
                render={
                    <Avatar size="sm">
                        {name && image && <AvatarImage src={image} alt="" />}
                        <AvatarFallback>
                            {name ? (
                                name.slice(0, 2).toUpperCase()
                            ) : (
                                <User className="size-3" />
                            )}
                        </AvatarFallback>
                        <span className="sr-only">{label}</span>
                    </Avatar>
                }
            />
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    )
}
