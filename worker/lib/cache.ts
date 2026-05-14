import { env } from "cloudflare:workers"

export async function get<T>(key: string) {
    return env.APP_CACHE.get<T>(key, "json")
}

export async function set<T>(
    key: string,
    value: T,
    options?: KVNamespacePutOptions
) {
    await env.APP_CACHE.put(key, JSON.stringify(value), options)
}
