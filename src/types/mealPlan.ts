// Types for real meal plan data from the API

export interface RecipeInfo {
    _id: string;
    name_vi: string;
    name_en: string;
    calories: number;
    image_url?: string;
}

export interface FoodInfo {
    _id: string;
    name_vi: string;
    name_en: string;
    energy_kcal: number;
}

export interface MealPlanItemAPI {
    _id: string;
    meal_plan_id: string;
    day_number: number;
    meal_type: "breakfast" | "lunch" | "dinner" | "snack";
    recipe_id?: RecipeInfo;
    food_id?: FoodInfo;
    serving_size?: number;
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
    return item.recipe_id?.name_vi || item.food_id?.name_vi || "Unknown";
}

export function getItemCalories(item: MealPlanItemAPI): number {
    return item.recipe_id?.calories || item.food_id?.energy_kcal || 0;
}

export function getItemId(item: MealPlanItemAPI): string {
    return item.recipe_id?._id || item.food_id?._id || item._id;
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
