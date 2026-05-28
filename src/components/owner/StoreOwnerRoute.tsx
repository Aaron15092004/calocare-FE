import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export const StoreOwnerRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, isStoreOwner, isStaff, loading } = useAuthContext();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAuthenticated) return <Navigate to="/auth" replace />;
    // Admin/moderator can access owner routes too (for inspection)
    if (!isStoreOwner && !isStaff) return <Navigate to="/" replace />;

    return <>{children}</>;
};
