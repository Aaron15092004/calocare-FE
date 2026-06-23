import { useState, useEffect, useCallback } from "react";
import { format, subDays, isSameDay, parseISO } from "date-fns";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { NutritionAnalysis, FoodItem, VitaminInfo } from "@/hooks/useFoodAnalysis";
import { FOOD_DIARY_UPDATED_EVENT } from "@/hooks/useMealProgress";

export interface DiaryFoodItem {
    dish_name: string;
    matched_name?: string;
    source?: "recipe" | "food" | "ai_estimate" | "usda" | "fatsecret" | "store_menu";
    nutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
    };
    weight_grams?: number;
    store_id?: string;
    store_name?: string;
    menu_item_id?: string;
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

// selectedDate: the day currently viewed in the diary (defaults to today)
export const useFoodDiary = (userId: string | undefined, selectedDate?: Date) => {
    const [entries, setEntries] = useState<FoodDiaryEntry[]>([]);
    // Last 30 days — used for weekly chart, streak, calendar dots, getTodaysTotals
    const [summaryEntries, setSummaryEntries] = useState<FoodDiaryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const { toast } = useToast();

    const targetDateStr = format(selectedDate ?? new Date(), "yyyy-MM-dd");

    const fetchEntries = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get<{ data: FoodDiaryEntry[] }>("/food-diary", {
                params: { date: targetDateStr, limit: 50 },
            });
            setEntries(data.data || []);
        } catch (error) {
            console.error("Error fetching food diary:", error);
        } finally {
            setLoading(false);
        }
    }, [targetDateStr]);

    const fetchSummary = useCallback(async () => {
        setSummaryLoading(true);
        try {
            const endDate = format(new Date(), "yyyy-MM-dd");
            const startDate = format(subDays(new Date(), 30), "yyyy-MM-dd");
            const { data } = await api.get<{ data: FoodDiaryEntry[] }>("/food-diary", {
                params: { start_date: startDate, end_date: endDate, limit: 500 },
            });
            setSummaryEntries(data.data || []);
        } catch (error) {
            console.error("Error fetching diary summary:", error);
        } finally {
            setSummaryLoading(false);
        }
    }, []);

    // Re-fetch entries whenever the viewed date changes.
    useEffect(() => {
        if (userId) {
            void fetchEntries();
        } else {
            setEntries([]);
            setLoading(false);
        }
    }, [userId, fetchEntries]);

    // Summary fetched once on mount (last 30 days).
    useEffect(() => {
        if (userId) {
            void fetchSummary();
        } else {
            setSummaryEntries([]);
            setSummaryLoading(false);
        }
    }, [userId, fetchSummary]);

    // A completed meal-plan meal can be recorded from another page. Keep every
    // mounted diary consumer (Home, Diary, reports) in sync without a reload.
    useEffect(() => {
        if (!userId) return;
        const syncDiary = () => {
            void fetchEntries();
            void fetchSummary();
        };
        window.addEventListener(FOOD_DIARY_UPDATED_EVENT, syncDiary);
        return () => window.removeEventListener(FOOD_DIARY_UPDATED_EVENT, syncDiary);
    }, [userId, fetchEntries, fetchSummary]);

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
                foods: analysis.foods.map((item: FoodItem) => ({
                    dish_name: item.name,
                    matched_name: item.name,
                    source: item.source || "food",
                    fs_food_id: item.fs_food_id || undefined,
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

            setEntries((prev) => [data, ...prev]);
            setSummaryEntries((prev) => [data, ...prev]);
            window.dispatchEvent(new Event(FOOD_DIARY_UPDATED_EVENT));
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
            setEntries((prev) => prev.filter((e) => e.id !== entryId));
            setSummaryEntries((prev) => prev.filter((e) => e.id !== entryId));
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
            const update = (arr: FoodDiaryEntry[]) =>
                arr.map((e) => (e.id === entryId ? { ...e, notes } : e));
            setEntries(update);
            setSummaryEntries(update);
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
            source?: "recipe" | "food" | "store_menu";
            recipe_id?: string;
            food_id?: string;
            store_id?: string;
            store_name?: string;
            menu_item_id?: string;
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
                    source: item.source || "food",
                    nutrition: {
                        calories: item.calories,
                        protein: item.protein,
                        carbs: item.carbs,
                        fat: item.fat,
                        fiber: item.fiber,
                    },
                    ...(item.recipe_id ? { recipe_id: item.recipe_id } : {}),
                    ...(item.food_id ? { food_id: item.food_id } : {}),
                    ...(item.store_id ? { store_id: item.store_id } : {}),
                    ...(item.store_name ? { store_name: item.store_name } : {}),
                    ...(item.menu_item_id ? { menu_item_id: item.menu_item_id } : {}),
                })),
                totals: data.totals,
                vitamins: [],
                health_tips: [],
                meal_type: data.mealType,
                health_score: 0,
                image_url: null,
                notes: data.notes || null,
            });

            setEntries((prev) => [entry, ...prev]);
            setSummaryEntries((prev) => [entry, ...prev]);
            window.dispatchEvent(new Event(FOOD_DIARY_UPDATED_EVENT));
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
        return summaryEntries.filter((entry) => entry.scanned_at.split("T")[0] === dateStr);
    };

    // Always computed from summaryEntries so Index.tsx gets correct value
    const getTodaysTotals = () => {
        const today = new Date();
        const todayEntries = summaryEntries.filter((e) =>
            isSameDay(parseISO(e.scanned_at), today),
        );
        return todayEntries.reduce(
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
        entries,           // current viewed date's entries only
        summaryEntries,    // last 30 days — for charts, streak, calendar
        loading,
        summaryLoading,
        addEntry,
        addManualEntry,
        deleteEntry,
        updateEntryNotes,
        getEntriesByDate,
        getTodaysTotals,
        refetch: fetchEntries,
        refetchSummary: fetchSummary,
    };
};
