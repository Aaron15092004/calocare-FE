import React, { useState } from "react";
import { Flame, Target, CheckCircle2, Circle, Sunrise, Sun, Moon, Apple, ChevronRight, BookOpen, ShoppingBasket, ChefHat, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
    DayPlanFromAPI,
    MealPlanItemAPI,
    MEAL_ORDER,
    getItemDisplayName,
    getItemCalories,
    getItemMacros,
    getRecipeIngredients,
    getRecipeSteps,
} from "@/types/mealPlan";

interface DayPlanSectionProps {
    dayPlan: DayPlanFromAPI;
    isToday: boolean;
    isMealCompleted?: (dayNumber: number, mealType: string) => boolean;
    onToggleMeal?: (dayNumber: number, mealType: string, notes?: string) => void;
}

const mealConfig: Record<string, { label: string; Icon: React.ElementType; time: string; hours: [number, number] }> = {
    breakfast:       { label: "Bữa sáng",       Icon: Sunrise, time: "7:00",  hours: [5, 10] },
    morning_snack:   { label: "Bữa phụ sáng",   Icon: Apple,   time: "9:30",  hours: [8, 11] },
    lunch:           { label: "Bữa trưa",        Icon: Sun,     time: "12:30", hours: [11, 15] },
    afternoon_snack: { label: "Bữa phụ chiều",  Icon: Apple,   time: "15:30", hours: [14, 17] },
    dinner:          { label: "Bữa tối",         Icon: Moon,    time: "19:00", hours: [17, 23] },
    snack:           { label: "Bữa phụ",         Icon: Apple,   time: "15:30", hours: [0, 24] },
};

