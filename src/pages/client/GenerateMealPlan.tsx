import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { invalidateMealPlanCache } from "@/pages/client/MealPlan";
import {
    ArrowLeft, Sparkles, Crown, Zap, CheckCircle2, ChevronDown, ChevronUp,
    Flame, RefreshCw, Calendar, Target, Utensils, Leaf, Lock,
    User, Activity, TrendingDown, Dumbbell, Scale,
    ChefHat, ShoppingBag, Check, Loader2, MessageCircle, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSSEMealPlan, type DayPlan as SSEDayPlan, type MealItem as SSEMealItem, type MealsPerDay, type CookingStyle } from "@/hooks/useSSEMealPlan";
import { MEAL_ORDER } from "@/types/mealPlan";
import api from "@/lib/api";
import { AdSenseUnit } from "@/components/AdSenseUnit";
import { MealPlanRecoveryBanner } from "@/components/MealPlanRecoveryBanner";

/* ── Types ──────────────────────────────────────────────────────── */
type GeneratedMeal = SSEMealItem & { food_name: string };
type GeneratedDay = SSEDayPlan;

/* ── Constants ──────────────────────────────────────────────────── */
const MEAL_LABELS: Record<string, string> = {
    breakfast:       "Bữa sáng",
    morning_snack:   "Bữa phụ sáng",
    lunch:           "Bữa trưa",
    afternoon_snack: "Bữa phụ chiều",
    dinner:          "Bữa tối",
    snack:           "Bữa phụ",
};

const MEAL_BORDER: Record<string, string> = {
    breakfast: "border-l-amber-400",
    lunch:     "border-l-emerald-500",
    dinner:    "border-l-blue-500",
    snack:     "border-l-primary",
};

const GOAL_OPTIONS: { value: string; label: string; Icon: LucideIcon; color: string; desc: string }[] = [
    { value: "weight_loss",  label: "Giảm cân",           Icon: TrendingDown, color: "text-blue-500",   desc: "Thâm hụt calo an toàn" },
    { value: "muscle_gain",  label: "Tăng cơ / Tăng cân", Icon: Dumbbell,     color: "text-orange-500", desc: "Calo và protein cao hơn" },
    { value: "maintenance",  label: "Duy trì cân nặng",   Icon: Scale,        color: "text-purple-500", desc: "Cân bằng năng lượng" },
];

const DIET_OPTIONS = [
    { value: "omnivore",   label: "Đa dạng",        desc: "Cả thịt, hải sản và rau" },
    { value: "vegetarian", label: "Chay trứng/sữa",  desc: "Không thịt, có trứng và sữa" },
    { value: "vegan",      label: "Thuần chay",       desc: "Hoàn toàn từ thực vật" },
];

const MEALS_PER_DAY_OPTIONS: { value: MealsPerDay; label: string; desc: string }[] = [
    { value: 3, label: "3 bữa",  desc: "Sáng · Trưa · Tối" },
    { value: 4, label: "4 bữa",  desc: "Sáng · Trưa · Tối · Bữa phụ" },
    { value: 5, label: "5 bữa",  desc: "Sáng · Phụ sáng · Trưa · Phụ chiều · Tối" },
];

const COOKING_STYLE_OPTIONS: { value: CookingStyle; label: string; desc: string; Icon: LucideIcon }[] = [
    { value: "fresh", label: "Nấu tươi mỗi bữa",   desc: "Chế biến và ăn ngay — đơn giản, nhanh gọn",     Icon: ChefHat },
    { value: "batch", label: "Nấu một lần nhiều bữa", desc: "Nấu lớn, chia bữa — tiết kiệm thời gian",      Icon: ShoppingBag },
];

