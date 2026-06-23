import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export interface MealProgress {
    id: string;
    user_id: string;
    user_meal_plan_id?: string;
    day_number: number;
    meal_type: string;
    recipe_id: string;
    completed_at: string;
    notes: string | null;
}

export const FOOD_DIARY_UPDATED_EVENT = "calovie:food-diary-updated";

function notifyDiaryUpdated() {
    window.dispatchEvent(new Event(FOOD_DIARY_UPDATED_EVENT));
}

export const useMealProgress = (
    userId: string | undefined,
    totalDays = 21,
    planId?: string,
    dayItemCounts?: Map<number, number>,
) => {
    const [progress, setProgress] = useState<MealProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchProgress = useCallback(async () => {
        if (!userId) return;
        try {
            const params: Record<string, string> = {};
            if (planId) params.user_meal_plan_id = planId;
            const { data } = await api.get<MealProgress[]>("/meal-progress", { params });
            setProgress(data || []);
        } catch (error) {
            console.error("Error fetching progress:", error);
        } finally {
            setLoading(false);
        }
    }, [userId, planId]);

    useEffect(() => {
        if (userId) {
            void fetchProgress();
        } else {
            setProgress([]);
            setLoading(false);
        }
    }, [userId, fetchProgress]);

    const toggleMealComplete = async (
        dayNumber: number,
        mealType: string,
        notes?: string,
    ) => {
        if (!userId) {
            toast({
                title: "Cần đăng nhập",
                description: "Vui lòng đăng nhập để theo dõi tiến độ.",
                variant: "destructive",
            });
            return { error: new Error("Not authenticated") };
        }

        const existing = progress.find(
            (p) => p.day_number === dayNumber && p.meal_type === mealType
                && (!planId || p.user_meal_plan_id === planId),
        );

        if (existing) {
            try {
                const progressId = existing.id || (existing as MealProgress & { _id?: string })._id;
                await api.delete(`/meal-progress/${progressId}`);
                setProgress(progress.filter((p) => p.id !== existing.id));
                notifyDiaryUpdated();
                toast({ title: "Đã bỏ đánh dấu", description: "Đã xóa bữa ăn này khỏi nhật ký." });
            } catch {
                toast({ title: "Lỗi", description: "Không thể cập nhật tiến độ.", variant: "destructive" });
                return { error: new Error("Failed") };
            }
        } else {
            if (!planId) {
                toast({
                    title: "Không tìm thấy kế hoạch",
                    description: "Vui lòng tải lại kế hoạch trước khi đánh dấu bữa ăn.",
                    variant: "destructive",
                });
                return { error: new Error("Missing meal plan") };
            }
            try {
                const { data } = await api.post<MealProgress>("/meal-progress", {
                    day_number: dayNumber,
                    meal_type: mealType,
                    user_meal_plan_id: planId,
                    ...(notes ? { notes } : {}),
                });
                const newProgress = [...progress, data];
                setProgress(newProgress);
                notifyDiaryUpdated();
                toast({ title: "Đã lưu vào nhật ký", description: "Calories và macros của cả bữa đã được cập nhật." });

                // Day completion notification
                if (dayItemCounts) {
                    const dayTotal = dayItemCounts.get(dayNumber) ?? 0;
                    const dayDone = newProgress.filter((p) => p.day_number === dayNumber).length;
                    if (dayTotal > 0 && dayDone >= dayTotal) {
                        setTimeout(() => {
                            toast({ title: `Ngày ${dayNumber} hoàn thành!`, description: "Tuyệt vời! Bạn đã hoàn thành tất cả bữa ăn hôm nay." });
                        }, 1200);
                    }

                    // Plan completion notification
                    const totalPlan = [...dayItemCounts.values()].reduce((a, b) => a + b, 0);
                    if (totalPlan > 0 && newProgress.length >= totalPlan) {
                        setTimeout(() => {
                            toast({ title: "Chúc mừng! Hoàn thành kế hoạch!", description: "Bạn đã hoàn thành toàn bộ thực đơn. Xuất sắc!" });
                        }, 2500);
                    }
                }
            } catch {
                toast({ title: "Lỗi", description: "Không thể lưu tiến độ.", variant: "destructive" });
                return { error: new Error("Failed") };
            }
        }

        return { error: null };
    };

    const isMealCompleted = (dayNumber: number, mealType: string) =>
        progress.some((p) => p.day_number === dayNumber && p.meal_type === mealType
            && (!planId || p.user_meal_plan_id === planId));

    const getDayProgress = (dayNumber: number) => {
        const dayMeals = progress.filter((p) => p.day_number === dayNumber && (!planId || p.user_meal_plan_id === planId));
        const total = dayItemCounts?.get(dayNumber) ?? 4;
        return {
            completed: dayMeals.length,
            total,
            percentage: Math.round((dayMeals.length / Math.max(total, 1)) * 100),
        };
    };

    const getOverallProgress = () => {
        const totalMeals = dayItemCounts
            ? [...dayItemCounts.values()].reduce((a, b) => a + b, 0)
            : totalDays * 4;
        return {
            completed: progress.length,
            total: totalMeals,
            percentage: Math.round((progress.length / Math.max(totalMeals, 1)) * 100),
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
