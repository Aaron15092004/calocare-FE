// Types for real meal plan data from the API

export interface RecipeIngredient {
    name: string;
    amount: string;
    kcal: number;
}

export interface RecipeInstruction {
    type: "ingredients" | "steps";
    items: RecipeIngredient[] | string[];
}

export interface RecipeInfo {
    _id: string;
    name_vi: string;
    name_en: string;
    calories: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    description?: string;
    instructions?: RecipeInstruction[];
    image_url?: string;
}

export interface FoodInfo {
    _id: string;
    name_vi: string;
    name_en: string;
    energy_kcal: number;
    protein?: number;
    lipid?: number;
    glucid?: number;
    fiber?: number;
    image_url?: string;
}

// Canonical meal-type ordering used across the app
export const MEAL_ORDER = [
    "breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "snack",
] as const;

export interface CustomFood {
    name: string;
    description?: string;
    calories_kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
    serving_description?: string;
}

export interface MealPlanItemAPI {
    _id: string;
    meal_plan_id: string;
    day_number: number;
    meal_type: "breakfast" | "lunch" | "dinner" | "snack" | "morning_snack" | "afternoon_snack";
    recipe_id?: RecipeInfo;
    food_id?: FoodInfo;
    usda_food_id?: FoodInfo & { description_vi?: string; description_en?: string };
    custom_food?: CustomFood;
    serving_size?: number;
    calories?: number;
    sort_order: number;
}

export interface MealPlanAPI {
    _id: string;
    title: string;
    description?: string;
    total_days: number;
    goal_type?: string;
    tags?: string[];
    is_public: boolean;
    is_approved: boolean;
    creator_id?: string;
    created_at: string;
    updated_at: string;
}

export interface UserMealPlanAPI {
    _id: string;
    user_id: string;
    meal_plan_id: MealPlanAPI;
    start_date?: string;
    is_active: boolean;
    created_at: string;
}

export interface DayPlanFromAPI {
    day: number;
    items: MealPlanItemAPI[];
    totalCalories: number;
}

export function getItemDisplayName(item: MealPlanItemAPI): string {
    return item.recipe_id?.name_vi
        || item.custom_food?.name
        || item.food_id?.name_vi
        || item.usda_food_id?.description_vi
        || item.usda_food_id?.description_en
        || "Unknown";
}

export function getItemCalories(item: MealPlanItemAPI): number {
    const plannedCalories = Number(item.calories);
    if (Number.isFinite(plannedCalories) && plannedCalories > 0) return Math.round(plannedCalories);
    if (item.recipe_id) return Math.round(item.recipe_id.calories || 0);
    if (item.custom_food) return Math.round(item.custom_food.calories_kcal || 0);
    const food = item.food_id || item.usda_food_id;
    if (!food) return 0;
    return Math.round((food.energy_kcal || 0) * ((item.serving_size || 100) / 100));
}

export function getItemMacros(item: MealPlanItemAPI): { protein: number; carbs: number; fat: number; fiber: number } {
    const plannedCalories = Number(item.calories);
    if (item.recipe_id) {
        const scale = Number.isFinite(plannedCalories) && plannedCalories > 0 && item.recipe_id.calories > 0
            ? plannedCalories / item.recipe_id.calories
            : 1;
        return {
            protein: Math.round((item.recipe_id.protein ?? 0) * scale * 10) / 10,
            carbs:   Math.round((item.recipe_id.carbs ?? 0) * scale * 10) / 10,
            fat:     Math.round((item.recipe_id.fat ?? 0) * scale * 10) / 10,
            fiber:   Math.round((item.recipe_id.fiber ?? 0) * scale * 10) / 10,
        };
    }
    if (item.custom_food) {
        return {
            protein: item.custom_food.protein_g,
            carbs:   item.custom_food.carbs_g,
            fat:     item.custom_food.fat_g,
            fiber:   item.custom_food.fiber_g ?? 0,
        };
    }
    const food = item.food_id || item.usda_food_id;
    if (food) {
        const baseCalories = food.energy_kcal || 0;
        const scale = Number.isFinite(plannedCalories) && plannedCalories > 0 && baseCalories > 0
            ? plannedCalories / baseCalories
            : (item.serving_size || 100) / 100;
        return {
            protein: Math.round((food.protein ?? 0) * scale * 10) / 10,
            carbs:   Math.round((food.glucid ?? 0) * scale * 10) / 10,
            fat:     Math.round((food.lipid ?? 0) * scale * 10) / 10,
            fiber:   Math.round((food.fiber ?? 0) * scale * 10) / 10,
        };
    }
    return { protein: 0, carbs: 0, fat: 0, fiber: 0 };
}

export function getItemId(item: MealPlanItemAPI): string {
    return item.recipe_id?._id || item.food_id?._id || item.usda_food_id?._id || item._id;
}

export function getRecipeIngredients(item: MealPlanItemAPI): RecipeIngredient[] {
    const instr = item.recipe_id?.instructions;
    if (!instr) return [];
    const block = instr.find((b) => b.type === "ingredients");
    return (block?.items ?? []) as RecipeIngredient[];
}

export function getRecipeSteps(item: MealPlanItemAPI): string[] {
    const instr = item.recipe_id?.instructions;
    if (!instr) return [];
    const block = instr.find((b) => b.type === "steps");
    return (block?.items ?? []) as string[];
}

// Canonical "which day of the plan is today" — calendar-based from start_date,
// clamped to [1, totalDays]. Replaces the progress-based variant that jumped
// ahead when a user completed one meal on a later day.
export function computeCurrentDay(startDate: string | Date | undefined, totalDays: number): number {
    if (!totalDays || totalDays < 1) return 1;
    if (!startDate) return 1;
    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) return 1;
    const elapsedDays = Math.floor((Date.now() - start.getTime()) / 86_400_000);
    return Math.min(Math.max(elapsedDays + 1, 1), totalDays);
}

export function groupItemsByDay(items: MealPlanItemAPI[], totalDays: number): DayPlanFromAPI[] {
    const days: DayPlanFromAPI[] = [];
    for (let d = 1; d <= totalDays; d++) {
        const dayItems = items.filter((i) => i.day_number === d);
        const totalCalories = dayItems.reduce((sum, i) => sum + getItemCalories(i), 0);
        days.push({ day: d, items: dayItems, totalCalories });
    }
    return days;
}
