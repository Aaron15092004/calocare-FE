import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Plus,
    Pencil,
    Trash2,
    Send,
    Loader2,
    Search,
    X,
    ChevronDown,
    ChevronUp,
    Flame,
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

// ── Types ────────────────────────────────────────────────────────────────────

interface Ingredient {
    _id?: string;
    food_id: string;
    food_name: string;
    amount: number; // grams
    unit: string;
    calories_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
    fiber_per_100g: number;
    sort_order: number;
}

interface RecipeAPI {
    _id: string;
    name_vi: string;
    name_en?: string;
    description?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    servings?: number;
    prep_time?: number;
    cook_time?: number;
    tags?: string[];
    image_url?: string;
    is_public?: boolean;
    is_approved?: boolean;
    ingredients?: Ingredient[];
}

interface RecipeForm {
    id?: string;
    name_vi: string;
    name_en: string;
    description: string;
    prep_time: number;
    cook_time: number;
    servings: number;
    tags: string[];
    image_url: string;
}

const emptyForm: RecipeForm = {
    name_vi: "",
    name_en: "",
    description: "",
    prep_time: 0,
    cook_time: 0,
    servings: 1,
    tags: [],
    image_url: "",
};

// New food form for inline creation
interface NewFoodForm {
    name_vi: string;
    name_en: string;
    energy_kcal: number;
    protein: number;
    lipid: number;
    glucid: number;
    fiber: number;
}

const emptyFoodForm: NewFoodForm = {
    name_vi: "",
    name_en: "",
    energy_kcal: 0,
    protein: 0,
    lipid: 0,
    glucid: 0,
    fiber: 0,
};

