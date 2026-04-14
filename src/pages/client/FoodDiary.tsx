import React, { useState, useMemo, useEffect } from "react";
import { format, isToday, isYesterday, parseISO, isSameDay, subDays, startOfDay } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { PenLine, Plus, Search as SearchIcon, Loader2 as Loader2Icon, Info, Star, Leaf, ChevronRight } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useAuthContext } from "@/contexts/AuthContext";
import { useFoodDiary } from "@/hooks/useFoodDiary";
import { useMealProgress } from "@/hooks/useMealProgress";
import { MonthlyCalorieCalendar } from "@/components/MonthlyCalorieCalendar";
import { cn } from "@/lib/utils";
import {
    BookOpen,
    Camera,
    Calendar,
    Trash2,
    Flame,
    CheckCircle2,
    UtensilsCrossed,
    TrendingUp,
    CalendarIcon,
    X,
    StickyNote,
    Edit3,
    Check,
    BarChart3,
    Zap,
    Sunrise,
    Sun,
    Moon,
    Apple,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts";
import { useNavigate } from "react-router-dom";

const FoodDiary: React.FC = () => {
    const navigate = useNavigate();
    const { user, profile, loading: authLoading } = useAuthContext();
    const {
        entries,
        loading: diaryLoading,
        deleteEntry,
        updateEntryNotes,
        getTodaysTotals,
        addManualEntry,
    } = useFoodDiary(user?.id);
    const { progress, loading: progressLoading, getDayProgress } = useMealProgress(user?.id);
    const [activeTab, setActiveTab] = useState("scanned");
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [noteText, setNoteText] = useState("");
    // URL params from BottomNav
    const [searchParams, setSearchParams] = useSearchParams();

    // Log Meal states
    const [showLogModal, setShowLogModal] = useState(false);
    const [logMealType, setLogMealType] = useState("lunch");
    const [logItems, setLogItems] = useState<any[]>([]); // food items (log thẳng)
    const [logSearch, setLogSearch] = useState("");
    const [logSearchResults, setLogSearchResults] = useState<any[]>([]);
    const [logSearching, setLogSearching] = useState(false);
    const [logNotes, setLogNotes] = useState("");
    const [logSaving, setLogSaving] = useState(false);

    // Recipe detail states
    const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
    const [recipeIngredients, setRecipeIngredients] = useState<any[]>([]);
    const [loadingIngredients, setLoadingIngredients] = useState(false);
    const [editedIngredients, setEditedIngredients] = useState(false);
    const [recipeName, setRecipeName] = useState("");

    // Entry detail modal
    const [selectedEntry, setSelectedEntry] = useState<(typeof entries)[0] | null>(null);

    // Submit to admin
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Handle URL action params
    useEffect(() => {
        const action = searchParams.get("action");
        if (action === "log") {
            setShowLogModal(true);
            setLogMealType(guessMealType());
            setSearchParams({}, { replace: true });
        }
        if (action === "scan") {
            const scanner = document.querySelector("[data-scanner]");
            if (scanner) scanner.scrollIntoView({ behavior: "smooth" });
            setSearchParams({}, { replace: true });
        }
    }, [searchParams]);

    const guessMealType = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 10) return "breakfast";
        if (hour >= 10 && hour < 14) return "lunch";
        if (hour >= 14 && hour < 17) return "snack";
        return "dinner";
    };

    // Search recipes + foods
    const handleLogSearch = async (query: string) => {
        setLogSearch(query);
        if (query.length < 2) {
            setLogSearchResults([]);
            return;
        }
        setLogSearching(true);

        const [recipesRes, foodsRes] = await Promise.all([
            api.get("/recipes", { params: { q: query, is_approved: true, limit: 5 } }),
            api.get("/foods", { params: { q: query, limit: 5 } }),
        ]);

        const results = [
            ...((recipesRes.data?.data || []).map((r: any) => ({
                id: r._id,
                name: r.name_vi,
                type: "recipe" as const,
                calories: r.calories || 0,
                protein: r.protein || 0,
                carbs: r.carbs || 0,
                fat: r.fat || 0,
                fiber: 0,
                servings: r.servings || 1,
                isOwn: false,
            }))),
            ...((foodsRes.data?.data || []).map((f: any) => ({
                id: f._id,
                name: f.name_vi,
                type: "food" as const,
                calories: f.energy_kcal || 0,
                protein: f.protein || 0,
                carbs: f.glucid || 0,
                fat: f.lipid || 0,
                fiber: f.fiber || 0,
            }))),
        ];

        setLogSearchResults(results);
        setLogSearching(false);
    };

    // Chọn recipe → load ingredients
    const selectRecipe = async (recipe: any) => {
        setSelectedRecipe(recipe);
        setRecipeName(recipe.name);
        setLogSearch("");
        setLogSearchResults([]);
        setEditedIngredients(false);
        setLoadingIngredients(true);

        const { data: recipeDetail } = await api.get(`/recipes/${recipe.id}`);
        setRecipeIngredients(
            (recipeDetail.ingredients || []).map((ing: any) => ({
                id: ing._id,
                food_id: ing.food_id?._id || ing.food_id,
                name: ing.food_id?.name_vi || "Unknown",
                amount: ing.amount,
                unit: ing.unit,
                calories: ing.food_id?.energy_kcal || 0,
                protein: ing.food_id?.protein || 0,
                carbs: ing.food_id?.glucid || 0,
                fat: ing.food_id?.lipid || 0,
                fiber: ing.food_id?.fiber || 0,
            })),
        );
        setLoadingIngredients(false);
    };

    // Chọn food → add thẳng vào list (weight_grams default 100g)
    const addFoodItem = (item: any) => {
        setLogItems([...logItems, { ...item, weight_grams: 100 }]);
        setLogSearch("");
        setLogSearchResults([]);
    };

    const removeLogItem = (index: number) => {
        setLogItems(logItems.filter((_, i) => i !== index));
    };

    const updateLogWeight = (index: number, grams: number) => {
        const updated = [...logItems];
        updated[index].weight_grams = grams;
        setLogItems(updated);
    };

    // Recipe ingredient editing
    const updateIngredientAmount = (index: number, amount: number) => {
        const updated = [...recipeIngredients];
        updated[index].amount = amount;
        setRecipeIngredients(updated);
        setEditedIngredients(true);
    };

    const removeIngredient = (index: number) => {
        setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
        setEditedIngredients(true);
    };

    // Add ingredient to recipe via search
    const [ingSearch, setIngSearch] = useState("");
    const [ingSearchResults, setIngSearchResults] = useState<any[]>([]);
    const [ingSearching, setIngSearching] = useState(false);

    const searchIngredient = async (query: string) => {
        setIngSearch(query);
        if (query.length < 2) {
            setIngSearchResults([]);
            return;
        }
        setIngSearching(true);
        try {
            const { data } = await api.get("/foods", { params: { q: query, limit: 8 } });
            setIngSearchResults((data.data || []).map((f: any) => ({ ...f, id: f._id })));
        } catch { setIngSearchResults([]); }
        setIngSearching(false);
    };

    const addIngredientToRecipe = (food: any) => {
        setRecipeIngredients([
            ...recipeIngredients,
            {
                food_id: food.id,
                name: food.name_vi,
                amount: 100,
                unit: "g",
                calories: food.energy_kcal || 0,
                protein: food.protein || 0,
                carbs: food.glucid || 0,
                fat: food.lipid || 0,
                fiber: food.fiber || 0,
            },
        ]);
        setIngSearch("");
        setIngSearchResults([]);
        setEditedIngredients(true);
    };

    // Calculate recipe totals from ingredients
    const getRecipeTotals = () => {
        return recipeIngredients.reduce(
            (sum, ing) => {
                const ratio = ing.amount / 100;
                return {
                    calories: sum.calories + Math.round(ing.calories * ratio),
                    protein: sum.protein + Math.round(ing.protein * ratio),
                    carbs: sum.carbs + Math.round(ing.carbs * ratio),
                    fat: sum.fat + Math.round(ing.fat * ratio),
                    fiber: sum.fiber + Math.round(ing.fiber * ratio),
                };
            },
            { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
        );
    };

    // Calculate food items totals (calories stored per 100g in DB)
    const getLogTotals = () => {
        return logItems.reduce(
            (sum, item) => {
                const w = item.weight_grams ?? 100;
                return {
                    calories: sum.calories + Math.round(item.calories * w / 100),
                    protein: sum.protein + Math.round(item.protein * w / 100),
                    carbs: sum.carbs + Math.round(item.carbs * w / 100),
                    fat: sum.fat + Math.round(item.fat * w / 100),
                    fiber: sum.fiber + Math.round(item.fiber * w / 100),
                };
            },
            { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
        );
    };

    // Combined totals
    const getCombinedTotals = () => {
        const recipeTotals = selectedRecipe
            ? getRecipeTotals()
            : { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
        const foodTotals = getLogTotals();
        return {
            calories: recipeTotals.calories + foodTotals.calories,
            protein: recipeTotals.protein + foodTotals.protein,
            carbs: recipeTotals.carbs + foodTotals.carbs,
            fat: recipeTotals.fat + foodTotals.fat,
            fiber: recipeTotals.fiber + foodTotals.fiber,
        };
    };

    // Save: log diary + optionally save as My Recipe
    const handleLogSave = async () => {
        if (!selectedRecipe && logItems.length === 0) return;
        setLogSaving(true);

        const totals = getCombinedTotals();
        const foods: any[] = [];

        // Recipe ingredients
        if (selectedRecipe && recipeIngredients.length > 0) {
            recipeIngredients.forEach((ing) => {
                const ratio = ing.amount / 100;
                foods.push({
                    name: ing.name,
                    portion: `${ing.amount}${ing.unit}`,
                    calories: Math.round(ing.calories * ratio),
                    protein: Math.round(ing.protein * ratio),
                    carbs: Math.round(ing.carbs * ratio),
                    fat: Math.round(ing.fat * ratio),
                    fiber: Math.round(ing.fiber * ratio),
                });
            });

            // Save as My Recipe if edited
            if (editedIngredients && profile?.id) {
                await api.post("/recipes", {
                    name_vi: recipeName || selectedRecipe.name,
                    calories: totals.calories,
                    protein: totals.protein,
                    carbs: totals.carbs,
                    fat: totals.fat,
                    servings: 1,
                    is_public: false,
                    is_approved: false,
                    ingredients: recipeIngredients.map((ing, i) => ({
                        food_id: ing.food_id,
                        amount: ing.amount,
                        unit: ing.unit,
                        sort_order: i,
                    })),
                });
            }
        }

        // Food items
        logItems.forEach((item) => {
            const w = item.weight_grams ?? 100;
            foods.push({
                name: item.name,
                portion: `${w}g`,
                calories: Math.round(item.calories * w / 100),
                protein: Math.round(item.protein * w / 100),
                carbs: Math.round(item.carbs * w / 100),
                fat: Math.round(item.fat * w / 100),
                fiber: Math.round(item.fiber * w / 100),
            });
        });

        await addManualEntry({
            foods,
            totals,
            mealType: logMealType,
            notes: logNotes || undefined,
        });

        resetLogModal();
        setLogSaving(false);
    };

    // Submit My Recipe to admin for approval
    const handleSubmitToAdmin = async () => {
        if (!selectedRecipe || !profile?.id) return;
        setSubmitting(true);

        // Save recipe first if not saved yet
        const recipeTotals = getRecipeTotals();
        await api.post("/recipes", {
            name_vi: recipeName || selectedRecipe.name,
            calories: recipeTotals.calories,
            protein: recipeTotals.protein,
            carbs: recipeTotals.carbs,
            fat: recipeTotals.fat,
            servings: 1,
            is_public: true,
            is_approved: false,
            ingredients: recipeIngredients.map((ing, i) => ({
                food_id: ing.food_id,
                amount: ing.amount,
                unit: ing.unit,
                sort_order: i,
            })),
        });

        setSubmitting(false);
        setShowSubmitConfirm(false);
    };

    const resetLogModal = () => {
        setLogItems([]);
        setLogSearch("");
        setLogSearchResults([]);
        setLogNotes("");
        setSelectedRecipe(null);
        setRecipeIngredients([]);
        setEditedIngredients(false);
        setRecipeName("");
        setIngSearch("");
        setIngSearchResults([]);
        setShowLogModal(false);
        setShowSubmitConfirm(false);
    };

    const clearRecipe = () => {
        setSelectedRecipe(null);
        setRecipeIngredients([]);
        setEditedIngredients(false);
        setRecipeName("");
        setIngSearch("");
        setIngSearchResults([]);
    };

    const loading = authLoading || diaryLoading || progressLoading;
    const todaysTotals = getTodaysTotals();

    const formatDate = (dateStr: string) => {
        const date = parseISO(dateStr);
        if (isToday(date)) return "Today";
        if (isYesterday(date)) return "Yesterday";
        return format(date, "MMM d, yyyy");
    };

    const formatTime = (dateStr: string) => {
        return format(parseISO(dateStr), "h:mm a");
    };

    const getMealTypeIcon = (mealType: string) => {
        const cls = "w-4 h-4 text-primary";
        switch (mealType) {
            case "breakfast": return <Sunrise className={cls} />;
            case "lunch":     return <Sun className={cls} />;
            case "dinner":    return <Moon className={cls} />;
            case "snack":     return <Apple className={cls} />;
            default:          return <UtensilsCrossed className={cls} />;
        }
    };

    const getRecipeById = (_recipeId: string) => null;

    // Filter entries by selected date
    const filteredEntries = useMemo(() => {
        if (!selectedDate) return entries;
        return entries.filter((entry) => isSameDay(parseISO(entry.scanned_at), selectedDate));
    }, [entries, selectedDate]);

    // Get dates that have entries for calendar highlighting
    const datesWithEntries = useMemo(() => {
        return entries.map((entry) => parseISO(entry.scanned_at));
    }, [entries]);

    // Calculate weekly calorie data for the chart
    const weeklyCalorieData = useMemo(() => {
        const today = startOfDay(new Date());
        const data = [];

        for (let i = 6; i >= 0; i--) {
            const date = subDays(today, i);
            const dayEntries = entries.filter((entry) =>
                isSameDay(parseISO(entry.scanned_at), date),
            );
            const totalCalories = dayEntries.reduce(
                (sum, entry) => sum + (entry.totals.calories || 0),
                0,
            );

            data.push({
                day: format(date, "EEE"),
                date: format(date, "MMM d"),
                calories: totalCalories,
                goal: profile?.daily_nutrition_goals?.calories || 2000,
            });
        }

        return data;
    }, [entries, profile?.daily_nutrition_goals?.calories]);

    // Calculate calorie goal streak
    const streakData = useMemo(() => {
        const goal = profile?.daily_nutrition_goals?.calories || 2000;
        const today = startOfDay(new Date());

        // Build a map of daily calorie totals
        const dailyTotals = new Map<string, number>();
        entries.forEach((entry) => {
            const dateKey = format(parseISO(entry.scanned_at), "yyyy-MM-dd");
            const current = dailyTotals.get(dateKey) || 0;
            dailyTotals.set(dateKey, current + (entry.totals.calories || 0));
        });

        // Count streak going backwards from yesterday (today is still in progress)
        let currentStreak = 0;
        let bestStreak = 0;
        let tempStreak = 0;

        // Check up to 365 days back for best streak calculation
        const allDates: { date: Date; hitGoal: boolean }[] = [];
        for (let i = 1; i <= 365; i++) {
            const date = subDays(today, i);
            const dateKey = format(date, "yyyy-MM-dd");
            const calories = dailyTotals.get(dateKey) || 0;
            // Hit goal if calories are between 80% and 115% of goal
            const hitGoal = calories > 0 && calories >= goal * 0.8 && calories <= goal * 1.15;
            allDates.push({ date, hitGoal });
        }

        // Calculate current streak (consecutive days from yesterday)
        for (const { hitGoal } of allDates) {
            if (hitGoal) {
                currentStreak++;
            } else {
                break;
            }
        }

        // Calculate best streak
        for (const { hitGoal } of allDates) {
            if (hitGoal) {
                tempStreak++;
                bestStreak = Math.max(bestStreak, tempStreak);
            } else {
                tempStreak = 0;
            }
        }

        // Check if today is on track
        const todayKey = format(today, "yyyy-MM-dd");
        const todayCalories = dailyTotals.get(todayKey) || 0;
        const todayOnTrack = todayCalories > 0 && todayCalories <= goal * 1.15;

        return {
            currentStreak,
            bestStreak: Math.max(bestStreak, currentStreak),
            todayOnTrack,
            todayCalories,
        };
    }, [entries, profile?.daily_nutrition_goals?.calories]);

    // Group entries by date
    const groupedEntries = filteredEntries.reduce(
        (groups, entry) => {
            const dateKey = formatDate(entry.scanned_at);
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(entry);
            return groups;
        },
        {} as Record<string, typeof filteredEntries>,
    );

    // Group completed meals by day
    const groupedProgress = progress.reduce(
        (groups, meal) => {
            const key = `Day ${meal.day_number}`;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(meal);
            return groups;
        },
        {} as Record<string, typeof progress>,
    );

    const calorieDiffText = (c = 0, g = 0) =>
        `${Number(Math.abs(c - g).toFixed(1))} ${c <= g ? "remaining" : "over"}`;

    if (!user && !authLoading) {
        return (
            <div className="min-h-screen gradient-fresh pb-24">
                <Header />
                <main className="container px-4 py-6">
                    <Card className="p-8 text-center">
                        <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h2 className="text-xl font-bold mb-2">Sign in to view your Food Diary</h2>
                        <p className="text-muted-foreground mb-4">
                            Track your meals and nutrition by signing in
                        </p>
                        <Button onClick={() => navigate("/auth")}>Sign In</Button>
                    </Card>
                </main>
                <BottomNav />
            </div>
        );
    }

    return (
        <div className="min-h-screen gradient-fresh pb-24">
            <Header />

            <main className="container px-4 py-6 space-y-6">
                {/* Page Header */}
                <section className="animate-slide-up">
                    <div className="flex items-center gap-3 mb-1">
                        <BookOpen className="w-7 h-7 text-primary" />
                        <h2 className="text-2xl font-bold text-foreground">Food Diary</h2>
                    </div>
                    <p className="text-muted-foreground">Your complete nutrition history</p>
                </section>

                {/* Today's Nutrition Summary with Calorie Goal Progress */}
                <Card className="animate-slide-up-delay-1 overflow-hidden">
                    <div className="bg-gradient-to-r from-primary/10 to-accent/30 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Flame className="w-5 h-5 text-primary" />
                                <h3 className="font-semibold text-foreground">Today's Nutrition</h3>
                            </div>
                            {profile?.daily_nutrition_goals?.calories && (
                                <span className="text-xs text-muted-foreground">
                                    Goal:{" "}
                                    {profile?.daily_nutrition_goals?.calories.toLocaleString()} cal
                                </span>
                            )}
                        </div>

                        {/* Calorie Goal Progress Bar */}
                        {profile?.daily_nutrition_goals?.calories && (
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-sm font-medium text-foreground">
                                        {todaysTotals.calories} /{" "}
                                        {profile?.daily_nutrition_goals?.calories} cal
                                    </span>
                                    <span
                                        className={cn(
                                            "text-xs font-medium",
                                            todaysTotals.calories >
                                                profile?.daily_nutrition_goals?.calories
                                                ? "text-destructive"
                                                : "text-primary",
                                        )}
                                    >
                                        {calorieDiffText(
                                            todaysTotals?.calories,
                                            profile?.daily_nutrition_goals?.calories,
                                        )}
                                    </span>
                                </div>
                                <div className="h-3 bg-background/80 rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all duration-500",
                                            todaysTotals.calories >
                                                profile?.daily_nutrition_goals?.calories
                                                ? "bg-destructive"
                                                : "bg-gradient-to-r from-primary to-primary/70",
                                        )}
                                        style={{
                                            width: `${Math.min((todaysTotals.calories / profile?.daily_nutrition_goals?.calories) * 100, 100)}%`,
                                        }}
                                    />
                                </div>
                                <div className="flex justify-between mt-1">
                                    <span className="text-[10px] text-muted-foreground">0%</span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {Math.round(
                                            (todaysTotals.calories /
                                                profile?.daily_nutrition_goals?.calories) *
                                                100,
                                        )}
                                        %
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">100%</span>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-4 gap-2">
                            <div className="bg-background/80 rounded-xl p-3 text-center">
                                <p className="text-xl font-bold text-primary">
                                    {todaysTotals.calories}
                                </p>
                                <p className="text-xs text-muted-foreground">Calories</p>
                            </div>
                            <div className="bg-background/80 rounded-xl p-3 text-center">
                                <p className="text-xl font-bold text-foreground">
                                    {todaysTotals.protein}g
                                </p>
                                <p className="text-xs text-muted-foreground">Protein</p>
                            </div>
                            <div className="bg-background/80 rounded-xl p-3 text-center">
                                <p className="text-xl font-bold text-foreground">
                                    {todaysTotals.carbs}g
                                </p>
                                <p className="text-xs text-muted-foreground">Carbs</p>
                            </div>
                            <div className="bg-background/80 rounded-xl p-3 text-center">
                                <p className="text-xl font-bold text-foreground">
                                    {todaysTotals.fat}g
                                </p>
                                <p className="text-xs text-muted-foreground">Fat</p>
                            </div>
                        </div>
                        {todaysTotals.fiber > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground text-center">
                                + {todaysTotals.fiber}g fiber
                            </div>
                        )}
                    </div>
                </Card>

                {/* Weekly Calorie Trend Chart */}
                <Card className="animate-slide-up-delay-2">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-primary" />
                                <CardTitle className="text-base">Weekly Calorie Trend</CardTitle>
                            </div>
                            <span className="text-xs text-muted-foreground">Last 7 days</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[180px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={weeklyCalorieData}
                                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient
                                            id="calorieGradient"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="5%"
                                                stopColor="hsl(var(--primary))"
                                                stopOpacity={0.3}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor="hsl(var(--primary))"
                                                stopOpacity={0}
                                            />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="day"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{
                                            fontSize: 11,
                                            fill: "hsl(var(--muted-foreground))",
                                        }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{
                                            fontSize: 11,
                                            fill: "hsl(var(--muted-foreground))",
                                        }}
                                        width={40}
                                    />
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                                                        <p className="text-xs text-muted-foreground">
                                                            {data.date}
                                                        </p>
                                                        <p className="text-sm font-semibold text-foreground">
                                                            {data.calories.toLocaleString()} cal
                                                        </p>
                                                        {profile?.daily_nutrition_goals
                                                            ?.calories && (
                                                            <p
                                                                className={cn(
                                                                    "text-xs",
                                                                    data.calories > data.goal
                                                                        ? "text-destructive"
                                                                        : "text-primary",
                                                                )}
                                                            >
                                                                {data.calories <= data.goal
                                                                    ? `${data.goal - data.calories} under goal`
                                                                    : `${data.calories - data.goal} over goal`}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    {profile?.daily_nutrition_goals?.calories && (
                                        <ReferenceLine
                                            y={profile?.daily_nutrition_goals?.calories}
                                            stroke="hsl(var(--muted-foreground))"
                                            strokeDasharray="4 4"
                                            strokeOpacity={0.5}
                                        />
                                    )}
                                    <Area
                                        type="monotone"
                                        dataKey="calories"
                                        stroke="hsl(var(--primary))"
                                        strokeWidth={2}
                                        fill="url(#calorieGradient)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        {profile?.daily_nutrition_goals?.calories && (
                            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-0.5 bg-primary rounded" />
                                    <span>Daily calories</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-0.5 border-t border-dashed border-muted-foreground" />
                                    <span>Goal ({profile?.daily_nutrition_goals?.calories})</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Monthly Calendar View */}
                <Card className="animate-slide-up-delay-3">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-primary" />
                            <CardTitle className="text-base">Monthly Overview</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <MonthlyCalorieCalendar
                            entries={entries}
                            calorieGoal={profile?.daily_nutrition_goals?.calories || 2000}
                            onDateSelect={(date) => {
                                setSelectedDate(date);
                                setActiveTab("scanned");
                            }}
                        />
                    </CardContent>
                </Card>

                {/* Quick Stats with Streak */}
                <div className="grid grid-cols-3 gap-3 animate-slide-up-delay-4">
                    <Card className="p-4">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Camera className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-xl font-bold">{entries.length}</p>
                                <p className="text-[10px] text-muted-foreground">Meals</p>
                            </div>
                        </div>
                    </Card>
                    <Card
                        className={cn(
                            "p-4",
                            streakData.currentStreak > 0 &&
                                "bg-gradient-to-br from-primary/10 to-accent/20",
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <div
                                className={cn(
                                    "w-9 h-9 rounded-xl flex items-center justify-center",
                                    streakData.currentStreak > 0 ? "bg-primary/20" : "bg-muted",
                                )}
                            >
                                <Zap
                                    className={cn(
                                        "w-4 h-4",
                                        streakData.currentStreak > 0
                                            ? "text-primary"
                                            : "text-muted-foreground",
                                    )}
                                />
                            </div>
                            <div>
                                <p className="text-xl font-bold">{streakData.currentStreak}</p>
                                <p className="text-[10px] text-muted-foreground">Day Streak</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-accent/50 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-xl font-bold">{progress.length}</p>
                                <p className="text-[10px] text-muted-foreground">Plan Done</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Streak Info Banner */}
                {streakData.currentStreak > 0 && (
                    <Card className="p-3 bg-gradient-to-r from-primary/5 to-accent/10 border-primary/20 animate-slide-up-delay-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">🔥</span>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">
                                        {streakData.currentStreak} day streak!
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {streakData.todayOnTrack
                                            ? "Keep it up today!"
                                            : "Log your meals to continue the streak"}
                                    </p>
                                </div>
                            </div>
                            {streakData.bestStreak > streakData.currentStreak && (
                                <div className="text-right">
                                    <p className="text-xs text-muted-foreground">Best</p>
                                    <p className="text-sm font-bold text-primary">
                                        {streakData.bestStreak} days
                                    </p>
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                {/* Tabs */}
                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="animate-slide-up-delay-2"
                >
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="scanned" className="flex items-center gap-2">
                                <Camera className="w-4 h-4" />
                                Scanned
                            </TabsTrigger>
                            <TabsTrigger value="plan" className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Plan Progress
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Date Picker - only show for scanned tab */}
                    {activeTab === "scanned" && (
                        <div className="flex items-center gap-2 mb-4">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "justify-start text-left font-normal flex-1",
                                            !selectedDate && "text-muted-foreground",
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {selectedDate
                                            ? format(selectedDate, "PPP")
                                            : "Filter by date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <CalendarComponent
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        disabled={(date) => date > new Date()}
                                        initialFocus
                                        modifiers={{
                                            hasEntries: datesWithEntries,
                                        }}
                                        modifiersStyles={{
                                            hasEntries: {
                                                fontWeight: "bold",
                                                textDecoration: "underline",
                                                textDecorationColor: "hsl(var(--primary))",
                                            },
                                        }}
                                    />
                                </PopoverContent>
                            </Popover>
                            {selectedDate && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSelectedDate(undefined)}
                                    className="shrink-0"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Scanned Meals Tab */}
                    <TabsContent value="scanned" className="mt-4 space-y-4">
                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <Card key={i} className="p-4">
                                        <div className="flex gap-4">
                                            <Skeleton className="w-20 h-20 rounded-xl" />
                                            <div className="flex-1 space-y-2">
                                                <Skeleton className="h-5 w-32" />
                                                <Skeleton className="h-4 w-48" />
                                                <Skeleton className="h-4 w-24" />
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : filteredEntries.length === 0 ? (
                            <Card className="p-8 text-center">
                                <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                                <h3 className="font-semibold mb-1">
                                    {selectedDate
                                        ? `No meals on ${format(selectedDate, "PPP")}`
                                        : "No scanned meals yet"}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    {selectedDate
                                        ? "Try selecting a different date or clear the filter"
                                        : "Use the AI scanner to log your meals"}
                                </p>
                                {selectedDate ? (
                                    <Button
                                        variant="outline"
                                        onClick={() => setSelectedDate(undefined)}
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Clear Filter
                                    </Button>
                                ) : (
                                    <Button onClick={() => navigate("/")}>
                                        <Camera className="w-4 h-4 mr-2" />
                                        Scan Your First Meal
                                    </Button>
                                )}
                            </Card>
                        ) : (
                            Object.entries(groupedEntries).map(([date, dateEntries]) => (
                                <div key={date}>
                                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        {date}
                                    </h4>
                                    <div className="space-y-3">
                                        {dateEntries.map((entry, entryIdx) => (
                                            <Card
                                                key={entry.id || (entry as any)._id || String(entryIdx)}
                                                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                                                onClick={() => setSelectedEntry(entry)}
                                            >
                                                <CardContent className="p-4">
                                                    <div className="flex gap-4">
                                                        {entry.image_url && (
                                                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                                                                <img
                                                                    src={entry.image_url}
                                                                    alt="Meal"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span>
                                                                            {getMealTypeIcon(
                                                                                entry.meal_type,
                                                                            )}
                                                                        </span>
                                                                        <Badge
                                                                            variant="secondary"
                                                                            className="capitalize"
                                                                        >
                                                                            {entry.meal_type}
                                                                        </Badge>
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {formatTime(
                                                                                entry.scanned_at,
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm text-foreground font-medium truncate">
                                                                        {entry.foods
                                                                            .map((f) => f.dish_name || f.matched_name || "")
                                                                            .filter(Boolean)
                                                                            .join(", ")}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-1 shrink-0">
                                                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="text-muted-foreground hover:text-destructive h-7 w-7"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            deleteEntry(entry.id || (entry as any)._id);
                                                                        }}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-2 text-sm">
                                                                <div className="flex items-center gap-1 text-calories">
                                                                    <Flame className="w-4 h-4" />
                                                                    <span className="font-semibold">
                                                                        {entry.totals.calories}
                                                                    </span>
                                                                    <span className="text-muted-foreground text-xs">cal</span>
                                                                </div>
                                                                {entry.totals.protein > 0 && (
                                                                    <span className="text-xs text-muted-foreground">
                                                                        P {entry.totals.protein}g · C {entry.totals.carbs}g · F {entry.totals.fat}g
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Notes Section */}
                                                    <div className="mt-3 pt-3 border-t border-border/50">
                                                        {editingNoteId === entry.id ? (
                                                            <div className="space-y-2">
                                                                <Textarea
                                                                    value={noteText}
                                                                    onChange={(e) =>
                                                                        setNoteText(e.target.value)
                                                                    }
                                                                    placeholder="Add a note about this meal..."
                                                                    className="min-h-[60px] text-sm"
                                                                />
                                                                <div className="flex gap-2 justify-end">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setEditingNoteId(null);
                                                                            setNoteText("");
                                                                        }}
                                                                    >
                                                                        <X className="w-3 h-3 mr-1" />
                                                                        Cancel
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={async () => {
                                                                            await updateEntryNotes(
                                                                                entry.id,
                                                                                noteText || null,
                                                                            );
                                                                            setEditingNoteId(null);
                                                                            setNoteText("");
                                                                        }}
                                                                    >
                                                                        <Check className="w-3 h-3 mr-1" />
                                                                        Save
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-start gap-2">
                                                                <StickyNote className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                                                {entry.notes ? (
                                                                    <p className="text-sm text-muted-foreground flex-1">
                                                                        {entry.notes}
                                                                    </p>
                                                                ) : (
                                                                    <p className="text-sm text-muted-foreground/60 italic flex-1">
                                                                        No notes
                                                                    </p>
                                                                )}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                                    onClick={() => {
                                                                        setEditingNoteId(entry.id);
                                                                        setNoteText(
                                                                            entry.notes || "",
                                                                        );
                                                                    }}
                                                                >
                                                                    <Edit3 className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </TabsContent>

                    {/* Plan Progress Tab */}
                    <TabsContent value="plan" className="mt-4 space-y-4">
                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <Card key={i} className="p-4">
                                        <Skeleton className="h-5 w-24 mb-3" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-12 w-full" />
                                            <Skeleton className="h-12 w-full" />
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : progress.length === 0 ? (
                            <Card className="p-8 text-center">
                                <UtensilsCrossed className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                                <h3 className="font-semibold mb-1">No completed meals yet</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Start the 21-day plan to track your progress
                                </p>
                                <Button onClick={() => navigate("/meal-plan")}>
                                    <Calendar className="w-4 h-4 mr-2" />
                                    View Meal Plan
                                </Button>
                            </Card>
                        ) : (
                            Object.entries(groupedProgress)
                                .sort((a, b) => {
                                    const dayA = parseInt(a[0].replace("Day ", ""));
                                    const dayB = parseInt(b[0].replace("Day ", ""));
                                    return dayB - dayA;
                                })
                                .map(([dayLabel, dayMeals]) => {
                                    const dayNumber = parseInt(dayLabel.replace("Day ", ""));
                                    const dayProgressData = getDayProgress(dayNumber);

                                    return (
                                        <Card key={dayLabel}>
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-base flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-primary" />
                                                        {dayLabel}
                                                    </CardTitle>
                                                    <Badge
                                                        variant={
                                                            dayProgressData.percentage === 100
                                                                ? "default"
                                                                : "secondary"
                                                        }
                                                    >
                                                        {dayProgressData.completed}/
                                                        {dayProgressData.total} meals
                                                    </Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-2">
                                                {dayMeals.map((meal) => {
                                                    const recipe = getRecipeById(meal.recipe_id);
                                                    return (
                                                        <div
                                                            key={meal.id}
                                                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span>
                                                                    {getMealTypeIcon(
                                                                        meal.meal_type,
                                                                    )}
                                                                </span>
                                                                <div>
                                                                    <p className="text-sm font-medium capitalize">
                                                                        {meal.meal_type}
                                                                    </p>
                                                                    {recipe && (
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {recipe.title}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {recipe && (
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {recipe.calories} cal
                                                                    </span>
                                                                )}
                                                                <CheckCircle2 className="w-5 h-5 text-primary" />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </CardContent>
                                        </Card>
                                    );
                                })
                        )}
                    </TabsContent>
                </Tabs>
            </main>

            {/* ── Entry Detail Modal ─────────────────────────────────────── */}
            <Dialog open={!!selectedEntry} onOpenChange={(open) => { if (!open) setSelectedEntry(null); }}>
                <DialogContent className="max-w-sm w-full p-0 overflow-hidden flex flex-col max-h-[90vh]">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Chi tiết bữa ăn</DialogTitle>
                    </DialogHeader>
                    {selectedEntry && (() => {
                        const e = selectedEntry;
                        const vitamins: any[] = Array.isArray(e.vitamins) ? e.vitamins : [];
                        const tips: string[] = Array.isArray(e.health_tips) ? e.health_tips : [];
                        const score = e.health_score ?? 0;

                        return (
                            <>
                                {/* Header image — fixed at top, never scrolls */}
                                {e.image_url ? (
                                    <div className="relative w-full aspect-video flex-shrink-0 bg-muted overflow-hidden">
                                        <img
                                            src={e.image_url}
                                            alt="Meal"
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-full h-16 gradient-primary flex-shrink-0" />
                                )}

                                <div className="overflow-y-auto flex-1">
                                <div className="p-5 space-y-5">
                                    {/* Title row */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                {getMealTypeIcon(e.meal_type)}
                                                <Badge variant="secondary" className="capitalize">{e.meal_type}</Badge>
                                                <span className="text-xs text-muted-foreground">{formatTime(e.scanned_at)}</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {format(parseISO(e.scanned_at), "EEEE, d MMM yyyy")}
                                            </p>
                                        </div>
                                        {score > 0 && (
                                            <div className="flex flex-col items-center shrink-0">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${score >= 8 ? "bg-primary/10 text-primary" : score >= 5 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600"}`}>
                                                    {score}
                                                </div>
                                                <span className="text-[10px] text-muted-foreground mt-0.5">Health</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Macro summary */}
                                    <div className="grid grid-cols-4 gap-2 text-center">
                                        {[
                                            { v: e.totals.calories, u: "kcal", cls: "bg-orange-50 text-orange-600" },
                                            { v: `${e.totals.protein}g`, u: "Protein", cls: "bg-blue-50 text-blue-600" },
                                            { v: `${e.totals.carbs}g`, u: "Carbs", cls: "bg-yellow-50 text-yellow-700" },
                                            { v: `${e.totals.fat}g`, u: "Fat", cls: "bg-pink-50 text-pink-600" },
                                        ].map(({ v, u, cls }) => (
                                            <div key={u} className={`rounded-xl p-3 ${cls}`}>
                                                <p className="text-lg font-bold">{v}</p>
                                                <p className="text-[10px] text-muted-foreground">{u}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {e.totals.fiber > 0 && (
                                        <p className="text-xs text-muted-foreground text-center -mt-3">
                                            <Leaf className="w-3 h-3 inline mr-1" />Chất xơ: {e.totals.fiber}g
                                        </p>
                                    )}

                                    {/* Foods list */}
                                    {e.foods.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                                                <UtensilsCrossed className="w-4 h-4 text-primary" />
                                                Thực phẩm ({e.foods.length})
                                            </h4>
                                            <div className="space-y-2">
                                                {e.foods.map((food, fi) => (
                                                    <div key={fi} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                                                        <div className="flex-1 min-w-0 mr-3">
                                                            <p className="text-sm font-medium truncate">
                                                                {food.dish_name || food.matched_name || "Món ăn"}
                                                            </p>
                                                            {food.weight_grams && (
                                                                <p className="text-xs text-muted-foreground">{food.weight_grams}g</p>
                                                            )}
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="text-sm font-semibold text-orange-600">{food.nutrition.calories} kcal</p>
                                                            <p className="text-[10px] text-muted-foreground">
                                                                P{food.nutrition.protein}g · C{food.nutrition.carbs}g · F{food.nutrition.fat}g
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Vitamins & minerals */}
                                    {vitamins.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                                                <Star className="w-4 h-4 text-primary" />
                                                Vitamin &amp; Khoáng chất
                                            </h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                {vitamins.map((vit: any, vi: number) => (
                                                    <div key={vi} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50">
                                                        <div>
                                                            <p className="text-xs font-medium">{vit.name}</p>
                                                            <p className="text-[10px] text-muted-foreground">{vit.amount}{vit.unit}</p>
                                                        </div>
                                                        {vit.percent_dv > 0 && (
                                                            <div className="text-right">
                                                                <p className="text-xs font-semibold text-primary">{vit.percent_dv}%</p>
                                                                <p className="text-[10px] text-muted-foreground">DV</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Health tips */}
                                    {tips.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                                                <Info className="w-4 h-4 text-primary" />
                                                Gợi ý dinh dưỡng
                                            </h4>
                                            <ul className="space-y-1.5">
                                                {tips.map((tip, ti) => (
                                                    <li key={ti} className="flex items-start gap-2 text-sm text-muted-foreground">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                                        {tip}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Notes */}
                                    {e.notes && (
                                        <div className="p-3 rounded-xl bg-muted/50">
                                            <p className="text-xs text-muted-foreground mb-1">Ghi chú</p>
                                            <p className="text-sm">{e.notes}</p>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-1">
                                        <Button
                                            variant="outline"
                                            className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/5"
                                            onClick={() => {
                                                deleteEntry(e.id || (e as any)._id);
                                                setSelectedEntry(null);
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Xóa
                                        </Button>
                                        <Button className="flex-1" onClick={() => setSelectedEntry(null)}>
                                            Đóng
                                        </Button>
                                    </div>
                                </div>
                                </div>
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            {/* Log Meal Modal */}
            <Dialog
                open={showLogModal}
                onOpenChange={(open) => {
                    if (!open) resetLogModal();
                }}
            >
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <PenLine className="w-5 h-5" /> Log Meal
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Meal type */}
                        <div>
                            <Label className="text-xs text-muted-foreground">Meal Type</Label>
                            <div className="grid grid-cols-4 gap-2 mt-1">
                                {["breakfast", "lunch", "dinner", "snack"].map((mt) => (
                                    <button
                                        key={mt}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                                            logMealType === mt
                                                ? "bg-primary text-white"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                        onClick={() => setLogMealType(mt)}
                                    >
                                        {mt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Search (chỉ hiện khi chưa chọn recipe) */}
                        {!selectedRecipe && (
                            <div>
                                <Label className="text-xs text-muted-foreground">
                                    Search Recipes & Foods
                                </Label>
                                <div className="relative mt-1">
                                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        value={logSearch}
                                        onChange={(e) => handleLogSearch(e.target.value)}
                                        placeholder="Search..."
                                        className="pl-9"
                                    />
                                    {logSearching && (
                                        <Loader2Icon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
                                    )}
                                </div>

                                {logSearchResults.length > 0 && (
                                    <div className="mt-1 border rounded-lg max-h-48 overflow-y-auto bg-white">
                                        {logSearchResults.map((r) => (
                                            <button
                                                key={`${r.type}-${r.id}`}
                                                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 text-sm flex justify-between border-b last:border-0"
                                                onClick={() =>
                                                    r.type === "recipe"
                                                        ? selectRecipe(r)
                                                        : addFoodItem(r)
                                                }
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span
                                                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                                                            r.type === "recipe"
                                                                ? "bg-orange-100 text-orange-700"
                                                                : "bg-blue-100 text-blue-700"
                                                        }`}
                                                    >
                                                        {r.type === "recipe" ? "R" : "F"}
                                                    </span>
                                                    <span className="truncate">{r.name}</span>
                                                    {r.isOwn && (
                                                        <span className="text-[10px] text-purple-600 shrink-0">
                                                            (My)
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-muted-foreground text-xs whitespace-nowrap ml-2">
                                                    {r.calories} kcal
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Selected Recipe — show ingredients */}
                        {selectedRecipe && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0 mr-2">
                                        <Input
                                            value={recipeName}
                                            onChange={(e) => {
                                                setRecipeName(e.target.value);
                                                setEditedIngredients(true);
                                            }}
                                            className="font-medium"
                                        />
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={clearRecipe}>
                                        <X className="w-4 h-4 mr-1" /> Change
                                    </Button>
                                </div>

                                {/* Ingredients list */}
                                <div>
                                    <Label className="text-xs text-muted-foreground">
                                        Ingredients
                                    </Label>
                                    {loadingIngredients ? (
                                        <div className="flex items-center justify-center py-4">
                                            <Loader2Icon className="w-5 h-5 animate-spin" />
                                        </div>
                                    ) : (
                                        <div className="mt-1 space-y-1.5">
                                            {recipeIngredients.map((ing, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm truncate">
                                                            {ing.name}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            {Math.round(
                                                                (ing.calories * ing.amount) / 100,
                                                            )}{" "}
                                                            kcal
                                                        </p>
                                                    </div>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        value={ing.amount}
                                                        onChange={(e) =>
                                                            updateIngredientAmount(
                                                                i,
                                                                parseFloat(e.target.value) || 0,
                                                            )
                                                        }
                                                        className="w-16 h-7 text-xs"
                                                    />
                                                    <span className="text-xs text-muted-foreground w-4">
                                                        {ing.unit}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-red-400"
                                                        onClick={() => removeIngredient(i)}
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            ))}

                                            {/* Add ingredient */}
                                            <div className="relative mt-2">
                                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                                <Input
                                                    value={ingSearch}
                                                    onChange={(e) =>
                                                        searchIngredient(e.target.value)
                                                    }
                                                    placeholder="Add ingredient..."
                                                    className="pl-8 h-8 text-xs"
                                                />
                                                {ingSearching && (
                                                    <Loader2Icon className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin" />
                                                )}
                                            </div>
                                            {ingSearchResults.length > 0 && (
                                                <div className="border rounded-lg max-h-32 overflow-y-auto bg-white">
                                                    {ingSearchResults.map((f) => (
                                                        <button
                                                            key={f.id}
                                                            className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-xs flex justify-between border-b last:border-0"
                                                            onClick={() => addIngredientToRecipe(f)}
                                                        >
                                                            <span className="truncate">
                                                                {f.name_vi}
                                                            </span>
                                                            <span className="text-muted-foreground ml-2">
                                                                {f.energy_kcal} kcal/100g
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Recipe nutrition totals */}
                                {recipeIngredients.length > 0 && (
                                    <div className="grid grid-cols-4 gap-2 text-center">
                                        {(() => {
                                            const t = getRecipeTotals();
                                            return (
                                                <>
                                                    <div className="bg-orange-50 rounded p-1.5">
                                                        <p className="text-sm font-bold text-orange-600">
                                                            {t.calories}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            kcal
                                                        </p>
                                                    </div>
                                                    <div className="bg-blue-50 rounded p-1.5">
                                                        <p className="text-sm font-bold text-blue-600">
                                                            {t.protein}g
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            P
                                                        </p>
                                                    </div>
                                                    <div className="bg-yellow-50 rounded p-1.5">
                                                        <p className="text-sm font-bold text-yellow-600">
                                                            {t.carbs}g
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            C
                                                        </p>
                                                    </div>
                                                    <div className="bg-pink-50 rounded p-1.5">
                                                        <p className="text-sm font-bold text-pink-600">
                                                            {t.fat}g
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            F
                                                        </p>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* Edited indicator + submit to admin */}
                                {editedIngredients && (
                                    <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                                        <p className="text-xs text-purple-700">
                                            Modified — will save as My Recipe
                                        </p>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs text-purple-700 h-7"
                                            onClick={() => setShowSubmitConfirm(true)}
                                        >
                                            Submit to Public
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Food items (non-recipe) */}
                        {logItems.length > 0 && (
                            <div>
                                <Label className="text-xs text-muted-foreground">
                                    Foods ({logItems.length})
                                </Label>
                                <div className="mt-1 space-y-1.5">
                                    {logItems.map((item, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm truncate">{item.name}</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {Math.round(item.calories * (item.weight_grams ?? 100) / 100)} kcal
                                                </p>
                                            </div>
                                            <Input
                                                type="number"
                                                min={1}
                                                step={1}
                                                placeholder="100"
                                                value={item.weight_grams ?? 100}
                                                onChange={(e) =>
                                                    updateLogWeight(
                                                        i,
                                                        parseInt(e.target.value) || 100,
                                                    )
                                                }
                                                className="w-16 h-7 text-xs"
                                            />
                                            <span className="text-xs text-muted-foreground">
                                                g
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-red-400"
                                                onClick={() => removeLogItem(i)}
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Combined totals */}
                        {(selectedRecipe || logItems.length > 0) && (
                            <div className="grid grid-cols-4 gap-2 pt-2 border-t text-center">
                                {(() => {
                                    const t = getCombinedTotals();
                                    return (
                                        <>
                                            <div className="bg-orange-50 rounded p-1.5">
                                                <p className="text-sm font-bold text-orange-600">
                                                    {t.calories}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    Total kcal
                                                </p>
                                            </div>
                                            <div className="bg-blue-50 rounded p-1.5">
                                                <p className="text-sm font-bold text-blue-600">
                                                    {t.protein}g
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    Protein
                                                </p>
                                            </div>
                                            <div className="bg-yellow-50 rounded p-1.5">
                                                <p className="text-sm font-bold text-yellow-600">
                                                    {t.carbs}g
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    Carbs
                                                </p>
                                            </div>
                                            <div className="bg-pink-50 rounded p-1.5">
                                                <p className="text-sm font-bold text-pink-600">
                                                    {t.fat}g
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    Fat
                                                </p>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Notes */}
                        <div>
                            <Label className="text-xs text-muted-foreground">
                                Notes (optional)
                            </Label>
                            <Textarea
                                value={logNotes}
                                onChange={(e) => setLogNotes(e.target.value)}
                                placeholder="Add a note..."
                                rows={2}
                                className="mt-1"
                            />
                        </div>

                        {/* Save */}
                        <div className="flex gap-2 pt-2">
                            <Button
                                className="flex-1"
                                onClick={handleLogSave}
                                disabled={(!selectedRecipe && logItems.length === 0) || logSaving}
                            >
                                {logSaving ? (
                                    <>
                                        <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />{" "}
                                        Saving...
                                    </>
                                ) : (
                                    "Save to Diary"
                                )}
                            </Button>
                            <Button variant="outline" onClick={resetLogModal}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Submit to Admin Confirm */}
            <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Submit Recipe for Review?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Your recipe "{recipeName || selectedRecipe?.name}" will be sent to admin for
                        review. If approved, it will be visible to all users.
                    </p>
                    <div className="flex gap-2 pt-2">
                        <Button
                            className="flex-1"
                            onClick={handleSubmitToAdmin}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />{" "}
                                    Submitting...
                                </>
                            ) : (
                                "Submit for Review"
                            )}
                        </Button>
                        <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>
                            Cancel
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <BottomNav />
        </div>
    );
};

export default FoodDiary;