/* ── Recipe Detail Sheet ───────────────────────────────────────── */
const RecipeSheet: React.FC<{ item: MealPlanItemAPI | null; open: boolean; onClose: () => void }> = ({
    item,
    open,
    onClose,
}) => {
    if (!item) return null;
    const name        = getItemDisplayName(item);
    const calories    = getItemCalories(item);
    const macros      = getItemMacros(item);
    const ingredients = getRecipeIngredients(item);
    const steps       = getRecipeSteps(item);
    const description = item.recipe_id?.description || item.custom_food?.description || "";
    const serving     = item.custom_food?.serving_description || "";
    const mealLabel   = mealConfig[item.meal_type]?.label ?? item.meal_type;

    return (
        <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
            <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl overflow-y-auto pb-10">
                <SheetHeader className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">{mealLabel}</Badge>
                        {item.recipe_id?.instructions?.length ? (
                            <Badge className="text-xs bg-primary/10 text-primary border-0">
                                <BookOpen className="w-3 h-3 mr-1" />Công thức
                            </Badge>
                        ) : null}
                    </div>
                    <SheetTitle className="text-left text-base leading-snug">{name}</SheetTitle>
                    {description && (
                        <p className="text-sm text-muted-foreground text-left mt-1">{description}</p>
                    )}
                </SheetHeader>

                {/* Recipe image */}
                {item.recipe_id?.image_url && (
                    <div className="w-full h-44 rounded-2xl overflow-hidden mb-4">
                        <img
                            src={item.recipe_id.image_url}
                            alt={name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                {/* Nutrition summary */}
                <div className="grid grid-cols-4 gap-2 mb-5">
                    {[
                        { label: "Calo",    value: `${calories}`, unit: "kcal", color: "text-orange-500" },
                        { label: "Protein", value: `${macros.protein}`, unit: "g", color: "text-blue-500" },
                        { label: "Carbs",   value: `${macros.carbs}`,   unit: "g", color: "text-yellow-500" },
                        { label: "Fat",     value: `${macros.fat}`,     unit: "g", color: "text-red-400" },
                    ].map((n) => (
                        <div key={n.label} className="bg-muted/50 rounded-xl p-2.5 text-center">
                            <p className={`text-base font-bold ${n.color}`}>{n.value}</p>
                            <p className="text-[10px] text-muted-foreground">{n.unit}</p>
                            <p className="text-[10px] text-muted-foreground">{n.label}</p>
                        </div>
                    ))}
                </div>
                {serving && <p className="text-xs text-muted-foreground mb-4 italic">Khẩu phần: {serving}</p>}

                {/* Ingredients */}
                {ingredients.length > 0 && (
                    <div className="mb-5">
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <ShoppingBasket className="w-4 h-4 text-primary" /> Nguyên liệu
                        </h3>
                        <div className="space-y-1.5">
                            {ingredients.map((ing, i) => (
                                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                                    <span className="text-sm">{ing.name}</span>
                                    <div className="text-right">
                                        <span className="text-xs text-muted-foreground">{ing.amount}</span>
                                        {ing.kcal > 0 && (
                                            <span className="text-xs text-orange-400 ml-2">{ing.kcal} kcal</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Steps */}
                {steps.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <ChefHat className="w-4 h-4 text-primary" /> Cách làm
                        </h3>
                        <div className="space-y-3">
                            {steps.map((step, i) => (
                                <div key={i} className="flex gap-3">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                                        {i + 1}
                                    </div>
                                    <p className="text-sm text-foreground leading-relaxed flex-1">
                                        {typeof step === "string" ? step.replace(/^Bước\s*\d+:\s*/i, "") : step}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {ingredients.length === 0 && steps.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">
                        Chưa có chi tiết công thức cho món này.
                    </p>
                )}
            </SheetContent>
        </Sheet>
    );
};


/* ── Meal Row (no meal-type label — shown in group header instead) ── */
interface MealRowProps {
    item: MealPlanItemAPI;
    isCompleted?: boolean;
    onToggle?: () => void;
    onDetail?: () => void;
}

const MealRow: React.FC<MealRowProps> = ({ item, isCompleted, onToggle, onDetail }) => {
    const config   = mealConfig[item.meal_type] ?? mealConfig.snack;
    const name     = getItemDisplayName(item);
    const calories = getItemCalories(item);
    const { Icon } = config;
    const hasDetail = (getRecipeIngredients(item).length > 0 || getRecipeSteps(item).length > 0)
        || !!item.recipe_id?.description || !!item.custom_food?.description;
    const imgUrl = item.recipe_id?.image_url || (item.food_id as { image_url?: string })?.image_url;

    return (
        <div className={`flex items-center gap-3 px-2 py-2 rounded-xl transition-colors group ${
            isCompleted ? "bg-primary/5" : "hover:bg-accent/50"
        }`}>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
                className="flex-shrink-0 transition-transform hover:scale-110"
            >
                {isCompleted
                    ? <CheckCircle2 className="w-5 h-5 text-primary" />
                    : <Circle className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary/50" />
                }
            </button>
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center overflow-hidden shrink-0">
                {imgUrl
                    ? <img src={imgUrl} alt={name} className="w-full h-full object-cover" />
                    : <Icon className="w-4 h-4 text-muted-foreground" />
                }
            </div>
            <button type="button" className="flex-1 min-w-0 text-left" onClick={onDetail}>
                <h4 className={`text-sm truncate ${isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {name}
                </h4>
            </button>
            <div className="flex items-center gap-0.5 text-xs text-calories flex-shrink-0">
                <Flame className="w-3 h-3" />
                <span>{calories}</span>
            </div>
            {hasDetail && (
                <button type="button" onClick={onDetail} aria-label="Xem công thức"
                    className="opacity-30 group-hover:opacity-60 transition-opacity flex-shrink-0">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
            )}
        </div>
    );
};

/* ── Day Plan Section ──────────────────────────────────────────── */
export const DayPlanSection: React.FC<DayPlanSectionProps> = ({
    dayPlan,
    isToday,
    isMealCompleted,
    onToggleMeal,
}) => {
    const [detailItem, setDetailItem] = useState<MealPlanItemAPI | null>(null);
    const [noteItem, setNoteItem] = useState<MealPlanItemAPI | null>(null);
    const [pendingNote, setPendingNote] = useState("");

    // Single-pass group by meal_type; unknown types land at the end naturally
    const groupMap = new Map<string, MealPlanItemAPI[]>();
    for (const item of dayPlan.items) {
        const bucket = groupMap.get(item.meal_type);
        if (bucket) bucket.push(item);
        else groupMap.set(item.meal_type, [item]);
    }
    // Sort groups into canonical order; unknown types keep insertion order at the end
    const grouped = Object.fromEntries(
        [...MEAL_ORDER.filter((mt) => groupMap.has(mt)), ...[...groupMap.keys()].filter((mt) => !MEAL_ORDER.includes(mt as typeof MEAL_ORDER[number]))]
            .map((mt) => [mt, groupMap.get(mt)!]),
    );
    const mealGroups = Object.keys(grouped);
    const completedCount = mealGroups.filter((mt) => isMealCompleted?.(dayPlan.day, mt)).length;

    const handleToggleIntercept = (item: MealPlanItemAPI) => {
        const completed = isMealCompleted?.(dayPlan.day, item.meal_type);
        if (completed) {
            // The backend also removes the diary entry linked to this meal.
            onToggleMeal?.(dayPlan.day, item.meal_type);
        } else {
            setPendingNote("");
            setNoteItem(item);
        }
    };

    const handleConfirmComplete = () => {
        if (!noteItem) return;
        // Completing any row completes and logs the entire planned meal group.
        onToggleMeal?.(dayPlan.day, noteItem.meal_type, pendingNote.trim() || undefined);
        setNoteItem(null);
        setPendingNote("");
    };

    const noteItemConfig = noteItem ? (mealConfig[noteItem.meal_type] ?? mealConfig.snack) : null;
    const pendingMealItems = noteItem ? grouped[noteItem.meal_type] ?? [] : [];
    const pendingMealCalories = pendingMealItems.reduce((sum, item) => sum + getItemCalories(item), 0);
    const isMismatch = noteItem && noteItemConfig
        ? (() => {
            const h = new Date().getHours();
            const [lo, hi] = noteItemConfig.hours;
            return h < lo || h >= hi;
        })()
        : false;

    return (
        <>
            <Card
                variant={isToday ? "gradient" : "default"}
                className={`overflow-hidden ${isToday ? "ring-2 ring-primary/50" : ""}`}
            >
                <CardContent className="p-4">
                    {/* Day Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center ${
                                isToday ? "bg-primary text-primary-foreground" : "bg-accent"
                            }`}>
                                <span className="text-xs font-medium opacity-80">Ngày</span>
                                <span className="text-xl font-bold leading-none">{dayPlan.day}</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    {isToday && (
                                        <Badge className="bg-primary/20 text-primary border-0 text-xs">Hôm nay</Badge>
                                    )}
                                    {completedCount > 0 && (
                                        <Badge variant="secondary" className="text-xs">
                                            {completedCount}/{mealGroups.length} bữa xong
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                    <Target className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-sm text-foreground">
                                        {mealGroups.length} bữa · {dayPlan.items.length} món
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-muted-foreground">Tổng calo</div>
                            <div className="flex items-center gap-1 text-calories">
                                <Flame className="w-4 h-4" />
                                <span className="text-lg font-bold">{dayPlan.totalCalories}</span>
                            </div>
                        </div>
                    </div>

                    {mealGroups.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-3 border-t border-border/50">
                            Không có bữa ăn nào
                        </p>
                    ) : (
                        <div className="space-y-3 border-t border-border/50 pt-3">
                            {mealGroups.map((mealType) => {
                                const items = grouped[mealType];
                                const config = mealConfig[mealType] ?? mealConfig.snack;
                                const groupCal = items.reduce((s, i) => s + getItemCalories(i), 0);
                                const isDone = isMealCompleted?.(dayPlan.day, mealType) ?? false;
                                return (
                                    <div key={mealType}>
                                        {/* Meal group header */}
                                        <div className={`flex items-center gap-1.5 px-2 mb-1 ${isDone ? "opacity-50" : ""}`}>
                                            <config.Icon className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="text-xs font-semibold text-muted-foreground">{config.label}</span>
                                            <span className="text-xs text-muted-foreground/50">· {config.time}</span>
                                            <div className="flex-1" />
                                            <Flame className="w-3 h-3 text-calories/60" />
                                            <span className="text-xs font-medium text-calories/80">{groupCal} kcal</span>
                                        </div>
                                        {/* Items in this meal */}
                                        <div className="space-y-0.5">
                                            {items.map((item) => (
                                                <MealRow
                                                    key={item._id || `${dayPlan.day}-${mealType}-${item.sort_order}`}
                                                    item={item}
                                                    isCompleted={isDone}
                                                    onDetail={() => setDetailItem(item)}
                                                    onToggle={() => handleToggleIntercept(item)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <RecipeSheet
                item={detailItem}
                open={!!detailItem}
                onClose={() => setDetailItem(null)}
            />

            {/* Note / mismatch dialog for meal completion */}
            <Sheet open={!!noteItem} onOpenChange={(o) => { if (!o) setNoteItem(null); }}>
                <SheetContent side="bottom" className="rounded-t-3xl pb-8">
                    <SheetHeader className="mb-4">
                        <SheetTitle className="text-base">Hoàn thành bữa ăn</SheetTitle>
                    </SheetHeader>

                    {noteItem && (
                        <div className="space-y-4">
                            {isMismatch && (
                                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-700">
                                        Đây là <strong>{noteItemConfig?.label}</strong> (thường {noteItemConfig?.time}).
                                        Bạn đang ăn khác khung giờ kế hoạch — ghi chú nếu cần nhé!
                                    </p>
                                </div>
                            )}

                            <div className="bg-muted/50 rounded-xl p-3">
                                <p className="text-sm font-semibold">{noteItemConfig?.label}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {pendingMealItems.length} món · {pendingMealCalories} kcal sẽ được ghi vào nhật ký
                                </p>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1.5 block">Ghi chú (tùy chọn)</label>
                                <Textarea
                                    value={pendingNote}
                                    onChange={(e) => setPendingNote(e.target.value)}
                                    placeholder="Ăn đúng khẩu phần không? Cảm giác thế nào?..."
                                    className="resize-none"
                                    rows={3}
                                />
                            </div>

                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => setNoteItem(null)}>
                                    Hủy
                                </Button>
                                <Button className="flex-1 gradient-primary" onClick={handleConfirmComplete}>
                                    <CheckCircle2 className="w-4 h-4 mr-1.5" />Hoàn thành
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </>
    );
};
