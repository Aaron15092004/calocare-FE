import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Users, Flame, Tag, Loader2, Copy } from "lucide-react";
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

const GOAL_LABELS: Record<string, string> = {
    weight_loss: "Weight Loss",
    muscle_gain: "Muscle Gain",
    maintain: "Maintain",
    health: "General Health",
};

const CommunityMealPlans: React.FC = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [plans, setPlans] = useState<MealPlanAPI[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [goalFilter, setGoalFilter] = useState("");
    const [cloneTarget, setCloneTarget] = useState<MealPlanAPI | null>(null);
    const [cloning, setCloning] = useState(false);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/meal-plans", {
                params: { community: true, limit: 100 },
            });
            setPlans(data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleClone = async () => {
        if (!cloneTarget) return;
        setCloning(true);
        try {
            await api.post(`/meal-plans/${cloneTarget._id}/clone`);
            toast({
                title: "Plan activated!",
                description: `"${cloneTarget.title}" is now your active meal plan.`,
            });
            setCloneTarget(null);
            navigate("/meal-plan");
        } catch {
            toast({ title: "Error", description: "Could not clone plan.", variant: "destructive" });
        } finally {
            setCloning(false);
        }
    };

    const filtered = plans.filter((p) => {
        const matchSearch =
            !search ||
            p.title.toLowerCase().includes(search.toLowerCase()) ||
            p.description?.toLowerCase().includes(search.toLowerCase()) ||
            p.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()));
        const matchGoal = !goalFilter || p.goal_type === goalFilter;
        return matchSearch && matchGoal;
    });

    return (
        <div className="min-h-screen gradient-fresh pb-24">
            {/* Header */}
            <header className="sticky top-0 z-50 glass border-b border-border/50">
                <div className="container px-4 py-4">
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
                            <h1 className="text-xl font-bold text-foreground">Community Plans</h1>
                            <p className="text-sm text-muted-foreground">
                                Browse and use approved meal plans
                            </p>
                        </div>
                        <Users className="w-5 h-5 text-primary" />
                    </div>
                </div>
            </header>

            <main className="container px-4 py-6 space-y-4">
                {/* Search & Filter */}
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            className="pl-9"
                            placeholder="Search plans..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {["", "weight_loss", "muscle_gain", "maintain", "health"].map((g) => (
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
                                {g ? GOAL_LABELS[g] : "All Goals"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stats */}
                <p className="text-sm text-muted-foreground">
                    {filtered.length} plan{filtered.length !== 1 ? "s" : ""} available
                </p>

                {/* Plans */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : filtered.length === 0 ? (
                    <Card>
                        <CardContent className="p-10 text-center text-muted-foreground">
                            No community plans found.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {filtered.map((plan) => (
                            <Card key={plan._id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-foreground truncate mb-1">
                                                {plan.title}
                                            </h3>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                                <span className="flex items-center gap-1">
                                                    <Flame className="w-3 h-3" />
                                                    {plan.total_days} days
                                                </span>
                                                {plan.goal_type && (
                                                    <>
                                                        <span>·</span>
                                                        <span>{GOAL_LABELS[plan.goal_type] ?? plan.goal_type}</span>
                                                    </>
                                                )}
                                            </div>
                                            {plan.description && (
                                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                                    {plan.description}
                                                </p>
                                            )}
                                            {plan.tags && plan.tags.length > 0 && (
                                                <div className="flex gap-1 flex-wrap">
                                                    {plan.tags.map((tag) => (
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
                                            Use Plan
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* My Plans shortcut */}
                <Card className="bg-gradient-to-br from-primary/10 to-accent">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                            <span className="text-xl">✍️</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium">Create your own plan</p>
                            <p className="text-xs text-muted-foreground">
                                Build a custom plan and share with the community
                            </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => navigate("/my-meal-plans")}>
                            Create
                        </Button>
                    </CardContent>
                </Card>
            </main>

            {/* Clone confirm dialog */}
            <Dialog open={!!cloneTarget} onOpenChange={() => setCloneTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Use this meal plan?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        <strong>{cloneTarget?.title}</strong> will become your active meal plan.
                        Any currently active plan will be deactivated.
                    </p>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setCloneTarget(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleClone} disabled={cloning}>
                            {cloning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <BottomNav />
        </div>
    );
};

export default CommunityMealPlans;
