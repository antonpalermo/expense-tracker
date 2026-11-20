import type { Hono } from 'hono'
import type { HonoBindings } from '@/index'

// just for cleaner index?
export default function registerRoutes(app: Hono<HonoBindings>) {
    console.log(app)
}
