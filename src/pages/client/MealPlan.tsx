import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Flame, Target, Plus, Users, BookOpen, Sparkles, Crown, Zap, ChevronRight, UserCircle2, BarChart2, RefreshCw, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DayPlanSection } from "@/components/DayPlanSection";
import { useAuthContext } from "@/contexts/AuthContext";
import { useMealProgress } from "@/hooks/useMealProgress";
import { BottomNav } from "@/components/BottomNav";
import api from "@/lib/api";
import {
    UserMealPlanAPI,
    MealPlanItemAPI,
    DayPlanFromAPI,
    groupItemsByDay,
} from "@/types/mealPlan";

// ── Module-level SWR cache (survives React re-mounts, cleared on plan change) ──
interface PlanCache {
    userId: string;
    plan: UserMealPlanAPI;
    items: MealPlanItemAPI[];
    at: number;
}
let _planCache: PlanCache | null = null;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes — background refresh threshold

export function invalidateMealPlanCache() {
    _planCache = null;
}

const MealPlan: React.FC = () => {
    const navigate = useNavigate();
    const { user, profile } = useAuthContext();

    const [activePlan, setActivePlan] = useState<UserMealPlanAPI | null>(null);
    const [dayPlans, setDayPlans] = useState<DayPlanFromAPI[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedWeek, setSelectedWeek] = useState<string>("all");
    const [mainTab, setMainTab] = useState<"plan" | "ai">("plan");

    const isPremium = profile?.subscription_tier === "premium" || profile?.subscription_tier === "pro";
    const isPro = profile?.subscription_tier === "pro";

    const totalDays = activePlan?.meal_plan_id?.total_days ?? 0;

    const dayItemCounts = useMemo(() => {
        const counts = new Map<number, number>();
        dayPlans.forEach((dp) => counts.set(dp.day, dp.items.length));
        return counts;
    }, [dayPlans]);

    const {
        isMealCompleted,
        toggleMealComplete,
        getOverallProgress,
    } = useMealProgress(user?.id, totalDays, activePlan?._id, dayItemCounts);

    useEffect(() => {
        fetchActivePlan();
    }, [user]);

    const applyPlanData = (plan: UserMealPlanAPI, items: MealPlanItemAPI[]) => {
        setActivePlan(plan);
        setDayPlans(groupItemsByDay(items, plan.meal_plan_id.total_days));
    };

    const fetchActivePlan = async (background = false) => {
        if (!user) {
            setLoading(false);
            return;
        }

        // Show cached data immediately (stale-while-revalidate)
        const cached = _planCache;
        if (cached && cached.userId === user.id) {
            applyPlanData(cached.plan, cached.items);
            setLoading(false);
            // If cache is fresh enough, skip background refetch
            if (Date.now() - cached.at < CACHE_TTL) return;
            background = true;
        }

        try {
            const { data } = await api.get<{ plan: UserMealPlanAPI | null; items: MealPlanItemAPI[] }>(
                "/user-meal-plans/active-with-items",
            );
            if (data.plan) {
                _planCache = { userId: user.id, plan: data.plan, items: data.items, at: Date.now() };
                applyPlanData(data.plan, data.items);
            } else {
                _planCache = null;
                setActivePlan(null);
                setDayPlans([]);
            }
        } catch (err) {
            console.error("Error fetching active plan:", err);
        } finally {
            if (!background) setLoading(false);
        }
    };

    const overallProgress = getOverallProgress();
    const currentDay = Math.min(overallProgress.daysCompleted + 1, totalDays || 1);

    const getWeekDays = (week: string): DayPlanFromAPI[] => {
        switch (week) {
            case "1": return dayPlans.filter((d) => d.day >= 1 && d.day <= 7);
            case "2": return dayPlans.filter((d) => d.day >= 8 && d.day <= 14);
            case "3": return dayPlans.filter((d) => d.day >= 15 && d.day <= 21);
            default: return dayPlans;
        }
    };

    const displayDays = getWeekDays(selectedWeek);
    const avgCalories = displayDays.length
        ? Math.round(displayDays.reduce((s, d) => s + d.totalCalories, 0) / displayDays.length)
        : 0;

    const handleToggleMeal = async (
        dayNumber: number,
        mealType: string,
        itemId: string,
        diaryData?: { name: string; calories: number; protein?: number; carbs?: number; fat?: number; fiber?: number; notes?: string },
    ) => {
        await toggleMealComplete(dayNumber, mealType, itemId, diaryData);
    };

    if (loading) {
        return (
            <div className="min-h-screen gradient-fresh flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    // No active plan state
    if (!activePlan) {
        return (
            <div className="min-h-screen gradient-fresh pb-nav-safe">
                <header className="sticky top-0 z-50 glass border-b border-border/50">
                    <div className="container px-5 py-4 flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-xl">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <h1 className="page-title text-foreground">Kế hoạch</h1>
                    </div>
                </header>

                <main className="container px-5 py-6 space-y-4 max-w-lg mx-auto">
                    {isPremium ? (
                        <>
                            {/* AI hero — visible immediately, no tabs */}
                            <button
                                type="button"
                                onClick={() => navigate("/generate-meal-plan")}
                                className="w-full gradient-primary rounded-2xl p-5 text-primary-foreground shadow-lg shadow-primary/25 active:scale-[0.98] transition-all duration-150 text-left"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                                        <Sparkles className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-base">CaloCare AI</p>
                                        <p className="text-xs text-primary-foreground/75">
                                            {isPro ? "Pro · 21 ngày" : "Premium · 7 ngày"} · Cá nhân hóa
                                        </p>
                                    </div>
                                </div>
                                <p className="text-sm text-primary-foreground/85 leading-relaxed mb-4">
                                    AI tạo thực đơn {isPro ? "21" : "7"} ngày dựa trên hồ sơ sức khỏe của bạn — kèm công thức nấu ăn, nguyên liệu và calo từng bữa.
                                </p>
                                <div className="flex items-center justify-between">
                                    <div className="flex gap-3 text-xs text-primary-foreground/70">
                                        <span className="flex items-center gap-1">
                                            <BookOpen className="w-3 h-3" />Công thức chi tiết
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <BarChart2 className="w-3 h-3" />Cân bằng dinh dưỡng
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-sm font-semibold bg-white/20 px-3 py-1.5 rounded-xl">
                                        Tạo ngay <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </button>

                            {/* Secondary options */}
                            <div className="relative flex items-center gap-3">
                                <div className="flex-1 h-px bg-border" />
                                <span className="text-xs text-muted-foreground">hoặc chọn thủ công</span>
                                <div className="flex-1 h-px bg-border" />
                            </div>

                            <div className="flex flex-col gap-2">
                                <Button variant="outline" onClick={() => navigate("/community-plans")} className="gap-2 h-11">
                                    <Users className="w-4 h-4" />
                                    Thực đơn cộng đồng
                                </Button>
                                <Button variant="outline" onClick={() => navigate("/my-meal-plans")} className="gap-2 h-11">
                                    <Plus className="w-4 h-4" />
                                    Tạo thực đơn cá nhân
                                </Button>
                            </div>

                            {!isPro && (
                                <button
                                    type="button"
                                    onClick={() => navigate("/subscription")}
                                    className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-amber-200 bg-amber-50"
                                >
                                    <Zap className="w-5 h-5 text-amber-500 shrink-0" />
                                    <div className="flex-1 text-left">
                                        <p className="text-xs font-semibold text-amber-700">Nâng Pro → thực đơn 21 ngày</p>
                                        <p className="text-xs text-amber-600">Hiện tại: 7 ngày với Premium</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-amber-400" />
                                </button>
                            )}
                        </>
                    ) : (
                        /* Free tier */
                        <div className="flex flex-col gap-4 pt-2">
                            {/* Locked AI card */}
                            <div className="relative rounded-2xl overflow-hidden">
                                <div className="w-full gradient-primary rounded-2xl p-5 text-primary-foreground opacity-40 select-none pointer-events-none">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                            <Sparkles className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-base">CaloCare AI</p>
                                            <p className="text-xs">Premium · 7 ngày · Cá nhân hóa</p>
                                        </div>
                                    </div>
                                    <p className="text-sm leading-relaxed">
                                        Tạo thực đơn cá nhân hóa với công thức nấu ăn, nguyên liệu và calo từng bữa.
                                    </p>
                                </div>
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/60 rounded-2xl backdrop-blur-[2px]">
                                    <Crown className="w-8 h-8 text-amber-500" />
                                    <p className="font-semibold text-sm text-foreground">Tính năng Premium</p>
                                    <Button
                                        size="sm"
                                        onClick={() => navigate("/subscription")}
                                        className="bg-amber-500 hover:bg-amber-400 text-white gap-1.5 shadow-md"
                                    >
                                        <Zap className="w-3.5 h-3.5" /> Nâng cấp để mở khóa
                                    </Button>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="relative flex items-center gap-3">
                                <div className="flex-1 h-px bg-border" />
                                <span className="text-xs text-muted-foreground">hoặc chọn thủ công</span>
                                <div className="flex-1 h-px bg-border" />
                            </div>

                            <Button onClick={() => navigate("/community-plans")} className="gap-2">
                                <Users className="w-4 h-4" />Thực đơn cộng đồng
                            </Button>
                            <Button variant="outline" onClick={() => navigate("/my-meal-plans")} className="gap-2">
                                <Plus className="w-4 h-4" />Tạo thực đơn cá nhân
                            </Button>
                        </div>
                    )}
                </main>
                <BottomNav />
            </div>
        );
    }

    const planInfo = activePlan.meal_plan_id;

    // meal_plan_id can be null if the referenced plan was deleted — treat as no plan
    if (!planInfo) return null;

    const weekLabels: Record<string, string> = { "1": "Tuần 1", "2": "Tuần 2", "3": "Tuần 3", all: "Tất cả" };

    return (
        <div className="min-h-screen gradient-fresh pb-nav-safe">
            {/* Header */}
            <header className="sticky top-0 z-50 glass border-b border-border/50">
                <div className="container px-5 py-3 flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-xl shrink-0">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h1 className="page-title text-foreground truncate">{planInfo.title}</h1>
                        <p className="text-xs text-muted-foreground">
                            {planInfo.total_days} ngày
                            {planInfo.goal_type && ` · ${planInfo.goal_type.replace(/_/g, " ")}`}
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-xl shrink-0"
                        onClick={() => navigate("/my-meal-plans")} title="Thực đơn của tôi">
                        <BookOpen className="w-5 h-5" />
                    </Button>
                    {isPremium && (
                        <button
                            type="button"
                            onClick={() => setMainTab(mainTab === "ai" ? "plan" : "ai")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                                mainTab === "ai"
                                    ? "gradient-primary text-primary-foreground shadow-md shadow-primary/30"
                                    : "bg-primary/10 text-primary hover:bg-primary/20"
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            {mainTab === "ai" ? "Thực đơn" : "AI"}
                        </button>
                    )}
                </div>
            </header>

            {mainTab === "ai" && isPremium ? (
                <main className="container px-5 py-5 space-y-4 max-w-lg mx-auto">
                    <div className="rounded-2xl gradient-primary p-5 text-primary-foreground shadow-md shadow-primary/20">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="font-bold text-base">CaloCare AI</p>
                                <p className="text-xs text-primary-foreground/75">Thực đơn cá nhân hóa</p>
                            </div>
                        </div>
                        <p className="text-sm text-primary-foreground/85 leading-relaxed mb-4">
                            Tạo thực đơn {isPro ? "21" : "7"} ngày mới hoàn toàn cá nhân hóa — kèm công thức nấu ăn, nguyên liệu và calo từng bữa.
                        </p>
                        <Button
                            className="w-full bg-white text-primary hover:bg-white/90 gap-2"
                            onClick={() => navigate("/generate-meal-plan")}
                        >
                            <Sparkles className="w-4 h-4" />
                            Tạo thực đơn {isPro ? "21" : "7"} ngày mới
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {[
                            { Icon: Target,   title: "Cá nhân hóa 100%",    desc: "Dựa trên hồ sơ sức khỏe và mục tiêu của bạn",                      color: "text-primary" },
                            { Icon: BookOpen, title: "Công thức chi tiết",   desc: "Hướng dẫn nấu ăn từng bước, danh sách nguyên liệu với calo",       color: "text-blue-500" },
                            { Icon: BarChart2, title: "Cân bằng dinh dưỡng", desc: "Protein, carbs, fat tính chính xác cho mục tiêu của bạn",          color: "text-orange-500" },
                        ].map((f) => (
                            <div key={f.title} className="flex gap-3 p-3 rounded-xl bg-card border border-border/50">
                                <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
                                    <f.Icon className={`w-4 h-4 ${f.color}`} />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">{f.title}</p>
                                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {!isPro && (
                        <button
                            type="button"
                            onClick={() => navigate("/subscription")}
                            className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-amber-200 bg-amber-50"
                        >
                            <Zap className="w-5 h-5 text-amber-500 shrink-0" />
                            <div className="flex-1 text-left">
                                <p className="text-xs font-semibold text-amber-700">Nâng Pro → thực đơn 21 ngày</p>
                                <p className="text-xs text-amber-600">Hiện tại: 7 ngày với Premium</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-amber-400" />
                        </button>
                    )}
                </main>
            ) : (
            <main className="container px-5 py-6 space-y-6">
                {/* Progress Overview */}
                <Card variant="gradient" className="animate-slide-up">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-foreground">Tiến độ của bạn</h2>
                                <p className="text-sm text-muted-foreground">
                                    {overallProgress.completed} bữa đã hoàn thành
                                </p>
                            </div>
                            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                                <span className="text-2xl font-bold text-primary">
                                    {overallProgress.percentage}%
                                </span>
                            </div>
                        </div>

                        <div className="h-3 bg-accent rounded-full overflow-hidden mb-4">
                            <div
                                className="h-full gradient-primary rounded-full transition-all duration-500"
                                style={{ width: `${overallProgress.percentage.toString()}%` }}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-3 bg-accent/50 rounded-xl">
                                <div className="flex items-center justify-center gap-1 text-primary mb-1">
                                    <Target className="w-4 h-4" />
                                </div>
                                <div className="text-xl font-bold text-foreground">{planInfo.total_days}</div>
                                <div className="text-xs text-muted-foreground">Ngày</div>
                            </div>
                            <div className="text-center p-3 bg-accent/50 rounded-xl">
                                <div className="flex items-center justify-center gap-1 text-calories mb-1">
                                    <Flame className="w-4 h-4" />
                                </div>
                                <div className="text-xl font-bold text-foreground">{avgCalories}</div>
                                <div className="text-xs text-muted-foreground">Kcal/ngày</div>
                            </div>
                            <div className="text-center p-3 bg-accent/50 rounded-xl">
                                <div className="flex items-center justify-center gap-1 text-primary mb-1">
                                    <UtensilsCrossed className="w-4 h-4" />
                                </div>
                                <div className="text-xl font-bold text-foreground">{overallProgress.completed}</div>
                                <div className="text-xs text-muted-foreground">Đã ăn</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Week Filter */}
                {planInfo.total_days >= 7 && (
                    <Tabs value={selectedWeek} onValueChange={setSelectedWeek} className="animate-slide-up-delay-1">
                        <TabsList className="grid w-full grid-cols-4 h-auto p-1">
                            <TabsTrigger value="all" className="text-xs py-2">Tất cả</TabsTrigger>
                            <TabsTrigger value="1" className="text-xs py-2">Tuần 1</TabsTrigger>
                            {planInfo.total_days >= 14 && (
                                <TabsTrigger value="2" className="text-xs py-2">Tuần 2</TabsTrigger>
                            )}
                            {planInfo.total_days >= 21 && (
                                <TabsTrigger value="3" className="text-xs py-2">Tuần 3</TabsTrigger>
                            )}
                        </TabsList>
                        <div className="flex items-center gap-2 mt-4 mb-2">
                            <Badge variant="secondary" className="text-xs">
                                {weekLabels[selectedWeek] ?? "Tất cả"}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{displayDays.length} ngày</span>
                        </div>
                    </Tabs>
                )}

                {/* Day Plans */}
                {displayDays.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            Không có bữa ăn nào trong giai đoạn này.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {displayDays.map((dayPlan) => (
                            <DayPlanSection
                                key={dayPlan.day}
                                dayPlan={dayPlan}
                                isToday={dayPlan.day === currentDay}
                                isMealCompleted={isMealCompleted}
                                onToggleMeal={handleToggleMeal}
                            />
                        ))}
                    </div>
                )}

                {/* CaloCare AI card — always visible in plan tab for premium/pro */}
                {isPremium && (
                    <button
                        type="button"
                        onClick={() => navigate("/generate-meal-plan")}
                        className="w-full gradient-primary rounded-2xl p-4 text-primary-foreground flex items-center gap-3 shadow-md shadow-primary/20 active:scale-[0.98] transition-all"
                    >
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-bold">Tạo thực đơn mới với AI</p>
                            <p className="text-xs text-primary-foreground/80">
                                {isPro ? "21" : "7"} ngày · cá nhân hóa · có công thức nấu ăn
                            </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-primary-foreground/60 shrink-0" />
                    </button>
                )}

                {/* Switch plan shortcut */}
                <Card className="bg-gradient-to-br from-primary/10 to-accent">
                    <CardContent className="p-4 flex items-center gap-4">
                        <Users className="w-8 h-8 text-primary flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium">Muốn thử thực đơn khác?</p>
                            <p className="text-xs text-muted-foreground">Khám phá thực đơn cộng đồng</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => navigate("/community-plans")}>
                            Xem
                        </Button>
                    </CardContent>
                </Card>
            </main>
            )}

            <BottomNav />
        </div>
    );
};

export default MealPlan;
