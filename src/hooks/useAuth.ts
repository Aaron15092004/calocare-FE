import { useState, useEffect, useCallback } from "react";
import api, { setTokens, clearTokens, getGoogleOAuthUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { AxiosError } from "axios";

export interface Profile {
    id: string;
    email: string;
    display_name: string | null;
    avatar_url: string | null;
    role: "user" | "admin" | "moderator";
    subscription_tier: "free" | "premium" | "pro";
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

const getCachedProfile = (): { profile: Profile; timestamp: number } | null => {
    const cached = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached);
};

const setCachedProfile = (profile: Profile) => {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ profile, timestamp: Date.now() }));
};

const clearCachedProfile = () => localStorage.removeItem(PROFILE_CACHE_KEY);

export const useAuth = () => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const isAdmin = profile?.role === "admin";
    const isModerator = profile?.role === "moderator";
    const isStaff = isAdmin || isModerator;
    const isBanned = profile?.is_banned === true;
    const isPremium =
        profile?.subscription_tier === "premium" || profile?.subscription_tier === "pro";

    const fetchProfile = useCallback(async (force = false) => {
        try {
            const cached = getCachedProfile();
            if (!force && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
                setProfile(cached.profile);
                return;
            }
            const { data } = await api.get<Profile>("/auth/me");
            setProfile(data);
            setCachedProfile(data);
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
            setProfile(data.user);
            setCachedProfile(data.user);

            toast({ title: "Account created!", description: "Welcome to CaloCare." });
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
            setProfile(data.user);
            setCachedProfile(data.user);

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

    const signInWithGoogle = () => {
        window.location.href = getGoogleOAuthUrl();
    };

    const updateProfile = async (updates: Partial<Profile>) => {
        try {
            const { data } = await api.put<Profile>("/profile", updates);
            setProfile(data);
            setCachedProfile(data);
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
        signInWithGoogle,
        updateProfile,
        handleOAuthCallback,
        refreshProfile,
        isAuthenticated: !!profile,
        isAdmin,
        isModerator,
        isStaff,
        isBanned,
        isPremium,
    };
};