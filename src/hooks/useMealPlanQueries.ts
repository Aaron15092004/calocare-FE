import { useMutation, useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import type { MealPlanItemAPI, UserMealPlanAPI } from "@/types/mealPlan";

// Single source of truth for the active meal plan. Every page (Home, MealPlan,
// MyMealPlans, Community, Generate) reads this key — replacing the old mix of
// module-level SWR cache + per-page fetches that showed different plans.
export const ACTIVE_MEAL_PLAN_KEY = ["active-meal-plan"] as const;

export interface ActiveMealPlanResponse {
    plan: UserMealPlanAPI | null;
    items: MealPlanItemAPI[];
}

export function useActiveMealPlan(enabled = true) {
    return useQuery<ActiveMealPlanResponse>({
        queryKey: ACTIVE_MEAL_PLAN_KEY,
        queryFn: () => api.get<ActiveMealPlanResponse>("/user-meal-plans/active-with-items").then((r) => r.data),
        staleTime: 3 * 60 * 1000,
        enabled,
    });
}

export function invalidateActiveMealPlan(): void {
    queryClient.invalidateQueries({ queryKey: ACTIVE_MEAL_PLAN_KEY });
}

/** Unified activation — works for own plans and community plans alike. */
export function useActivatePlan() {
    return useMutation({
        mutationFn: (mealPlanId: string) =>
            api.post(`/meal-plans/${mealPlanId}/activate`).then((r) => r.data as { user_meal_plan_id: string; meal_plan_id: string }),
        onSuccess: () => invalidateActiveMealPlan(),
    });
}
