import { Skeleton } from '@/components/ui/skeleton'

export default function SummarySkeleton() {
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
        </div>
    )
}
