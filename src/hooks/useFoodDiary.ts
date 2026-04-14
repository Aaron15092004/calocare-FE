import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { NutritionAnalysis, FoodItem, VitaminInfo } from "@/hooks/useFoodAnalysis";

export interface DiaryFoodItem {
    dish_name: string;
    matched_name?: string;
    source?: "recipe" | "food" | "ai_estimate";
    nutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
    };
    weight_grams?: number;
}

export interface FoodDiaryEntry {
    id: string;
    user_id: string;
    scanned_at: string;
    image_url: string | null;
    foods: DiaryFoodItem[];
    totals: NutritionAnalysis["totals"];
    vitamins: VitaminInfo[];
    health_tips: string[];
    meal_type: string;
    health_score: number;
    notes: string | null;
}

export const useFoodDiary = (userId: string | undefined) => {
    const [entries, setEntries] = useState<FoodDiaryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        if (userId) {
            fetchEntries();
        } else {
            setEntries([]);
            setLoading(false);
        }
    }, [userId]);

    const fetchEntries = async () => {
        if (!userId) return;
        try {
            const { data } = await api.get<{ data: FoodDiaryEntry[] }>("/food-diary", {
                params: { limit: 200 },
            });
            setEntries(data.data || []);
        } catch (error) {
            console.error("Error fetching food diary:", error);
        } finally {
            setLoading(false);
        }
    };

    const addEntry = async (analysis: NutritionAnalysis, imageUrl?: string | null) => {
        if (!userId) {
            toast({
                title: "Sign in required",
                description: "Please sign in to save to your food diary.",
                variant: "destructive",
            });
            return { error: new Error("Not authenticated") };
        }
        try {
            const { data } = await api.post<FoodDiaryEntry>("/food-diary", {
                foods: analysis.foods.map((item) => ({
                    dish_name: item.name,
                    matched_name: item.name,
                    source: "food",
                    nutrition: {
                        calories: item.calories,
                        protein: item.protein,
                        carbs: item.carbs,
                        fat: item.fat,
                        fiber: item.fiber,
                    },
                })),
                totals: analysis.totals,
                vitamins: analysis.vitamins,
                health_tips: analysis.healthTips,
                meal_type: analysis.mealType,
                health_score: analysis.healthScore,
                image_url: imageUrl || null,
            });

            setEntries([data, ...entries]);
            toast({ title: "Saved to diary! 📝", description: "Your meal has been logged." });
            return { data, error: null };
        } catch (err) {
            console.error("Error saving to diary:", err);
            toast({
                title: "Failed to save",
                description: "Could not save to your food diary.",
                variant: "destructive",
            });
            return { error: err };
        }
    };

    const deleteEntry = async (entryId: string) => {
        try {
            await api.delete(`/food-diary/${entryId}`);
            setEntries(entries.filter((e) => e.id !== entryId));
            toast({ title: "Entry deleted", description: "Removed from your food diary." });
            return { error: null };
        } catch (err) {
            toast({
                title: "Failed to delete",
                description: "Could not remove the entry.",
                variant: "destructive",
            });
            return { error: err };
        }
    };

    const updateEntryNotes = async (entryId: string, notes: string | null) => {
        try {
            await api.put(`/food-diary/${entryId}`, { notes });
            setEntries(entries.map((e) => (e.id === entryId ? { ...e, notes } : e)));
            toast({ title: "Notes saved", description: "Your note has been updated." });
            return { error: null };
        } catch (err) {
            toast({
                title: "Failed to save",
                description: "Could not update the notes.",
                variant: "destructive",
            });
            return { error: err };
        }
    };

    const addManualEntry = async (data: {
        foods: {
            name: string;
            calories: number;
            protein: number;
            carbs: number;
            fat: number;
            fiber: number;
            portion: string;
        }[];
        totals: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
        mealType: string;
        notes?: string;
    }) => {
        if (!userId) {
            toast({
                title: "Sign in required",
                description: "Please sign in to save to your food diary.",
                variant: "destructive",
            });
            return { error: new Error("Not authenticated") };
        }
        try {
            const { data: entry } = await api.post<FoodDiaryEntry>("/food-diary", {
                foods: data.foods.map((item) => ({
                    dish_name: item.name,
                    matched_name: item.name,
                    source: "food",
                    nutrition: {
                        calories: item.calories,
                        protein: item.protein,
                        carbs: item.carbs,
                        fat: item.fat,
                        fiber: item.fiber,
                    },
                })),
                totals: data.totals,
                vitamins: [],
                health_tips: [],
                meal_type: data.mealType,
                health_score: 0,
                image_url: null,
                notes: data.notes || null,
            });

            setEntries([entry, ...entries]);
            toast({ title: "Meal logged! 📝", description: "Your meal has been added to the diary." });
            return { data: entry, error: null };
        } catch (err) {
            toast({
                title: "Failed to save",
                description: "Could not save to your food diary.",
                variant: "destructive",
            });
            return { error: err };
        }
    };

    const getEntriesByDate = (date: Date) => {
        const dateStr = date.toISOString().split("T")[0];
        return entries.filter((entry) => entry.scanned_at.split("T")[0] === dateStr);
    };

    const getTodaysTotals = () => {
        const todaysEntries = getEntriesByDate(new Date());
        return todaysEntries.reduce(
            (acc, entry) => ({
                calories: acc.calories + (entry.totals.calories || 0),
                protein: acc.protein + (entry.totals.protein || 0),
                carbs: acc.carbs + (entry.totals.carbs || 0),
                fat: acc.fat + (entry.totals.fat || 0),
                fiber: acc.fiber + (entry.totals.fiber || 0),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
        );
    };

    return {
        entries,
        loading,
        addEntry,
        addManualEntry,
        deleteEntry,
        updateEntryNotes,
        getEntriesByDate,
        getTodaysTotals,
        refetch: fetchEntries,
    };
};