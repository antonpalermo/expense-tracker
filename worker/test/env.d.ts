import type { D1Migration } from '@cloudflare/vitest-pool-workers'

declare global {
    // biome-ignore lint/style/noNamespace: only way to augment the ambient Cloudflare.Env interface
    namespace Cloudflare {
        interface Env {
            TEST_MIGRATIONS: D1Migration[]
        }
    }
}
