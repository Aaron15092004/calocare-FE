import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { CalorieProgress } from "@/components/CalorieProgress";
import { NutritionRing } from "@/components/NutritionRing";
import { MealPlanCard } from "@/components/MealPlanCard";
import { OnboardingTour } from "@/components/OnboardingTour";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { FoodScanner } from "@/components/FoodScanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    ArrowRight,
    Calendar,
    ScanLine,
    Heart,
    UtensilsCrossed,
    BookOpen,
    MapPin,
    Plus,
    TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { getGreeting } from "@/utils/greetings";
import { useAuthContext } from "@/contexts/AuthContext";
import { useFoodDiary } from "@/hooks/useFoodDiary";
import api from "@/lib/api";

// Quick action items shown on the home page
const QuickActions = ({ onBarcode }: { onBarcode: () => void }) => {
    const navigate = useNavigate();

    const actions = [
        {
            icon: ScanLine,
            label: "Mã vạch",
            sublabel: "Tra cứu sản phẩm",
            color: "bg-blue-500/10 text-blue-600",
            onClick: onBarcode,
        },
        {
            icon: BookOpen,
            label: "Nhật ký",
            sublabel: "Ghi bữa ăn",
            color: "bg-orange-500/10 text-orange-600",
            onClick: () => navigate("/diary"),
        },
        {
            icon: Heart,
            label: "Yêu thích",
            sublabel: "Đã lưu",
            color: "bg-red-500/10 text-red-500",
            onClick: () => navigate("/favorites"),
        },
        {
            icon: Calendar,
            label: "Thực đơn",
            sublabel: "Kế hoạch ăn",
            color: "bg-purple-500/10 text-purple-600",
            onClick: () => navigate("/meal-plan"),
        },
        {
            icon: UtensilsCrossed,
            label: "Công thức",
            sublabel: "Của tôi",
            color: "bg-emerald-500/10 text-emerald-600",
            onClick: () => navigate("/my-recipes"),
        },
        {
            icon: MapPin,
            label: "Quán ăn",
            sublabel: "Gần đây",
            color: "bg-amber-500/10 text-amber-600",
            onClick: () => navigate("/nearby"),
        },
        {
            icon: TrendingUp,
            label: "Cộng đồng",
            sublabel: "Thực đơn cộng đồng",
            color: "bg-cyan-500/10 text-cyan-600",
            onClick: () => navigate("/community-plans"),
        },
    ];

    return (
        <section>
            <h3 className="text-base font-bold text-foreground mb-3">Tính năng</h3>
            <div className="grid grid-cols-4 gap-2.5">
                {actions.map((action) => (
                    <button
                        key={action.label}
                        type="button"
                        onClick={action.onClick}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:bg-primary/5 active:scale-95 transition-all duration-150 shadow-sm"
                    >
                        <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color}`}
                        >
                            <action.icon className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-semibold text-foreground leading-tight text-center">
                            {action.label}
                        </span>
                        <span className="text-[9px] text-muted-foreground leading-tight text-center hidden sm:block">
                            {action.sublabel}
                        </span>
                    </button>
                ))}
            </div>
        </section>
    );
};

const Index = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { profile, user } = useAuthContext();
    const greeting = getGreeting(profile?.display_name);
    const GreetingIcon = greeting.icon;
    const { getTodaysTotals } = useFoodDiary(user?.id);
    const todaysTotals = getTodaysTotals();

    const [planItems, setPlanItems] = useState<any[]>([]);
    const [showBarcode, setShowBarcode] = useState(false);

    useEffect(() => {
        if (profile?.id) {
            fetchActivePlan();
        }
    }, [profile?.id]);

    const fetchActivePlan = async () => {
        const mealTime: Record<string, string> = {
            breakfast: "7:00",
            lunch: "12:30",
            dinner: "19:00",
            snack: "15:30",
        };
        try {
            const { data: plans } = await api.get("/user-meal-plans", {
                params: { is_active: true },
            });
            const userPlan = plans?.[0];
            if (!userPlan) return;

            const startDate = userPlan.start_date
                ? new Date(userPlan.start_date)
                : new Date(userPlan.created_at);
            const diffDays =
                Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) +
                1;
            const totalDays = userPlan.meal_plan_id?.total_days || 7;
            const currentDay = Math.max(1, Math.min(diffDays, totalDays));

            const { data: items } = await api.get(`/user-meal-plans/${userPlan._id}/items`);
            setPlanItems(
                (items || [])
                    .filter((item: any) => item.day_number === currentDay)
                    .map((item: any) => ({
                        day: item.day_number,
                        mealType: item.meal_type,
                        title:
                            item.recipe_id?.name_vi || item.food_id?.name_vi || "Unknown",
                        calories: Math.round(
                            (item.recipe_id?.calories || item.food_id?.energy_kcal || 0) *
                                (item.serving_size || 1),
                        ),
                        time: mealTime[item.meal_type] || "—",
                        isToday: true,
                    })),
            );
        } catch (err) {
            console.error("fetchActivePlan error:", err);
        }
    };

    const goals = profile?.daily_nutrition_goals;
    const calorieGoal = goals?.calories || 2000;
    const caloriePercent = Math.min(100, Math.round((todaysTotals.calories / calorieGoal) * 100));

    return (
        <div className="min-h-screen gradient-fresh pb-24">
            <Header />

            {/* Onboarding tour for first-time users */}
            <OnboardingTour />

            {/* Barcode scanner overlay */}
            {showBarcode && <BarcodeScanner onClose={() => setShowBarcode(false)} />}

            <main className="container px-4 py-5 space-y-5">
                {/* Greeting — compact */}
                <section className="animate-slide-up flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <GreetingIcon className={`w-5 h-5 ${greeting.iconColor}`} />
                            <h2 className="text-lg font-bold text-foreground">{greeting.title}</h2>
                        </div>
                        <p className="text-xs text-muted-foreground ml-7">{greeting.subtitle}</p>
                    </div>
                    {/* Calorie pill summary */}
                    <div className="flex items-center gap-1.5 bg-card border border-border/50 rounded-full px-3 py-1.5 shadow-sm">
                        <svg className="w-4 h-4" viewBox="0 0 16 16">
                            <circle cx="8" cy="8" r="6" fill="none" strokeWidth="2.5" className="stroke-primary/20" />
                            <circle
                                cx="8" cy="8" r="6" fill="none" strokeWidth="2.5"
                                className="stroke-primary"
                                strokeDasharray={`${caloriePercent * 0.377} 37.7`}
                                strokeLinecap="round"
                                transform="rotate(-90 8 8)"
                            />
                        </svg>
                        <span className="text-xs font-semibold text-foreground">
                            {Math.round(todaysTotals.calories)}
                        </span>
                        <span className="text-xs text-muted-foreground">/ {calorieGoal}</span>
                    </div>
                </section>

                {/* Calorie progress — compact card */}
                <Card variant="gradient" className="animate-slide-up-delay-1">
                    <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-muted-foreground">
                                {t("home.todayProgress")}
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-primary h-7 px-2 text-xs"
                                onClick={() => navigate("/diary")}
                            >
                                {t("home.viewDetails")}{" "}
                                <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <CalorieProgress
                            consumed={Math.round(todaysTotals.calories)}
                            goal={calorieGoal}
                            burned={0}
                        />
                    </CardContent>
                </Card>

                {/* Macros — compact row */}
                <section className="animate-slide-up-delay-2">
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            {
                                value: todaysTotals.protein,
                                max: goals?.protein || 120,
                                color: "hsl(200, 80%, 50%)",
                                label: t("home.protein"),
                            },
                            {
                                value: todaysTotals.carbs,
                                max: goals?.carbs || 250,
                                color: "hsl(45, 95%, 55%)",
                                label: t("home.carbs"),
                            },
                            {
                                value: todaysTotals.fat,
                                max: goals?.fat || 65,
                                color: "hsl(340, 75%, 55%)",
                                label: t("home.fat"),
                            },
                            {
                                value: todaysTotals.fiber,
                                max: goals?.fiber || 25,
                                color: "hsl(280, 70%, 55%)",
                                label: t("home.fiber"),
                            },
                        ].map((ring) => (
                            <Card key={ring.label} variant="nutrition" className="p-3">
                                <NutritionRing {...ring} size={72} strokeWidth={7} unit="g" />
                            </Card>
                        ))}
                    </div>
                </section>

                {/* AI Food Scanner — prominent feature */}
                <section className="animate-slide-up-delay-3">
                    <h3 className="text-base font-bold text-foreground mb-3">AI Food Scanner</h3>
                    <FoodScanner />
                </section>

                {/* Quick Actions */}
                <section className="animate-slide-up-delay-3">
                    <QuickActions onBarcode={() => setShowBarcode(true)} />
                </section>

                {/* Today's Meal Plan */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            <h3 className="text-base font-bold text-foreground">
                                {t("home.mealPlan")}
                            </h3>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary h-7 px-2 text-xs"
                            onClick={() => navigate("/meal-plan")}
                        >
                            {t("home.seeAll")} <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                    </div>

                    {planItems.length > 0 ? (
                        <div className="space-y-2">
                            {planItems.slice(0, 3).map((meal, index) => (
                                <MealPlanCard key={index} {...meal} />
                            ))}
                            {planItems.length > 3 && (
                                <button
                                    type="button"
                                    className="w-full text-xs text-primary text-center py-2 hover:underline"
                                    onClick={() => navigate("/meal-plan")}
                                >
                                    +{planItems.length - 3} bữa nữa hôm nay
                                </button>
                            )}
                        </div>
                    ) : (
                        <Card className="border-dashed">
                            <CardContent className="p-5 text-center">
                                <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground mb-3">
                                    {t("home.noPlanYet", "Chưa có thực đơn hôm nay")}
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate("/community-plans")}
                                >
                                    <Plus className="w-3 h-3 mr-1" />
                                    {t("home.browsePlans", "Chọn thực đơn")}
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </section>
            </main>

            <BottomNav />
        </div>
    );
};

export default Index;
