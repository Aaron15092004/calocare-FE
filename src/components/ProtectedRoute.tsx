// src/components/ProtectedRoute.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { isOnboardingComplete } from "@/utils/onboarding";

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

  // Store owner vào client route → redirect sang owner dashboard
  if (profile.role === "store_owner") {
    return <Navigate to="/owner" replace />;
  }

  if (!skipOnboardingCheck) {
    if (!isOnboardingComplete(profile)) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  return <>{children}</>;
};
