import { Outlet } from '@tanstack/react-router'
import { TooltipProvider } from '@/components/ui/tooltip'

export default function RootLayout() {
    // Provided app-wide so moving between adjacent tooltips — the author
    // avatars down an entries table — does not re-wait the open delay.
    return (
        <TooltipProvider>
            <Outlet />
        </TooltipProvider>
    )
}