const LOADING_STEPS = [
    "Phân tích hồ sơ dinh dưỡng...",
    "Tính toán nhu cầu calo...",
    "Lên danh sách nguyên liệu...",
    "Xây dựng thực đơn cân bằng...",
    "Soạn hướng dẫn nấu ăn...",
    "Kiểm tra giá trị dinh dưỡng...",
    "Hoàn thiện thực đơn...",
];

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
    recipe:     { label: "Công thức",  color: "bg-emerald-500/10 text-emerald-600" },
    food:       { label: "Thực phẩm", color: "bg-blue-500/10 text-blue-600" },
    usda:       { label: "USDA",      color: "bg-purple-500/10 text-purple-600" },
    fatsecret:  { label: "FatSecret", color: "bg-orange-500/10 text-orange-600" },
    ai_generated: { label: "Ước tính", color: "bg-amber-500/10 text-amber-700" },
};

/* ── Meal detail modal ───────────────────────────────────────────── */
const MealDetailModal: React.FC<{
    meal: SSEMealItem | null;
    onClose: () => void;
    onAskChatbot: (prompt: string) => void;
}> = ({ meal, onClose, onAskChatbot }) => {
    if (!meal) return null;
    const totalMacroG = meal.protein + meal.carbs + meal.fat || 1;
    const src = meal.source_type ? SOURCE_LABELS[meal.source_type] : null;
    const chatbotPrompt = `Cho tôi công thức chi tiết, nguyên liệu và cách nấu đầy đủ của món: ${meal.food_name} (${meal.weight_grams}g, khoảng ${meal.calories} kcal)`;

    return (
        <Dialog open={!!meal} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-sm rounded-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-base leading-snug pr-6">{meal.food_name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{MEAL_LABELS[meal.meal_type]}</Badge>
                        <Badge variant="outline" className="text-xs">{meal.weight_grams}g</Badge>
                        {src && <Badge className={`text-xs border-0 ${src.color}`}>{src.label}</Badge>}
                    </div>

                    {/* Calorie highlight */}
                    <div className="flex items-center justify-center gap-2 bg-orange-50 rounded-xl py-3">
                        <Flame className="w-5 h-5 text-orange-400" />
                        <span className="text-2xl font-bold text-orange-500">{meal.calories}</span>
                        <span className="text-sm text-muted-foreground">kcal</span>
                    </div>

                    {/* Macro bars */}
                    <div className="space-y-2.5">
                        {[
                            { label: "Protein",  value: meal.protein, color: "bg-blue-500",  pct: Math.round((meal.protein / totalMacroG) * 100) },
                            { label: "Carbs",    value: meal.carbs,   color: "bg-amber-400", pct: Math.round((meal.carbs   / totalMacroG) * 100) },
                            { label: "Chất béo", value: meal.fat,     color: "bg-rose-400",  pct: Math.round((meal.fat     / totalMacroG) * 100) },
                        ].map((m) => (
                            <div key={m.label}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-muted-foreground">{m.label}</span>
                                    <span className="font-semibold">{m.value}g <span className="text-muted-foreground font-normal">({m.pct}%)</span></span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.pct}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Cooking steps */}
                    {meal.cooking_steps && meal.cooking_steps.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                                <ChefHat className="w-3.5 h-3.5 text-primary" /> Cách nấu cơ bản
                            </p>
                            <ol className="space-y-1.5">
                                {meal.cooking_steps.map((step, i) => (
                                    <li key={i} className="flex gap-2 text-xs text-foreground/80">
                                        <span className="shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold mt-0.5">{i + 1}</span>
                                        <span>{step}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}

                    {/* Ask chatbot link */}
                    <button
                        type="button"
                        onClick={() => { onClose(); onAskChatbot(chatbotPrompt); }}
                        className="w-full flex items-center gap-2 text-xs text-primary bg-primary/5 hover:bg-primary/10 transition-colors rounded-xl px-3 py-2.5 border border-primary/20"
                    >
                        <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                        <span className="flex-1 text-left">Muốn công thức chi tiết hơn? Hỏi CaloVie AI →</span>
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

/* ── Meal preview row (label lives in the group header, not per item) ── */
const MealPreviewCard: React.FC<{ meal: SSEMealItem; onClick: () => void }> = ({ meal, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`w-full text-left border-l-2 ${MEAL_BORDER[meal.meal_type] || "border-l-primary"} bg-muted/30 rounded-r-xl hover:bg-muted/50 transition-colors active:scale-[0.99]`}
    >
        <div className="flex items-start justify-between px-3 py-2.5">
            <div className="flex-1 min-w-0 pr-3">
                <p className="text-sm font-semibold text-foreground leading-snug">{meal.food_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{meal.weight_grams}g · nhấn để xem chi tiết</p>
            </div>
            <div className="text-right shrink-0 flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-400" />
                    <span className="text-sm font-bold text-orange-500">{meal.calories}</span>
                    <span className="text-[10px] text-muted-foreground">kcal</span>
                </div>
                <div className="flex gap-1.5 text-[10px] text-muted-foreground">
                    <span>P:{meal.protein}g</span>
                    <span>C:{meal.carbs}g</span>
                    <span>F:{meal.fat}g</span>
                </div>
            </div>
        </div>
    </button>
);

/* ── Day preview — meals grouped once per meal type like the plan page ── */
const DayPreview: React.FC<{ day: SSEDayPlan; defaultOpen?: boolean; onMealClick: (meal: SSEMealItem) => void }> = ({ day, defaultOpen = false, onMealClick }) => {
    const [open, setOpen] = useState(defaultOpen);

    const groupMap = new Map<string, SSEMealItem[]>();
    for (const meal of day.meals) {
        const bucket = groupMap.get(meal.meal_type);
        if (bucket) bucket.push(meal);
        else groupMap.set(meal.meal_type, [meal]);
    }
    const orderedTypes = [
        ...MEAL_ORDER.filter((mt) => groupMap.has(mt)),
        ...[...groupMap.keys()].filter((mt) => !MEAL_ORDER.includes(mt as typeof MEAL_ORDER[number])),
    ];

    return (
        <div className="rounded-xl overflow-hidden shadow-ios-sm">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-accent/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">{day.day_number}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Flame className="w-3 h-3 text-orange-400" />
                        <span className="font-medium text-foreground">{day.day_totals.calories} kcal</span>
                        <span>·</span>
                        <span>{day.day_totals.protein}g protein</span>
                        <span>·</span>
                        <span>{orderedTypes.length} bữa · {day.meals.length} món</span>
                    </div>
                </div>
                {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {open && (
                <div className="p-3 space-y-3 bg-muted/10">
                    {orderedTypes.map((mealType) => {
                        const meals = groupMap.get(mealType)!;
                        const groupCal = meals.reduce((s, m) => s + m.calories, 0);
                        return (
                            <div key={mealType}>
                                <div className="flex items-center gap-1.5 px-1 mb-1">
                                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                                        {MEAL_LABELS[mealType] ?? mealType}
                                    </span>
                                    <div className="flex-1" />
                                    <Flame className="w-3 h-3 text-orange-300" />
                                    <span className="text-[11px] font-medium text-muted-foreground">{groupCal} kcal</span>
                                </div>
                                <div className="space-y-1.5">
                                    {meals.map((meal, i) => (
                                        <MealPreviewCard key={`${mealType}-${i}`} meal={meal} onClick={() => onMealClick(meal)} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/* ── Main page ──────────────────────────────────────────────────── */
const GenerateMealPlan: React.FC = () => {
    const navigate = useNavigate();
    const { profile, refreshProfile } = useAuthContext();
    const { toast } = useToast();

    const tier      = profile?.subscription_tier === "pro" ? "family" : (profile?.subscription_tier ?? "free");
    const isPremium = tier === "premium" || tier === "family";
    const isPro     = tier === "family";
    const totalDays = isPro ? 21 : 7;

    const [goalType,     setGoalType]     = useState("weight_loss");
    const [dietType,     setDietType]     = useState("omnivore");
    const [mealsPerDay,  setMealsPerDay]  = useState<MealsPerDay>(3);
    const [cookingStyle, setCookingStyle] = useState<CookingStyle>("fresh");
    const [foodsToAvoid, setFoodsToAvoid] = useState("");

    // Pre-populate from profile once when data is available
    const profileLoaded = useRef(false);
    useEffect(() => {
        if (!profile || profileLoaded.current) return;
        profileLoaded.current = true;
        const p = (profile.preferences as Record<string, unknown>) ?? {};
        if (p.goal) setGoalType(p.goal as string);
        if (p.dietary_preference) setDietType(p.dietary_preference as string);
        if (Array.isArray(p.allergies) && p.allergies.length > 0) {
            setFoodsToAvoid((p.allergies as string[]).join(", "));
        }
    }, [profile]);

    const [activating, setActivating] = useState(false);
    const [confirmActivate, setConfirmActivate] = useState(false);
    const [selectedMeal, setSelectedMeal] = useState<SSEMealItem | null>(null);
    const { isGenerating, progress, days, substitutions, result, error: genError, generate, reset } = useSSEMealPlan();

    useEffect(() => {
        void refreshProfile();
    }, [refreshProfile]);

    const prefs    = (profile?.preferences as Record<string, unknown>) ?? {};
    const age      = (prefs.age as number) || null;
    const weight   = (prefs.weight_kg as number) || null;
    const height   = (prefs.height_cm as number) || null;
    const activity = (prefs.activity_level as string) || null;
    const calories = profile?.daily_nutrition_goals?.calories || null;

    const activityLabels: Record<string, string> = {
        sedentary: "Ít vận động",
        light:     "Nhẹ",
        moderate:  "Vừa phải",
        active:    "Tích cực",
        veryActive:"Rất tích cực",
    };

    const handleGenerate = () => {
        const allergies = foodsToAvoid
            .split(/[,;\n]+/)
            .map((s) => s.trim())
            .filter(Boolean);
        generate({
            duration_days: totalDays as 7 | 21,
            goal: goalType as import("@/hooks/useSSEMealPlan").GoalType,
            meals_per_day: mealsPerDay,
            cooking_style: cookingStyle,
            preferences: {
                dietary_preference: dietType !== "omnivore" ? dietType : undefined,
                allergies: allergies.length ? allergies : undefined,
                cuisine_preferences: ["vietnamese"],
            },
        });
    };

    // Show substitution notice once generation completes
    useEffect(() => {
        if (result && substitutions.length > 0) {
            toast({
                title: `${substitutions.length} món được điều chỉnh`,
                description: "Một số tên món không có trong cơ sở dữ liệu — đã được thay bằng thực phẩm tương đương.",
            });
        }
    }, [result]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleActivate = async () => {
        if (!result || activating) return;
        setActivating(true);
        try {
            await api.post(`/meal-plans/${result.meal_plan_id}/activate`);
            toast({ title: "Thực đơn đã kích hoạt!", description: "Bắt đầu hành trình ăn uống lành mạnh nhé." });
            invalidateMealPlanCache();
            navigate("/meal-plan");
        } catch {
            toast({ title: "Lỗi kích hoạt", description: "Không thể kích hoạt thực đơn, vui lòng thử lại.", variant: "destructive" });
        } finally {
            setActivating(false);
            setConfirmActivate(false);
        }
    };

    /* ── Free gate ── */
    if (!isPremium) {
        return (
            <div className="min-h-screen bg-background pb-24">
                <header className="sticky top-0 z-50 border-b border-border/30">
                    <div className="gradient-hero container px-5 py-4 flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => navigate("/meal-plan")} className="rounded-xl">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-primary-foreground" />
                            </div>
                            <h1 className="page-title">CaloVie AI</h1>
                        </div>
                    </div>
                </header>
                <main className="container px-5 py-10 flex flex-col items-center gap-6 text-center max-w-sm mx-auto">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30">
                        <Lock className="w-9 h-9 text-primary-foreground" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold mb-2">Tính năng Premium & Family</h2>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            CaloVie AI phân tích hồ sơ sức khỏe và tạo thực đơn cá nhân hóa hoàn toàn — có công thức nấu ăn chi tiết, nguyên liệu và calo từng món.
                        </p>
                    </div>
                    <div className="w-full space-y-3">
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-left">
                            <div className="flex items-center gap-2 mb-2">
                                <Crown className="w-4 h-4 text-primary" />
                                <span className="text-sm font-semibold text-primary">Premium — 7 ngày</span>
                            </div>
                            <ul className="text-xs text-primary/80 space-y-1.5">
                                {["Thực đơn 7 ngày cá nhân hóa bằng AI", "Công thức nấu ăn chi tiết cho từng bữa", "Danh sách nguyên liệu & calo từng món"].map((t) => (
                                    <li key={t} className="flex items-center gap-1.5"><Check className="w-3 h-3 shrink-0" />{t}</li>
                                ))}
                            </ul>
                        </div>
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="w-4 h-4 text-amber-600" />
                                <span className="text-sm font-semibold text-amber-700">Family — 21 ngày</span>
                            </div>
                            <ul className="text-xs text-amber-600 space-y-1.5">
                                {["Thực đơn 21 ngày đầy đủ", "Tất cả tính năng Premium", "Tái tạo không giới hạn"].map((t) => (
                                    <li key={t} className="flex items-center gap-1.5"><Check className="w-3 h-3 shrink-0" />{t}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <Button className="w-full gradient-primary" onClick={() => navigate("/subscription")}>
                        <Crown className="w-4 h-4 mr-2" /> Nâng cấp ngay
                    </Button>
                </main>
            </div>
        );
    }

    /* ── Loading ── */
    /* -- Loading -- */
    if (isGenerating) {
        return (
            <div className="min-h-screen gradient-fresh flex flex-col items-center justify-center px-4 gap-8">
                <div className="relative">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-xl shadow-primary/30">
                        <Sparkles className="w-11 h-11 text-primary-foreground" />
                    </div>
                    <div className="absolute -inset-3 rounded-3xl border-2 border-primary/30 animate-ping" />
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-bold mb-1">CaloVie AI đang tạo thực đơn...</h2>
                    {progress && (
                        <p className="text-muted-foreground text-sm mt-1">
                            Ngày {progress.current_day}/{progress.total_days}
                        </p>
                    )}
                </div>
                {/* Real-time day cards */}
                {days.length > 0 && (
                    <div className="w-full max-w-sm space-y-2 max-h-60 overflow-y-auto">
                        {days.map((d) => (
                            <div key={d.day_number} className="flex items-center gap-3 bg-card rounded-xl px-3 py-2 shadow-ios-sm">
                                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex-1 text-xs">
                                    <span className="font-semibold">Ngày {d.day_number}</span>
                                    <span className="text-muted-foreground ml-2">{d.day_totals.calories} kcal</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {progress && (
                    <div className="w-full max-w-xs bg-muted rounded-full h-2">
                        <div
                            className="bg-primary h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.round(progress.current_day / progress.total_days * 100)}%` }}
                        />
                    </div>
                )}
                <p className="text-xs text-muted-foreground text-center px-6">
                    Mỗi ngày mất khoảng 15–30 giây. Bạn có thể rời trang — quá trình tạo vẫn tiếp tục và thực đơn sẽ được lưu tự động.
                </p>
            </div>
        );
    }

    /* ── Result preview ── */
    /* -- Result preview -- */
    if (result || (days.length > 0 && !isGenerating)) {
        const displayDays = days;
        const avgCal = displayDays.length ? Math.round(displayDays.reduce((s, d) => s + d.day_totals.calories, 0) / displayDays.length) : 0;
        const avgPro = displayDays.length ? Math.round(displayDays.reduce((s, d) => s + d.day_totals.protein, 0) / displayDays.length) : 0;
        const totalMeals = displayDays.reduce((s, d) => s + d.meals.length, 0);

        return (
            <div className="min-h-screen bg-background pb-36">
                <header className="sticky top-0 z-50 border-b border-border/30">
                    <div className="gradient-hero container px-5 py-4 flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={reset} className="rounded-xl">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex-1 min-w-0">
                            <h1 className="page-title truncate">Thực đơn AI {totalDays} ngày</h1>
                            <p className="text-xs text-muted-foreground">{displayDays.length} ngày · Xem trước</p>
                        </div>
                        <Badge className="bg-primary/15 text-primary border-0 shrink-0">
                            <Sparkles className="w-3 h-3 mr-1" />CaloVie AI
                        </Badge>
                    </div>
                </header>

                <main className="container px-5 py-5 space-y-4">
                    <Card className="overflow-hidden border-0 shadow-md">
                        <div className="gradient-primary p-5 text-primary-foreground">
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: "Ngày", value: displayDays.length },
                                    { label: "kcal/ngày", value: avgCal },
                                    { label: "Bữa ăn", value: totalMeals },
                                ].map((s) => (
                                    <div key={s.label} className="bg-white/15 rounded-xl p-3 text-center">
                                        <p className="text-xl font-bold">{s.value}</p>
                                        <p className="text-xs text-primary-foreground/70 mt-0.5">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 text-xs text-primary-foreground/70">
                                Protein trung bình: <strong className="text-primary-foreground">{avgPro}g/ngày</strong>
                            </div>
                        </div>
                    </Card>

                    {genError && (
                        <div className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3">{genError}</div>
                    )}

                    <div>
                        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            Chi tiết thực đơn
                            <span className="text-[10px] font-normal text-muted-foreground ml-1">— nhấn vào món để xem chi tiết</span>
                        </h2>
                        <div className="space-y-2">
                            {displayDays.map((day, i) => (
                                <DayPreview key={day.day_number} day={day} defaultOpen={i === 0} onMealClick={setSelectedMeal} />
                            ))}
                        </div>
                    </div>

                    <MealDetailModal
                        meal={selectedMeal}
                        onClose={() => setSelectedMeal(null)}
                        onAskChatbot={(prompt) => navigate("/assistant", { state: { prompt } })}
                    />
                </main>

                <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border p-4 space-y-2">
                    {result && (
                        <Button className="w-full gradient-primary" size="lg" onClick={() => setConfirmActivate(true)} disabled={activating}>
                            {activating
                                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang kích hoạt...</>
                                : <><CheckCircle2 className="w-4 h-4 mr-2" />Kích hoạt thực đơn này</>
                            }
                        </Button>
                    )}
                    <Button variant="outline" className="w-full gap-2" onClick={reset}>
                        <RefreshCw className="w-4 h-4" /> Tạo lại thực đơn khác
                    </Button>
                </div>

                <AlertDialog open={confirmActivate} onOpenChange={setConfirmActivate}>
                    <AlertDialogContent className="max-w-sm rounded-2xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Kích hoạt thực đơn mới?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Kế hoạch đang dùng hiện tại (nếu có) sẽ được thay thế. Tiến độ của kế hoạch cũ vẫn được lưu lại.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction onClick={handleActivate}>Kích hoạt</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        );
    }

    /* ── Form ── */
    return (
        <div className="min-h-screen bg-background pb-32">
            <header className="sticky top-0 z-50 border-b border-border/30">
                <div className="gradient-hero container px-5 py-4 flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/meal-plan")} className="rounded-xl">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex items-center gap-2 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                            <Sparkles className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="page-title leading-tight">CaloVie AI</h1>
                            <p className="text-[10px] text-muted-foreground leading-tight">Thực đơn cá nhân hóa</p>
                        </div>
                    </div>
                    <Badge className={`border-0 text-white shrink-0 ${isPro
                        ? "bg-gradient-to-r from-amber-400 to-orange-500"
                        : "bg-gradient-to-r from-primary to-primary/80"}`}>
                        {isPro
                            ? <><Zap className="w-3 h-3 mr-1" />Family · 21 ngày</>
                            : <><Crown className="w-3 h-3 mr-1" />Premium · 7 ngày</>
                        }
                    </Badge>
                </div>
            </header>

            <main className="container px-5 py-5 space-y-4 max-w-lg mx-auto">
                {/* Recover a plan whose generation survived a reload/navigation */}
                <MealPlanRecoveryBanner />

                {/* Intro banner */}
                <div className="rounded-2xl gradient-primary p-4 text-primary-foreground flex gap-4 items-center shadow-md shadow-primary/20">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-bold mb-0.5">AI sẽ tạo thực đơn {totalDays} ngày</p>
                        <p className="text-xs text-primary-foreground/80 leading-relaxed">
                            Kèm công thức nấu ăn, nguyên liệu và calo từng bữa — hoàn toàn cá nhân hóa theo bạn.
                        </p>
                    </div>
                </div>

                {/* Profile summary */}
                <Card>
                    <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <User className="w-4 h-4 text-primary" /> Hồ sơ của bạn
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                        {age && weight && height ? (
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: "Tuổi",         value: `${age} tuổi` },
                                    { label: "Cân nặng",     value: `${weight} kg` },
                                    { label: "Chiều cao",    value: `${height} cm` },
                                    { label: "Calo mục tiêu",value: calories ? `${calories} kcal` : "Chưa đặt" },
                                    ...(activity ? [{ label: "Vận động", value: activityLabels[activity] || activity }] : []),
                                ].map((item) => (
                                    <div key={item.label} className="bg-muted/50 rounded-lg px-3 py-2">
                                        <p className="text-[10px] text-muted-foreground">{item.label}</p>
                                        <p className="text-sm font-semibold">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                                <Activity className="w-5 h-5 text-amber-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-amber-700">Hồ sơ chưa đầy đủ</p>
                                    <p className="text-xs text-amber-600">AI vẫn sẽ tạo thực đơn, nhưng độ chính xác thấp hơn.</p>
                                </div>
                                <Button size="sm" variant="outline"
                                    className="shrink-0 text-xs h-7 border-amber-300 text-amber-600"
                                    onClick={() => navigate("/settings")}>
                                    Cập nhật
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Goal */}
                <Card>
                    <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Target className="w-4 h-4 text-primary" /> Mục tiêu của bạn
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <div className="grid grid-cols-2 gap-2">
                            {GOAL_OPTIONS.map((g) => (
                                <button
                                    key={g.value}
                                    type="button"
                                    onClick={() => setGoalType(g.value)}
                                    className={`flex flex-col gap-1.5 p-3 rounded-xl border-2 text-left transition-all ${
                                        goalType === g.value
                                            ? "border-primary bg-primary/5"
                                            : "border-border hover:border-primary/30"
                                    }`}
                                >
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                        goalType === g.value ? "bg-primary/10" : "bg-muted"
                                    }`}>
                                        <g.Icon className={`w-4 h-4 ${goalType === g.value ? "text-primary" : g.color}`} />
                                    </div>
                                    <span className={`text-xs font-semibold leading-tight ${goalType === g.value ? "text-primary" : "text-foreground"}`}>
                                        {g.label}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">{g.desc}</span>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Diet */}
                <Card>
                    <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Leaf className="w-4 h-4 text-emerald-500" /> Chế độ ăn
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4 space-y-2">
                        {DIET_OPTIONS.map((d) => (
                            <button
                                key={d.value}
                                type="button"
                                onClick={() => setDietType(d.value)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                                    dietType === d.value
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:border-primary/20"
                                }`}
                            >
                                <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                                    dietType === d.value ? "border-primary bg-primary" : "border-muted-foreground"
                                }`}>
                                    {dietType === d.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <div>
                                    <p className={`text-sm font-medium ${dietType === d.value ? "text-primary" : "text-foreground"}`}>{d.label}</p>
                                    <p className="text-xs text-muted-foreground">{d.desc}</p>
                                </div>
                            </button>
                        ))}
                    </CardContent>
                </Card>

                {/* Meals per day */}
                <Card>
                    <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Utensils className="w-4 h-4 text-primary" /> Bạn ăn mấy bữa mỗi ngày?
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <div className="grid grid-cols-3 gap-2">
                            {MEALS_PER_DAY_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setMealsPerDay(opt.value)}
                                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 text-center transition-all ${
                                        mealsPerDay === opt.value
                                            ? "border-primary bg-primary/5"
                                            : "border-border hover:border-primary/30"
                                    }`}
                                >
                                    <span className={`text-base font-bold ${mealsPerDay === opt.value ? "text-primary" : "text-foreground"}`}>
                                        {opt.label}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground leading-tight">{opt.desc}</span>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Cooking style */}
                <Card>
                    <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <ChefHat className="w-4 h-4 text-primary" /> Bạn thường nấu ăn thế nào?
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4 space-y-2">
                        {COOKING_STYLE_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setCookingStyle(opt.value)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                                    cookingStyle === opt.value
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:border-primary/20"
                                }`}
                            >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                    cookingStyle === opt.value ? "bg-primary/10" : "bg-muted"
                                }`}>
                                    <opt.Icon className={`w-4.5 h-4.5 ${cookingStyle === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                                </div>
                                <div>
                                    <p className={`text-sm font-medium ${cookingStyle === opt.value ? "text-primary" : "text-foreground"}`}>
                                        {opt.label}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                                </div>
                                {cookingStyle === opt.value && (
                                    <Check className="w-4 h-4 text-primary ml-auto shrink-0" />
                                )}
                            </button>
                        ))}
                    </CardContent>
                </Card>

                <AdSenseUnit
                    slot={import.meta.env.VITE_ADSENSE_SLOT_GENERATE ?? import.meta.env.VITE_ADSENSE_SLOT_INLINE ?? ""}
                    format="auto"
                    className="min-h-[100px]"
                />

                {/* Foods to avoid */}
                <Card>
                    <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-sm">Dị ứng / Không thích (tuỳ chọn)</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <Input
                            value={foodsToAvoid}
                            onChange={(e) => setFoodsToAvoid(e.target.value)}
                            placeholder="VD: tôm, sữa, đậu phộng, hành tây..."
                        />
                        <p className="text-xs text-muted-foreground mt-1.5">
                            AI sẽ loại bỏ các thực phẩm này khỏi toàn bộ thực đơn.
                        </p>
                    </CardContent>
                </Card>

                {/* Pro nudge for premium users */}
                {tier === "premium" && (
                    <div className="flex items-center gap-3 border border-amber-200 bg-amber-50 rounded-xl p-3.5">
                        <Zap className="w-5 h-5 text-amber-500 shrink-0" />
                        <div className="flex-1">
                            <p className="text-xs font-semibold text-amber-700">Nâng cấp Family → thực đơn 21 ngày</p>
                            <p className="text-xs text-amber-600">Hiện tại bạn có thực đơn 7 ngày.</p>
                        </div>
                        <Button size="sm" variant="outline"
                            className="border-amber-300 text-amber-600 shrink-0 text-xs h-7"
                            onClick={() => navigate("/subscription")}>
                            Xem
                        </Button>
                    </div>
                )}
            </main>

            <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border p-4">
                <Button className="w-full gradient-primary gap-2" size="lg" onClick={handleGenerate}>
                    <Sparkles className="w-5 h-5" />
                    Tạo thực đơn {totalDays} ngày bằng CaloVie AI
                </Button>
            </div>
        </div>
    );
};

export default GenerateMealPlan;
