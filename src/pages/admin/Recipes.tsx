// src/pages/admin/Recipes.tsx
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { uploadFile, getOptimizedUrl } from "@/utils/cloudinary";
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
    Eye,
    MoreHorizontal,
    Plus,
    Pencil,
    Trash2,
    ArrowLeft,
    Loader2,
    Camera,
    Ban,
    Send,
    User,
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

interface Ingredient {
    id?: string;
    food_id: string;
    food_name?: string;
    amount: number;
    unit: string;
    sort_order: number;
    food?: {
        name_vi: string;
        energy_kcal: number;
        protein: number;
        lipid: number;
        glucid: number;
        fiber: number;
    };
}

interface RecipeForm {
    id?: string;
    name_vi: string;
    name_en: string;
    code: string;
    description: string;
    servings: number;
    instructions: string[];
    tags: string[];
    is_public: boolean;
    is_approved: boolean;
    category_id: number | null;
}

const emptyForm: RecipeForm = {
    name_vi: "",
    name_en: "",
    code: "",
    description: "",
    servings: 1,
    instructions: [""],
    tags: [],
    is_public: false,
    is_approved: false,
    category_id: null,
};

type ViewMode = "list" | "form" | "detail";
type StatusFilter = "all" | "draft" | "pending" | "approved" | "rejected";

const STATUS_COLORS: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
};

