import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, User, Target, Loader2, Languages, Calculator,
  Activity, Info, Crown, Zap, Star, ChevronRight,
  Store as StoreIcon, Eye, UtensilsCrossed, BadgeCheck,
  Clock, XCircle, Pencil, MapPin, Plus, TrendingUp,
  Scale, TrendingDown, Dumbbell, Salad, LogOut,
  Sun, Moon, Monitor, Camera, MessageSquare, CalendarDays, Lock, TriangleAlert,
  Heart, ChefHat, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  calculateNutritionGoals, calculateBMI, calculateIdealWeightRange,
} from "@/utils/nutritionCalculator";
import { BottomNav } from "@/components/BottomNav";
import { DietaryPreferences } from "@/components/DietaryPreferences";
import api from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";

type Screen = null | "profile" | "physical" | "nutrition" | "dietary" | "language" | "store";

type PhysicalStats = {
  age: number;
  gender: "male" | "female" | "other";
  height_cm: number;
  weight_kg: number;
  activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
  goal: "lose" | "maintain" | "gain";
};

type NutritionGoals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

const GOAL_REVERSE: Record<string, PhysicalStats["goal"]> = {
  weight_loss: "lose",
  muscle_gain: "gain",
  maintenance: "maintain",
};

const GOAL_MAP: Record<string, string> = {
  lose: "weight_loss",
  gain: "muscle_gain",
  maintain: "maintenance",
};

