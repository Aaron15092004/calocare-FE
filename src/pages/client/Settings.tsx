import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  User,
  Target,
  Save,
  Loader2,
  Languages,
  Calculator,
  Activity,
  TrendingUp,
  Info,
  Crown,
  Zap,
  Star,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  calculateNutritionGoals,
  calculateBMI,
  calculateIdealWeightRange,
} from "@/utils/nutritionCalculator";
import { BottomNav } from "@/components/BottomNav";

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, profile, loading, isAuthenticated, updateProfile } = useAuthContext();

  const [displayName, setDisplayName] = useState("");
  const [nutritionGoals, setNutritionGoals] = useState({
    calories: 2000,
    protein: 120,
    carbs: 250,
    fat: 65,
    fiber: 25,
  });
  const [physicalStats, setPhysicalStats] = useState({
    age: 25,
    gender: "male" as "male" | "female" | "other",
    height_cm: 170,
    weight_kg: 70,
    activity_level: "moderate" as
      | "sedentary"
      | "light"
      | "moderate"
      | "active"
      | "very_active",
    goal: "maintain" as "lose" | "maintain" | "gain",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

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
      // ← THÊM
      if (profile.preferences) {
        setPhysicalStats({
          age: profile.preferences.age || 25,
          gender: (profile.preferences.gender as any) || "male",
          height_cm: profile.preferences.height_cm || 170,
          weight_kg: profile.preferences.weight_kg || 70,
          activity_level:
            (profile.preferences.activity_level as any) || "moderate",
          goal: "maintain",
        });
      }
    }
  }, [profile]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [loading, isAuthenticated, navigate]);

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
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    await updateProfile({
      display_name: displayName || null,
      preferences: {
        age: physicalStats.age,
        gender: physicalStats.gender,
        height_cm: physicalStats.height_cm,
        weight_kg: physicalStats.weight_kg,
        activity_level: physicalStats.activity_level,
      },
      daily_nutrition_goals: nutritionGoals,
    });
    setIsSaving(false);
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

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  // Calculate BMI and ideal weight
  const bmi =
    physicalStats.weight_kg && physicalStats.height_cm
      ? calculateBMI(physicalStats.weight_kg, physicalStats.height_cm)
      : null;

  const idealWeightRange = physicalStats.height_cm
    ? calculateIdealWeightRange(physicalStats.height_cm)
    : null;

  const getBMIStatus = (bmi: number) => {
    if (bmi < 18.5) return { label: "Underweight", color: "text-blue-500" };
    if (bmi < 25) return { label: "Normal", color: "text-green-500" };
    if (bmi < 30) return { label: "Overweight", color: "text-yellow-500" };
    return { label: "Obese", color: "text-red-500" };
  };

  // Calculate macro percentages
  const totalMacroCalories =
    nutritionGoals.protein * 4 +
    nutritionGoals.carbs * 4 +
    nutritionGoals.fat * 9;
  const proteinPercent = Math.round(
    ((nutritionGoals.protein * 4) / totalMacroCalories) * 100,
  );
  const carbsPercent = Math.round(
    ((nutritionGoals.carbs * 4) / totalMacroCalories) * 100,
  );
  const fatPercent = Math.round(
    ((nutritionGoals.fat * 9) / totalMacroCalories) * 100,
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container flex items-center h-16 px-4 gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold">{t("settings.title")}</h1>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6 max-w-lg mx-auto ">
        {/* ── Subscription Hero ─────────────────────────────────────────── */}
        {profile?.subscription_tier === "free" ? (
          /* Free — bordered card, no gradient */
          <div className="rounded-2xl overflow-hidden border-2 border-border bg-card shadow-sm">
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Star className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Gói của bạn</p>
                    <p className="text-foreground text-xl font-bold leading-tight">Free</p>
                  </div>
                </div>
              </div>
              <div className="bg-muted rounded-xl px-3 py-2.5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-muted-foreground text-xs">AI Scan hôm nay</span>
                  <span className="text-foreground text-xs font-bold">2 lần/ngày</span>
                </div>
                <div className="text-muted-foreground text-[11px]">
                  Log thủ công: 5 bữa/ngày · Lịch sử 7 ngày
                </div>
              </div>
            </div>
            <div className="bg-primary/5 border-t border-primary/20 px-5 py-3">
              <button
                type="button"
                onClick={() => navigate("/subscription")}
                className="w-full flex items-center justify-between"
              >
                <span className="text-primary font-semibold text-sm">
                  Nâng cấp lên Premium — 79.000₫/tháng
                </span>
                <ChevronRight className="w-4 h-4 text-primary/70 flex-shrink-0" />
              </button>
            </div>
          </div>
        ) : (
          /* Premium / Pro — gradient-primary */
          <div className={`rounded-2xl overflow-hidden shadow-md ${
            profile?.subscription_tier === "pro"
              ? "shadow-[var(--shadow-glow)]"
              : ""
          } gradient-primary`}>
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
                    {profile?.subscription_tier === "pro" ? (
                      <Crown className="w-6 h-6 text-yellow-300" />
                    ) : (
                      <Zap className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Gói của bạn</p>
                    <p className="text-white text-xl font-bold leading-tight">
                      {profile?.subscription_tier === "pro" ? "Pro" : "Premium"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-[10px]">Hết hạn</p>
                  <p className="text-white text-xs font-semibold">
                    {profile?.subscription_expires_at
                      ? new Date(profile.subscription_expires_at).toLocaleDateString("vi-VN")
                      : "—"}
                  </p>
                </div>
              </div>
              <div className="bg-white/10 rounded-xl px-3 py-2.5">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-white/80 text-xs">AI Scan hôm nay</span>
                  <span className="text-white text-xs font-bold">
                    {profile?.subscription_tier === "pro" ? "20 lần/ngày" : "10 lần/ngày"}
                  </span>
                </div>
                <div className="text-white/60 text-[11px]">
                  {profile?.subscription_tier === "pro"
                    ? "Log thủ công: không giới hạn · Lịch sử 90 ngày · Batch scan"
                    : "Log thủ công: không giới hạn · Lịch sử 30 ngày"}
                </div>
              </div>
            </div>
            <div className="bg-black/20 px-5 py-3">
              <button
                type="button"
                onClick={() => navigate("/subscription")}
                className="w-full flex items-center justify-between"
              >
                {profile?.subscription_tier === "pro" ? (
                  <span className="text-white/80 text-sm">Xem chi tiết gói</span>
                ) : (
                  <span className="text-white font-semibold text-sm">
                    Nâng cấp lên Pro — 179.000₫/tháng
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-white/70 flex-shrink-0" />
              </button>
            </div>
          </div>
        )}

        {/* Language Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="w-5 h-5 text-primary" />
              {t("settings.language.title")}
            </CardTitle>
            <CardDescription>
              {t("settings.language.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={i18n.language === "vi" ? "default" : "outline"}
                className="flex-1"
                onClick={() => changeLanguage("vi")}
              >
                VN · {t("settings.language.vietnamese")}
              </Button>
              <Button
                variant={i18n.language === "en" ? "default" : "outline"}
                className="flex-1"
                onClick={() => changeLanguage("en")}
              >
                EN · {t("settings.language.english")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profile Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {t("settings.profile.title")}
            </CardTitle>
            <CardDescription>
              {t("settings.profile.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("settings.profile.email")}</Label>
              <Input
                id="email"
                value={user?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                {t("settings.profile.emailNote")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">
                {t("settings.profile.displayName")}
              </Label>
              <Input
                id="displayName"
                placeholder={t("settings.profile.displayNamePlaceholder")}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Physical Information
            </CardTitle>
            <CardDescription>
              Update your body stats for accurate nutrition calculations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Age & Gender Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={physicalStats.age}
                  onChange={(e) =>
                    setPhysicalStats({
                      ...physicalStats,
                      age: Number(e.target.value),
                    })
                  }
                  min={18}
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={physicalStats.gender}
                  onValueChange={(value: any) =>
                    setPhysicalStats({ ...physicalStats, gender: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Height & Weight Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={physicalStats.height_cm}
                  onChange={(e) =>
                    setPhysicalStats({
                      ...physicalStats,
                      height_cm: Number(e.target.value),
                    })
                  }
                  min={100}
                  max={250}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={physicalStats.weight_kg}
                  onChange={(e) =>
                    setPhysicalStats({
                      ...physicalStats,
                      weight_kg: Number(e.target.value),
                    })
                  }
                  min={30}
                  max={300}
                />
              </div>
            </div>

            {/* Activity Level */}
            <div className="space-y-2">
              <Label htmlFor="activity">Activity Level</Label>
              <Select
                value={physicalStats.activity_level}
                onValueChange={(value: any) =>
                  setPhysicalStats({ ...physicalStats, activity_level: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">
                    Sedentary (little or no exercise)
                  </SelectItem>
                  <SelectItem value="light">
                    Light (exercise 1-2 days/week)
                  </SelectItem>
                  <SelectItem value="moderate">
                    Moderate (exercise 3-5 days/week)
                  </SelectItem>
                  <SelectItem value="active">
                    Active (exercise 6-7 days/week)
                  </SelectItem>
                  <SelectItem value="very_active">
                    Very Active (intense exercise daily)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Goal */}
            <div className="space-y-2">
              <Label htmlFor="goal">Your Goal</Label>
              <Select
                value={physicalStats.goal}
                onValueChange={(value: any) =>
                  setPhysicalStats({ ...physicalStats, goal: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lose">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Lose Weight</span>
                      <span className="text-xs text-muted-foreground">
                        ~0.5kg/week (500 kcal deficit)
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="maintain">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Maintain Weight</span>
                      <span className="text-xs text-muted-foreground">
                        Keep current weight
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="gain">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Gain Weight</span>
                      <span className="text-xs text-muted-foreground">
                        ~0.3kg/week (300 kcal surplus)
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Calculate Button */}
            <Alert className="bg-primary/5 border-primary/20">
              <Calculator className="h-4 w-4 text-primary" />
              <AlertTitle className="text-sm font-medium">
                Auto-calculate nutrition goals
              </AlertTitle>
              <AlertDescription className="text-xs">
                Click below to calculate personalized goals based on your
                physical stats using Schofield equations (FAO/WHO/UNU
                standards).
              </AlertDescription>
              <Button
                variant="default"
                size="sm"
                className="mt-3 w-full"
                onClick={handleAutoCalculate}
              >
                <Calculator className="w-4 h-4 mr-2" />
                Calculate My Goals
              </Button>
            </Alert>
          </CardContent>
        </Card>

        {/* BMI & Health Stats Card */}
        {bmi && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Health Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* BMI Display */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Body Mass Index (BMI)
                  </p>
                  <p className="text-2xl font-bold">{bmi}</p>
                </div>
                <Badge variant="outline" className={getBMIStatus(bmi).color}>
                  {getBMIStatus(bmi).label}
                </Badge>
              </div>

              {/* Ideal Weight Range */}
              {idealWeightRange && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Ideal Weight Range
                    </span>
                    <span className="font-medium">
                      {idealWeightRange.minWeight} -{" "}
                      {idealWeightRange.maxWeight} kg
                    </span>
                  </div>
                  {profile?.preferences?.weight_kg && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Info className="w-3 h-3" />
                      <span>
                        Current: {profile.preferences.weight_kg} kg
                        {profile.preferences.weight_kg <
                          idealWeightRange.minWeight && " (Below range)"}
                        {profile.preferences.weight_kg >
                          idealWeightRange.maxWeight && " (Above range)"}
                        {profile.preferences.weight_kg >=
                          idealWeightRange.minWeight &&
                          profile.preferences.weight_kg <=
                            idealWeightRange.maxWeight &&
                          " (Healthy range)"}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Physical Stats */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Height</p>
                  <p className="text-sm font-medium">
                    {physicalStats.height_cm} cm
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Weight</p>
                  <p className="text-sm font-medium">
                    {physicalStats.weight_kg} kg
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Age</p>
                  <p className="text-sm font-medium">
                    {physicalStats.age} years
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Activity</p>
                  <p className="text-sm font-medium capitalize">
                    {physicalStats.activity_level.replace("_", " ")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Nutrition Goals Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  {t("settings.nutrition.title")}
                </CardTitle>
                <CardDescription>
                  {t("settings.nutrition.description")}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoCalculate}
                disabled={!profile?.preferences?.age}
              >
                <Calculator className="w-4 h-4 mr-2" />
                Auto Calculate
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Macro Distribution Visual */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Macro Distribution
                </span>
                <span className="text-xs text-muted-foreground">
                  {totalMacroCalories.toLocaleString()} kcal from macros
                </span>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500"
                  style={{ width: `${proteinPercent}%` }}
                  title={`Protein: ${proteinPercent}%`}
                />
                <div
                  className="bg-yellow-500"
                  style={{ width: `${carbsPercent}%` }}
                  title={`Carbs: ${carbsPercent}%`}
                />
                <div
                  className="bg-red-500"
                  style={{ width: `${fatPercent}%` }}
                  title={`Fat: ${fatPercent}%`}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-blue-500" />
                  Protein {proteinPercent}%
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-yellow-500" />
                  Carbs {carbsPercent}%
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-500" />
                  Fat {fatPercent}%
                </span>
              </div>
            </div>

            {/* Calories */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{t("settings.nutrition.calorieGoal")}</Label>
                <span className="text-2xl font-bold text-primary">
                  {nutritionGoals.calories.toLocaleString()}
                </span>
              </div>
              <Slider
                value={[nutritionGoals.calories]}
                onValueChange={([value]) =>
                  setNutritionGoals({ ...nutritionGoals, calories: value })
                }
                min={1000}
                max={5000}
                step={50}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1,000</span>
                <span>5,000 cal</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                {t("settings.nutrition.quickPresets")}
              </Label>
              <div className="flex flex-wrap gap-2">
                {[1500, 1800, 2000, 2200, 2500].map((preset) => (
                  <Button
                    key={preset}
                    variant={
                      nutritionGoals.calories === preset ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setNutritionGoals({ ...nutritionGoals, calories: preset })
                    }
                  >
                    {preset.toLocaleString()}
                  </Button>
                ))}
              </div>
            </div>

            {/* Macros sliders */}
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-sm font-semibold">Macronutrients</Label>

              {/* Protein */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Protein</Label>
                  <span className="text-sm font-semibold text-primary">
                    {nutritionGoals.protein}g (
                    {Math.round(nutritionGoals.protein * 4)} kcal)
                  </span>
                </div>
                <Slider
                  value={[nutritionGoals.protein]}
                  onValueChange={([value]) =>
                    setNutritionGoals({ ...nutritionGoals, protein: value })
                  }
                  min={50}
                  max={300}
                  step={5}
                />
              </div>

              {/* Carbs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Carbs</Label>
                  <span className="text-sm font-semibold text-primary">
                    {nutritionGoals.carbs}g (
                    {Math.round(nutritionGoals.carbs * 4)} kcal)
                  </span>
                </div>
                <Slider
                  value={[nutritionGoals.carbs]}
                  onValueChange={([value]) =>
                    setNutritionGoals({ ...nutritionGoals, carbs: value })
                  }
                  min={100}
                  max={500}
                  step={10}
                />
              </div>

              {/* Fat */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Fat</Label>
                  <span className="text-sm font-semibold text-primary">
                    {nutritionGoals.fat}g ({Math.round(nutritionGoals.fat * 9)}{" "}
                    kcal)
                  </span>
                </div>
                <Slider
                  value={[nutritionGoals.fat]}
                  onValueChange={([value]) =>
                    setNutritionGoals({ ...nutritionGoals, fat: value })
                  }
                  min={30}
                  max={150}
                  step={5}
                />
              </div>

              {/* Fiber */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Fiber</Label>
                  <span className="text-sm font-semibold text-primary">
                    {nutritionGoals.fiber}g
                  </span>
                </div>
                <Slider
                  value={[nutritionGoals.fiber]}
                  onValueChange={([value]) =>
                    setNutritionGoals({ ...nutritionGoals, fiber: value })
                  }
                  min={15}
                  max={50}
                  step={1}
                />
              </div>
            </div>

            {/* Validation Warning */}
            {Math.abs(totalMacroCalories - nutritionGoals.calories) > 100 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Macro Mismatch</AlertTitle>
                <AlertDescription className="text-xs">
                  Your macros total {totalMacroCalories.toLocaleString()} kcal,
                  but your calorie goal is{" "}
                  {nutritionGoals.calories.toLocaleString()} kcal. Consider
                  adjusting your macros or calorie goal.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full"
          size="lg"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("settings.saving")}
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {t("settings.save")}
            </>
          )}
        </Button>
      </main>

      <BottomNav />
    </div>
  );
};

export default Settings;
