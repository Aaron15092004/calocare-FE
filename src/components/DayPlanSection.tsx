import React from "react";
import { Flame, Target, ChevronRight, CheckCircle2, Circle, Sunrise, Sun, Moon, Apple } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DayPlanFromAPI, MealPlanItemAPI, getItemDisplayName, getItemCalories, getItemId } from "@/types/mealPlan";

interface DayPlanSectionProps {
    dayPlan: DayPlanFromAPI;
    isToday: boolean;
    isMealCompleted?: (dayNumber: number, mealType: string) => boolean;
    onToggleMeal?: (dayNumber: number, mealType: string, itemId: string, diaryData?: { name: string; calories: number }) => void;
}

const mealConfig = {
    breakfast: { label: "Breakfast", Icon: Sunrise, time: "7:00 AM" },
    lunch: { label: "Lunch", Icon: Sun, time: "12:30 PM" },
    dinner: { label: "Dinner", Icon: Moon, time: "7:00 PM" },
    snack: { label: "Snack", Icon: Apple, time: "3:30 PM" },
};

interface MealRowProps {
    item: MealPlanItemAPI;
    isCompleted?: boolean;
    onToggle?: () => void;
}

const MealRow: React.FC<MealRowProps> = ({ item, isCompleted, onToggle }) => {
    const config = mealConfig[item.meal_type];
    const name = getItemDisplayName(item);
    const calories = getItemCalories(item);
    const { Icon } = config;

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggle?.();
    };

    return (
        <div
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left group ${
                isCompleted ? "bg-primary/5" : "hover:bg-accent/50"
            }`}
        >
            <button type="button" onClick={handleToggle} className="flex-shrink-0 transition-transform hover:scale-110">
                {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                ) : (
                    <Circle className="w-6 h-6 text-muted-foreground/50 group-hover:text-primary/50" />
                )}
            </button>
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
                    <span className="text-xs text-muted-foreground/60">· {config.time}</span>
                </div>
                <h4 className={`font-medium truncate ${isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {name}
                </h4>
            </div>
            <div className="flex items-center gap-1 text-xs text-calories">
                <Flame className="w-3.5 h-3.5" />
                <span>{calories}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
        </div>
    );
};

export const DayPlanSection: React.FC<DayPlanSectionProps> = ({
    dayPlan,
    isToday,
    isMealCompleted,
    onToggleMeal,
}) => {
    const mealTypes: Array<"breakfast" | "lunch" | "dinner" | "snack"> = [
        "breakfast",
        "lunch",
        "dinner",
        "snack",
    ];

    const completedCount = mealTypes.filter((t) => isMealCompleted?.(dayPlan.day, t)).length;

    return (
        <Card
            variant={isToday ? "gradient" : "default"}
            className={`overflow-hidden ${isToday ? "ring-2 ring-primary/50" : ""}`}
        >
            <CardContent className="p-4">
                {/* Day Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div
                            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center ${
                                isToday ? "bg-primary text-primary-foreground" : "bg-accent"
                            }`}
                        >
                            <span className="text-xs font-medium opacity-80">Day</span>
                            <span className="text-xl font-bold leading-none">{dayPlan.day}</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                {isToday && (
                                    <Badge className="bg-primary/20 text-primary border-0">Today</Badge>
                                )}
                                {completedCount > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                        {completedCount}/{dayPlan.items.length} done
                                    </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                    Week {Math.ceil(dayPlan.day / 7)}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                                <Target className="w-3.5 h-3.5 text-primary" />
                                <span className="text-sm text-foreground">
                                    {dayPlan.items.length} meals
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-muted-foreground">Daily Total</div>
                        <div className="flex items-center gap-1 text-calories">
                            <Flame className="w-4 h-4" />
                            <span className="text-lg font-bold">{dayPlan.totalCalories}</span>
                        </div>
                    </div>
                </div>

                {/* Meals List */}
                {dayPlan.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-3 border-t border-border/50">
                        No meals scheduled
                    </p>
                ) : (
                    <div className="space-y-1 border-t border-border/50 pt-3">
                        {dayPlan.items.map((item) => (
                            <MealRow
                                key={item._id}
                                item={item}
                                isCompleted={isMealCompleted?.(dayPlan.day, item.meal_type)}
                                onToggle={() =>
                                    onToggleMeal?.(dayPlan.day, item.meal_type, getItemId(item), {
                                        name: getItemDisplayName(item),
                                        calories: getItemCalories(item) * (item.serving_size || 1),
                                    })
                                }
                            />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
