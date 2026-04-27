export interface PlanLimits {
  postsPerMonth: number         // -1 = unlimited
  productPhotosPerMonth: number // -1 = unlimited, 0 = none
  assets: number                // -1 = unlimited
  templates: number             // -1 = unlimited, 0 = no custom templates
  composite: boolean
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free:    { postsPerMonth: 3,   productPhotosPerMonth: 0,  assets: 1,  templates: 0,  composite: false },
  starter: { postsPerMonth: 20,  productPhotosPerMonth: 10, assets: 10, templates: 3,  composite: false },
  growth:  { postsPerMonth: 100, productPhotosPerMonth: 50, assets: 50, templates: -1, composite: true  },
  agency:  { postsPerMonth: -1,  productPhotosPerMonth: -1, assets: -1, templates: -1, composite: true  },
  pro:     { postsPerMonth: 20,  productPhotosPerMonth: 10, assets: 10, templates: 3,  composite: false }, // legacy alias for starter
}

export function getLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
}

export function monthStart(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}