interface DailyUsage {
  scan:               { used: number; effective_limit: number; can_earn_more: boolean };
  chat:               { used: number; limit: number };
  meal_plan_generate: { used: number; limit: number };
  meal_plan:          { videos_watched: number; videos_required: number; is_unlocked: boolean };
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, profile, loading, isAuthenticated, updateProfile, signOut, deleteAccount } = useAuthContext();

  const [screen, setScreen] = useState<Screen>(null);
  const [displayName, setDisplayName] = useState("");
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals>({
    calories: 2000,
    protein: 120,
    carbs: 250,
    fat: 65,
    fiber: 25,
  });
  const [physicalStats, setPhysicalStats] = useState<PhysicalStats>({
    age: 25,
    gender: "male",
    height_cm: 170,
    weight_kg: 70,
    activity_level: "moderate",
    goal: "maintain",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [myStores, setMyStores] = useState<any[]>([]);
  const [storesLoaded, setStoresLoaded] = useState(false);
  const [usage, setUsage] = useState<DailyUsage | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setNutritionGoals({
        calories: profile.daily_nutrition_goals?.calories || 2000,
        protein: profile.daily_nutrition_goals?.protein || 120,
        carbs: profile.daily_nutrition_goals?.carbs || 250,
        fat: profile.daily_nutrition_goals?.fat || 65,
        fiber: profile.daily_nutrition_goals?.fiber || 25,
      });
      if (profile.preferences) {
        const p = profile.preferences;
        setPhysicalStats({
          age: (p.age as number) || 25,
          gender: (p.gender as PhysicalStats["gender"]) || "male",
          height_cm: (p.height_cm as number) || 170,
          weight_kg: (p.weight_kg as number) || 70,
          activity_level: (p.activity_level as PhysicalStats["activity_level"]) || "moderate",
          goal: GOAL_REVERSE[(p.goal as string) || "maintenance"] ?? "maintain",
        });
      }
    }
  }, [profile]);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/auth");
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated && !storesLoaded) {
      api.get("/stores/mine")
        .then((res) => setMyStores(res.data?.data || []))
        .catch(() => {})
        .finally(() => setStoresLoaded(true));
    }
  }, [isAuthenticated, storesLoaded]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get<DailyUsage>("/rewards/status").then((r) => setUsage(r.data)).catch(() => {});
  }, [isAuthenticated]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        display_name: displayName || null,
        preferences: {
          age: physicalStats.age,
          gender: physicalStats.gender,
          height_cm: physicalStats.height_cm,
          weight_kg: physicalStats.weight_kg,
          activity_level: physicalStats.activity_level,
          goal: GOAL_MAP[physicalStats.goal] ?? "maintenance",
        },
        daily_nutrition_goals: nutritionGoals,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoCalculate = () => {
    const calculated = calculateNutritionGoals({
      age: physicalStats.age,
      gender: physicalStats.gender,
      weight_kg: physicalStats.weight_kg,
      height_cm: physicalStats.height_cm,
      activity_level: physicalStats.activity_level,
      goal: physicalStats.goal,
    });
    setNutritionGoals(calculated);
  };

  const bmi = physicalStats.weight_kg && physicalStats.height_cm
    ? calculateBMI(physicalStats.weight_kg, physicalStats.height_cm)
    : null;

  const idealWeightRange = physicalStats.height_cm
    ? calculateIdealWeightRange(physicalStats.height_cm)
    : null;

  const getBMIStatus = (b: number) => {
    if (b < 18.5) return { label: t("settings.bmi.underweight"), color: "text-blue-500" };
    if (b < 25)   return { label: t("settings.bmi.normal"),      color: "text-green-500" };
    if (b < 30)   return { label: t("settings.bmi.overweight"),  color: "text-yellow-500" };
    return               { label: t("settings.bmi.obese"),       color: "text-red-500" };
  };

  const totalMacroCalories =
    nutritionGoals.protein * 4 + nutritionGoals.carbs * 4 + nutritionGoals.fat * 9;
  const proteinPct = Math.round((nutritionGoals.protein * 4 / totalMacroCalories) * 100);
  const carbsPct   = Math.round((nutritionGoals.carbs   * 4 / totalMacroCalories) * 100);
  const fatPct     = Math.round((nutritionGoals.fat     * 9 / totalMacroCalories) * 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ── Sub-screen header ──────────────────────────────────────────── */
  const SubHeader: React.FC<{ title: string; showSave?: boolean }> = ({ title, showSave }) => (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="container flex items-center h-16 px-5 gap-3">
        <Button variant="ghost" size="icon" onClick={() => setScreen(null)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="page-title flex-1">{title}</h1>
        {showSave && (
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="min-w-[60px]">
            {isSaving
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : t("settings.save")}
          </Button>
        )}
      </div>
    </header>
  );

  /* ── SCREEN: Profile ─────────────────────────────────────────────── */
  if (screen === "profile") {
    return (
      <div className="min-h-screen bg-background pb-nav-safe">
        <SubHeader title={t("settings.menu.profile")} showSave />
        <main className="container isolate px-5 py-6 space-y-5 max-w-lg mx-auto">
          <div className="space-y-2">
            <Label htmlFor="email">{t("settings.profile.email")}</Label>
            <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">{t("settings.profile.emailNote")}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">{t("settings.profile.displayName")}</Label>
            <Input
              id="displayName"
              placeholder={t("settings.profile.displayNamePlaceholder")}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  /* ── SCREEN: Physical stats ──────────────────────────────────────── */
  if (screen === "physical") {
    const goalOptions: { value: PhysicalStats["goal"]; Icon: React.ElementType; color: string }[] = [
      { value: "lose",     Icon: TrendingDown, color: "text-blue-500" },
      { value: "maintain", Icon: Scale,        color: "text-purple-500" },
      { value: "gain",     Icon: Dumbbell,     color: "text-orange-500" },
    ];

    return (
      <div className="min-h-screen bg-background pb-nav-safe">
        <SubHeader title={t("settings.menu.physical")} showSave />
        <main className="container isolate px-5 py-6 space-y-6 max-w-lg mx-auto">
          {/* Age & Gender */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">{t("settings.physical.age")}</Label>
              <Input
                id="age" type="number" min={18} max={100}
                value={physicalStats.age}
                onChange={(e) => setPhysicalStats({ ...physicalStats, age: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("settings.physical.gender")}</Label>
              <Select
                value={physicalStats.gender}
                onValueChange={(v) => setPhysicalStats({ ...physicalStats, gender: v as PhysicalStats["gender"] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t("settings.physical.male")}</SelectItem>
                  <SelectItem value="female">{t("settings.physical.female")}</SelectItem>
                  <SelectItem value="other">{t("settings.physical.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Height & Weight */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height">{t("settings.physical.height")}</Label>
              <Input
                id="height" type="number" min={100} max={250}
                value={physicalStats.height_cm}
                onChange={(e) => setPhysicalStats({ ...physicalStats, height_cm: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">{t("settings.physical.weight")}</Label>
              <Input
                id="weight" type="number" min={30} max={300}
                value={physicalStats.weight_kg}
                onChange={(e) => setPhysicalStats({ ...physicalStats, weight_kg: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* BMI indicator */}
          {bmi && (
            <div className="flex items-center justify-between px-4 py-3 bg-muted/40 rounded-xl">
              <div>
                <p className="text-xs text-muted-foreground">{t("settings.bmi.bmi")}</p>
                <p className="text-2xl font-bold">{bmi}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${getBMIStatus(bmi).color}`}>{getBMIStatus(bmi).label}</p>
                {idealWeightRange && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {idealWeightRange.minWeight}–{idealWeightRange.maxWeight} kg
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Activity level */}
          <div className="space-y-2">
            <Label>{t("settings.physical.activityLevel")}</Label>
            <Select
              value={physicalStats.activity_level}
              onValueChange={(v) => setPhysicalStats({ ...physicalStats, activity_level: v as PhysicalStats["activity_level"] })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">{t("settings.physical.sedentary")}</SelectItem>
                <SelectItem value="light">{t("settings.physical.light")}</SelectItem>
                <SelectItem value="moderate">{t("settings.physical.moderate")}</SelectItem>
                <SelectItem value="active">{t("settings.physical.active")}</SelectItem>
                <SelectItem value="very_active">{t("settings.physical.veryActive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Goal selector */}
          <div className="space-y-2">
            <Label>{t("settings.physical.goal")}</Label>
            <div className="space-y-2">
              {goalOptions.map(({ value, Icon, color }) => (
                <button
                  key={value} type="button"
                  onClick={() => setPhysicalStats({ ...physicalStats, goal: value })}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors text-left ${
                    physicalStats.goal === value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
                  <div>
                    <p className="text-sm font-medium">{t(`settings.physical.${value}`)}</p>
                    <p className="text-xs text-muted-foreground">{t(`settings.physical.${value}Desc`)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Auto-calculate */}
          <Alert className="bg-primary/5 border-primary/20">
            <Calculator className="h-4 w-4 text-primary" />
            <AlertTitle className="text-sm font-medium">{t("settings.physical.autoCalculate")}</AlertTitle>
            <AlertDescription className="text-xs">{t("settings.physical.autoCalculateDesc")}</AlertDescription>
            <Button variant="default" size="sm" className="mt-3 w-full" onClick={handleAutoCalculate}>
              <Calculator className="w-4 h-4 mr-2" />
              {t("settings.physical.calculateBtn")}
            </Button>
          </Alert>
        </main>
        <BottomNav />
      </div>
    );
  }

  /* ── SCREEN: Nutrition goals ─────────────────────────────────────── */
  if (screen === "nutrition") {
    const macros: { key: keyof NutritionGoals; label: string; color: string; min: number; max: number; step: number; kcalPer: number }[] = [
      { key: "protein", label: t("settings.nutrition.protein"), color: "bg-blue-500",   min: 50,  max: 300, step: 5,  kcalPer: 4 },
      { key: "carbs",   label: t("settings.nutrition.carbs"),   color: "bg-yellow-500", min: 100, max: 500, step: 10, kcalPer: 4 },
      { key: "fat",     label: t("settings.nutrition.fat"),     color: "bg-red-500",    min: 30,  max: 150, step: 5,  kcalPer: 9 },
      { key: "fiber",   label: t("settings.nutrition.fiber"),   color: "bg-green-500",  min: 15,  max: 50,  step: 1,  kcalPer: 0 },
    ];

    return (
      <div className="min-h-screen bg-background pb-nav-safe">
        <SubHeader title={t("settings.menu.nutrition")} showSave />
        <main className="container isolate px-5 py-6 space-y-6 max-w-lg mx-auto">
          {/* Macro distribution bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("settings.nutrition.macroDist")}</span>
              <span className="text-xs text-muted-foreground">{totalMacroCalories.toLocaleString()} kcal</span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden">
              <div className="bg-blue-500"   style={{ width: `${proteinPct}%` }} />
              <div className="bg-yellow-500" style={{ width: `${carbsPct}%`   }} />
              <div className="bg-red-500"    style={{ width: `${fatPct}%`     }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" /> Protein {proteinPct}%</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-yellow-500 inline-block" /> Carbs {carbsPct}%</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500 inline-block" /> Fat {fatPct}%</span>
            </div>
          </div>

          {/* Auto-calc */}
          <Button
            variant="outline" size="sm" className="w-full"
            onClick={handleAutoCalculate}
            disabled={!profile?.preferences?.age}
          >
            <Calculator className="w-4 h-4 mr-2" />
            {t("settings.nutrition.autoCalculate")}
          </Button>

          {/* Calories slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t("settings.nutrition.calorieGoal")}</Label>
              <span className="text-2xl font-bold text-primary">{nutritionGoals.calories.toLocaleString()}</span>
            </div>
            <Slider
              value={[nutritionGoals.calories]}
              onValueChange={([v]) => setNutritionGoals({ ...nutritionGoals, calories: v })}
              min={1000} max={5000} step={50} className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1.000</span><span>5.000 kcal</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[1500, 1800, 2000, 2200, 2500].map((p) => (
                <Button
                  key={p}
                  variant={nutritionGoals.calories === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNutritionGoals({ ...nutritionGoals, calories: p })}
                >
                  {p.toLocaleString()}
                </Button>
              ))}
            </div>
          </div>

          {/* Macro sliders */}
          <div className="space-y-5 pt-4 border-t">
            <Label className="text-sm font-semibold">{t("settings.nutrition.macros")}</Label>
            {macros.map(({ key, label, color, min, max, step, kcalPer }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded ${color} inline-block`} />
                    <Label className="text-sm">{label}</Label>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    {nutritionGoals[key]}g
                    {kcalPer > 0 && ` (${Math.round((nutritionGoals[key] as number) * kcalPer)} kcal)`}
                  </span>
                </div>
                <Slider
                  value={[nutritionGoals[key] as number]}
                  onValueChange={([v]) => setNutritionGoals({ ...nutritionGoals, [key]: v })}
                  min={min} max={max} step={step}
                />
              </div>
            ))}
          </div>

          {/* Mismatch warning */}
          {Math.abs(totalMacroCalories - nutritionGoals.calories) > 100 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>{t("settings.nutrition.macroMismatch")}</AlertTitle>
              <AlertDescription className="text-xs">
                {t("settings.nutrition.macroMismatchDesc", {
                  total: totalMacroCalories.toLocaleString(),
                  goal: nutritionGoals.calories.toLocaleString(),
                })}
              </AlertDescription>
            </Alert>
          )}
        </main>
        <BottomNav />
      </div>
    );
  }

  /* ── SCREEN: Dietary ─────────────────────────────────────────────── */
  if (screen === "dietary") {
    return (
      <div className="min-h-screen bg-background pb-nav-safe">
        <SubHeader title={t("settings.menu.dietary")} />
        <main className="container isolate px-5 py-6 max-w-lg mx-auto">
          <DietaryPreferences />
        </main>
        <BottomNav />
      </div>
    );
  }

  /* ── SCREEN: Language ────────────────────────────────────────────── */
  if (screen === "language") {
    return (
      <div className="min-h-screen bg-background pb-nav-safe">
        <SubHeader title={t("settings.language.title")} />
        <main className="container isolate px-5 py-6 space-y-3 max-w-lg mx-auto">
          {([
            { code: "vi", flag: "VN", label: t("settings.language.vietnamese") },
            { code: "en", flag: "EN", label: t("settings.language.english") },
          ] as const).map(({ code, flag, label }) => (
            <button
              key={code} type="button"
              onClick={() => i18n.changeLanguage(code)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl border-2 transition-colors ${
                i18n.language === code
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/40"
              }`}
            >
              <span className="text-xl font-bold text-muted-foreground w-8">{flag}</span>
              <span className="font-medium flex-1 text-left">{label}</span>
              {i18n.language === code && <BadgeCheck className="w-5 h-5 text-primary" />}
            </button>
          ))}
        </main>
        <BottomNav />
      </div>
    );
  }

  /* ── SCREEN: Store ───────────────────────────────────────────────── */
  if (screen === "store") {
    const activeStores   = myStores.filter((s) => s.is_active);
    const pendingStores  = myStores.filter((s) => !s.is_active && !s.reject_reason);
    const rejectedStores = myStores.filter((s) => !s.is_active && s.reject_reason);
    const totalViews     = myStores.reduce((sum, s) => sum + (s.views_count || 0), 0);
    const totalMenuItems = myStores.reduce((sum, s) => sum + (s.menu_items?.length || 0), 0);
    const ratedStores    = myStores.filter((s) => s.rating_count > 0);
    const avgRating      = ratedStores.length
      ? (ratedStores.reduce((sum, s) => sum + s.average_rating, 0) / ratedStores.length).toFixed(1)
      : null;

    return (
      <div className="min-h-screen bg-background pb-nav-safe">
        <SubHeader title={t("settings.menu.store")} />
        <main className="container isolate px-5 py-6 space-y-4 max-w-lg mx-auto">
          <div className="rounded-2xl overflow-hidden shadow-md bg-gradient-to-br from-amber-400 via-red-500 to-red-700">
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
                    <StoreIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white/70 text-xs font-medium uppercase tracking-wider">{t("settings.store.role")}</p>
                    <p className="text-white text-xl font-bold leading-tight">{t("settings.store.owner")}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-[10px]">{t("settings.store.totalStores")}</p>
                  <p className="text-white text-2xl font-bold">{myStores.length}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { Icon: Eye,            value: totalViews.toLocaleString("vi-VN"), label: t("settings.store.views") },
                  { Icon: UtensilsCrossed, value: totalMenuItems,                   label: t("settings.store.dishes") },
                  { Icon: Star,           value: avgRating ?? "—",                  label: t("settings.store.rating") },
                ].map(({ Icon, value, label }) => (
                  <div key={label} className="bg-white/15 rounded-xl p-2.5 text-center">
                    <Icon className="w-3 h-3 text-white/70 mx-auto mb-0.5" />
                    <p className="text-white text-base font-bold leading-none">{value}</p>
                    <p className="text-white/60 text-[10px] mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                {activeStores.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/30 text-white border border-green-300/30">
                    <BadgeCheck className="w-3 h-3" /> {activeStores.length} {t("settings.store.active")}
                  </span>
                )}
                {pendingStores.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-400/30 text-white border border-yellow-300/30">
                    <Clock className="w-3 h-3" /> {pendingStores.length} {t("settings.store.pending")}
                  </span>
                )}
                {rejectedStores.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-800/40 text-white border border-red-300/20">
                    <XCircle className="w-3 h-3" /> {rejectedStores.length} {t("settings.store.rejected")}
                  </span>
                )}
              </div>
            </div>
            <div className="bg-black/20 px-4 py-3 space-y-2">
              {myStores.slice(0, 3).map((store) => (
                <div key={store._id} className="flex items-center gap-3 bg-white/10 rounded-xl px-3 py-2.5">
                  {store.images?.[0] ? (
                    <img src={store.images[0]} alt={store.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                      <StoreIcon className="w-5 h-5 text-white/70" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{store.name}</p>
                    <div className="flex items-center gap-1 text-white/60 text-[11px]">
                      <MapPin className="w-2.5 h-2.5" />
                      <span className="truncate">{store.city || store.address}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {store.is_active ? (
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                    ) : store.reject_reason ? (
                      <span className="w-2 h-2 rounded-full bg-red-400" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-yellow-300" />
                    )}
                    <Eye className="w-3 h-3 text-white/70" />
                    <span className="text-white/70 text-xs">{(store.views_count || 0).toLocaleString("vi-VN")}</span>
                    {store.average_rating > 0 && (
                      <div className="flex items-center gap-0.5 text-yellow-300 text-xs">
                        <Star className="w-3 h-3 fill-current" />
                        {store.average_rating.toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-black/30 px-5 py-3 flex items-center justify-between">
              <button type="button" onClick={() => navigate("/store-registration")}
                className="flex items-center gap-2 text-white/90 text-sm font-semibold">
                <TrendingUp className="w-4 h-4" />
                {t("settings.store.manage")}
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => navigate("/store-registration")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs font-medium">
                  <Pencil className="w-3 h-3" /> {t("settings.store.edit")}
                </button>
                <button type="button" onClick={() => navigate("/store-registration")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-red-600 text-xs font-bold">
                  <Plus className="w-3 h-3" /> {t("settings.store.addNew")}
                </button>
              </div>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  /* ── MAIN MENU ───────────────────────────────────────────────────── */
  const tier      = profile?.subscription_tier === "pro" ? "family" : (profile?.subscription_tier || "free");
  const tierLabel = tier === "family" ? "Family" : tier === "premium" ? "Premium" : "Free";
  const TierIcon  = tier === "family" ? Crown : tier === "premium" ? Zap : Star;
  const tierColor = tier === "family" ? "text-yellow-500" : tier === "premium" ? "text-primary" : "text-muted-foreground";

  const menuItems = [
    {
      id:    "profile"  as Screen,
      icon:  <User      className="w-6 h-6 text-muted-foreground" />,
      title: t("settings.menu.profile"),
      desc:  profile?.display_name || user?.email || t("settings.profile.displayNamePlaceholder"),
      show:  true,
    },
    {
      id:    "physical" as Screen,
      icon:  <Activity  className="w-6 h-6 text-muted-foreground" />,
      title: t("settings.menu.physical"),
      desc:  bmi ? `BMI ${bmi} · ${getBMIStatus(bmi).label}` : t("settings.menu.physicalDesc"),
      show:  true,
    },
    {
      id:    "nutrition" as Screen,
      icon:  <Target    className="w-6 h-6 text-primary" />,
      title: t("settings.menu.nutrition"),
      desc:  `${nutritionGoals.calories.toLocaleString()} kcal`,
      show:  true,
    },
    {
      id:    "dietary"  as Screen,
      icon:  <Salad     className="w-6 h-6 text-primary" />,
      title: t("settings.menu.dietary"),
      desc:  t("settings.menu.dietaryDesc"),
      show:  true,
    },
    {
      id:    "language" as Screen,
      icon:  <Languages className="w-6 h-6 text-muted-foreground" />,
      title: t("settings.menu.language"),
      desc:  i18n.language === "vi" ? "Tiếng Việt" : "English",
      show:  true,
    },
    {
      id:    "store"    as Screen,
      icon:  <StoreIcon className="w-6 h-6 text-muted-foreground" />,
      title: t("settings.menu.store"),
      desc:  `${myStores.length} ${t("settings.menu.storeDesc")}`,
      show:  storesLoaded && myStores.length > 0,
    },
  ];

  // Render a usage chip: "X/Y" with thin progress bar, or "∞", or locked state
  const UsageChip = ({
    used, limit, label, note,
  }: { used?: number; limit: number; label?: string; note?: string }) => {
    if (limit === -1) {
      return <span className="text-sm font-bold text-green-600">∞</span>;
    }
    if (limit === 0) {
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="w-3 h-3" /> Chưa có
        </span>
      );
    }
    if (used !== undefined) {
      const pct = Math.min(used / limit, 1);
      const barColor = pct >= 1 ? "bg-destructive" : pct >= 0.8 ? "bg-amber-500" : "bg-primary";
      return (
        <div className="flex flex-col items-end gap-1 min-w-[64px]">
          <span className={`text-xs font-semibold tabular-nums ${pct >= 1 ? "text-destructive" : "text-foreground"}`}>
            {used}/{limit}{note ? <span className="text-muted-foreground font-normal"> {note}</span> : null}
          </span>
          <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct * 100}%` }} /> {/* dynamic width requires inline style */}
          </div>
        </div>
      );
    }
    return <span className="text-xs font-medium text-muted-foreground">{label ?? `${limit}/ngày`}</span>;
  };

  const historyLabel = tier === "family" ? "180 ngày" : tier === "premium" ? "30 ngày" : "7 ngày";
  const logLabel     = tier === "free" ? "5 bữa/ngày" : "Không giới hạn";

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setIsDeletingAccount(true);
    try {
      const result = await deleteAccount();
      if (!result.error) {
        navigate("/auth", { replace: true });
      }
    } finally {
      setIsDeletingAccount(false);
      setDeleteDialogOpen(false);
      setDeleteConfirmText("");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-nav-safe">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container flex items-center h-16 px-5 gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="page-title">{t("settings.title")}</h1>
        </div>
      </header>

      <main className="container isolate px-5 py-6 space-y-4 max-w-lg mx-auto">

        {/* User card */}
        <div className="flex items-center gap-4 px-4 py-4 bg-card shadow-ios-sm rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base truncate">
              {profile?.display_name || t("settings.profile.displayNamePlaceholder")}
            </p>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted ${tierColor}`}>
            <TierIcon className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">{tierLabel}</span>
          </div>
        </div>

        {/* Subscription + feature usage card */}
        <div className="rounded-2xl overflow-hidden shadow-ios-sm bg-card">
          {/* Plan row */}
          <button
            type="button"
            onClick={() => navigate("/subscription")}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors text-left"
          >
            <TierIcon className="w-6 h-6 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">
                {tier === "free" ? "Gói Free" : tier === "premium" ? "Gói Premium" : "Gói Gia đình"}
              </p>
              <p className="text-xs text-muted-foreground">
                {tier === "free"
                  ? t("settings.upgradeDesc")
                  : profile?.subscription_expires_at
                  ? `${t("settings.expiresOn")} ${new Date(profile.subscription_expires_at).toLocaleDateString("vi-VN")}`
                  : "Không giới hạn thời gian"}
              </p>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 whitespace-nowrap ${
              tier === "free" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {tier === "free" ? "Nâng cấp" : "Quản lý"}
            </span>
          </button>

          {/* Feature usage rows */}
          <div className="border-t border-border divide-y divide-border/60">
            {[
              {
                Icon: Camera,
                name: "Quét ảnh AI",
                chip: <UsageChip
                  used={usage?.scan.used}
                  limit={usage?.scan.effective_limit ?? (tier === "free" ? 2 : tier === "premium" ? 5 : -1)}
                  note={usage?.scan.can_earn_more ? "(+bonus)" : undefined}
                />,
              },
              {
                Icon: MessageSquare,
                name: "Chat AI",
                chip: <UsageChip
                  used={usage?.chat.used}
                  limit={usage?.chat.limit ?? (tier === "free" ? 5 : tier === "premium" ? 100 : -1)}
                />,
              },
              {
                Icon: CalendarDays,
                name: "Kế hoạch bữa ăn",
                chip: <UsageChip
                  used={usage?.meal_plan_generate.used}
                  limit={usage?.meal_plan_generate.limit ?? (tier === "free" ? 0 : tier === "premium" ? 1 : 5)}
                />,
              },
              {
                Icon: UtensilsCrossed,
                name: "Nhật ký thực phẩm",
                chip: <UsageChip limit={tier === "free" ? 5 : -1} label={logLabel} />,
              },
              {
                Icon: Clock,
                name: "Lịch sử dữ liệu",
                chip: <span className="text-xs font-medium text-muted-foreground">{historyLabel}</span>,
              },
            ].map(({ Icon, name, chip }) => (
              <div key={name} className="flex items-center gap-3 px-4 py-2.5">
                <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 text-xs text-muted-foreground">{name}</span>
                {chip}
              </div>
            ))}
          </div>
        </div>

        {/* Reports — prominent always-visible card */}
        <button
          type="button"
          onClick={() => navigate("/reports")}
          className="w-full rounded-2xl shadow-ios-sm bg-primary/10 border border-primary/20 flex items-center gap-4 px-5 py-4 hover:bg-primary/15 transition-all text-left"
        >
          <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">Báo cáo dinh dưỡng</p>
            <p className="text-xs text-muted-foreground">Xu hướng calo, macro, tuân thủ mục tiêu</p>
          </div>
          <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />
        </button>

        {/* Settings menu */}
        <div className="rounded-2xl overflow-hidden shadow-ios-sm divide-y divide-border bg-card">
          {menuItems.filter((item) => item.show).map((item) => (
            <button
              key={item.id} type="button"
              onClick={() => setScreen(item.id)}
              className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors text-left"
            >
              {item.icon}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* Explore — links to all discoverable features */}
        <div className="rounded-2xl overflow-hidden shadow-ios-sm divide-y divide-border bg-card">
          <div className="px-4 pt-3.5 pb-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Khám phá</p>
          </div>
          {[
            { icon: <Heart     className="w-5 h-5 text-fat"      />, title: "Yêu thích",          desc: "Món ăn đã lưu",                  path: "/favorites"       },
            { icon: <ChefHat   className="w-5 h-5 text-calories" />, title: "Công thức của tôi",  desc: "Quản lý công thức cá nhân",       path: "/my-recipes"      },
            { icon: <Users     className="w-5 h-5 text-protein"  />, title: "Cộng đồng",          desc: "Kế hoạch bữa ăn từ cộng đồng",   path: "/community-plans" },
            { icon: <MapPin    className="w-5 h-5 text-vitamins" />, title: "Nhà hàng gần đây",   desc: "Tìm quán ăn lành mạnh",           path: "/nearby"          },
          ].map(({ icon, title, desc, path }) => (
            <button
              key={path} type="button"
              onClick={() => navigate(path)}
              className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors text-left"
            >
              {icon}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground truncate">{desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* Appearance */}
        <div className="rounded-2xl overflow-hidden shadow-ios-sm bg-card px-4 py-3.5 space-y-3">
          <div className="flex items-center gap-3">
            <Monitor className="w-6 h-6 text-muted-foreground flex-shrink-0" />
            <p className="text-sm font-medium flex-1">Giao diện</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: "light",  Icon: Sun,     label: "Sáng"     },
              { value: "system", Icon: Monitor, label: "Hệ thống" },
              { value: "dark",   Icon: Moon,    label: "Tối"      },
            ] as const).map(({ value, Icon, label }) => (
              <button
                key={value} type="button"
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border-2 text-xs font-medium transition-colors ${
                  theme === value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-muted-foreground/40"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden shadow-ios-sm divide-y divide-border bg-card">
          <div className="px-4 pt-3.5 pb-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tài khoản & quyền riêng tư</p>
          </div>
          <div className="flex items-start gap-4 px-4 py-3.5">
            <TriangleAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{t("settings.account.deleteTitle")}</p>
              <p className="text-xs text-muted-foreground">
                Dành cho trường hợp bạn muốn xoá toàn bộ dữ liệu tài khoản khỏi CaloVie.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700"
            >
              Xóa
            </Button>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors text-left"
          >
            <LogOut className="w-5 h-5 text-destructive flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-destructive">Đăng xuất</p>
              <p className="text-xs text-muted-foreground">Thoát khỏi thiết bị hiện tại.</p>
            </div>
          </button>
        </div>

      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.account.dialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.account.dialogDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
              {t("settings.account.dialogWarning")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-account-confirm">{t("settings.account.confirmLabel")}</Label>
              <Input
                id="delete-account-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteConfirmText("");
              }}
            >
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteAccount();
              }}
              disabled={deleteConfirmText !== "DELETE" || isDeletingAccount}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeletingAccount ? t("settings.account.deleting") : t("settings.account.deleteAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <BottomNav />
    </div>
  );
};

export default Settings;
