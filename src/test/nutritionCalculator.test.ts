import { describe, it, expect } from "vitest";
import {
  calculateNutritionGoals,
  calculateBMI,
  calculateIdealWeightRange,
} from "@/utils/nutritionCalculator";

describe("calculateNutritionGoals", () => {
  const base = {
    age: 25,
    gender: "male" as const,
    weight_kg: 70,
    height_cm: 175,
    activity_level: "moderate" as const,
  };

  it("returns positive calorie goal for a typical active male", () => {
    const goals = calculateNutritionGoals(base);
    expect(goals.calories).toBeGreaterThan(1500);
    expect(goals.calories).toBeLessThan(4000);
  });

  it("applies 500 kcal deficit for lose goal", () => {
    const maintain = calculateNutritionGoals({ ...base, goal: "maintain" });
    const lose = calculateNutritionGoals({ ...base, goal: "lose" });
    expect(maintain.calories - lose.calories).toBe(500);
  });

  it("applies 300 kcal surplus for gain goal", () => {
    const maintain = calculateNutritionGoals({ ...base, goal: "maintain" });
    const gain = calculateNutritionGoals({ ...base, goal: "gain" });
    expect(gain.calories - maintain.calories).toBe(300);
  });

  it("female calorie goal is lower than male for same stats", () => {
    const male = calculateNutritionGoals({ ...base, gender: "male" });
    const female = calculateNutritionGoals({ ...base, gender: "female" });
    expect(female.calories).toBeLessThan(male.calories);
  });

  it("higher activity level → higher calorie goal", () => {
    const sedentary = calculateNutritionGoals({ ...base, activity_level: "sedentary" });
    const very_active = calculateNutritionGoals({ ...base, activity_level: "very_active" });
    expect(very_active.calories).toBeGreaterThan(sedentary.calories);
  });

  it("fiber is always 25g", () => {
    const goals = calculateNutritionGoals(base);
    expect(goals.fiber).toBe(25);
  });

  it("macros are positive integers", () => {
    const goals = calculateNutritionGoals(base);
    expect(goals.protein).toBeGreaterThan(0);
    expect(goals.carbs).toBeGreaterThan(0);
    expect(goals.fat).toBeGreaterThan(0);
    expect(Number.isInteger(goals.protein)).toBe(true);
    expect(Number.isInteger(goals.carbs)).toBe(true);
    expect(Number.isInteger(goals.fat)).toBe(true);
  });

  it("uses female Schofield formula for gender=other", () => {
    const female = calculateNutritionGoals({ ...base, gender: "female" });
    const other = calculateNutritionGoals({ ...base, gender: "other" });
    expect(other.calories).toBe(female.calories);
  });

  it("older male (≥60) uses different Schofield coefficient", () => {
    const young = calculateNutritionGoals({ ...base, age: 25 });
    const old = calculateNutritionGoals({ ...base, age: 65 });
    // Different BMR formula — calories will differ
    expect(young.calories).not.toBe(old.calories);
  });
});

describe("calculateBMI", () => {
  it("returns correct BMI rounded to 1 decimal", () => {
    // 70kg / 1.75m^2 = 22.857… → 22.9
    expect(calculateBMI(70, 175)).toBe(22.9);
  });

  it("returns 25 for a borderline overweight person", () => {
    // 175cm height, BMI 25 → 25 * 1.75^2 = 76.5625kg
    expect(calculateBMI(76.6, 175)).toBeCloseTo(25.0, 0);
  });

  it("increases with weight for fixed height", () => {
    expect(calculateBMI(60, 170)).toBeLessThan(calculateBMI(80, 170));
  });
});

describe("calculateIdealWeightRange", () => {
  it("returns min < max", () => {
    const { minWeight, maxWeight } = calculateIdealWeightRange(170);
    expect(minWeight).toBeLessThan(maxWeight);
  });

  it("taller person has higher ideal weight range", () => {
    const short = calculateIdealWeightRange(160);
    const tall = calculateIdealWeightRange(180);
    expect(tall.minWeight).toBeGreaterThan(short.minWeight);
    expect(tall.maxWeight).toBeGreaterThan(short.maxWeight);
  });

  it("minWeight corresponds to BMI 18.5", () => {
    const { minWeight } = calculateIdealWeightRange(170);
    const h = 1.7;
    expect(minWeight).toBe(Math.round(18.5 * h * h));
  });
});
