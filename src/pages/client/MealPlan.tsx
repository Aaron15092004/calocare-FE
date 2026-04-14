import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Flame, Target, Plus, Users, BookOpen } from "lucide-react";
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

const MealPlan: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthContext();

    const [activePlan, setActivePlan] = useState<UserMealPlanAPI | null>(null);
    const [dayPlans, setDayPlans] = useState<DayPlanFromAPI[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedWeek, setSelectedWeek] = useState<string>("all");

    const totalDays = activePlan?.meal_plan_id?.total_days ?? 0;

    const {
        isMealCompleted,
        toggleMealComplete,
        getOverallProgress,
    } = useMealProgress(user?.id, totalDays);

    useEffect(() => {
        fetchActivePlan();
    }, [user]);

    const fetchActivePlan = async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        try {
            const { data: plans } = await api.get<UserMealPlanAPI[]>("/user-meal-plans", {
                params: { is_active: true },
            });
            if (plans.length > 0) {
                const plan = plans[0];
                setActivePlan(plan);

                const { data: items } = await api.get<MealPlanItemAPI[]>(
                    `/user-meal-plans/${plan._id}/items`,
                );
                setDayPlans(groupItemsByDay(items, plan.meal_plan_id.total_days));
            }
        } catch (err) {
            console.error("Error fetching active plan:", err);
        } finally {
            setLoading(false);
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
        diaryData?: { name: string; calories: number },
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
            <div className="min-h-screen gradient-fresh pb-24">
                <header className="sticky top-0 z-50 glass border-b border-border/50">
                    <div className="container px-4 py-4">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-xl">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <h1 className="text-xl font-bold text-foreground">Meal Plan</h1>
                        </div>
                    </div>
                </header>
                <main className="container px-4 py-10 flex flex-col items-center gap-6 text-center">
                    <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center">
                        <Calendar className="w-10 h-10 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold mb-2">No active meal plan</h2>
                        <p className="text-muted-foreground text-sm">
                            Choose a community plan or create your own to get started.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 w-full max-w-xs">
                        <Button onClick={() => navigate("/community-plans")} className="gap-2">
                            <Users className="w-4 h-4" />
                            Browse Community Plans
                        </Button>
                        <Button variant="outline" onClick={() => navigate("/my-meal-plans")} className="gap-2">
                            <Plus className="w-4 h-4" />
                            Create Personal Plan
                        </Button>
                    </div>
                </main>
                <BottomNav />
            </div>
        );
    }

    const planInfo = activePlan.meal_plan_id;
    const weekLabels: Record<string, string> = { "1": "Week 1", "2": "Week 2", "3": "Week 3", all: "All Days" };

    return (
        <div className="min-h-screen gradient-fresh pb-24">
            {/* Header */}
            <header className="sticky top-0 z-50 glass border-b border-border/50">
                <div className="container px-4 py-4">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-xl">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex-1">
                            <h1 className="text-xl font-bold text-foreground truncate">{planInfo.title}</h1>
                            <p className="text-sm text-muted-foreground">
                                {planInfo.total_days}-day plan
                                {planInfo.goal_type && ` · ${planInfo.goal_type.replace("_", " ")}`}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl"
                                onClick={() => navigate("/my-meal-plans")}
                                title="My Plans"
                            >
                                <BookOpen className="w-5 h-5" />
                            </Button>
                            <Calendar className="w-5 h-5 text-primary mt-2" />
                        </div>
                    </div>
                </div>
            </header>

            <main className="container px-4 py-6 space-y-6">
                {/* Progress Overview */}
                <Card variant="gradient" className="animate-slide-up">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-foreground">Your Progress</h2>
                                <p className="text-sm text-muted-foreground">
                                    {overallProgress.completed} meals completed
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
                                <div className="text-xs text-muted-foreground">Days</div>
                            </div>
                            <div className="text-center p-3 bg-accent/50 rounded-xl">
                                <div className="flex items-center justify-center gap-1 text-calories mb-1">
                                    <Flame className="w-4 h-4" />
                                </div>
                                <div className="text-xl font-bold text-foreground">{avgCalories}</div>
                                <div className="text-xs text-muted-foreground">Avg Cal/Day</div>
                            </div>
                            <div className="text-center p-3 bg-accent/50 rounded-xl">
                                <div className="flex items-center justify-center gap-1 text-primary mb-1">
                                    <span className="text-lg">🍽️</span>
                                </div>
                                <div className="text-xl font-bold text-foreground">{overallProgress.completed}</div>
                                <div className="text-xs text-muted-foreground">Completed</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Week Filter (only show if plan >= 7 days) */}
                {planInfo.total_days >= 7 && (
                    <Tabs value={selectedWeek} onValueChange={setSelectedWeek} className="animate-slide-up-delay-1">
                        <TabsList className="grid w-full grid-cols-4 h-auto p-1">
                            <TabsTrigger value="all" className="text-xs py-2">All Days</TabsTrigger>
                            <TabsTrigger value="1" className="text-xs py-2">Week 1</TabsTrigger>
                            {planInfo.total_days >= 14 && (
                                <TabsTrigger value="2" className="text-xs py-2">Week 2</TabsTrigger>
                            )}
                            {planInfo.total_days >= 21 && (
                                <TabsTrigger value="3" className="text-xs py-2">Week 3</TabsTrigger>
                            )}
                        </TabsList>

                        <div className="flex items-center gap-2 mt-4 mb-2">
                            <Badge variant="secondary" className="text-xs">
                                {weekLabels[selectedWeek] ?? "All Days"}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{displayDays.length} days</span>
                        </div>
                    </Tabs>
                )}

                {/* Day Plans */}
                {displayDays.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            No meals scheduled for this period.
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

                {/* Switch plan shortcut */}
                <Card className="bg-gradient-to-br from-primary/10 to-accent">
                    <CardContent className="p-4 flex items-center gap-4">
                        <Users className="w-8 h-8 text-primary flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium">Want to try another plan?</p>
                            <p className="text-xs text-muted-foreground">Browse approved community meal plans</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => navigate("/community-plans")}>
                            Browse
                        </Button>
                    </CardContent>
                </Card>
            </main>

            <BottomNav />
        </div>
    );
};

export default MealPlan;
