// shared/plan-middleware.ts
// Copy into each worker's src/ — enforces plan tier on any route

export type Plan = 'lite' | 'standard' | 'pro'

const PLAN_RANK: Record<Plan, number> = { lite: 1, standard: 2, pro: 3 }

/** Returns a 403 Response if user's plan is below the required tier */
export function requirePlan(
  userPlan: string | undefined,
  minPlan: Plan
): Response | null {
  const rank    = PLAN_RANK[userPlan as Plan] ?? 0
  const minRank = PLAN_RANK[minPlan]
  if (rank < minRank) {
    return new Response(
      JSON.stringify({
        error:    `This feature requires Insight ${minPlan.charAt(0).toUpperCase() + minPlan.slice(1)} or higher.`,
        required_plan: minPlan,
        upgrade_url:   'https://insighthunter.app/dashboard/upgrade.html',
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }
  return null
}

/** Hono middleware factory — use as: app.use('/route', planGate('standard')) */
export function planGate(minPlan: Plan) {
  return async (c: any, next: () => Promise<void>) => {
    const block = requirePlan(c.var.user?.plan, minPlan)
    if (block) return block
    await next()
  }
}
