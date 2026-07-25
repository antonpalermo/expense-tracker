import { createFileRoute } from '@tanstack/react-router'

import App from '@/components/app'

export const Route = createFileRoute('/_dashboard/')({ component: App })
