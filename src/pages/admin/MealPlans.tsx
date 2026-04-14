// src/pages/admin/MealPlans.tsx
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Search,
    Check,
    X,
    MoreHorizontal,
    Plus,
    Pencil,
    Trash2,
    Eye,
    ArrowLeft,
    Loader2,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

interface MealPlanForm {
    id?: string;
    title: string;
    description: string;
    total_days: number;
    goal_type: string;
    tags: string[];
    is_public: boolean;
    is_approved: boolean;
}

interface MealItem {
    id?: string;
    day_number: number;
    meal_type: string;
    recipe_id: string | null;
    food_id: string | null;
    serving_size: number;
    note: string;
    sort_order: number;
    // display
    recipe_name?: string;
    food_name?: string;
    calories?: number;
}

const emptyForm: MealPlanForm = {
    title: "",
    description: "",
    total_days: 7,
    goal_type: "",
    tags: [],
    is_public: false,
    is_approved: false,
};

const GOAL_TYPES = [
    { value: "", label: "-- Select goal --" },
    { value: "weight_loss", label: "Weight Loss" },
    { value: "muscle_gain", label: "Muscle Gain" },
    { value: "maintain", label: "Maintain" },
    { value: "health", label: "General Health" },
];

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

const MEAL_LABELS: Record<string, string> = {
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    snack: "Snack",
};

type ViewMode = "list" | "form" | "detail";

