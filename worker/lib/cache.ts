import { env } from "cloudflare:workers"

export async function get(key: string) {
    return await env.APP_CACHE.get(key)
}

export async function set<T>(
    key: string,
    value: T,
    options?: KVNamespacePutOptions
) {
    await env.APP_CACHE.put(key, JSON.stringify(value), options)
}
