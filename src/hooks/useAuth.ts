import { useState, useEffect, useCallback } from "react";
import api, { setTokens, clearTokens, getGoogleOAuthUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { AxiosError } from "axios";

export interface Profile {
    id: string;
    email: string;
    display_name: string | null;
    avatar_url: string | null;
    role: "user" | "admin" | "moderator" | "store_owner";
    subscription_tier: "free" | "premium" | "family" | "pro";
    subscription_expires_at: string | null;
    is_banned: boolean;
    language: string;
    daily_nutrition_goals: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
        vitamins?: Record<string, number>;
        minerals?: Record<string, number>;
    };
    preferences: {
        age?: number;
        gender?: "male" | "female" | "other";
        height_cm?: number;
        weight_kg?: number;
        activity_level?: "sedentary" | "light" | "moderate" | "active" | "very_active";
        dietary_restrictions?: string[];
    };
    created_at: string;
}

const PROFILE_CACHE_KEY = import.meta.env.VITE_PROFILE_CACHE_KEY || "user_profile_cache";
const CACHE_DURATION = Number(import.meta.env.VITE_CACHE_DURATION) || 900000;

const getEffectiveProfileTier = (profile?: Profile | null): Profile["subscription_tier"] => {
    if (!profile || profile.subscription_tier === "free") return "free";
    if (!profile.subscription_expires_at) return "free";

    const expiresAt = new Date(profile.subscription_expires_at).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return "free";

    return profile.subscription_tier;
};

const normalizeProfileSubscription = (profile: Profile): Profile => {
    const effectiveTier = getEffectiveProfileTier(profile);
    if (effectiveTier === profile.subscription_tier) return profile;
    return {
        ...profile,
        subscription_tier: "free",
        subscription_expires_at: null,
    };
};

const getCachedProfile = (): { profile: Profile; timestamp: number } | null => {
    const cached = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as { profile: Profile; timestamp: number };
    return { ...parsed, profile: normalizeProfileSubscription(parsed.profile) };
};

const setCachedProfile = (profile: Profile) => {
    localStorage.setItem(
        PROFILE_CACHE_KEY,
        JSON.stringify({ profile: normalizeProfileSubscription(profile), timestamp: Date.now() }),
    );
};

const clearCachedProfile = () => localStorage.removeItem(PROFILE_CACHE_KEY);

export const useAuth = () => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const isAdmin      = profile?.role === "admin";
    const isModerator  = profile?.role === "moderator";
    const isStoreOwner = profile?.role === "store_owner";
    const isStaff      = isAdmin || isModerator;
    const isBanned     = profile?.is_banned === true;
    const effectiveTier = getEffectiveProfileTier(profile);
    const isPremium    = effectiveTier === "premium" || effectiveTier === "family" || effectiveTier === "pro";

    const fetchProfile = useCallback(async (force = false) => {
        try {
            const cached = getCachedProfile();
            if (!force && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
                setProfile(cached.profile);
                return;
            }
            const { data } = await api.get<Profile>("/auth/me");
            const normalized = normalizeProfileSubscription(data);
            setProfile(normalized);
            setCachedProfile(normalized);
        } catch {
            setProfile(null);
            clearCachedProfile();
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (token) {
            fetchProfile().finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [fetchProfile]);

    const signUp = async (email: string, password: string, displayName?: string) => {
        try {
            const { data } = await api.post<{
                access_token: string;
                refresh_token: string;
                user: Profile;
            }>("/auth/register", {
                email,
                password,
                display_name: displayName || email.split("@")[0],
            });

            setTokens(data.access_token, data.refresh_token);
            const normalized = normalizeProfileSubscription(data.user);
            setProfile(normalized);
            setCachedProfile(normalized);

            toast({ title: "Account created!", description: "Welcome to CaloVie." });
            return { data, error: null };
        } catch (err) {
            const error = err as AxiosError<{ error: string }>;
            const message = error.response?.data?.error || "Sign up failed";
            toast({ title: "Sign Up Failed", description: message, variant: "destructive" });
            return { error };
        }
    };

    const signIn = async (email: string, password: string) => {
        clearCachedProfile();
        try {
            const { data } = await api.post<{
                access_token: string;
                refresh_token: string;
                user: Profile;
            }>("/auth/login", { email, password });

            setTokens(data.access_token, data.refresh_token);
            const normalized = normalizeProfileSubscription(data.user);
            setProfile(normalized);
            setCachedProfile(normalized);

            toast({ title: "Welcome back! 👋", description: "You've successfully signed in." });
            return { data, error: null };
        } catch (err) {
            const error = err as AxiosError<{ error: string }>;
            const msg = error.response?.data?.error || "Invalid email or password";
            toast({ title: "Sign In Failed", description: msg, variant: "destructive" });
            return { error };
        }
    };

    const signOut = async () => {
        try {
            const refreshToken = localStorage.getItem("refresh_token");
            await api.post("/auth/logout", { refresh_token: refreshToken });
        } catch { /* ignore */ }

        clearTokens();
        setProfile(null);
        toast({ title: "Signed out", description: "See you next time!" });
        return { error: null };
    };

    const deleteAccount = async () => {
        try {
            await api.delete("/auth/account", {
                data: { confirmation: "DELETE" },
            });
            clearTokens();
            clearCachedProfile();
            setProfile(null);
            toast({
                title: "Account deleted",
                description: "Your CaloVie account and core data have been removed.",
            });
            return { error: null };
        } catch (err) {
            const error = err as AxiosError<{ error: string }>;
            toast({
                title: "Delete failed",
                description: error.response?.data?.error || "Could not delete account",
                variant: "destructive",
            });
            return { error };
        }
    };

    const signInWithGoogle = () => {
        window.location.href = getGoogleOAuthUrl();
    };

    const updateProfile = async (updates: Partial<Profile>) => {
        try {
            const { data } = await api.put<Profile>("/profile", updates);
            const normalized = normalizeProfileSubscription(data);
            setProfile(normalized);
            setCachedProfile(normalized);
            toast({ title: "Profile Updated", description: "Your changes have been saved." });
            return { data, error: null };
        } catch (err) {
            const error = err as AxiosError<{ error: string }>;
            toast({
                title: "Update Failed",
                description: error.response?.data?.error || "Update failed",
                variant: "destructive",
            });
            return { error };
        }
    };

    // Called after Google OAuth redirect with tokens in URL
    const handleOAuthCallback = async (accessToken: string, refreshToken: string) => {
        setTokens(accessToken, refreshToken);
        await fetchProfile(true);
    };

    const refreshProfile = useCallback(() => fetchProfile(true), [fetchProfile]);

    return {
        user: profile,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        deleteAccount,
        signInWithGoogle,
        updateProfile,
        handleOAuthCallback,
        refreshProfile,
        isAuthenticated: !!profile,
        isAdmin,
        isModerator,
        isStoreOwner,
        isStaff,
        isBanned,
        isPremium,
    };
};