const MealPlans = () => {
    const { profile } = useAuthContext();
    const [plans, setPlans] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "draft" | "public">("all");
    const [filterGoal, setFilterGoal] = useState<string>("all");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [form, setForm] = useState<MealPlanForm>(emptyForm);
    const [items, setItems] = useState<MealItem[]>([]);
    const [tagInput, setTagInput] = useState("");

    // Item search
    const [addingDay, setAddingDay] = useState<number | null>(null);
    const [addingMeal, setAddingMeal] = useState<string>("breakfast");
    const [itemSearch, setItemSearch] = useState("");
    const [itemResults, setItemResults] = useState<any[]>([]);
    const [itemSearchType, setItemSearchType] = useState<"recipe" | "food">("recipe");
    const [itemSearching, setItemSearching] = useState(false);
    const [showAddDialog, setShowAddDialog] = useState(false);

    // Detail
    const [detailPlan, setDetailPlan] = useState<any>(null);
    const [detailItems, setDetailItems] = useState<MealItem[]>([]);

    // Delete
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Collapsed days
    const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/meal-plans", { params: { limit: 200 } });
            setPlans(data.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    // ── CRUD ──

    const handleNew = () => {
        setForm(emptyForm);
        setItems([]);
        setCollapsedDays(new Set());
        setViewMode("form");
    };

    const handleEdit = async (plan: any) => {
        setForm({
            id: plan.id,
            title: plan.title || "",
            description: plan.description || "",
            total_days: plan.total_days || 7,
            goal_type: plan.goal_type || "",
            tags: plan.tags || [],
            is_public: plan.is_public || false,
            is_approved: plan.is_approved || false,
        });

        const { data: planDetail } = await api.get(`/meal-plans/${plan._id || plan.id}`);
        setItems(
            (planDetail.items || []).map((item: any) => ({
                id: item._id,
                day_number: item.day_number,
                meal_type: item.meal_type,
                recipe_id: item.recipe_id?._id || item.recipe_id,
                food_id: item.food_id?._id || item.food_id,
                serving_size: item.serving_size || 1,
                note: item.note || "",
                sort_order: item.sort_order || 0,
                recipe_name: item.recipe_id?.name_vi,
                food_name: item.food_id?.name_vi,
                calories: item.recipe_id?.calories || item.food_id?.energy_kcal || 0,
            })),
        );
        setCollapsedDays(new Set());
        setViewMode("form");
    };

    const handleSave = async () => {
        if (!form.title.trim()) return;
        setSaving(true);

        const planData = {
            title: form.title.trim(),
            description: form.description.trim() || null,
            total_days: form.total_days,
            goal_type: form.goal_type || null,
            tags: form.tags,
            is_public: form.is_public,
            is_approved: form.is_approved,
            creator_id: profile?.id,
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

        setSaving(false);
        setViewMode("list");
        fetchPlans();
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        await api.delete(`/meal-plans/${deleteId}`);
        setDeleteId(null);
        fetchPlans();
    };

    const handleViewDetail = async (plan: any) => {
        setDetailPlan(plan);
        const { data } = await api.get(`/meal-plans/${plan._id || plan.id}`);
        setDetailItems(
            (data.items || []).map((item: any) => ({
                ...item,
                recipe_name: item.recipe_id?.name_vi,
                food_name: item.food_id?.name_vi,
                calories: item.recipe_id?.calories || item.food_id?.energy_kcal || 0,
            })),
        );
        setViewMode("detail");
    };

    const approve = async (id: string) => {
        await api.post(`/meal-plans/${id}/approve`);
        fetchPlans();
    };

    const reject = async (id: string) => {
        await api.post(`/meal-plans/${id}/reject`);
        fetchPlans();
    };

    // ── Item helpers ──

    const searchItems = async (query: string) => {
        setItemSearch(query);
        if (query.length < 2) {
            setItemResults([]);
            return;
        }
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
            note: "",
            sort_order: items.filter(
                (i) => i.day_number === addingDay && i.meal_type === addingMeal,
            ).length,
            recipe_name: itemSearchType === "recipe" ? result.name_vi : undefined,
            food_name: itemSearchType === "food" ? result.name_vi : undefined,
            calories: result.calories || result.energy_kcal || 0,
        };
        setItems([...items, newItem]);
        setItemSearch("");
        setItemResults([]);
        setShowAddDialog(false);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItemServing = (index: number, serving: number) => {
        const updated = [...items];
        updated[index].serving_size = serving;
        setItems(updated);
    };

    const updateItemNote = (index: number, note: string) => {
        const updated = [...items];
        updated[index].note = note;
        setItems(updated);
    };

    const openAddDialog = (day: number, mealType: string) => {
        setAddingDay(day);
        setAddingMeal(mealType);
        setItemSearch("");
        setItemResults([]);
        setItemSearchType("recipe");
        setShowAddDialog(true);
    };

    // ── Tags ──
    const addTag = () => {
        if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
            setForm({ ...form, tags: [...form.tags, tagInput.trim()] });
            setTagInput("");
        }
    };

    const removeTag = (tag: string) => {
        setForm({ ...form, tags: form.tags.filter((t) => t !== tag) });
    };

    // ── Day collapse ──
    const toggleDay = (day: number) => {
        const next = new Set(collapsedDays);
        next.has(day) ? next.delete(day) : next.add(day);
        setCollapsedDays(next);
    };

    // ── Day calories ──
    const getDayCalories = (day: number, itemList: MealItem[]) => {
        return Math.round(
            itemList
                .filter((i) => i.day_number === day)
                .reduce((sum, i) => sum + (i.calories || 0) * (i.serving_size || 1), 0),
        );
    };

    // ── Filter ──
    const filtered = plans.filter((p) => {
        const matchSearch = (p.title || "").toLowerCase().includes(search.toLowerCase());
        const matchFilter =
            filter === "all" ? true : filter === "draft" ? !p.is_approved : p.is_approved;
        const matchGoal = filterGoal === "all" ? true : p.goal_type === filterGoal;
        return matchSearch && matchFilter && matchGoal;
    });

    // ══════════ DETAIL VIEW ══════════
    if (viewMode === "detail" && detailPlan) {
        const days = Array.from({ length: detailPlan.total_days }, (_, i) => i + 1);

        return (
            <div className="space-y-6">
                <Button variant="ghost" onClick={() => setViewMode("list")}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to list
                </Button>

                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{detailPlan.title}</h1>
                        {detailPlan.description && (
                            <p className="text-muted-foreground mt-1">{detailPlan.description}</p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => handleEdit(detailPlan)}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                        </Button>
                        {!detailPlan.is_approved && (
                            <Button
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                    approve(detailPlan.id);
                                    setViewMode("list");
                                }}
                            >
                                <Check className="w-4 h-4 mr-2" /> Approve
                            </Button>
                        )}
                    </div>
                </div>

                {/* Plan info */}
                <div className="flex flex-wrap gap-3">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                        {detailPlan.total_days} days
                    </span>
                    {detailPlan.goal_type && (
                        <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
                            {detailPlan.goal_type}
                        </span>
                    )}
                    <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${detailPlan.is_approved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
                    >
                        {detailPlan.is_approved ? "Public" : "Draft"}
                    </span>
                    {detailPlan.tags?.map((t: string) => (
                        <span key={t} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                            {t}
                        </span>
                    ))}
                </div>

                {/* Days */}
                {days.map((day) => {
                    const dayItems = detailItems.filter((i) => i.day_number === day);
                    const dayCal = getDayCalories(day, detailItems);
                    return (
                        <Card key={day}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold">Day {day}</h3>
                                    <span className="text-sm text-muted-foreground">
                                        {dayCal} kcal
                                    </span>
                                </div>
                                {dayItems.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No meals planned
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {MEAL_TYPES.map((mt) => {
                                            const meals = dayItems.filter(
                                                (i) => i.meal_type === mt,
                                            );
                                            if (meals.length === 0) return null;
                                            return (
                                                <div key={mt}>
                                                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                                                        {MEAL_LABELS[mt]}
                                                    </p>
                                                    {meals.map((m, i) => (
                                                        <div
                                                            key={i}
                                                            className="flex justify-between items-center text-sm py-1 pl-3 border-l-2 border-primary/20"
                                                        >
                                                            <div>
                                                                <span>
                                                                    {m.recipe_name ||
                                                                        m.food_name ||
                                                                        "Unknown"}
                                                                </span>
                                                                {m.serving_size !== 1 && (
                                                                    <span className="text-muted-foreground ml-1">
                                                                        x{m.serving_size}
                                                                    </span>
                                                                )}
                                                                {m.note && (
                                                                    <span className="text-muted-foreground ml-2 text-xs">
                                                                        ({m.note})
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-muted-foreground">
                                                                {Math.round(
                                                                    (m.calories || 0) *
                                                                        (m.serving_size || 1),
                                                                )}{" "}
                                                                kcal
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        );
    }

    // ══════════ FORM VIEW ══════════
    if (viewMode === "form") {
        const days = Array.from({ length: form.total_days }, (_, i) => i + 1);

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => setViewMode("list")}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to list
                    </Button>
                    <h1 className="text-xl font-bold">
                        {form.id ? "Edit Meal Plan" : "New Meal Plan"}
                    </h1>
                </div>

                {/* Plan info */}
                <Card>
                    <CardContent className="p-5 space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                                <Label>Title *</Label>
                                <Input
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="Giảm cân 7 ngày cho dân văn phòng"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Total Days</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={90}
                                        value={form.total_days}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                total_days: parseInt(e.target.value) || 7,
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <Label>Goal</Label>
                                    <select
                                        className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                                        value={form.goal_type}
                                        onChange={(e) =>
                                            setForm({ ...form, goal_type: e.target.value })
                                        }
                                    >
                                        {GOAL_TYPES.map((g) => (
                                            <option key={g.value} value={g.value}>
                                                {g.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Textarea
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                rows={2}
                            />
                        </div>
                        <div className="flex gap-4">
                            {/* Tags */}
                            <div className="flex-1">
                                <Label>Tags</Label>
                                <div className="flex gap-2 mt-1">
                                    <Input
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={(e) =>
                                            e.key === "Enter" && (e.preventDefault(), addTag())
                                        }
                                        placeholder="low-carb, budget..."
                                        className="flex-1"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addTag}
                                    >
                                        Add
                                    </Button>
                                </div>
                                {form.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {form.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-2 py-0.5 bg-gray-100 rounded-full text-xs flex items-center gap-1"
                                            >
                                                {tag}
                                                <button
                                                    onClick={() => removeTag(tag)}
                                                    className="text-gray-400 hover:text-red-500"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-4 items-end pb-1">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={form.is_public}
                                        onChange={(e) =>
                                            setForm({ ...form, is_public: e.target.checked })
                                        }
                                    />
                                    Public
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={form.is_approved}
                                        onChange={(e) =>
                                            setForm({ ...form, is_approved: e.target.checked })
                                        }
                                    />
                                    Approved
                                </label>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Days & Items */}
                <div className="space-y-3">
                    {days.map((day) => {
                        const dayItems = items.filter((i) => i.day_number === day);
                        const isCollapsed = collapsedDays.has(day);
                        const dayCal = getDayCalories(day, items);

                        return (
                            <Card key={day}>
                                <CardContent className="p-4">
                                    <button
                                        className="w-full flex items-center justify-between"
                                        onClick={() => toggleDay(day)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-bold">Day {day}</h3>
                                            <span className="text-xs text-muted-foreground">
                                                {dayItems.length} items
                                            </span>
                                            <span className="text-xs text-orange-600 font-medium">
                                                {dayCal} kcal
                                            </span>
                                        </div>
                                        {isCollapsed ? (
                                            <ChevronDown className="w-4 h-4" />
                                        ) : (
                                            <ChevronUp className="w-4 h-4" />
                                        )}
                                    </button>

                                    {!isCollapsed && (
                                        <div className="mt-3 space-y-3">
                                            {MEAL_TYPES.map((mt) => {
                                                const meals = dayItems.filter(
                                                    (i) => i.meal_type === mt,
                                                );
                                                return (
                                                    <div key={mt}>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <p className="text-xs font-medium text-muted-foreground uppercase">
                                                                {MEAL_LABELS[mt]}
                                                            </p>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 text-xs"
                                                                onClick={() =>
                                                                    openAddDialog(day, mt)
                                                                }
                                                            >
                                                                <Plus className="w-3 h-3 mr-1" />{" "}
                                                                Add
                                                            </Button>
                                                        </div>
                                                        {meals.length > 0 ? (
                                                            <div className="space-y-1">
                                                                {meals.map((m) => {
                                                                    const globalIndex =
                                                                        items.indexOf(m);
                                                                    return (
                                                                        <div
                                                                            key={globalIndex}
                                                                            className="flex items-center gap-2 py-1.5 pl-3 border-l-2 border-primary/20 bg-gray-50/50 rounded-r-lg pr-2"
                                                                        >
                                                                            <div className="flex-1 min-w-0">
                                                                                <span className="text-sm font-medium">
                                                                                    {m.recipe_name ||
                                                                                        m.food_name}
                                                                                </span>
                                                                                <span className="text-xs text-muted-foreground ml-2">
                                                                                    {Math.round(
                                                                                        (m.calories ||
                                                                                            0) *
                                                                                            m.serving_size,
                                                                                    )}{" "}
                                                                                    kcal
                                                                                </span>
                                                                            </div>
                                                                            <Input
                                                                                type="number"
                                                                                min={0.5}
                                                                                step={0.5}
                                                                                value={
                                                                                    m.serving_size
                                                                                }
                                                                                onChange={(e) =>
                                                                                    updateItemServing(
                                                                                        globalIndex,
                                                                                        parseFloat(
                                                                                            e.target
                                                                                                .value,
                                                                                        ) || 1,
                                                                                    )
                                                                                }
                                                                                className="w-16 h-7 text-xs"
                                                                            />
                                                                            <Input
                                                                                value={m.note}
                                                                                onChange={(e) =>
                                                                                    updateItemNote(
                                                                                        globalIndex,
                                                                                        e.target
                                                                                            .value,
                                                                                    )
                                                                                }
                                                                                placeholder="Note"
                                                                                className="w-24 h-7 text-xs"
                                                                            />
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-7 w-7 text-red-400"
                                                                                onClick={() =>
                                                                                    removeItem(
                                                                                        globalIndex,
                                                                                    )
                                                                                }
                                                                            >
                                                                                <Trash2 className="w-3 h-3" />
                                                                            </Button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-muted-foreground pl-3">
                                                                No items
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Save */}
                <div className="flex gap-2 sticky bottom-4">
                    <Button
                        className="flex-1"
                        onClick={handleSave}
                        disabled={saving || !form.title.trim()}
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                            </>
                        ) : (
                            "Save Meal Plan"
                        )}
                    </Button>
                    <Button variant="outline" onClick={() => setViewMode("list")}>
                        Cancel
                    </Button>
                </div>

                {/* Add item dialog */}
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                Add to Day {addingDay} — {MEAL_LABELS[addingMeal]}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <Button
                                    variant={itemSearchType === "recipe" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                        setItemSearchType("recipe");
                                        setItemSearch("");
                                        setItemResults([]);
                                    }}
                                >
                                    Recipes
                                </Button>
                                <Button
                                    variant={itemSearchType === "food" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                        setItemSearchType("food");
                                        setItemSearch("");
                                        setItemResults([]);
                                    }}
                                >
                                    Foods
                                </Button>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    value={itemSearch}
                                    onChange={(e) => searchItems(e.target.value)}
                                    placeholder={`Search ${itemSearchType}s...`}
                                    className="pl-9"
                                />
                                {itemSearching && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
                                )}
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                                {itemResults.length > 0 ? (
                                    itemResults.map((r) => (
                                        <button
                                            key={r.id}
                                            className="w-full text-left px-3 py-2.5 hover:bg-gray-50 text-sm flex justify-between border-b last:border-0"
                                            onClick={() => addItem(r)}
                                        >
                                            <span>{r.name_vi}</span>
                                            <span className="text-muted-foreground">
                                                {r.calories || r.energy_kcal || 0} kcal
                                            </span>
                                        </button>
                                    ))
                                ) : itemSearch.length >= 2 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No results
                                    </p>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        Type at least 2 characters
                                    </p>
                                )}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    // ══════════ LIST VIEW ══════════
    const pendingPlans = plans.filter((p) => p.is_public && !p.is_approved);

    return (
        <div className="space-y-6">
            {/* Pending Review section */}
            {pendingPlans.length > 0 && (
                <Card className="border-yellow-200 bg-yellow-50/50">
                    <CardContent className="p-4">
                        <h2 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                            ⏳ Pending Review ({pendingPlans.length})
                        </h2>
                        <div className="space-y-2">
                            {pendingPlans.map((p) => (
                                <div
                                    key={p._id}
                                    className="flex items-center justify-between gap-3 p-3 bg-white rounded-lg border border-yellow-100"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{p.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {p.total_days} days
                                            {p.goal_type ? ` · ${p.goal_type}` : ""}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700 gap-1"
                                            onClick={() => approve(p._id)}
                                        >
                                            <Check className="w-3.5 h-3.5" /> Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-red-600 border-red-200 gap-1"
                                            onClick={() => reject(p._id)}
                                        >
                                            <X className="w-3.5 h-3.5" /> Reject
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Meal Plans</h1>
                    <p className="text-muted-foreground">{plans.length} total plans</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <div className="relative w-full sm:w-52">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <select
                        className="border rounded-md px-3 py-2 text-sm bg-white"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as any)}
                    >
                        <option value="all">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="public">Public</option>
                    </select>
                    <select
                        className="border rounded-md px-3 py-2 text-sm bg-white"
                        value={filterGoal}
                        onChange={(e) => setFilterGoal(e.target.value)}
                    >
                        <option value="all">All Goals</option>
                        {GOAL_TYPES.filter((g) => g.value).map((g) => (
                            <option key={g.value} value={g.value}>
                                {g.label}
                            </option>
                        ))}
                    </select>
                    <Button onClick={handleNew}>
                        <Plus className="w-4 h-4 mr-2" /> New
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-gray-50/50">
                                    <th className="px-4 py-3 text-left font-medium">Title</th>
                                    <th className="px-4 py-3 text-left font-medium">Days</th>
                                    <th className="px-4 py-3 text-left font-medium">Goal</th>
                                    <th className="px-4 py-3 text-left font-medium">Tags</th>
                                    <th className="px-4 py-3 text-left font-medium">Creator</th>
                                    <th className="px-4 py-3 text-left font-medium">Status</th>
                                    <th className="px-4 py-3 text-left font-medium">Created</th>
                                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center">
                                            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-4 py-8 text-center text-muted-foreground"
                                        >
                                            No meal plans found
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((p) => (
                                        <tr
                                            key={p._id}
                                            className="border-b last:border-0 hover:bg-gray-50/50"
                                        >
                                            <td className="px-4 py-3 font-medium">{p.title}</td>
                                            <td className="px-4 py-3">{p.total_days}</td>
                                            <td className="px-4 py-3">
                                                {p.goal_type ? (
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                                                        {p.goal_type}
                                                    </span>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {(p.tags || []).slice(0, 2).map((t: string) => (
                                                        <span
                                                            key={t}
                                                            className="px-2 py-0.5 bg-gray-100 rounded-full text-xs"
                                                        >
                                                            {t}
                                                        </span>
                                                    ))}
                                                    {(p.tags || []).length > 2 && (
                                                        <span className="text-xs text-muted-foreground">
                                                            +{p.tags.length - 2}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground text-xs">
                                                {p.creator?.display_name || "System"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.is_approved && p.is_public ? "bg-green-100 text-green-700" : p.is_public ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}`}
                                                >
                                                    {p.is_approved && p.is_public
                                                        ? "Published"
                                                        : p.is_public
                                                        ? "Pending"
                                                        : "Private"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground text-xs">
                                                {new Date(p.created_at).toLocaleDateString("vi-VN")}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-1">
                                                    {p.is_public && !p.is_approved && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-green-600"
                                                                title="Approve"
                                                                onClick={() => approve(p._id)}
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-red-500"
                                                                title="Reject"
                                                                onClick={() => reject(p._id)}
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                onClick={() => handleViewDetail(p)}
                                                            >
                                                                <Eye className="w-4 h-4 mr-2" />{" "}
                                                                View Detail
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleEdit(p)}
                                                            >
                                                                <Pencil className="w-4 h-4 mr-2" />{" "}
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => approve(p._id)}
                                                            >
                                                                <Check className="w-4 h-4 mr-2" />{" "}
                                                                Approve
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => reject(p._id)}
                                                            >
                                                                <X className="w-4 h-4 mr-2" />{" "}
                                                                Reject
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="text-red-600"
                                                                onClick={() => setDeleteId(p._id)}
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2" />{" "}
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Delete confirm */}
            <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Meal Plan?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        This will permanently delete this meal plan and all its items.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MealPlans;
