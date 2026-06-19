type OnboardingProfile = {
    daily_nutrition_goals?: {
        calories?: number | null;
    } | null;
    preferences?: Record<string, unknown> | null;
};

function hasPositiveNumber(value: unknown): boolean {
    return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function isOnboardingComplete(profile?: OnboardingProfile | null): boolean {
    if (!profile) return false;
    const prefs = profile.preferences ?? {};
    if (prefs.onboarding_completed === true) return true;

    return Boolean(
        hasPositiveNumber(profile.daily_nutrition_goals?.calories) &&
        hasPositiveNumber(prefs.age) &&
        hasPositiveNumber(prefs.weight_kg) &&
        hasPositiveNumber(prefs.height_cm),
    );
}

