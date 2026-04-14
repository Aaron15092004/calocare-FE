// src/components/ProtectedRoute.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipOnboardingCheck?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  skipOnboardingCheck = false,
}) => {
  const { user, profile, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen gradient-fresh flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen gradient-fresh flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Admin/Moderator vào client route → redirect sang admin
  if (profile.role === "admin" || profile.role === "moderator") {
    return <Navigate to="/admin" replace />;
  }

  if (!skipOnboardingCheck) {
    const isOnboardingComplete =
      profile.daily_nutrition_goals?.calories &&
      profile.daily_nutrition_goals.calories > 0 &&
      profile.preferences?.age &&
      profile.preferences.weight_kg &&
      profile.preferences.height_cm;

    if (!isOnboardingComplete) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  return <>{children}</>;
};