const Recipes = () => {
    const { profile } = useAuthContext();
    const [recipes, setRecipes] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [form, setForm] = useState<RecipeForm>(emptyForm);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [tagInput, setTagInput] = useState("");

    const [foodSearch, setFoodSearch] = useState("");
    const [foodResults, setFoodResults] = useState<any[]>([]);
    const [foodSearching, setFoodSearching] = useState(false);

    const [detailRecipe, setDetailRecipe] = useState<any>(null);
    const [detailIngredients, setDetailIngredients] = useState<Ingredient[]>([]);

    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [categories, setCategories] = useState<any[]>([]);
    const [filterCategory, setFilterCategory] = useState<string>("all");

    // Multiple images: existing URLs + new files pending upload
    const [images, setImages] = useState<string[]>([]);
    const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);

    // Reject dialog
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState("");

    // Pending count for badge
    const pendingCount = recipes.filter((r) => r.status === "pending").length;

    useEffect(() => {
        fetchRecipes();
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        const { data } = await api.get("/recipe-categories");
        setCategories(data || []);
    };

    const fetchRecipes = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/recipes", { params: { limit: 200 } });
            setRecipes(data.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    // ── CRUD ──

    const handleNew = () => {
        setForm(emptyForm);
        setIngredients([]);
        setImages([]);
        setNewImageFiles([]);
        setViewMode("form");
    };

    const handleEdit = async (recipe: any) => {
        setForm({
            id: recipe.id,
            name_vi: recipe.name_vi || "",
            name_en: recipe.name_en || "",
            code: recipe.code || "",
            description: recipe.description || "",
            servings: recipe.servings || 1,
            instructions: recipe.instructions?.length ? recipe.instructions : [""],
            tags: recipe.tags || [],
            is_public: recipe.is_public || false,
            is_approved: recipe.is_approved || false,
            category_id: recipe.category_id || null,
        });
        setImages(recipe.images?.length ? recipe.images : recipe.image_url ? [recipe.image_url] : []);
        setNewImageFiles([]);

        const { data: recipeDetail } = await api.get(`/recipes/${recipe._id || recipe.id}`);
        setIngredients(
            (recipeDetail.ingredients || []).map((ing: any) => ({
                id: ing._id,
                food_id: ing.food_id?._id || ing.food_id,
                food_name: ing.food_id?.name_vi,
                amount: ing.amount,
                unit: ing.unit,
                sort_order: ing.sort_order,
                food: ing.food_id,
            })),
        );
        setViewMode("form");
    };

    const handleSave = async () => {
        if (!form.name_vi.trim()) return;
        setSaving(true);

        let allImages = [...images];
        if (newImageFiles.length) {
            setUploading(true);
            for (const file of newImageFiles) {
                try {
                    const uploaded = await uploadFile(file, "calocare/recipes");
                    allImages.push(uploaded.url);
                } catch (err) {
                    console.error("Image upload failed:", err);
                }
            }
            setUploading(false);
        }

        const totals = ingredients.reduce(
            (sum, ing) => {
                if (!ing.food) return sum;
                const ratio = ing.amount / 100;
                return {
                    calories: sum.calories + (ing.food.energy_kcal || 0) * ratio,
                    protein: sum.protein + (ing.food.protein || 0) * ratio,
                    carbs: sum.carbs + (ing.food.glucid || 0) * ratio,
                    fat: sum.fat + (ing.food.lipid || 0) * ratio,
                    fiber: sum.fiber + (ing.food.fiber || 0) * ratio,
                };
            },
            { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
        );

        const recipeData = {
            name_vi: form.name_vi.trim(),
            name_en: form.name_en.trim() || null,
            code: form.code.trim() || null,
            description: form.description.trim() || null,
            servings: form.servings,
            instructions: form.instructions.filter((s) => s.trim()),
            tags: form.tags,
            is_public: form.is_public,
            is_approved: form.is_approved,
            calories: Math.round(totals.calories * 10) / 10,
            protein: Math.round(totals.protein * 10) / 10,
            carbs: Math.round(totals.carbs * 10) / 10,
            fat: Math.round(totals.fat * 10) / 10,
            fiber: Math.round(totals.fiber * 10) / 10,
            creator_id: profile?.id,
            category_id: form.category_id || null,
            images: allImages,
            image_url: allImages[0] || null,
            status: form.is_approved ? "approved" : form.is_public ? "pending" : "draft",
            updated_at: new Date().toISOString(),
            total_weight: ingredients.reduce((sum, ing) => sum + ing.amount, 0),
        };

        let recipeId = form.id;
        const ingPayload = ingredients.map((ing, i) => ({
            food_id: ing.food_id,
            amount: ing.amount,
            unit: ing.unit,
            sort_order: i,
        }));

        if (form.id) {
            await api.put(`/recipes/${form.id}`, { ...recipeData, ingredients: ingPayload });
        } else {
            const { data: created } = await api.post("/recipes", { ...recipeData, ingredients: ingPayload });
            recipeId = created._id;
        }

        setSaving(false);
        setViewMode("list");
        fetchRecipes();
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        await api.delete(`/recipes/${deleteId}`);
        setDeleteId(null);
        fetchRecipes();
    };

    const handleViewDetail = async (recipe: any) => {
        setDetailRecipe(recipe);
        const { data } = await api.get(`/recipes/${recipe._id || recipe.id}`);
        setDetailIngredients(data.ingredients || []);
        setViewMode("detail");
    };

    const approve = async (id: string) => {
        await api.put(`/recipes/${id}`, { is_approved: true, is_public: true });
        fetchRecipes();
    };

    const handleReject = async () => {
        if (!rejectId) return;
        await api.put(`/recipes/${rejectId}`, { is_approved: false, is_public: false });
        setRejectId(null);
        setRejectReason("");
        fetchRecipes();
    };

    // ── Ingredient helpers ──

    const searchFoods = async (query: string) => {
        setFoodSearch(query);
        if (query.length < 2) {
            setFoodResults([]);
            return;
        }
        setFoodSearching(true);
        try {
            const { data } = await api.get("/foods", { params: { q: query, limit: 10 } });
            setFoodResults((data.data || []).map((f: any) => ({ ...f, id: f._id })));
        } catch { setFoodResults([]); }
        setFoodSearching(false);
    };

    const addIngredient = (food: any) => {
        setIngredients([
            ...ingredients,
            {
                food_id: food.id,
                food_name: food.name_vi,
                amount: 100,
                unit: "g",
                sort_order: ingredients.length,
                food: food,
            },
        ]);
        setFoodSearch("");
        setFoodResults([]);
    };

    const removeIngredient = (index: number) => {
        setIngredients(ingredients.filter((_, i) => i !== index));
    };

    const updateIngredient = (index: number, field: string, value: any) => {
        const updated = [...ingredients];
        (updated[index] as any)[field] = value;
        setIngredients(updated);
    };

    const addStep = () => setForm({ ...form, instructions: [...form.instructions, ""] });
    const removeStep = (index: number) => {
        setForm({ ...form, instructions: form.instructions.filter((_, i) => i !== index) });
    };
    const updateStep = (index: number, value: string) => {
        const updated = [...form.instructions];
        updated[index] = value;
        setForm({ ...form, instructions: updated });
    };

    const addTag = () => {
        if (tagInput.trim() && !(form.tags || []).includes(tagInput.trim())) {
            setForm({ ...form, tags: [...form.tags, tagInput.trim()] });
            setTagInput("");
        }
    };
    const removeTag = (tag: string) => {
        setForm({ ...form, tags: (form.tags || []).filter((t) => t !== tag) });
    };

    const getStatus = (r: any) =>
        r.status || (r.is_approved ? "approved" : r.is_public ? "pending" : "draft");

    const filtered = recipes.filter((r) => {
        const matchSearch = (r.name_vi || "").toLowerCase().includes(search.toLowerCase());
        const status = getStatus(r);
        const matchStatus = filterStatus === "all" ? true : status === filterStatus;
        const matchCategory =
            filterCategory === "all" ? true : String(r.category_id) === filterCategory;
        return matchSearch && matchStatus && matchCategory;
    });

    // ══════════ DETAIL VIEW ══════════
    if (viewMode === "detail" && detailRecipe) {
        const status = getStatus(detailRecipe);
        return (
            <div className="space-y-6">
                <Button variant="ghost" onClick={() => setViewMode("list")}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to list
                </Button>

                {/* Pending review banner */}
                {status === "pending" && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Send className="w-5 h-5 text-yellow-600" />
                            <div>
                                <p className="font-medium text-yellow-800">Pending Review</p>
                                <p className="text-sm text-yellow-600">
                                    Submitted by {detailRecipe.creator?.display_name || "User"} —
                                    waiting for approval
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                className="bg-green-600 hover:bg-green-700"
                                size="sm"
                                onClick={() => approve(detailRecipe.id)}
                            >
                                <Check className="w-4 h-4 mr-1" /> Approve
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                    setRejectId(detailRecipe.id);
                                    setRejectReason("");
                                }}
                            >
                                <Ban className="w-4 h-4 mr-1" /> Reject
                            </Button>
                        </div>
                    </div>
                )}

                {/* Rejected banner */}
                {status === "rejected" && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <Ban className="w-5 h-5 text-red-600" />
                            <div>
                                <p className="font-medium text-red-800">Rejected</p>
                                {detailRecipe.reject_reason && (
                                    <p className="text-sm text-red-600">
                                        Reason: {detailRecipe.reject_reason}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                            <Button
                                className="bg-green-600 hover:bg-green-700"
                                size="sm"
                                onClick={() => approve(detailRecipe.id)}
                            >
                                <Check className="w-4 h-4 mr-1" /> Approve Instead
                            </Button>
                        </div>
                    </div>
                )}

                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{detailRecipe.name_vi}</h1>
                        {detailRecipe.name_en && (
                            <p className="text-muted-foreground">{detailRecipe.name_en}</p>
                        )}
                    </div>
                    <Button variant="outline" onClick={() => handleEdit(detailRecipe)}>
                        <Pencil className="w-4 h-4 mr-2" /> Edit
                    </Button>
                </div>

                {/* Image gallery */}
                {(detailRecipe.images?.length > 0 || detailRecipe.image_url) && (() => {
                    const imgs: string[] = detailRecipe.images?.length
                        ? detailRecipe.images
                        : [detailRecipe.image_url];
                    return (
                        <div className={`grid gap-2 ${imgs.length === 1 ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-3"}`}>
                            {imgs.map((url: string, i: number) => (
                                <div key={url} className={`relative rounded-xl overflow-hidden bg-muted ${i === 0 ? "aspect-video col-span-full" : "aspect-square"}`}>
                                    <img src={getOptimizedUrl(url, i === 0 ? 800 : 400)} alt="" className="w-full h-full object-cover" />
                                    {i === 0 && imgs.length > 1 && (
                                        <span className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">Cover</span>
                                    )}
                                    {i > 0 && (
                                        <span className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">AI #{i}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                })()}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                        <CardContent className="p-5 space-y-3">
                            {/* Creator info */}
                            <div className="flex items-center gap-3 pb-3 border-b">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    {detailRecipe.creator?.avatar_url ? (
                                        <img
                                            src={detailRecipe.creator.avatar_url}
                                            alt=""
                                            className="w-8 h-8 rounded-full object-cover"
                                        />
                                    ) : (
                                        <User className="w-4 h-4 text-primary" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-medium">
                                        {detailRecipe.creator?.display_name || "System"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Created{" "}
                                        {new Date(detailRecipe.created_at).toLocaleDateString(
                                            "vi-VN",
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Code</span>
                                <span className="font-mono">{detailRecipe.code || "—"}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Category</span>
                                <span>{detailRecipe.category?.name_vi || "—"}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Servings</span>
                                <span>{detailRecipe.servings}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Status</span>
                                <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || STATUS_COLORS.draft}`}
                                >
                                    {status}
                                </span>
                            </div>
                            {detailRecipe.total_weight && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total Weight</span>
                                    <span>{detailRecipe.total_weight}g</span>
                                </div>
                            )}
                            {detailRecipe.description && (
                                <div className="pt-2 border-t">
                                    <p className="text-sm text-muted-foreground mb-1">
                                        Description
                                    </p>
                                    <p className="text-sm">{detailRecipe.description}</p>
                                </div>
                            )}
                            {(detailRecipe.tags || []).length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-2">
                                    {detailRecipe.tags.map((t: string) => (
                                        <span
                                            key={t}
                                            className="px-2 py-0.5 bg-gray-100 rounded-full text-xs"
                                        >
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="pt-2 border-t">
                                <p className="text-sm text-muted-foreground mb-2">
                                    Nutrition (total)
                                </p>
                                <div className="grid grid-cols-5 gap-2 text-center">
                                    {[
                                        {
                                            val: detailRecipe.calories,
                                            label: "kcal",
                                            color: "bg-orange-50 text-orange-600",
                                        },
                                        {
                                            val: detailRecipe.protein,
                                            label: "P",
                                            color: "bg-blue-50 text-blue-600",
                                            unit: "g",
                                        },
                                        {
                                            val: detailRecipe.carbs,
                                            label: "C",
                                            color: "bg-yellow-50 text-yellow-600",
                                            unit: "g",
                                        },
                                        {
                                            val: detailRecipe.fat,
                                            label: "F",
                                            color: "bg-pink-50 text-pink-600",
                                            unit: "g",
                                        },
                                        {
                                            val: detailRecipe.fiber,
                                            label: "Fiber",
                                            color: "bg-green-50 text-green-600",
                                            unit: "g",
                                        },
                                    ].map((n) => (
                                        <div key={n.label} className={`${n.color} rounded-lg p-2`}>
                                            <p className="text-lg font-bold">
                                                {n.val || 0}
                                                {n.unit || ""}
                                            </p>
                                            <p className="text-xs opacity-70">{n.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-5">
                            <p className="font-medium mb-3">
                                Ingredients ({detailIngredients.length})
                            </p>
                            {detailIngredients.length > 0 ? (
                                <div className="space-y-2">
                                    {detailIngredients.map((ing: any) => (
                                        <div
                                            key={ing.id}
                                            className="flex justify-between items-center text-sm py-1.5 border-b last:border-0"
                                        >
                                            <span>{ing.food?.name_vi || "Unknown"}</span>
                                            <span className="text-muted-foreground">
                                                {ing.amount}
                                                {ing.unit} —{" "}
                                                {Math.round(
                                                    ((ing.food?.energy_kcal || 0) * ing.amount) /
                                                        100,
                                                )}{" "}
                                                kcal
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No ingredients</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {(detailRecipe.instructions || []).length > 0 && (
                    <Card>
                        <CardContent className="p-5">
                            <p className="font-medium mb-3">Instructions</p>
                            <ol className="space-y-2">
                                {detailRecipe.instructions.map((step: string, i: number) => (
                                    <li key={i} className="flex gap-3 text-sm">
                                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                                            {i + 1}
                                        </span>
                                        <span>{step}</span>
                                    </li>
                                ))}
                            </ol>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    }

    // ══════════ FORM VIEW ══════════
    if (viewMode === "form") {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => setViewMode("list")}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to list
                    </Button>
                    <h1 className="text-xl font-bold">{form.id ? "Edit Recipe" : "New Recipe"}</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <Card>
                            <CardContent className="p-5 space-y-4">
                                <div>
                                    <Label>Name (Vietnamese) *</Label>
                                    <Input
                                        value={form.name_vi}
                                        onChange={(e) =>
                                            setForm({ ...form, name_vi: e.target.value })
                                        }
                                        placeholder="Phở bò tái"
                                    />
                                </div>
                                <div>
                                    <Label>Name (English)</Label>
                                    <Input
                                        value={form.name_en}
                                        onChange={(e) =>
                                            setForm({ ...form, name_en: e.target.value })
                                        }
                                        placeholder="Beef pho"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label>Code</Label>
                                        <Input
                                            value={form.code}
                                            onChange={(e) =>
                                                setForm({ ...form, code: e.target.value })
                                            }
                                            placeholder="HAP-223025"
                                        />
                                    </div>
                                    <div>
                                        <Label>Servings</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={form.servings}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    servings: parseInt(e.target.value) || 1,
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label>Category</Label>
                                    <select
                                        className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                                        value={form.category_id || ""}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                category_id: e.target.value
                                                    ? parseInt(e.target.value)
                                                    : null,
                                            })
                                        }
                                    >
                                        <option value="">-- Select category --</option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name_vi}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label>Description</Label>
                                    <Textarea
                                        value={form.description}
                                        onChange={(e) =>
                                            setForm({ ...form, description: e.target.value })
                                        }
                                        rows={2}
                                    />
                                </div>

                                {/* Images — multiple for AI training */}
                                <div>
                                    <Label>
                                        Images
                                        <span className="text-xs text-muted-foreground ml-2">
                                            First = cover · Extra angles used for AI training
                                        </span>
                                    </Label>
                                    <div className="mt-2 space-y-2">
                                        {/* Existing + pending grid */}
                                        {(images.length > 0 || newImageFiles.length > 0) && (
                                            <div className="grid grid-cols-3 gap-2">
                                                {images.map((url, i) => (
                                                    <div key={url} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
                                                        <img src={getOptimizedUrl(url, 200)} alt="" className="w-full h-full object-cover" />
                                                        {i === 0 && (
                                                            <span className="absolute top-1 left-1 bg-primary text-white text-[10px] px-1.5 rounded">Cover</span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            title="Remove image"
                                                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={() => setImages(images.filter((_, j) => j !== i))}
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {newImageFiles.map((f, i) => (
                                                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
                                                        <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover opacity-70" />
                                                        <span className="absolute bottom-1 left-1 bg-yellow-500 text-white text-[10px] px-1.5 rounded">Pending</span>
                                                        <button
                                                            type="button"
                                                            title="Remove image"
                                                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={() => setNewImageFiles(newImageFiles.filter((_, j) => j !== i))}
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {/* Add more */}
                                        <label className="flex items-center justify-center gap-2 w-full h-16 border-2 border-dashed rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                            <Camera className="w-5 h-5 text-muted-foreground" />
                                            <span className="text-sm text-muted-foreground">
                                                {images.length + newImageFiles.length === 0 ? "Upload images" : "Add more images"}
                                            </span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                                onChange={(e) => {
                                                    const files = Array.from(e.target.files || []);
                                                    setNewImageFiles([...newImageFiles, ...files]);
                                                    e.target.value = "";
                                                }}
                                            />
                                        </label>
                                        {uploading && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Loader2 className="w-4 h-4 animate-spin" /> Uploading images...
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Tags */}
                                <div>
                                    <Label>Tags</Label>
                                    <div className="flex gap-2 mt-1">
                                        <Input
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={(e) =>
                                                e.key === "Enter" && (e.preventDefault(), addTag())
                                            }
                                            placeholder="low-carb, quick..."
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
                                    {(form.tags || []).length > 0 && (
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

                                {/* Publish */}
                                <div className="flex gap-4 pt-2">
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
                            </CardContent>
                        </Card>

                        {/* Instructions */}
                        <Card>
                            <CardContent className="p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Instructions</Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={addStep}
                                    >
                                        <Plus className="w-4 h-4 mr-1" /> Step
                                    </Button>
                                </div>
                                {form.instructions.map((step, i) => (
                                    <div key={i} className="flex gap-2 items-start">
                                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-2">
                                            {i + 1}
                                        </span>
                                        <Textarea
                                            value={step}
                                            onChange={(e) => updateStep(i, e.target.value)}
                                            rows={1}
                                            className="flex-1"
                                            placeholder={`Step ${i + 1}...`}
                                        />
                                        {form.instructions.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-400 shrink-0"
                                                onClick={() => removeStep(i)}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Ingredients */}
                    <div className="space-y-4">
                        <Card>
                            <CardContent className="p-5 space-y-4">
                                <Label>Ingredients</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        value={foodSearch}
                                        onChange={(e) => searchFoods(e.target.value)}
                                        placeholder="Search foods to add..."
                                        className="pl-9"
                                    />
                                    {foodResults.length > 0 && (
                                        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                            {foodResults.map((food) => (
                                                <button
                                                    key={food.id}
                                                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex justify-between"
                                                    onClick={() => addIngredient(food)}
                                                >
                                                    <span>{food.name_vi}</span>
                                                    <span className="text-muted-foreground">
                                                        {food.energy_kcal} kcal/100g
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {foodSearching && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
                                    )}
                                </div>

                                {ingredients.length > 0 ? (
                                    <div className="space-y-2">
                                        {ingredients.map((ing, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">
                                                        {ing.food_name || ing.food?.name_vi}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {Math.round(
                                                            ((ing.food?.energy_kcal || 0) *
                                                                ing.amount) /
                                                                100,
                                                        )}{" "}
                                                        kcal
                                                    </p>
                                                </div>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={ing.amount}
                                                    onChange={(e) =>
                                                        updateIngredient(
                                                            i,
                                                            "amount",
                                                            parseFloat(e.target.value) || 0,
                                                        )
                                                    }
                                                    className="w-20 text-sm"
                                                />
                                                <select
                                                    value={ing.unit}
                                                    onChange={(e) =>
                                                        updateIngredient(i, "unit", e.target.value)
                                                    }
                                                    className="border rounded px-2 py-1.5 text-sm bg-white w-16"
                                                >
                                                    <option value="g">g</option>
                                                    <option value="ml">ml</option>
                                                    <option value="tbsp">tbsp</option>
                                                    <option value="tsp">tsp</option>
                                                    <option value="piece">pc</option>
                                                    <option value="cup">cup</option>
                                                </select>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-400 shrink-0"
                                                    onClick={() => removeIngredient(i)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}

                                        <div className="pt-3 border-t">
                                            <p className="text-xs text-muted-foreground mb-2">
                                                Nutrition preview
                                            </p>
                                            <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
                                                {[
                                                    {
                                                        key: "energy_kcal",
                                                        label: "kcal",
                                                        color: "bg-orange-50 text-orange-600",
                                                    },
                                                    {
                                                        key: "protein",
                                                        label: "P",
                                                        color: "bg-blue-50 text-blue-600",
                                                    },
                                                    {
                                                        key: "glucid",
                                                        label: "C",
                                                        color: "bg-yellow-50 text-yellow-600",
                                                    },
                                                    {
                                                        key: "lipid",
                                                        label: "F",
                                                        color: "bg-pink-50 text-pink-600",
                                                    },
                                                    {
                                                        key: "fiber",
                                                        label: "Fb",
                                                        color: "bg-green-50 text-green-600",
                                                    },
                                                ].map((n) => (
                                                    <div
                                                        key={n.key}
                                                        className={`${n.color} rounded p-1.5`}
                                                    >
                                                        <p className="font-bold">
                                                            {Math.round(
                                                                ingredients.reduce(
                                                                    (s, ing) =>
                                                                        s +
                                                                        (((ing.food as any)?.[
                                                                            n.key
                                                                        ] || 0) *
                                                                            ing.amount) /
                                                                            100,
                                                                    0,
                                                                ),
                                                            )}
                                                        </p>
                                                        <p className="opacity-70">{n.label}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        Search and add ingredients above
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <div className="flex gap-2">
                            <Button
                                className="flex-1"
                                onClick={handleSave}
                                disabled={saving || !form.name_vi.trim()}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                                    </>
                                ) : (
                                    "Save Recipe"
                                )}
                            </Button>
                            <Button variant="outline" onClick={() => setViewMode("list")}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ══════════ LIST VIEW ══════════
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Recipes</h1>
                    <p className="text-muted-foreground">{recipes.length} total recipes</p>
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
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
                    >
                        <option value="all">All Status</option>
                        <option value="pending">
                            Pending {pendingCount > 0 ? `(${pendingCount})` : ""}
                        </option>
                        <option value="approved">Approved</option>
                        <option value="draft">Draft</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <select
                        className="border rounded-md px-3 py-2 text-sm bg-white"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                    >
                        <option value="all">All Categories</option>
                        {categories.map((c) => (
                            <option key={c.id} value={String(c.id)}>
                                {c.name_vi}
                            </option>
                        ))}
                    </select>
                    <Button onClick={handleNew}>
                        <Plus className="w-4 h-4 mr-2" /> New
                    </Button>
                </div>
            </div>

            {/* Pending alert */}
            {pendingCount > 0 && filterStatus !== "pending" && (
                <div
                    className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-yellow-100 transition-colors"
                    onClick={() => setFilterStatus("pending")}
                >
                    <div className="flex items-center gap-2">
                        <Send className="w-4 h-4 text-yellow-600" />
                        <p className="text-sm text-yellow-800">
                            <span className="font-medium">
                                {pendingCount} recipe{pendingCount > 1 ? "s" : ""}
                            </span>{" "}
                            waiting for review
                        </p>
                    </div>
                    <span className="text-xs text-yellow-600">View →</span>
                </div>
            )}

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-gray-50/50">
                                    <th className="px-4 py-3 text-left font-medium">Recipe</th>
                                    <th className="px-4 py-3 text-left font-medium">Category</th>
                                    <th className="px-4 py-3 text-left font-medium">Creator</th>
                                    <th className="px-4 py-3 text-left font-medium">Calories</th>
                                    <th className="px-4 py-3 text-left font-medium">Status</th>
                                    <th className="px-4 py-3 text-left font-medium">Created</th>
                                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-4 py-8 text-center text-muted-foreground"
                                        >
                                            {loading ? "Loading..." : "No recipes found"}
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((r) => {
                                        const status = getStatus(r);
                                        return (
                                            <tr
                                                key={r.id}
                                                className={`border-b last:border-0 hover:bg-gray-50/50 ${status === "pending" ? "bg-yellow-50/30" : ""}`}
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        {r.image_url ? (
                                                            <img
                                                                src={getOptimizedUrl(
                                                                    r.image_url,
                                                                    80,
                                                                )}
                                                                alt=""
                                                                className="w-10 h-10 rounded-lg object-cover shrink-0"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                                                <Camera className="w-4 h-4 text-muted-foreground" />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-medium">
                                                                {r.name_vi}
                                                            </p>
                                                            {r.name_en && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    {r.name_en}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {r.category ? (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                                            {r.category.name_vi}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground text-xs">
                                                    {r.creator?.display_name || "System"}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {r.calories ? `${r.calories} kcal` : "—"}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[status] || STATUS_COLORS.draft}`}
                                                    >
                                                        {status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground text-xs">
                                                    {new Date(r.created_at).toLocaleDateString(
                                                        "vi-VN",
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-1">
                                                        {status === "pending" && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="text-green-600 h-8 w-8"
                                                                    onClick={() => approve(r.id)}
                                                                >
                                                                    <Check className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="text-red-600 h-8 w-8"
                                                                    onClick={() => {
                                                                        setRejectId(r.id);
                                                                        setRejectReason("");
                                                                    }}
                                                                >
                                                                    <Ban className="w-4 h-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                >
                                                                    <MoreHorizontal className="w-4 h-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        handleViewDetail(r)
                                                                    }
                                                                >
                                                                    <Eye className="w-4 h-4 mr-2" />{" "}
                                                                    View Detail
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => handleEdit(r)}
                                                                >
                                                                    <Pencil className="w-4 h-4 mr-2" />{" "}
                                                                    Edit
                                                                </DropdownMenuItem>
                                                                {status !== "approved" && (
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            approve(r.id)
                                                                        }
                                                                    >
                                                                        <Check className="w-4 h-4 mr-2" />{" "}
                                                                        Approve
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {status !== "rejected" && (
                                                                    <DropdownMenuItem
                                                                        onClick={() => {
                                                                            setRejectId(r.id);
                                                                            setRejectReason("");
                                                                        }}
                                                                    >
                                                                        <Ban className="w-4 h-4 mr-2" />{" "}
                                                                        Reject
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuItem
                                                                    className="text-red-600"
                                                                    onClick={() =>
                                                                        setDeleteId(r.id)
                                                                    }
                                                                >
                                                                    <Trash2 className="w-4 h-4 mr-2" />{" "}
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
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
                        <DialogTitle>Delete Recipe?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        This will permanently delete this recipe and all its ingredients.
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

            {/* Reject dialog */}
            <Dialog
                open={!!rejectId}
                onOpenChange={() => {
                    setRejectId(null);
                    setRejectReason("");
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Recipe?</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            This recipe will be marked as rejected. The creator will see your
                            reason.
                        </p>
                        <div>
                            <Label>Reason (optional)</Label>
                            <Textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="e.g. Missing ingredients, incorrect nutrition data..."
                                rows={3}
                                className="mt-1"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setRejectId(null);
                                setRejectReason("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleReject}>
                            <Ban className="w-4 h-4 mr-2" /> Reject
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Recipes;
