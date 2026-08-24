import { User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

type AuthorAvatarProps = {
    name: string | null
    image: string | null
}

/**
 * `entries.user_id` is nullable on purpose, so a null name is a normal state
 * (the author's account was deleted), not an error to guard against.
 */
export default function AuthorAvatar({ name, image }: AuthorAvatarProps) {
    if (!name) {
        return (
            <div className="flex items-center gap-2 text-muted-foreground">
                <Avatar size="sm">
                    <AvatarFallback>
                        <User className="size-3" />
                    </AvatarFallback>
                </Avatar>
                <span className="text-sm">Unknown</span>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-2">
            <Avatar size="sm">
                {image && <AvatarImage src={image} alt={name} />}
                <AvatarFallback>
                    {name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <span className="text-sm">{name}</span>
        </div>
    )
}
