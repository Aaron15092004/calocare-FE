import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { invalidateMealPlanCache } from "@/pages/client/MealPlan";
import { clearPendingGenerationMarker } from "@/hooks/useSSEMealPlan";

interface RecoveryPlan {
    _id: string;
    title: string;
    status: "generating" | "partial" | "completed";
    generated_days: number;
    total_days: number;
    goal_type?: string;
    generation_error?: string;
    created_at: string;
}

const DISMISS_KEY = "calovie:dismissed-recovery-plan";

/**
 * Surfaces the user's most recent AI meal plan that finished (or is still
 * generating) after they left the generation screen — the backend keeps
 * working through disconnects, this banner is how they find the result.
 */
export const MealPlanRecoveryBanner = ({ className = "" }: { className?: string }) => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [plan, setPlan] = useState<RecoveryPlan | null>(null);
    const [activating, setActivating] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchRecovery = useCallback(async () => {
        try {
            const { data } = await api.get<{ plan: RecoveryPlan | null }>("/meal-plans/mine/recovery");
            const found = data.plan;
            if (!found || localStorage.getItem(DISMISS_KEY) === found._id) {
                setPlan(null);
                return;
            }
            setPlan(found);
        } catch {
            // Non-critical surface — stay silent on errors
        }
    }, []);

    useEffect(() => {
        fetchRecovery();
    }, [fetchRecovery]);

    // While the plan is still generating, poll for progress
    useEffect(() => {
        if (plan?.status === "generating") {
            pollRef.current = setInterval(fetchRecovery, 5000);
            return () => {
                if (pollRef.current) clearInterval(pollRef.current);
            };
        }
    }, [plan?.status, fetchRecovery]);

    if (!plan) return null;

    const dismiss = () => {
        localStorage.setItem(DISMISS_KEY, plan._id);
        clearPendingGenerationMarker();
        setPlan(null);
    };

    const activate = async () => {
        if (activating) return;
        setActivating(true);
        try {
            await api.post("/user-meal-plans", { meal_plan_id: plan._id });
            invalidateMealPlanCache();
            clearPendingGenerationMarker();
            toast({ title: "Thực đơn đã kích hoạt!", description: "Bắt đầu hành trình ăn uống lành mạnh nhé." });
            navigate("/meal-plan");
        } catch {
            toast({ title: "Lỗi kích hoạt", description: "Không thể kích hoạt thực đơn, vui lòng thử lại.", variant: "destructive" });
        } finally {
            setActivating(false);
        }
    };

    if (plan.status === "generating") {
        const pct = plan.total_days > 0 ? Math.round((plan.generated_days / plan.total_days) * 100) : 0;
        return (
            <div className={`rounded-2xl border border-primary/20 bg-primary/5 p-4 ${className}`}>
                <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">CaloVie AI vẫn đang tạo thực đơn của bạn</p>
                        <p className="text-xs text-muted-foreground">
                            Đã xong {plan.generated_days}/{plan.total_days} ngày — bạn có thể dùng app bình thường, thực đơn sẽ được lưu tự động.
                        </p>
                    </div>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
            </div>
        );
    }

    return (
        <div className={`rounded-2xl border border-primary/20 bg-primary/5 p-4 ${className}`}>
            <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                    {plan.status === "completed"
                        ? <CheckCircle2 className="w-5 h-5 text-primary" />
                        : <Sparkles className="w-5 h-5 text-amber-500" />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">
                        {plan.status === "completed"
                            ? `Thực đơn ${plan.total_days} ngày của bạn đã sẵn sàng!`
                            : `Thực đơn đã tạo được ${plan.generated_days} ngày`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {plan.status === "partial" && plan.generation_error
                            ? `${plan.generation_error} — bạn vẫn có thể dùng các ngày đã tạo.`
                            : "Kế hoạch được tạo xong khi bạn rời trang. Kích hoạt để bắt đầu dùng ngay."}
                    </p>
                    <div className="mt-2.5 flex gap-2">
                        <Button size="sm" className="h-8 text-xs" onClick={activate} disabled={activating}>
                            {activating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                            Kích hoạt
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => navigate("/my-meal-plans")}>
                            Xem chi tiết
                        </Button>
                    </div>
                </div>
                <button type="button" onClick={dismiss} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Bỏ qua">
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default MealPlanRecoveryBanner;
