export type PlanLike = { name?: string; price?: number | null };

export function isPaidPlan(plan: PlanLike | null | undefined): boolean {
  return (plan?.price ?? 0) > 0;
}
