import * from "index.ts"

export default {
  async fetch(req: Request, env: Env) {
    try {
      // 1. AUTH VALIDATION
      const user = await validateAuth(req, env)

      if (!user) {
        return new Response("Unauthorized", { status: 401 })
      }

      // 2. TENANT RESOLUTION
      const tenantId = user.tenant_id
      const userId = user.id

      if (!tenantId) {
        return new Response("No tenant", { status: 400 })
      }

      // 3. GET TENANT WORKER (WfP core)
      const tenantWorker = env.DISPATCH.get(tenantId)

      if (!tenantWorker) {
        return new Response("Tenant worker not found", { status: 404 })
      }

      // 4. FORWARD REQUEST
      const newHeaders = new Headers(req.headers)
      newHeaders.set("x-tenant-id", tenantId)
      newHeaders.set("x-user-id", userId)

      const forwardedReq = new Request(req, {
        headers: newHeaders
      })

      return tenantWorker.fetch(forwardedReq)

    } catch (err) {
      return new Response("Dispatch error", { status: 500 })
    }
  }
}