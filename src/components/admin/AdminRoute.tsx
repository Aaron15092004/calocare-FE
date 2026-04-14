// src/components/admin/AdminRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, isStaff, loading } = useAuthContext();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (!isAuthenticated) return <Navigate to="/auth" replace />;
    if (!isStaff) return <Navigate to="/" replace />;

    return <>{children}</>;
};
