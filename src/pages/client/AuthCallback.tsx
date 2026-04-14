import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";

const AuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { handleOAuthCallback } = useAuthContext();

    useEffect(() => {
        const accessToken = searchParams.get("access_token");
        const refreshToken = searchParams.get("refresh_token");
        const error = searchParams.get("error");

        if (error) {
            navigate("/auth?error=" + error, { replace: true });
            return;
        }

        if (accessToken && refreshToken) {
            handleOAuthCallback(accessToken, refreshToken).then(() => {
                navigate("/", { replace: true });
            });
        } else {
            navigate("/auth", { replace: true });
        }
    }, []);

    return (
        <div className="min-h-screen gradient-fresh flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
    );
};

export default AuthCallback;