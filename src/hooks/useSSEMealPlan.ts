import { useState, useCallback, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:1509";

export type GoalType = "weight_loss" | "muscle_gain" | "maintenance";

export interface MealItem {
    meal_type: "breakfast" | "lunch" | "dinner" | "snack" | "morning_snack" | "afternoon_snack";
    food_name: string;
    food_id?: string;
    source_type?: "food" | "recipe" | "usda" | "ai_generated";
    weight_grams: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    cooking_steps?: string[];
}

export interface DayPlan {
    day_number: number;
    meals: MealItem[];
    day_totals: { calories: number; protein: number; carbs: number; fat: number };
}

export interface GenerateProgress {
    current_day: number;
    total_days: number;
}

export interface MealPlanResult {
    meal_plan_id: string;
    days_generated: number;
    // Additive fields from the resumable-generation backend (older responses omit them)
    plan_status?: "completed" | "partial";
    requested_days?: number;
}

// Marker persisted while a generation is in flight so the plan can be recovered
// after a reload/navigation (the backend keeps generating and stores progress).
const PENDING_KEY = "calovie:generating-plan";

export interface PendingGenerationMarker {
    planId: string;
    startedAt: number;
}

export function getPendingGenerationMarker(): PendingGenerationMarker | null {
    try {
        const raw = localStorage.getItem(PENDING_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as PendingGenerationMarker;
        // Expire markers older than 24h (matches the BE recovery window)
        if (!parsed.planId || Date.now() - parsed.startedAt > 24 * 3600 * 1000) {
            localStorage.removeItem(PENDING_KEY);
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

export function clearPendingGenerationMarker(): void {
    try {
        localStorage.removeItem(PENDING_KEY);
    } catch {
        /* storage unavailable */
    }
}

function setPendingGenerationMarker(planId: string): void {
    try {
        localStorage.setItem(PENDING_KEY, JSON.stringify({ planId, startedAt: Date.now() } satisfies PendingGenerationMarker));
    } catch {
        /* storage unavailable */
    }
}

export type MealsPerDay = 3 | 4 | 5;
export type CookingStyle = "fresh" | "batch";

export interface GenerateMealPlanRequest {
    duration_days: 7 | 21;
    goal: GoalType;
    meals_per_day?: MealsPerDay;
    cooking_style?: CookingStyle;
    preferences?: {
        dietary_preference?: string;
        allergies?: string[];
        cuisine_preferences?: string[];
    };
}

export function useSSEMealPlan() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState<GenerateProgress | null>(null);
    const [days, setDays] = useState<DayPlan[]>([]);
    const [substitutions, setSubstitutions] = useState<string[]>([]);
    const [result, setResult] = useState<MealPlanResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const generate = useCallback(async (req: GenerateMealPlanRequest) => {
        const token = localStorage.getItem("access_token");
        if (!token) return;

        setIsGenerating(true);
        setProgress(null);
        setDays([]);
        setSubstitutions([]);
        setResult(null);
        setError(null);

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const res = await fetch(`${API_URL}/api/rag/generate-meal-plan`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(req),
                signal: controller.signal,
            });

            if (!res.ok || !res.body) {
                const errText = await res.text().catch(() => "Request failed");
                throw new Error(errText);
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let lastEvent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    if (line.startsWith("event: ")) {
                        lastEvent = line.slice(7).trim();
                        continue;
                    }
                    if (!line.startsWith("data: ")) continue;
                    const data = line.slice(6);
                    if (!data.trim()) continue;

                    let parsed: unknown;
                    try {
                        parsed = JSON.parse(data);
                    } catch {
                        continue;
                    }

                    if (lastEvent === "created") {
                        // Plan doc exists server-side from this point — persist the id
                        // so a reload/navigation can recover it.
                        const created = parsed as { meal_plan_id?: string };
                        if (created.meal_plan_id) setPendingGenerationMarker(created.meal_plan_id);
                    } else if (lastEvent === "progress") {
                        setProgress(parsed as GenerateProgress);
                    } else if (lastEvent === "day") {
                        const dayData = parsed as { plan: DayPlan; substitutions?: string[] };
                        setDays((prev) => [...prev, dayData.plan]);
                        if (dayData.substitutions?.length) {
                            setSubstitutions((prev) => [...prev, ...dayData.substitutions!]);
                        }
                    } else if (lastEvent === "done") {
                        setResult(parsed as MealPlanResult);
                        clearPendingGenerationMarker();
                    } else if (lastEvent === "error") {
                        // Total failure: the backend deleted the empty plan and refunded quota
                        clearPendingGenerationMarker();
                        throw new Error((parsed as { message?: string }).message || "Generation failed");
                    }
                }
            }
        } catch (err) {
            if ((err as Error).name === "AbortError") return;
            const msg = err instanceof Error ? err.message : "Generation failed";
            setError(msg);
        } finally {
            setIsGenerating(false);
        }
    }, []);

    const reset = useCallback(() => {
        abortRef.current?.abort();
        setIsGenerating(false);
        setProgress(null);
        setDays([]);
        setSubstitutions([]);
        setResult(null);
        setError(null);
    }, []);

    return { isGenerating, progress, days, substitutions, result, error, generate, reset };
}
