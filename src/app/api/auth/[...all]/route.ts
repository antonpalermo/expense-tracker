import { initAuth } from "@/lib/auth"

function initAuthHandler() {
  const handler = async (request: Request) => {
    return (await initAuth()).handler(request)
  }

  return {
    GET: handler,
    POST: handler
  }
}

export const { GET, POST } = initAuthHandler()
