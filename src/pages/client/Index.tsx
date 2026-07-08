import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
    PenLine,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { getGreeting } from "@/utils/greetings";
import { useAuthContext } from "@/contexts/AuthContext";
import { useFoodDiary } from "@/hooks/useFoodDiary";
import { useActiveMealPlan } from "@/hooks/useMealPlanQueries";
import { computeCurrentDay, getItemCalories, getItemDisplayName } from "@/types/mealPlan";
import { AdBanner } from "@/components/AdBanner";
import { HomeBannerCarousel } from "@/components/HomeBannerCarousel";
import { MealPlanRecoveryBanner } from "@/components/MealPlanRecoveryBanner";
import { AdSenseUnit } from "@/components/AdSenseUnit";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Crown, Zap, X, Sparkles, ChevronRight } from "lucide-react";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

interface HomeMealPlanItem {
    day: number;
    mealType: MealType;
    title: string;
    calories: number;
    time: string;
    image?: string;
    isToday: boolean;
    planId?: string;
}

const isMealType = (value: string): value is MealType =>
    ["breakfast", "lunch", "dinner", "snack"].includes(value);

const MEAL_TIME: Record<MealType, string> = {
    breakfast: "7:00",
    lunch: "12:30",
    dinner: "19:00",
    snack: "15:30",
};

