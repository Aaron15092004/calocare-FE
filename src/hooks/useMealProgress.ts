import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export interface MealProgress {
    id: string;
    user_id: string;
    day_number: number;
    meal_type: string;
    recipe_id: string;
    completed_at: string;
    notes: string | null;
}

export const useMealProgress = (userId: string | undefined, totalDays = 21) => {
    const [progress, setProgress] = useState<MealProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        if (userId) {
            fetchProgress();
        } else {
            setProgress([]);
            setLoading(false);
        }
    }, [userId]);

    const fetchProgress = async () => {
        if (!userId) return;
        try {
            const { data } = await api.get<MealProgress[]>("/meal-progress");
            setProgress(data || []);
        } catch (error) {
            console.error("Error fetching progress:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleMealComplete = async (
        dayNumber: number,
        mealType: string,
        recipeId: string,
        diaryData?: { name: string; calories: number },
    ) => {
        if (!userId) {
            toast({
                title: "Sign in required",
                description: "Please sign in to track your progress.",
                variant: "destructive",
            });
            return { error: new Error("Not authenticated") };
        }

        const existing = progress.find(
            (p) => p.day_number === dayNumber && p.meal_type === mealType,
        );

        if (existing) {
            try {
                await api.delete(`/meal-progress/${existing.id}`);
                setProgress(progress.filter((p) => p.id !== existing.id));
                toast({ title: "Meal unmarked", description: "Removed from completed meals." });
            } catch {
                toast({ title: "Error", description: "Could not update progress.", variant: "destructive" });
                return { error: new Error("Failed") };
            }
        } else {
            try {
                const { data } = await api.post<MealProgress>("/meal-progress", {
                    day_number: dayNumber,
                    meal_type: mealType,
                    recipe_id: recipeId,
                });
                setProgress([...progress, data]);

                // Save to food diary
                if (diaryData) {
                    try {
                        await api.post("/food-diary", {
                            meal_type: mealType,
                            source: "meal_plan",
                            foods: [{
                                dish_name: diaryData.name,
                                nutrition: {
                                    calories: Math.round(diaryData.calories),
                                    protein: 0,
                                    carbs: 0,
                                    fat: 0,
                                    fiber: 0,
                                },
                            }],
                        });
                        toast({ title: "Đã lưu vào nhật ký", description: `${diaryData.name} · ${Math.round(diaryData.calories)} kcal` });
                    } catch {
                        toast({ title: "Hoàn thành bữa ăn", description: "Tiếp tục duy trì nhé!" });
                    }
                } else {
                    toast({ title: "Hoàn thành bữa ăn", description: "Tiếp tục duy trì nhé!" });
                }
            } catch {
                toast({ title: "Error", description: "Could not save progress.", variant: "destructive" });
                return { error: new Error("Failed") };
            }
        }

        return { error: null };
    };

    const isMealCompleted = (dayNumber: number, mealType: string) =>
        progress.some((p) => p.day_number === dayNumber && p.meal_type === mealType);

    const getDayProgress = (dayNumber: number) => {
        const dayMeals = progress.filter((p) => p.day_number === dayNumber);
        return {
            completed: dayMeals.length,
            total: 4,
            percentage: Math.round((dayMeals.length / 4) * 100),
        };
    };

    const getOverallProgress = () => {
        const totalMeals = totalDays * 4;
        return {
            completed: progress.length,
            total: totalMeals,
            percentage: Math.round((progress.length / totalMeals) * 100),
            daysCompleted: new Set(progress.map((p) => p.day_number)).size,
        };
    };

    return {
        progress,
        loading,
        toggleMealComplete,
        isMealCompleted,
        getDayProgress,
        getOverallProgress,
        refetch: fetchProgress,
    };
};