type ViewMode = "list" | "form";

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcRecipeNutrition(ingredients: Ingredient[]) {
    return ingredients.reduce(
        (sum, ing) => {
            const ratio = ing.amount / 100;
            return {
                calories: sum.calories + Math.round(ing.calories_per_100g * ratio),
                protein: sum.protein + Math.round(ing.protein_per_100g * ratio),
                carbs: sum.carbs + Math.round(ing.carbs_per_100g * ratio),
                fat: sum.fat + Math.round(ing.fat_per_100g * ratio),
                fiber: sum.fiber + Math.round(ing.fiber_per_100g * ratio),
            };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    );
}

function statusLabel(recipe: RecipeAPI) {
    if (recipe.is_approved && recipe.is_public) return "Published";
    if (!recipe.is_approved && recipe.is_public) return "Pending";
    return "Private";
}

function statusColor(recipe: RecipeAPI) {
    if (recipe.is_approved && recipe.is_public) return "bg-green-100 text-green-700";
    if (!recipe.is_approved && recipe.is_public) return "bg-yellow-100 text-yellow-700";
    return "bg-gray-100 text-gray-600";
}

// ── Component ─────────────────────────────────────────────────────────────────

const MyRecipes: React.FC = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    // List state
    const [recipes, setRecipes] = useState<RecipeAPI[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Form state
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [form, setForm] = useState<RecipeForm>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [tagInput, setTagInput] = useState("");

    // Ingredient state
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [ingSearch, setIngSearch] = useState("");
    const [ingResults, setIngResults] = useState<any[]>([]);
    const [ingSearching, setIngSearching] = useState(false);

    // Inline food creation
    const [showNewFoodDialog, setShowNewFoodDialog] = useState(false);
    const [newFoodForm, setNewFoodForm] = useState<NewFoodForm>(emptyFoodForm);
    const [foodSaving, setFoodSaving] = useState(false);
    const [pendingFoodName, setPendingFoodName] = useState("");

    // Delete confirmation
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    // ── Data fetching ──────────────────────────────────────────────────────────

    const fetchRecipes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get("/recipes/mine");
            setRecipes(res.data?.data || []);
        } catch {
            toast({ title: "Error", description: "Failed to load recipes", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchRecipes(); }, [fetchRecipes]);

    // ── Ingredient search ──────────────────────────────────────────────────────

    const searchFood = async (q: string) => {
        setIngSearch(q);
        if (q.length < 2) { setIngResults([]); return; }
        setIngSearching(true);
        try {
            const res = await api.get(`/foods?q=${encodeURIComponent(q)}&limit=10`);
            setIngResults(res.data?.data || []);
        } catch {
            setIngResults([]);
        } finally {
            setIngSearching(false);
        }
    };

    const addIngredient = (food: any) => {
        setIngredients((prev) => [
            ...prev,
            {
                food_id: food._id,
                food_name: food.name_vi,
                amount: 100,
                unit: "g",
                calories_per_100g: food.energy_kcal || 0,
                protein_per_100g: food.protein || 0,
                carbs_per_100g: food.glucid || 0,
                fat_per_100g: food.lipid || 0,
                fiber_per_100g: food.fiber || 0,
                sort_order: prev.length,
            },
        ]);
        setIngSearch("");
        setIngResults([]);
    };

    const updateIngredientAmount = (index: number, amount: number) => {
        const updated = [...ingredients];
        updated[index].amount = amount;
        setIngredients(updated);
    };

    const removeIngredient = (index: number) => {
        setIngredients(ingredients.filter((_, i) => i !== index));
    };

    // ── Inline food creation ───────────────────────────────────────────────────

    const openNewFoodDialog = () => {
        setPendingFoodName(ingSearch);
        setNewFoodForm({ ...emptyFoodForm, name_vi: ingSearch });
        setShowNewFoodDialog(true);
    };

    const handleCreateFood = async () => {
        if (!newFoodForm.name_vi.trim()) return;
        setFoodSaving(true);
        try {
            const res = await api.post("/foods", {
                name_vi: newFoodForm.name_vi.trim(),
                name_en: newFoodForm.name_en?.trim() || undefined,
                energy_kcal: newFoodForm.energy_kcal,
                protein: newFoodForm.protein,
                lipid: newFoodForm.lipid,
                glucid: newFoodForm.glucid,
                fiber: newFoodForm.fiber,
                is_approved: false,
            });
            const created = res.data;
            toast({
                title: "Food created",
                description: `"${created.name_vi}" submitted for review.`,
            });
            // Add as ingredient immediately
            addIngredient({
                _id: created._id,
                name_vi: created.name_vi,
                energy_kcal: created.energy_kcal,
                protein: created.protein,
                lipid: created.lipid,
                glucid: created.glucid,
                fiber: created.fiber,
            });
            setShowNewFoodDialog(false);
            setNewFoodForm(emptyFoodForm);
        } catch {
            toast({ title: "Error", description: "Failed to create food", variant: "destructive" });
        } finally {
            setFoodSaving(false);
        }
    };

    // ── Form helpers ──────────────────────────────────────────────────────────

    const openCreate = () => {
        setForm(emptyForm);
        setIngredients([]);
        setViewMode("form");
    };

    const openEdit = async (recipe: RecipeAPI) => {
        setForm({
            id: recipe._id,
            name_vi: recipe.name_vi,
            name_en: recipe.name_en || "",
            description: recipe.description || "",
            prep_time: recipe.prep_time || 0,
            cook_time: recipe.cook_time || 0,
            servings: recipe.servings || 1,
            tags: recipe.tags || [],
            image_url: recipe.image_url || "",
        });
        // Load ingredients
        try {
            const res = await api.get(`/recipes/${recipe._id}`);
            const raw: any[] = res.data?.ingredients || [];
            setIngredients(raw.map((ing: any, idx: number) => ({
                _id: ing._id,
                food_id: ing.food_id?._id || ing.food_id,
                food_name: ing.food_id?.name_vi || ing.food_name || "",
                amount: ing.amount || 100,
                unit: ing.unit || "g",
                calories_per_100g: ing.food_id?.energy_kcal || 0,
                protein_per_100g: ing.food_id?.protein || 0,
                carbs_per_100g: ing.food_id?.glucid || 0,
                fat_per_100g: ing.food_id?.lipid || 0,
                fiber_per_100g: ing.food_id?.fiber || 0,
                sort_order: idx,
            })));
        } catch {
            setIngredients([]);
        }
        setViewMode("form");
    };

    const addTag = () => {
        const t = tagInput.trim().toLowerCase();
        if (t && !form.tags.includes(t)) {
            setForm({ ...form, tags: [...form.tags, t] });
        }
        setTagInput("");
    };

    const removeTag = (tag: string) => {
        setForm({ ...form, tags: form.tags.filter((t) => t !== tag) });
    };

    // ── Save recipe ───────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (!form.name_vi.trim()) {
            toast({ title: "Validation", description: "Recipe name is required", variant: "destructive" });
            return;
        }
        setSaving(true);
        try {
            const nut = calcRecipeNutrition(ingredients);
            const payload = {
                name_vi: form.name_vi.trim(),
                name_en: form.name_en.trim() || undefined,
                description: form.description.trim() || undefined,
                prep_time: form.prep_time || undefined,
                cook_time: form.cook_time || undefined,
                servings: form.servings || 1,
                tags: form.tags,
                image_url: form.image_url.trim() || undefined,
                calories: nut.calories,
                protein: nut.protein,
                carbs: nut.carbs,
                fat: nut.fat,
                fiber: nut.fiber,
                ingredients: ingredients.map((ing, idx) => ({
                    food_id: ing.food_id,
                    amount: ing.amount,
                    unit: ing.unit || "g",
                    sort_order: idx,
                })),
            };

            if (form.id) {
                await api.put(`/recipes/${form.id}`, payload);
                toast({ title: "Saved", description: "Recipe updated." });
            } else {
                await api.post("/recipes", payload);
                toast({ title: "Created", description: "Recipe saved as private." });
            }
            await fetchRecipes();
            setViewMode("list");
        } catch {
            toast({ title: "Error", description: "Failed to save recipe", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    // ── Submit for review ─────────────────────────────────────────────────────

    const handleSubmit = async (id: string) => {
        try {
            await api.post(`/recipes/${id}/submit`);
            toast({ title: "Submitted", description: "Recipe sent for admin review." });
            await fetchRecipes();
        } catch {
            toast({ title: "Error", description: "Failed to submit recipe", variant: "destructive" });
        }
    };

    // ── Delete ────────────────────────────────────────────────────────────────

    const handleDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            await api.delete(`/recipes/${deleteId}`);
            toast({ title: "Deleted", description: "Recipe removed." });
            setDeleteId(null);
            await fetchRecipes();
        } catch {
            toast({ title: "Error", description: "Failed to delete recipe", variant: "destructive" });
        } finally {
            setDeleting(false);
        }
    };

    // ── Render: Form view ─────────────────────────────────────────────────────

    if (viewMode === "form") {
        const nut = calcRecipeNutrition(ingredients);

        return (
            <div className="min-h-screen bg-gray-50 pb-24">
                {/* Header */}
                <div className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => setViewMode("list")}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="font-semibold text-lg flex-1">
                        {form.id ? "Edit Recipe" : "New Recipe"}
                    </h1>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                    </Button>
                </div>

                <div className="max-w-lg mx-auto px-4 py-4 space-y-5">
                    {/* Basic info */}
                    <Card>
                        <CardContent className="pt-4 space-y-3">
                            <div>
                                <Label className="text-xs">Recipe Name (Vietnamese) *</Label>
                                <Input
                                    className="mt-1"
                                    value={form.name_vi}
                                    onChange={(e) => setForm({ ...form, name_vi: e.target.value })}
                                    placeholder="e.g. Phở bò"
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Recipe Name (English)</Label>
                                <Input
                                    className="mt-1"
                                    value={form.name_en}
                                    onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                                    placeholder="e.g. Beef Pho"
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Description</Label>
                                <Textarea
                                    className="mt-1"
                                    rows={2}
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Brief description..."
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <Label className="text-xs">Prep (min)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        className="mt-1"
                                        value={form.prep_time}
                                        onChange={(e) => setForm({ ...form, prep_time: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Cook (min)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        className="mt-1"
                                        value={form.cook_time}
                                        onChange={(e) => setForm({ ...form, cook_time: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Servings</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        className="mt-1"
                                        value={form.servings}
                                        onChange={(e) => setForm({ ...form, servings: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs">Image URL (optional)</Label>
                                <Input
                                    className="mt-1"
                                    value={form.image_url}
                                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                            {/* Tags */}
                            <div>
                                <Label className="text-xs">Tags</Label>
                                <div className="flex gap-2 mt-1">
                                    <Input
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                                        placeholder="Add tag..."
                                        className="flex-1"
                                    />
                                    <Button size="sm" variant="outline" onClick={addTag}>Add</Button>
                                </div>
                                {form.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {form.tags.map((t) => (
                                            <Badge key={t} variant="secondary" className="gap-1 text-xs">
                                                {t}
                                                <button onClick={() => removeTag(t)}>
                                                    <X className="w-2.5 h-2.5" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Ingredients */}
                    <Card>
                        <CardContent className="pt-4 space-y-3">
                            <h3 className="font-medium text-sm">Ingredients</h3>

                            {/* Search bar */}
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                                <Input
                                    value={ingSearch}
                                    onChange={(e) => searchFood(e.target.value)}
                                    placeholder="Search food database..."
                                    className="pl-8"
                                />
                                {ingSearching && (
                                    <Loader2 className="absolute right-2.5 top-2.5 w-4 h-4 animate-spin text-muted-foreground" />
                                )}
                            </div>

                            {/* Search results dropdown */}
                            {ingSearch.length >= 2 && (
                                <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
                                    {ingResults.length > 0 ? (
                                        ingResults.map((food) => (
                                            <button
                                                key={food._id}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-0 flex justify-between items-center"
                                                onClick={() => addIngredient(food)}
                                            >
                                                <span>{food.name_vi}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {food.energy_kcal} kcal/100g
                                                </span>
                                            </button>
                                        ))
                                    ) : (
                                        !ingSearching && (
                                            <div className="px-3 py-3 text-sm text-muted-foreground flex items-center justify-between">
                                                <span>No food found for "{ingSearch}"</span>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-xs"
                                                    onClick={openNewFoodDialog}
                                                >
                                                    <Plus className="w-3 h-3 mr-1" />
                                                    Create Food
                                                </Button>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}

                            {/* Ingredient list */}
                            {ingredients.length > 0 && (
                                <div className="space-y-2">
                                    {ingredients.map((ing, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-2 bg-gray-50 rounded-lg p-2"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm truncate">{ing.food_name}</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {Math.round(ing.calories_per_100g * ing.amount / 100)} kcal
                                                </p>
                                            </div>
                                            <Input
                                                type="number"
                                                min={1}
                                                step={1}
                                                value={ing.amount}
                                                onChange={(e) =>
                                                    updateIngredientAmount(i, parseInt(e.target.value) || 1)
                                                }
                                                className="w-16 h-7 text-xs"
                                            />
                                            <span className="text-xs text-muted-foreground">g</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-red-400"
                                                onClick={() => removeIngredient(i)}
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {ingredients.length === 0 && (
                                <p className="text-xs text-muted-foreground text-center py-3">
                                    Search above to add ingredients
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Nutrition summary */}
                    {ingredients.length > 0 && (
                        <Card>
                            <CardContent className="pt-4">
                                <h3 className="font-medium text-sm mb-3">Estimated Nutrition (total)</h3>
                                <div className="grid grid-cols-5 gap-2 text-center">
                                    <div className="bg-orange-50 rounded p-2">
                                        <p className="text-sm font-bold text-orange-600">{nut.calories}</p>
                                        <p className="text-[10px] text-muted-foreground">kcal</p>
                                    </div>
                                    <div className="bg-blue-50 rounded p-2">
                                        <p className="text-sm font-bold text-blue-600">{nut.protein}g</p>
                                        <p className="text-[10px] text-muted-foreground">protein</p>
                                    </div>
                                    <div className="bg-yellow-50 rounded p-2">
                                        <p className="text-sm font-bold text-yellow-600">{nut.carbs}g</p>
                                        <p className="text-[10px] text-muted-foreground">carbs</p>
                                    </div>
                                    <div className="bg-pink-50 rounded p-2">
                                        <p className="text-sm font-bold text-pink-600">{nut.fat}g</p>
                                        <p className="text-[10px] text-muted-foreground">fat</p>
                                    </div>
                                    <div className="bg-green-50 rounded p-2">
                                        <p className="text-sm font-bold text-green-600">{nut.fiber}g</p>
                                        <p className="text-[10px] text-muted-foreground">fiber</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Inline food creation dialog */}
                <Dialog open={showNewFoodDialog} onOpenChange={setShowNewFoodDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Food</DialogTitle>
                        </DialogHeader>
                        <p className="text-xs text-muted-foreground -mt-2">
                            This food will be submitted for admin review but added to your recipe immediately.
                        </p>
                        <div className="space-y-3 py-1">
                            <div>
                                <Label className="text-xs">Name (Vietnamese) *</Label>
                                <Input
                                    className="mt-1"
                                    value={newFoodForm.name_vi}
                                    onChange={(e) => setNewFoodForm({ ...newFoodForm, name_vi: e.target.value })}
                                    placeholder="Tên món ăn..."
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Name (English)</Label>
                                <Input
                                    className="mt-1"
                                    value={newFoodForm.name_en}
                                    onChange={(e) => setNewFoodForm({ ...newFoodForm, name_en: e.target.value })}
                                    placeholder="Food name..."
                                />
                            </div>
                            <p className="text-xs font-medium text-gray-500">Nutrition per 100g</p>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-xs">Calories (kcal)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        className="mt-1"
                                        value={newFoodForm.energy_kcal}
                                        onChange={(e) => setNewFoodForm({ ...newFoodForm, energy_kcal: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Protein (g)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        step={0.1}
                                        className="mt-1"
                                        value={newFoodForm.protein}
                                        onChange={(e) => setNewFoodForm({ ...newFoodForm, protein: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Carbs (g)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        step={0.1}
                                        className="mt-1"
                                        value={newFoodForm.glucid}
                                        onChange={(e) => setNewFoodForm({ ...newFoodForm, glucid: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Fat (g)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        step={0.1}
                                        className="mt-1"
                                        value={newFoodForm.lipid}
                                        onChange={(e) => setNewFoodForm({ ...newFoodForm, lipid: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Fiber (g)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        step={0.1}
                                        className="mt-1"
                                        value={newFoodForm.fiber}
                                        onChange={(e) => setNewFoodForm({ ...newFoodForm, fiber: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowNewFoodDialog(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreateFood} disabled={foodSaving || !newFoodForm.name_vi.trim()}>
                                {foodSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create & Add"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    // ── Render: List view ─────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="font-semibold text-lg flex-1">My Recipes</h1>
                <Button size="sm" onClick={openCreate}>
                    <Plus className="w-4 h-4 mr-1" />
                    New
                </Button>
            </div>

            <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : recipes.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-muted-foreground text-sm">No recipes yet.</p>
                        <Button className="mt-4" onClick={openCreate}>
                            <Plus className="w-4 h-4 mr-1" />
                            Create your first recipe
                        </Button>
                    </div>
                ) : (
                    recipes.map((recipe) => (
                        <Card key={recipe._id}>
                            <CardContent className="pt-4">
                                {/* Top row */}
                                <div className="flex items-start gap-2">
                                    {recipe.image_url && (
                                        <img
                                            src={recipe.image_url}
                                            alt={recipe.name_vi}
                                            className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-medium text-sm">{recipe.name_vi}</p>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor(recipe)}`}>
                                                {statusLabel(recipe)}
                                            </span>
                                        </div>
                                        {recipe.name_en && (
                                            <p className="text-xs text-muted-foreground">{recipe.name_en}</p>
                                        )}
                                        {recipe.calories != null && (
                                            <div className="flex items-center gap-1 mt-1 text-xs text-orange-500">
                                                <Flame className="w-3 h-3" />
                                                <span>{recipe.calories} kcal</span>
                                                {recipe.servings && recipe.servings > 1 && (
                                                    <span className="text-muted-foreground">/ {recipe.servings} servings</span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-1 flex-shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => setExpandedId(expandedId === recipe._id ? null : recipe._id)}
                                        >
                                            {expandedId === recipe._id ? (
                                                <ChevronUp className="w-4 h-4" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => openEdit(recipe)}
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-red-400"
                                            onClick={() => setDeleteId(recipe._id)}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Expanded detail */}
                                {expandedId === recipe._id && (
                                    <div className="mt-3 pt-3 border-t space-y-2">
                                        {recipe.description && (
                                            <p className="text-xs text-muted-foreground">{recipe.description}</p>
                                        )}
                                        {recipe.tags && recipe.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {recipe.tags.map((t) => (
                                                    <Badge key={t} variant="outline" className="text-xs">
                                                        {t}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                            {recipe.prep_time ? <span>Prep: {recipe.prep_time}min</span> : null}
                                            {recipe.cook_time ? <span>Cook: {recipe.cook_time}min</span> : null}
                                            {recipe.servings ? <span>{recipe.servings} serving(s)</span> : null}
                                        </div>

                                        {/* Submit for review button */}
                                        {!recipe.is_public && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="w-full text-xs mt-1"
                                                onClick={() => handleSubmit(recipe._id)}
                                            >
                                                <Send className="w-3 h-3 mr-1" />
                                                Submit for Community Review
                                            </Button>
                                        )}
                                        {recipe.is_public && !recipe.is_approved && (
                                            <p className="text-xs text-yellow-600 text-center mt-1">
                                                Awaiting admin approval
                                            </p>
                                        )}
                                        {recipe.is_public && recipe.is_approved && (
                                            <p className="text-xs text-green-600 text-center mt-1">
                                                Published to community
                                            </p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Delete confirmation */}
            <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Recipe</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete this recipe? This cannot be undone.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <BottomNav />
        </div>
    );
};

export default MyRecipes;