// Quick action items shown on the home page
const QuickActions = ({ onBarcode }: { onBarcode: () => void }) => {
    const navigate = useNavigate();

    const actions = [
        {
            icon: ScanLine,
            label: "Mã vạch",
            sublabel: "Tra cứu sản phẩm",
            iconClass: "w-6 h-6 text-primary",
            onClick: onBarcode,
        },
        {
            icon: PenLine,
            label: "Ghi bữa ăn",
            sublabel: "Thêm bữa ăn",
            iconClass: "w-6 h-6 text-primary",
            onClick: () => navigate("/diary?action=log"),
        },
        {
            icon: BookOpen,
            label: "Nhật ký",
            sublabel: "Xem lịch sử",
            iconClass: "w-6 h-6 text-primary",
            onClick: () => navigate("/diary"),
        },
        {
            icon: Heart,
            label: "Yêu thích",
            sublabel: "Đã lưu",
            iconClass: "w-6 h-6 text-muted-foreground",
            onClick: () => navigate("/favorites"),
        },
        {
            icon: Calendar,
            label: "Thực đơn",
            sublabel: "Kế hoạch ăn",
            iconClass: "w-6 h-6 text-primary",
            onClick: () => navigate("/meal-plan"),
        },
        {
            icon: UtensilsCrossed,
            label: "Công thức",
            sublabel: "Của tôi",
            iconClass: "w-6 h-6 text-primary",
            onClick: () => navigate("/my-recipes"),
        },
        {
            icon: MapPin,
            label: "Quán ăn",
            sublabel: "Gần đây",
            iconClass: "w-6 h-6 text-muted-foreground",
            onClick: () => navigate("/nearby"),
        },
        {
            icon: TrendingUp,
            label: "Cộng đồng",
            sublabel: "Thực đơn cộng đồng",
            iconClass: "w-6 h-6 text-muted-foreground",
            onClick: () => navigate("/community-plans"),
        },
    ];

    return (
        <section>
            <h3 className="section-header text-foreground mb-3">Tính năng</h3>
            <div className="grid grid-cols-4 gap-2.5">
                {actions.map((action) => (
                    <button
                        key={action.label}
                        type="button"
                        onClick={action.onClick}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card hover:bg-primary/5 active:scale-95 transition-all duration-150 shadow-ios-sm"
                    >
                        <action.icon className={action.iconClass} />
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
    const { getTodaysTotals, refetchSummary } = useFoodDiary(user?.id);
    const todaysTotals = getTodaysTotals();
    const location = useLocation();
    const locationState = location.state as { openBarcode?: boolean } | null;

    const [showBarcode, setShowBarcode] = useState(false);
    const [showPostScanAd, setShowPostScanAd] = useState(false);

    const handleScanComplete = () => {
        if (sessionStorage.getItem("post_scan_ad_shown") !== "1") {
            setShowPostScanAd(true);
        }
    };

    // Same query cache + calorie/name/current-day helpers as the plan page —
    // Home can no longer drift out of sync after activating a new plan.
    const { data: activePlanData } = useActiveMealPlan(Boolean(profile?.id));
    const planItems = useMemo<HomeMealPlanItem[]>(() => {
        const plan = activePlanData?.plan;
        if (!plan) return [];
        const totalDays = plan.meal_plan_id?.total_days || 7;
        const currentDay = computeCurrentDay(plan.start_date ?? plan.created_at, totalDays);
        return (activePlanData.items ?? [])
            .filter((item) => item.day_number === currentDay)
            .map((item) => {
                const mealType = isMealType(item.meal_type) ? item.meal_type : "snack";
                return {
                    day: item.day_number,
                    mealType,
                    title: getItemDisplayName(item),
                    calories: getItemCalories(item),
                    time: MEAL_TIME[mealType],
                    image: item.recipe_id?.image_url || item.food_id?.image_url,
                    isToday: true,
                    planId: plan._id,
                };
            });
    }, [activePlanData]);

    useEffect(() => {
        if (locationState?.openBarcode) {
            setShowBarcode(true);
            navigate("/", { replace: true, state: {} });
        }
    }, [locationState?.openBarcode, navigate]);

    const goals = profile?.daily_nutrition_goals;
    const calorieGoal = goals?.calories || 2000;
    const caloriePercent = Math.min(100, Math.round((todaysTotals.calories / calorieGoal) * 100));

    const tier = profile?.subscription_tier === "pro" ? "family" : (profile?.subscription_tier ?? "free");
    const isPremiumUser = tier === "premium" || tier === "family";
    const isFamilyUser = tier === "family";

    return (
        <div className="min-h-screen bg-background pb-nav-safe">
            <Header />

            {/* Onboarding tour for first-time users */}
            <OnboardingTour />

            {/* Barcode scanner overlay */}
            {showBarcode && <BarcodeScanner onClose={() => setShowBarcode(false)} />}

            {/* Hero gradient section — greeting + CalorieProgress */}
            <div className="gradient-hero px-5 pt-5 pb-6">
                {/* Greeting — compact */}
                <section className="animate-slide-up flex items-center justify-between mb-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <GreetingIcon className={`w-5 h-5 ${greeting.iconColor}`} />
                            <h2 className="page-title text-foreground">{greeting.title}</h2>
                        </div>
                        <p className="text-xs text-muted-foreground ml-7">{greeting.subtitle}</p>
                    </div>
                    {/* Calorie pill summary */}
                    <div className="flex items-center gap-1.5 bg-card rounded-full px-3 py-1.5 shadow-ios-sm">
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
            </div>

            <main className="container px-5 pt-4 space-y-5">
                {/* AI meal plan finished/still generating after user left the page */}
                <MealPlanRecoveryBanner />

                {/* Macros — P, C, F individual rings */}
                <section className="animate-slide-up-delay-2">
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: "Protein", value: Math.round(todaysTotals.protein), max: goals?.protein ?? 120, color: "hsl(200,80%,50%)" },
                            { label: "Carbs",   value: Math.round(todaysTotals.carbs),   max: goals?.carbs   ?? 250, color: "hsl(45,95%,55%)"  },
                            { label: "Fat",     value: Math.round(todaysTotals.fat),     max: goals?.fat     ?? 65,  color: "hsl(340,75%,55%)" },
                        ].map((ring) => (
                            <Card key={ring.label} className="p-3">
                                <NutritionRing value={ring.value} max={ring.max} color={ring.color} size={72} strokeWidth={7} label={ring.label} unit="g" />
                            </Card>
                        ))}
                    </div>
                </section>

                {/* AI Food Scanner — prominent feature */}
                <section className="animate-slide-up-delay-3">
                    <h3 className="text-base font-bold text-foreground mb-3">AI Food Scanner</h3>
                    <FoodScanner onScanComplete={handleScanComplete} onSaved={refetchSummary} />
                </section>

                {/* Quick Actions */}
                <section className="animate-slide-up-delay-3">
                    <QuickActions onBarcode={() => setShowBarcode(true)} />
                </section>

                {/* CaloVie AI spotlight — premium/pro only */}
                {isPremiumUser && (
                    <section>
                        <button
                            type="button"
                            onClick={() => navigate("/generate-meal-plan")}
                            className="w-full gradient-primary rounded-2xl p-4 text-primary-foreground flex items-center gap-4 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] transition-all duration-150"
                        >
                            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className="font-bold text-sm">CaloVie AI</p>
                                    <span className="text-[10px] font-semibold bg-white/20 px-1.5 py-0.5 rounded-full">
                                        {isFamilyUser ? "Family · 21 ngày" : "Premium · 7 ngày"}
                                    </span>
                                </div>
                                <p className="text-xs text-primary-foreground/80 leading-snug">
                                    Tạo thực đơn cá nhân hóa — có công thức & hướng dẫn nấu ăn chi tiết
                                </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-primary-foreground/60 shrink-0" />
                        </button>
                    </section>
                )}

                <section className="-mx-5 border-y border-border/60 bg-card/40 px-5 py-4">
                    <button
                        type="button"
                        onClick={() => navigate("/assistant")}
                        className="w-full text-left transition-all duration-150 active:scale-[0.99]"
                    >
                        <div className="flex items-center gap-4">
                            <div className="h-28 w-28 shrink-0 overflow-hidden">
                                <img src="/mascot-playful.png" alt="CaloVie mascot" className="h-full w-full object-cover object-top" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-3">
                                    <img src="/logo.png" alt="CaloVie" className="h-8 w-auto object-contain" />
                                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                                        Assistant
                                    </span>
                                </div>
                                <p className="mt-2 text-lg font-bold leading-tight text-foreground">
                                    Nói chuyện với Calovie về bữa ăn, quán gần bạn và kế hoạch hôm nay
                                </p>
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                    Mở màn trò chuyện riêng với mascot để hỏi nhanh, nhận gợi ý sát hồ sơ của bạn và được dẫn đường trong app.
                                </p>
                            </div>
                            <ChevronRight className="h-5 w-5 shrink-0 text-primary/60" />
                        </div>
                    </button>
                </section>

                {/* Rotating banner carousel (admin-managed + house ads) */}
                <HomeBannerCarousel />

                {/* AdSense unit — between actions and meal plan, free users only */}
                <AdSenseUnit
                    slot={import.meta.env.VITE_ADSENSE_SLOT_HOME ?? import.meta.env.VITE_ADSENSE_SLOT_INLINE ?? ""}
                    format="auto"
                    className="min-h-[100px]"
                />

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
                                <MealPlanCard
                            key={index}
                            {...meal}
                            onClick={() => navigate("/meal-plan")}
                        />
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
                    ) : isPremiumUser ? (
                        /* Premium/Pro: show AI as primary CTA */
                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => navigate("/generate-meal-plan")}
                                className="w-full gradient-primary rounded-2xl p-4 text-primary-foreground flex items-center gap-3 shadow-md shadow-primary/20 active:scale-[0.98] transition-all"
                            >
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-bold">Tạo thực đơn bằng AI</p>
                                    <p className="text-xs text-primary-foreground/80">
                                        {isFamilyUser ? "21" : "7"} ngày · cá nhân hóa · có công thức nấu ăn
                                    </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-primary-foreground/60 shrink-0" />
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate("/community-plans")}
                                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card shadow-ios-sm hover:bg-accent/50 transition-colors active:scale-[0.98]"
                            >
                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <span className="text-sm text-foreground">Thực đơn cộng đồng</span>
                                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                            </button>
                        </div>
                    ) : (
                        /* Free tier: standard empty state */
                        <Card className="border-dashed">
                            <CardContent className="p-5 text-center">
                                <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground mb-3">
                                    {t("home.noPlanYet", "Chưa có thực đơn hôm nay")}
                                </p>
                                <Button variant="outline" size="sm" onClick={() => navigate("/community-plans")}>
                                    <Plus className="w-3 h-3 mr-1" />
                                    {t("home.browsePlans", "Chọn thực đơn")}
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </section>
            </main>

            {/* Post-scan upgrade modal (free users, once per session) */}
            <Dialog
                open={showPostScanAd}
                onOpenChange={(open) => {
                    if (!open) {
                        sessionStorage.setItem("post_scan_ad_shown", "1");
                        setShowPostScanAd(false);
                    }
                }}
            >
                <DialogContent className="max-w-sm p-0 overflow-hidden rounded-3xl border-0">
                    {/* Hero gradient */}
                    <div className="relative bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-700 px-6 pt-8 pb-6 text-white overflow-hidden">
                        {/* Decorative circles */}
                        <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
                        <div className="pointer-events-none absolute -bottom-8 -left-6 w-28 h-28 rounded-full bg-white/10" />

                        <button
                            type="button"
                            aria-label="Đóng"
                            onClick={() => {
                                sessionStorage.setItem("post_scan_ad_shown", "1");
                                setShowPostScanAd(false);
                            }}
                            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>

                        <div className="relative">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 shadow-lg">
                                <Crown className="w-7 h-7 text-amber-300" />
                            </div>
                            <p className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-1">Scan thành công!</p>
                            <h3 className="text-xl font-bold leading-snug">Nâng cấp để scan<br />không giới hạn</h3>
                            <p className="text-sm text-white/75 mt-2">
                                Gói Free: <strong className="text-white">2 lần/ngày</strong> · Premium: <strong className="text-white">5 lần</strong> · Family: <strong className="text-white">không giới hạn</strong>
                            </p>
                        </div>
                    </div>

                    {/* Plan options */}
                    <div className="space-y-2.5 bg-card p-5">
                        <button
                            type="button"
                            className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border-2 border-violet-200 bg-violet-50 hover:bg-violet-100 active:scale-[0.98] transition-all text-left"
                            onClick={() => {
                                sessionStorage.setItem("post_scan_ad_shown", "1");
                                setShowPostScanAd(false);
                                navigate("/subscription");
                            }}
                        >
                            <Zap className="w-6 h-6 text-primary shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-violet-900">Premium · 59.000₫/tháng</p>
                                <p className="text-xs text-violet-600 mt-0.5">5 scan/ngày · Meal plan AI · Không quảng cáo</p>
                            </div>
                            <span className="text-violet-400 text-lg">›</span>
                        </button>

                        <button
                            type="button"
                            className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 dark:border-amber-400/30 dark:bg-amber-400/10 dark:hover:bg-amber-400/15 active:scale-[0.98] transition-all text-left"
                            onClick={() => {
                                sessionStorage.setItem("post_scan_ad_shown", "1");
                                setShowPostScanAd(false);
                                navigate("/subscription");
                            }}
                        >
                            <Crown className="w-6 h-6 text-muted-foreground shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-amber-900 dark:text-amber-100">Family · 199.000₫/tháng</p>
                                <p className="text-xs text-amber-700 dark:text-amber-200 mt-0.5">Scan không giới hạn · 5 thành viên · tư vấn chuyên gia</p>
                            </div>
                            <span className="text-amber-400 text-lg">›</span>
                        </button>

                        <Button
                            variant="ghost"
                            className="w-full text-sm text-muted-foreground h-9"
                            onClick={() => {
                                sessionStorage.setItem("post_scan_ad_shown", "1");
                                setShowPostScanAd(false);
                            }}
                        >
                            Để sau
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            <BottomNav />
        </div>
    );
};

export default Index;
