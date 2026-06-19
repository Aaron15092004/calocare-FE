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

                    if (lastEvent === "progress") {
                        setProgress(parsed as GenerateProgress);
                    } else if (lastEvent === "day") {
                        const dayData = parsed as { plan: DayPlan; substitutions?: string[] };
                        setDays((prev) => [...prev, dayData.plan]);
                        if (dayData.substitutions?.length) {
                            setSubstitutions((prev) => [...prev, ...dayData.substitutions!]);
                        }
                    } else if (lastEvent === "done") {
                        setResult(parsed as MealPlanResult);
                    } else if (lastEvent === "error") {
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
