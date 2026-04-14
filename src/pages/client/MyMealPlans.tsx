import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Plus,
    Pencil,
    Trash2,
    Send,
    Loader2,
    ChevronDown,
    ChevronUp,
    Search,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface MealItem {
    id?: string;
    day_number: number;
    meal_type: string;
    recipe_id: string | null;
    food_id: string | null;
    serving_size: number;
    sort_order: number;
    recipe_name?: string;
    food_name?: string;
    calories?: number;
}

interface PlanForm {
    id?: string;
    title: string;
    description: string;
    total_days: number;
    goal_type: string;
    tags: string[];
}

const emptyForm: PlanForm = {
    title: "",
    description: "",
    total_days: 7,
    goal_type: "",
    tags: [],
};

const GOAL_TYPES = [
    { value: "", label: "-- Select goal --" },
    { value: "weight_loss", label: "Weight Loss" },
    { value: "muscle_gain", label: "Muscle Gain" },
    { value: "maintain", label: "Maintain" },
    { value: "health", label: "General Health" },
];

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

type ViewMode = "list" | "form";

const MyMealPlans: React.FC = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [plans, setPlans] = useState<MealPlanAPI[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>("list");

    const [form, setForm] = useState<PlanForm>(emptyForm);
    const [items, setItems] = useState<MealItem[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());

    const [addingDay, setAddingDay] = useState<number | null>(null);
    const [addingMeal, setAddingMeal] = useState("breakfast");
    const [itemSearch, setItemSearch] = useState("");
    const [itemResults, setItemResults] = useState<any[]>([]);
    const [itemSearchType, setItemSearchType] = useState<"recipe" | "food">("recipe");
    const [itemSearching, setItemSearching] = useState(false);
    const [showAddDialog, setShowAddDialog] = useState(false);

    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [submitId, setSubmitId] = useState<string | null>(null);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/meal-plans", { params: { mine: true, limit: 100 } });
            setPlans(data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleNew = () => {
        setForm(emptyForm);
        setItems([]);
        setCollapsedDays(new Set());
        setViewMode("form");
    };

    const handleEdit = async (plan: MealPlanAPI) => {
        setForm({
            id: plan._id,
            title: plan.title,
            description: plan.description || "",
            total_days: plan.total_days,
            goal_type: plan.goal_type || "",
            tags: plan.tags || [],
        });
        try {
            const { data } = await api.get(`/meal-plans/${plan._id}`);
            setItems(
                (data.items || []).map((item: any) => ({
                    id: item._id,
                    day_number: item.day_number,
                    meal_type: item.meal_type,
                    recipe_id: item.recipe_id?._id || item.recipe_id,
                    food_id: item.food_id?._id || item.food_id,
                    serving_size: item.serving_size || 1,
                    sort_order: item.sort_order || 0,
                    recipe_name: item.recipe_id?.name_vi,
                    food_name: item.food_id?.name_vi,
                    calories: item.recipe_id?.calories || item.food_id?.energy_kcal || 0,
                })),
            );
        } catch (err) {
            console.error(err);
        }
        setCollapsedDays(new Set());
        setViewMode("form");
    };

    const handleSave = async () => {
        if (!form.title.trim()) return;
        setSaving(true);
        try {
            const planData = {
                title: form.title.trim(),
                description: form.description.trim() || null,
                total_days: form.total_days,
                goal_type: form.goal_type || null,
                tags: form.tags,
            };
            const itemsPayload = items.map((item, i) => ({
                day_number: item.day_number,
                meal_type: item.meal_type,
                recipe_id: item.recipe_id || null,
                food_id: item.food_id || null,
                serving_size: item.serving_size,
                sort_order: i,
            }));

            if (form.id) {
                await api.put(`/meal-plans/${form.id}`, { ...planData, items: itemsPayload });
            } else {
                await api.post("/meal-plans", { ...planData, items: itemsPayload });
            }
            toast({ title: "Saved", description: "Meal plan saved successfully." });
            setViewMode("list");
            fetchPlans();
        } catch (err) {
            toast({ title: "Error", description: "Could not save meal plan.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/meal-plans/${deleteId}`);
            toast({ title: "Deleted", description: "Meal plan deleted." });
            setDeleteId(null);
            fetchPlans();
        } catch {
            toast({ title: "Error", description: "Could not delete plan.", variant: "destructive" });
        }
    };

    const handleSubmitForReview = async () => {
        if (!submitId) return;
        try {
            await api.post(`/meal-plans/${submitId}/submit`);
            toast({ title: "Submitted!", description: "Your plan is now pending admin review." });
            setSubmitId(null);
            fetchPlans();
        } catch {
            toast({ title: "Error", description: "Could not submit plan.", variant: "destructive" });
        }
    };

    const handleActivatePlan = async (planId: string) => {
        try {
            await api.post("/user-meal-plans", { meal_plan_id: planId });
            toast({ title: "Plan activated!", description: "This is now your active meal plan." });
            navigate("/meal-plan");
        } catch {
            toast({ title: "Error", description: "Could not activate plan.", variant: "destructive" });
        }
    };

    // Item search
    const searchItems = async (query: string) => {
        setItemSearch(query);
        if (query.length < 2) { setItemResults([]); return; }
        setItemSearching(true);
        try {
            const endpoint = itemSearchType === "recipe" ? "/recipes" : "/foods";
            const { data } = await api.get(endpoint, { params: { q: query, limit: 10 } });
            setItemResults((data.data || []).map((r: any) => ({ ...r, id: r._id })));
        } catch { setItemResults([]); }
        setItemSearching(false);
    };

    const addItem = (result: any) => {
        if (addingDay === null) return;
        const newItem: MealItem = {
            day_number: addingDay,
            meal_type: addingMeal,
            recipe_id: itemSearchType === "recipe" ? result.id : null,
            food_id: itemSearchType === "food" ? result.id : null,
            serving_size: 1,
            sort_order: items.filter((i) => i.day_number === addingDay && i.meal_type === addingMeal).length,
            recipe_name: itemSearchType === "recipe" ? result.name_vi : undefined,
            food_name: itemSearchType === "food" ? result.name_vi : undefined,
            calories: result.calories || result.energy_kcal || 0,
        };
        setItems([...items, newItem]);
        setItemSearch("");
        setItemResults([]);
        setShowAddDialog(false);
    };

    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

    const toggleDay = (day: number) => {
        setCollapsedDays((prev) => {
            const next = new Set(prev);
            next.has(day) ? next.delete(day) : next.add(day);
            return next;
        });
    };

    const addTag = () => {
        const t = tagInput.trim();
        if (t && !form.tags.includes(t)) setForm({ ...form, tags: [...form.tags, t] });
        setTagInput("");
    };

    const planStatusBadge = (plan: MealPlanAPI) => {
        if (plan.is_approved && plan.is_public) return <Badge className="bg-green-100 text-green-700 border-0">Published</Badge>;
        if (plan.is_public && !plan.is_approved) return <Badge className="bg-yellow-100 text-yellow-700 border-0">Pending Review</Badge>;
        return <Badge variant="secondary">Private</Badge>;
    };

    // ── FORM VIEW ──
    if (viewMode === "form") {
        const days = Array.from({ length: form.total_days }, (_, i) => i + 1);

        return (
            <div className="min-h-screen gradient-fresh pb-24">
                <header className="sticky top-0 z-50 glass border-b border-border/50">
                    <div className="container px-4 py-4 flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => setViewMode("list")} className="rounded-xl">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <h1 className="flex-1 text-xl font-bold">{form.id ? "Edit Plan" : "New Plan"}</h1>
                        <Button onClick={handleSave} disabled={saving || !form.title.trim()} size="sm">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                        </Button>
                    </div>
                </header>

                <main className="container px-4 py-6 space-y-6">
                    {/* Basic info */}
                    <Card>
                        <CardContent className="p-4 space-y-4">
                            <div>
                                <Label>Title *</Label>
                                <Input
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g. My 7-Day Clean Eating Plan"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Description</Label>
                                <Textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Describe your plan..."
                                    rows={2}
                                    className="mt-1"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Total Days</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={90}
                                        value={form.total_days}
                                        onChange={(e) => setForm({ ...form, total_days: Number(e.target.value) })}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Goal</Label>
                                    <select
                                        value={form.goal_type}
                                        onChange={(e) => setForm({ ...form, goal_type: e.target.value })}
                                        className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-background"
                                    >
                                        {GOAL_TYPES.map((g) => (
                                            <option key={g.value} value={g.value}>{g.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <Label>Tags</Label>
                                <div className="flex gap-2 mt-1">
                                    <Input
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && addTag()}
                                        placeholder="Add tag..."
                                    />
                                    <Button type="button" variant="outline" size="sm" onClick={addTag}>Add</Button>
                                </div>
                                {form.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {form.tags.map((t) => (
                                            <Badge key={t} variant="secondary" className="gap-1 cursor-pointer" onClick={() => setForm({ ...form, tags: form.tags.filter((x) => x !== t) })}>
                                                {t} <X className="w-3 h-3" />
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Meals per day */}
                    <div className="space-y-3">
                        <h2 className="font-semibold text-lg">Meals</h2>
                        {days.map((day) => {
                            const dayItems = items.filter((i) => i.day_number === day);
                            const collapsed = collapsedDays.has(day);
                            return (
                                <Card key={day}>
                                    <CardContent className="p-3">
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-between mb-2"
                                            onClick={() => toggleDay(day)}
                                        >
                                            <span className="font-medium">Day {day}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground">{dayItems.length} items</span>
                                                {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                                            </div>
                                        </button>

                                        {!collapsed && (
                                            <>
                                                {MEAL_TYPES.map((mealType) => {
                                                    const mealItems = dayItems.filter((i) => i.meal_type === mealType);
                                                    return (
                                                        <div key={mealType} className="mb-2">
                                                            <div className="flex items-center justify-between py-1">
                                                                <span className="text-sm font-medium capitalize text-muted-foreground">{mealType}</span>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 px-2 text-xs"
                                                                    onClick={() => {
                                                                        setAddingDay(day);
                                                                        setAddingMeal(mealType);
                                                                        setItemSearch("");
                                                                        setItemResults([]);
                                                                        setShowAddDialog(true);
                                                                    }}
                                                                >
                                                                    <Plus className="w-3 h-3 mr-1" /> Add
                                                                </Button>
                                                            </div>
                                                            {mealItems.map((item, idx) => {
                                                                const globalIdx = items.indexOf(item);
                                                                return (
                                                                    <div key={idx} className="flex items-center justify-between text-sm py-1 pl-2 rounded hover:bg-accent/50">
                                                                        <span className="flex-1 truncate">{item.recipe_name || item.food_name}</span>
                                                                        <span className="text-xs text-muted-foreground mr-2">{item.calories} kcal</span>
                                                                        <button type="button" onClick={() => removeItem(globalIdx)}>
                                                                            <X className="w-3.5 h-3.5 text-destructive" />
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </main>

                {/* Add item dialog */}
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add item — Day {addingDay}, {addingMeal}</DialogTitle>
                        </DialogHeader>
                        <div className="flex gap-2 mb-3">
                            <Button
                                type="button"
                                size="sm"
                                variant={itemSearchType === "recipe" ? "default" : "outline"}
                                onClick={() => { setItemSearchType("recipe"); setItemSearch(""); setItemResults([]); }}
                            >
                                Recipe
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={itemSearchType === "food" ? "default" : "outline"}
                                onClick={() => { setItemSearchType("food"); setItemSearch(""); setItemResults([]); }}
                            >
                                Food
                            </Button>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                className="pl-9"
                                placeholder={`Search ${itemSearchType}s...`}
                                value={itemSearch}
                                onChange={(e) => searchItems(e.target.value)}
                            />
                        </div>
                        {itemSearching && <p className="text-sm text-muted-foreground mt-2">Searching...</p>}
                        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                            {itemResults.map((r) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    className="w-full text-left flex items-center justify-between p-2 rounded hover:bg-accent text-sm"
                                    onClick={() => addItem(r)}
                                >
                                    <span className="truncate">{r.name_vi}</span>
                                    <span className="text-xs text-muted-foreground ml-2">
                                        {r.calories || r.energy_kcal || 0} kcal
                                    </span>
                                </button>
                            ))}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <BottomNav />
            </div>
        );
    }

    // ── LIST VIEW ──
    return (
        <div className="min-h-screen gradient-fresh pb-24">
            <header className="sticky top-0 z-50 glass border-b border-border/50">
                <div className="container px-4 py-4 flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-xl">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="flex-1 text-xl font-bold">My Meal Plans</h1>
                    <Button size="sm" onClick={handleNew} className="gap-1">
                        <Plus className="w-4 h-4" /> New
                    </Button>
                </div>
            </header>

            <main className="container px-4 py-6 space-y-4">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : plans.length === 0 ? (
                    <Card>
                        <CardContent className="p-10 text-center">
                            <p className="text-muted-foreground mb-4">No meal plans yet.</p>
                            <Button onClick={handleNew} className="gap-2">
                                <Plus className="w-4 h-4" /> Create your first plan
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    plans.map((plan) => (
                        <Card key={plan._id}>
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <h3 className="font-semibold truncate">{plan.title}</h3>
                                            {planStatusBadge(plan)}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {plan.total_days} days
                                            {plan.goal_type ? ` · ${plan.goal_type.replace("_", " ")}` : ""}
                                        </p>
                                        {plan.description && (
                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{plan.description}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(plan)}>
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(plan._id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-3 flex-wrap">
                                    <Button size="sm" variant="outline" onClick={() => handleActivatePlan(plan._id)}>
                                        Set Active
                                    </Button>
                                    {!plan.is_public && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="gap-1"
                                            onClick={() => setSubmitId(plan._id)}
                                        >
                                            <Send className="w-3 h-3" /> Submit for Review
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </main>

            {/* Delete confirm */}
            <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete this plan?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Submit for review confirm */}
            <Dialog open={!!submitId} onOpenChange={() => setSubmitId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Submit plan for community review?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Your plan will be sent to admins for review. Once approved it will appear in the community feed.
                    </p>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setSubmitId(null)}>Cancel</Button>
                        <Button onClick={handleSubmitForReview}>Submit</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <BottomNav />
        </div>
    );
};

export default MyMealPlans;
