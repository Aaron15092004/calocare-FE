export interface UserData {
  age: number;
  gender: "male" | "female" | "other";
  weight_kg: number;
  height_cm: number;
  activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
  goal?: "lose" | "maintain" | "gain";
}

export interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

/**
 * Calculate nutrition goals using Schofield equations (FAO/WHO/UNU)
 */
export const calculateNutritionGoals = (user: UserData): NutritionGoals => {
  // 1. Calculate BMR using Schofield equations
  let bmr: number;

  if (user.gender === "male") {
    if (user.age >= 18 && user.age < 30) {
      bmr = 15.057 * user.weight_kg + 692.2;
    } else if (user.age >= 30 && user.age < 60) {
      bmr = 11.472 * user.weight_kg + 873.1;
    } else {
      // >= 60
      bmr = 11.711 * user.weight_kg + 587.7;
    }
  } else {
    // female or other (use female formula)
    if (user.age >= 18 && user.age < 30) {
      bmr = 14.818 * user.weight_kg + 486.6;
    } else if (user.age >= 30 && user.age < 60) {
      bmr = 8.126 * user.weight_kg + 845.6;
    } else {
      // >= 60
      bmr = 9.082 * user.weight_kg + 658.5;
    }
  }

  // 2. PAL (Physical Activity Level) factors - FAO/WHO/UNU standards
  const palFactors = {
    sedentary: 1.4, // Thụ động/ít vận động
    light: 1.55, // Hoạt động nhẹ
    moderate: 1.7, // Hoạt động trung bình
    active: 1.85, // Năng động
    very_active: 2.2, // Cực kỳ năng động
  };

  // 3. Calculate TEE (Total Energy Expenditure)
  let tee = bmr * palFactors[user.activity_level];

  // 4. Adjust based on goal
  if (user.goal === "lose") {
    tee -= 500; // Deficit 500 kcal/day = ~0.5kg/week loss
  } else if (user.goal === "gain") {
    tee += 300; // Surplus 300 kcal/day = ~0.3kg/week gain
  }
  // maintain: no adjustment

  const calories = Math.round(tee);

  // 5. Calculate macronutrients (WHO/FAO recommendations)

  // Protein: 10-15% of calories (use 15% for better satiety & muscle)
  // 4 kcal per gram
  const proteinCalories = calories * 0.15;
  const protein = Math.round(proteinCalories / 4);

  // Fat: 20-35% of calories (use 30% for hormone health)
  // 9 kcal per gram
  const fatCalories = calories * 0.3;
  const fat = Math.round(fatCalories / 9);

  // Carbs: Remaining calories (typically 55%)
  // 4 kcal per gram
  const carbCalories = calories - proteinCalories - fatCalories;
  const carbs = Math.round(carbCalories / 4);

  // Fiber: WHO recommends 25-30g/day
  const fiber = 25;

  return {
    calories,
    protein,
    carbs,
    fat,
    fiber,
  };
};

/**
 * Helper function to estimate ideal weight range (optional)
 * Using BMI 18.5-24.9 as healthy range
 */
export const calculateIdealWeightRange = (height_cm: number) => {
  const height_m = height_cm / 100;
  const minWeight = Math.round(18.5 * height_m * height_m);
  const maxWeight = Math.round(24.9 * height_m * height_m);

  return { minWeight, maxWeight };
};

/**
 * Calculate BMI
 */
export const calculateBMI = (weight_kg: number, height_cm: number): number => {
  const height_m = height_cm / 100;
  return Math.round((weight_kg / (height_m * height_m)) * 10) / 10;
};
