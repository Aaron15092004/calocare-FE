import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { invalidateMealPlanCache } from "@/pages/client/MealPlan";
import { ArrowLeft, Search, Users, Flame, Tag, Loader2, Copy, CalendarDays, ChefHat, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { MealPlanAPI } from "@/types/mealPlan";
import { AdSenseUnit } from "@/components/AdSenseUnit";

const GOAL_LABELS: Record<string, string> = {
    weight_loss: "Giảm cân",
    muscle_gain: "Tăng cơ",
    maintenance: "Duy trì",
    maintain: "Duy trì",
    health: "Sức khỏe",
};

const PAGE_SIZE = 20;

// Community list enriches plans with author + nutrition summary + preview image
type CommunityPlan = Omit<MealPlanAPI, "creator_id"> & {
    creator_id?: { display_name?: string } | string | null;
    avg_daily_kcal?: number | null;
    item_count?: number;
    preview_image?: string | null;
};

const authorName = (plan: CommunityPlan): string => {
    if (plan.creator_id && typeof plan.creator_id === "object") {
        return plan.creator_id.display_name || "Cộng đồng";
    }
    return "Cộng đồng";
};

const CommunityMealPlans: React.FC = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [plans, setPlans] = useState<CommunityPlan[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [goalFilter, setGoalFilter] = useState("");
    const [cloneTarget, setCloneTarget] = useState<CommunityPlan | null>(null);
    const [cloning, setCloning] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounced server-side search — the old version filtered a capped 100-row
    // page on the client, hiding anything beyond the cap
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setSearch(searchInput.trim()), 350);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [searchInput]);

    const fetchPlans = useCallback(async (offset = 0) => {
        if (offset === 0) setLoading(true);
        else setLoadingMore(true);
        try {
            const { data } = await api.get("/meal-plans", {
                params: {
                    community: true,
                    limit: PAGE_SIZE,
                    offset,
                    q: search || undefined,
                    goal_type: goalFilter || undefined,
                },
            });
            setTotal(data.total || 0);
            setPlans((prev) => (offset === 0 ? data.data || [] : [...prev, ...(data.data || [])]));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [search, goalFilter]);

    useEffect(() => {
        fetchPlans(0);
    }, [fetchPlans]);

    const handleClone = async () => {
        if (!cloneTarget) return;
        setCloning(true);
        try {
            await api.post(`/meal-plans/${cloneTarget._id}/activate`);
            toast({
                title: "Đã kích hoạt!",
                description: `"${cloneTarget.title}" là kế hoạch ăn đang dùng của bạn.`,
            });
            setCloneTarget(null);
            invalidateMealPlanCache();
            navigate("/meal-plan");
        } catch {
            toast({ title: "Lỗi", description: "Không thể kích hoạt kế hoạch.", variant: "destructive" });
        } finally {
            setCloning(false);
        }
    };

    return (
        <div className="min-h-screen gradient-fresh pb-nav-safe">
            {/* Header */}
            <header className="sticky top-0 z-50 glass border-b border-border/50">
                <div className="container px-5 py-4">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate("/")}
                            className="rounded-xl"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex-1">
                            <h1 className="page-title text-foreground">Thực đơn cộng đồng</h1>
                            <p className="text-sm text-muted-foreground">
                                Khám phá và dùng các kế hoạch ăn đã được duyệt
                            </p>
                        </div>
                        <Users className="w-5 h-5 text-primary" />
                    </div>
                </div>
            </header>

            <main className="container px-5 py-6 space-y-4">
                {/* Search & Filter */}
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            className="pl-9"
                            placeholder="Tìm thực đơn theo tên, mô tả, tag..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {["", "weight_loss", "muscle_gain", "maintenance"].map((g) => (
                            <button
                                key={g}
                                type="button"
                                onClick={() => setGoalFilter(g)}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                    goalFilter === g
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background border-border text-muted-foreground hover:border-primary"
                                }`}
                            >
                                {g ? GOAL_LABELS[g] : "Tất cả mục tiêu"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stats */}
                <p className="text-sm text-muted-foreground">{total} thực đơn</p>

                <AdSenseUnit
                    slot={import.meta.env.VITE_ADSENSE_SLOT_COMMUNITY ?? import.meta.env.VITE_ADSENSE_SLOT_INLINE ?? ""}
                    format="auto"
                    className="min-h-[100px]"
                />

                {/* Plans */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : plans.length === 0 ? (
                    <Card>
                        <CardContent className="p-10 text-center text-muted-foreground">
                            Chưa có thực đơn cộng đồng phù hợp.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {plans.map((plan) => (
                            <Card key={plan._id} className="overflow-hidden hover:shadow-md transition-shadow">
                                {plan.preview_image ? (
                                    <div className="h-32 w-full overflow-hidden">
                                        <img src={plan.preview_image} alt={plan.title} className="h-full w-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="h-20 w-full bg-gradient-to-r from-primary/15 via-primary/5 to-accent flex items-center justify-center">
                                        <ChefHat className="w-8 h-8 text-primary/40" />
                                    </div>
                                )}
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-foreground truncate mb-1">
                                                {plan.title}
                                            </h3>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <CalendarDays className="w-3 h-3" />
                                                    {plan.total_days} ngày
                                                </span>
                                                {plan.avg_daily_kcal ? (
                                                    <>
                                                        <span>·</span>
                                                        <span className="flex items-center gap-1">
                                                            <Flame className="w-3 h-3 text-orange-400" />
                                                            ~{plan.avg_daily_kcal.toLocaleString("vi-VN")} kcal/ngày
                                                        </span>
                                                    </>
                                                ) : null}
                                                {plan.goal_type && (
                                                    <>
                                                        <span>·</span>
                                                        <span>{GOAL_LABELS[plan.goal_type] ?? plan.goal_type}</span>
                                                    </>
                                                )}
                                            </div>
                                            <p className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                                                <UserCircle2 className="w-3.5 h-3.5" />
                                                {authorName(plan)}
                                            </p>
                                            {plan.description && (
                                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                                    {plan.description}
                                                </p>
                                            )}
                                            {plan.tags && plan.tags.length > 0 && (
                                                <div className="flex gap-1 flex-wrap">
                                                    {plan.tags.slice(0, 4).map((tag) => (
                                                        <Badge
                                                            key={tag}
                                                            variant="secondary"
                                                            className="text-xs gap-1"
                                                        >
                                                            <Tag className="w-2.5 h-2.5" />
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            size="sm"
                                            className="flex-shrink-0 gap-1"
                                            onClick={() => setCloneTarget(plan)}
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                            Dùng ngay
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {plans.length < total && (
                            <Button
                                variant="outline"
                                className="w-full"
                                disabled={loadingMore}
                                onClick={() => fetchPlans(plans.length)}
                            >
                                {loadingMore
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : `Xem thêm (${total - plans.length})`}
                            </Button>
                        )}
                    </div>
                )}

                {/* My Plans shortcut */}
                <Card className="bg-gradient-to-br from-primary/10 to-accent">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                            <span className="text-xl">✍️</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium">Tự tạo kế hoạch riêng</p>
                            <p className="text-xs text-muted-foreground">
                                Xây dựng thực đơn của bạn và chia sẻ với cộng đồng
                            </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => navigate("/my-meal-plans")}>
                            Tạo mới
                        </Button>
                    </CardContent>
                </Card>
            </main>

            {/* Clone confirm dialog */}
            <Dialog open={!!cloneTarget} onOpenChange={() => setCloneTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Dùng kế hoạch này?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        <strong>{cloneTarget?.title}</strong> sẽ trở thành kế hoạch ăn đang dùng của bạn.
                        Kế hoạch hiện tại (nếu có) sẽ được thay thế.
                    </p>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setCloneTarget(null)}>
                            Hủy
                        </Button>
                        <Button onClick={handleClone} disabled={cloning}>
                            {cloning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xác nhận"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <BottomNav />
        </div>
    );
};

export default CommunityMealPlans;
