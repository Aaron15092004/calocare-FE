// src/hooks/useFoodAnalysis.ts
import { useState } from "react";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { AxiosError } from "axios";

export interface FoodItem {
    name: string;
    portion: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
}

export interface VitaminInfo {
    name: string;
    amount: number;
    unit: string;
    percent_dv: number;
}

export interface DishResult {
    dish_name: string;
    source: "recipe" | "food" | "ai_estimate";
    matched_name: string | null;
    nutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
    };
    weight_grams?: number;
    servings?: number;
    category?: string;
}

export interface AnalysisResult {
    dishes: DishResult[];
    totals: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
    };
    vitamins: VitaminInfo[];
    meal_type: string;
}

// Compatibility type for addEntry
export interface NutritionAnalysis {
    foods: FoodItem[];
    totals: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
    };
    mealType: string;
    healthScore: number;
    vitamins: VitaminInfo[];
    healthTips: string[];
}

export const useFoodAnalysis = () => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const { toast } = useToast();
    const { i18n } = useTranslation();

    const analyzeFood = async (imageBase64: string) => {
        setIsAnalyzing(true);
        setResult(null);

        try {
            const { data } = await api.post<AnalysisResult & { error?: string; limit?: number; used?: number; tier?: string }>("/analyze-food", {
                imageBase64,
                language: i18n.language,
            });

            if (data?.error === "scan_limit_reached") {
                toast({
                    title: "Scan Limit Reached",
                    description: `You've used ${data.used}/${data.limit} scans today. Upgrade for more.`,
                    variant: "destructive",
                });
                return { error: "scan_limit_reached", ...data };
            }

            setResult(data);
            toast({
                title: "Phân tích hoàn tất",
                description: `Tìm thấy ${data.dishes?.length || 0} món`,
            });
            return data;
        } catch (err) {
            const error = err as AxiosError<{ error: string; limit?: number; used?: number; tier?: string }>;

            if (error.response?.status === 429) {
                const data = error.response.data;
                if (data.error === "scan_limit_reached") {
                    toast({
                        title: "Scan Limit Reached",
                        description: `You've used ${data.used}/${data.limit} scans today. Upgrade for more.`,
                        variant: "destructive",
                    });
                    return { error: "scan_limit_reached", ...data };
                }
                toast({ title: "Too many requests", description: "Please try again later.", variant: "destructive" });
                return null;
            }

            console.error("Food analysis error:", error);
            toast({
                title: "Analysis Failed",
                description: error.response?.data?.error || error.message || "Please try again",
                variant: "destructive",
            });
            return null;
        } finally {
            setIsAnalyzing(false);
        }
    };

    const toNutritionAnalysis = (data: AnalysisResult): NutritionAnalysis => ({
        foods: data.dishes.map((d) => ({
            name: d.matched_name || d.dish_name,
            portion: d.weight_grams ? `${d.weight_grams}g` : `${d.servings || 1} serving`,
            calories: d.nutrition.calories,
            protein: d.nutrition.protein,
            carbs: d.nutrition.carbs,
            fat: d.nutrition.fat,
            fiber: d.nutrition.fiber,
        })),
        totals: data.totals,
        mealType: data.meal_type,
        healthScore: 0,
        vitamins: data.vitamins || [],
        healthTips: [],
    });

    const clearResult = () => setResult(null);

    return { analyzeFood, isAnalyzing, result, clearResult, toNutritionAnalysis };
};