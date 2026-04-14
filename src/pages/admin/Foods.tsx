// src/pages/admin/Foods.tsx
import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadFile, getOptimizedUrl } from "@/utils/cloudinary";
import {
    Search,
    MoreHorizontal,
    Plus,
    Pencil,
    Trash2,
    Eye,
    ArrowLeft,
    Loader2,
    X,
    Camera,
    Upload,
    FileText,
    CheckCircle2,
    AlertCircle,
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

interface FoodForm {
    id?: string;
    code: string;
    name_vi: string;
    name_en: string;
    food_group_id: string | null;
    waste_percentage: number;
    water: number | null;
    energy_kcal: number | null;
    protein: number | null;
    lipid: number | null;
    glucid: number | null;
    fiber: number | null;
    ash: number | null;
    search_keywords: string[];
    notes: string;
}

const emptyForm: FoodForm = {
    code: "",
    name_vi: "",
    name_en: "",
    food_group_id: null,
    waste_percentage: 0,
    water: null,
    energy_kcal: null,
    protein: null,
    lipid: null,
    glucid: null,
    fiber: null,
    ash: null,
    search_keywords: [],
    notes: "",
};

interface ImportResult {
    total: number;
    imported: number;
    updated: number;
    errors: { row: number; code: string; error: string }[];
    message: string;
}

type ViewMode = "list" | "form" | "detail";

const Foods = () => {
    const { profile } = useAuthContext();
    const [foods, setFoods] = useState<any[]>([]);
    const [foodGroups, setFoodGroups] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [search, setSearch] = useState("");
    const [filterGroup, setFilterGroup] = useState<string>("all");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 20;

    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [form, setForm] = useState<FoodForm>(emptyForm);
    const [keywordInput, setKeywordInput] = useState("");
    const [detailFood, setDetailFood] = useState<any>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [serverSearch, setServerSearch] = useState("");
    const [searchTimer, setSearchTimer] = useState<any>(null);

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    // CSV import state
    const [showImport, setShowImport] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const csvInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { fetchFoodGroups(); }, []);
    useEffect(() => { fetchFoods(); }, [page, filterGroup, serverSearch]);

    useEffect(() => {
        if (searchTimer) clearTimeout(searchTimer);
        const timer = setTimeout(() => { setPage(0); setServerSearch(search); }, 400);
        setSearchTimer(timer);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchFoodGroups = async () => {
        const { data } = await api.get("/food-groups");
        setFoodGroups(data || []);
    };

    const fetchFoods = async () => {
        setLoading(true);
        try {
            const params: Record<string, any> = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
            if (filterGroup !== "all") params.food_group_id = filterGroup;
            if (serverSearch) params.q = serverSearch;
            const { data } = await api.get("/foods", { params });
            setFoods(data.data || []);
            setTotalCount(data.total || 0);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ── CRUD ──
    const handleNew = () => {
        setForm(emptyForm);
        setImageFile(null);
        setImagePreview(null);
        setViewMode("form");
    };

    const handleEdit = (food: any) => {
        // food_group_id may be a populated object or a raw ObjectId string
        const groupId = food.food_group_id?._id
            ? String(food.food_group_id._id)
            : food.food_group_id
            ? String(food.food_group_id)
            : null;
        // Mongoose's `id` virtual is excluded from toJSON by default — always use `_id`
        const foodId = food._id ? String(food._id) : food.id ? String(food.id) : undefined;
        setForm({
            id: foodId,
            code: food.code || "",
            name_vi: food.name_vi || "",
            name_en: food.name_en || "",
            food_group_id: groupId,
            waste_percentage: food.waste_percentage || 0,
            water: food.water,
            energy_kcal: food.energy_kcal,
            protein: food.protein,
            lipid: food.lipid,
            glucid: food.glucid,
            fiber: food.fiber,
            ash: food.ash,
            search_keywords: food.search_keywords || [],
            notes: food.notes || "",
        });
        setImagePreview(food.image_url || null);
        setImageFile(null);
        setViewMode("form");
    };

    const handleSave = async () => {
        if (!form.name_vi.trim() || !form.code.trim()) return;
        setSaving(true);

        let imageUrl = imagePreview;
        if (imageFile) {
            try {
                const uploaded = await uploadFile(imageFile, "calocare/foods");
                imageUrl = uploaded.url;
            } catch (err) {
                console.error("Image upload failed:", err);
            }
        }

        const foodData: any = {
            code: form.code.trim(),
            name_vi: form.name_vi.trim(),
            name_en: form.name_en.trim() || null,
            food_group_id: form.food_group_id || null,
            waste_percentage: form.waste_percentage,
            water: form.water,
            energy_kcal: form.energy_kcal,
            protein: form.protein,
            lipid: form.lipid,
            glucid: form.glucid,
            fiber: form.fiber,
            ash: form.ash,
            search_keywords: form.search_keywords,
            notes: form.notes.trim() || null,
            image_url: imageUrl || null,
        };

        try {
            if (form.id) {
                await api.put(`/foods/${form.id}`, foodData);
            } else {
                foodData.creator_id = profile?.id;
                await api.post("/foods", foodData);
            }
            setViewMode("list");
            fetchFoods();
        } catch (err: any) {
            console.error("Save failed:", err.response?.data || err.message);
            alert(err.response?.data?.error || "Failed to save food");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        await api.delete(`/foods/${deleteId}`);
        setDeleteId(null);
        fetchFoods();
    };

    const handleViewDetail = (food: any) => {
        setDetailFood(food);
        setViewMode("detail");
    };

    // ── CSV Import ──
    const handleImport = async () => {
        if (!csvFile) return;
        setImporting(true);
        setImportResult(null);
        try {
            const formData = new FormData();
            formData.append("file", csvFile);
            const { data } = await api.post("/foods/import-csv", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setImportResult(data);
            fetchFoods();
        } catch (err: any) {
            setImportResult({
                total: 0, imported: 0, updated: 0,
                errors: [{ row: 0, code: "", error: err.response?.data?.error || err.message }],
                message: "Import failed",
            });
        } finally {
            setImporting(false);
        }
    };

    const openImportDialog = () => {
        setCsvFile(null);
        setImportResult(null);
        setShowImport(true);
    };

    // ── Keywords ──
    const addKeyword = () => {
        if (keywordInput.trim() && !form.search_keywords.includes(keywordInput.trim())) {
            setForm({ ...form, search_keywords: [...form.search_keywords, keywordInput.trim()] });
            setKeywordInput("");
        }
    };

    const removeKeyword = (kw: string) =>
        setForm({ ...form, search_keywords: form.search_keywords.filter((k) => k !== kw) });

    const numInput = (label: string, field: keyof FoodForm, unit?: string) => (
        <div>
            <Label>{label}{unit ? ` (${unit})` : ""}</Label>
            <Input
                type="number" step="0.1"
                value={form[field] ?? ""}
                onChange={(e) =>
                    setForm({ ...form, [field]: e.target.value === "" ? null : parseFloat(e.target.value) })
                }
            />
        </div>
    );

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    // ══════════ DETAIL VIEW ══════════
    if (viewMode === "detail" && detailFood) {
        return (
            <div className="space-y-6">
                <Button variant="ghost" onClick={() => setViewMode("list")}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to list
                </Button>
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{detailFood.name_vi}</h1>
                        {detailFood.name_en && <p className="text-muted-foreground">{detailFood.name_en}</p>}
                    </div>
                    <Button variant="outline" onClick={() => handleEdit(detailFood)}>
                        <Pencil className="w-4 h-4 mr-2" /> Edit
                    </Button>
                </div>

                {detailFood.image_url && (
                    <div className="w-full h-48 rounded-xl overflow-hidden bg-muted">
                        <img src={getOptimizedUrl(detailFood.image_url, 600)} alt={detailFood.name_vi} className="w-full h-full object-cover" />
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                        <CardContent className="p-5 space-y-3">
                            <p className="font-medium mb-2">Basic Info</p>
                            {[
                                ["Code", detailFood.code],
                                ["Group", detailFood.food_group?.name_vi || "—"],
                                ["Waste %", `${detailFood.waste_percentage || 0}%`],
                                ["Creator", detailFood.creator?.display_name || "System"],
                                ["Created", new Date(detailFood.created_at).toLocaleDateString("vi-VN")],
                            ].map(([label, val]) => (
                                <div key={label} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{label}</span>
                                    <span>{val}</span>
                                </div>
                            ))}
                            {detailFood.search_keywords?.length > 0 && (
                                <div className="pt-2 border-t">
                                    <p className="text-sm text-muted-foreground mb-1">Keywords</p>
                                    <div className="flex flex-wrap gap-1">
                                        {detailFood.search_keywords.map((kw: string) => (
                                            <span key={kw} className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">{kw}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {detailFood.notes && (
                                <div className="pt-2 border-t">
                                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                                    <p className="text-sm">{detailFood.notes}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-5">
                            <p className="font-medium mb-3">Nutrition per 100g</p>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    ["Energy", detailFood.energy_kcal, "kcal", "bg-orange-50 text-orange-600"],
                                    ["Protein", detailFood.protein, "g", "bg-blue-50 text-blue-600"],
                                    ["Lipid", detailFood.lipid, "g", "bg-pink-50 text-pink-600"],
                                    ["Glucid", detailFood.glucid, "g", "bg-yellow-50 text-yellow-600"],
                                    ["Fiber", detailFood.fiber, "g", "bg-green-50 text-green-600"],
                                    ["Water", detailFood.water, "g", "bg-cyan-50 text-cyan-600"],
                                    ["Ash", detailFood.ash, "g", "bg-gray-50 text-gray-600"],
                                ].map(([label, val, unit, color]) => (
                                    <div key={label as string} className={`${color} rounded-lg p-3`}>
                                        <p className="text-lg font-bold">{val ?? "—"}{val != null ? unit : ""}</p>
                                        <p className="text-xs opacity-70">{label}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
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
                    <h1 className="text-xl font-bold">{form.id ? "Edit Food" : "New Food"}</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <Card>
                            <CardContent className="p-5 space-y-4">
                                <div>
                                    <Label>Code *</Label>
                                    <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="1001" />
                                </div>

                                {/* Image */}
                                <div>
                                    <Label>Image</Label>
                                    <div className="mt-1">
                                        {imagePreview ? (
                                            <div className="relative w-full h-32 rounded-xl overflow-hidden bg-muted">
                                                <img src={getOptimizedUrl(imagePreview, 400)} alt="Food" className="w-full h-full object-cover" />
                                                <Button variant="ghost" size="icon"
                                                    className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70 h-7 w-7"
                                                    onClick={() => { setImagePreview(null); setImageFile(null); }}>
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer hover:bg-gray-50">
                                                <Camera className="w-6 h-6 text-muted-foreground mb-1" />
                                                <span className="text-xs text-muted-foreground">Upload image</span>
                                                <input type="file" accept="image/*" className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
                                                    }} />
                                            </label>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <Label>Name (Vietnamese) *</Label>
                                    <Input value={form.name_vi} onChange={(e) => setForm({ ...form, name_vi: e.target.value })} placeholder="Gạo tẻ máy" />
                                </div>
                                <div>
                                    <Label>Name (English)</Label>
                                    <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} placeholder="Polished rice" />
                                </div>
                                <div>
                                    <Label>Food Group</Label>
                                    <select title="Food Group" className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                                        value={form.food_group_id ?? ""}
                                        onChange={(e) => setForm({ ...form, food_group_id: e.target.value || null })}>
                                        <option value="">-- Select group --</option>
                                        {foodGroups.map((g) => (
                                            <option key={String(g._id)} value={String(g._id)}>{g.name_vi}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label>Waste %</Label>
                                    <Input type="number" step="0.1" min={0} max={100}
                                        value={form.waste_percentage}
                                        onChange={(e) => setForm({ ...form, waste_percentage: parseFloat(e.target.value) || 0 })} />
                                </div>

                                <div>
                                    <Label>Search Keywords</Label>
                                    <div className="flex gap-2 mt-1">
                                        <Input value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                                            placeholder="gạo, rice, cơm..." className="flex-1" />
                                        <Button type="button" variant="outline" size="sm" onClick={addKeyword}>Add</Button>
                                    </div>
                                    {form.search_keywords.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {form.search_keywords.map((kw) => (
                                                <span key={kw} className="px-2 py-0.5 bg-gray-100 rounded-full text-xs flex items-center gap-1">
                                                    {kw}
                                                    <button type="button" title={`Remove ${kw}`} onClick={() => removeKeyword(kw)} className="text-gray-400 hover:text-red-500">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <Label>Notes</Label>
                                    <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        <Card>
                            <CardContent className="p-5 space-y-4">
                                <p className="font-medium">Nutrition per 100g</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {numInput("Energy", "energy_kcal", "kcal")}
                                    {numInput("Protein", "protein", "g")}
                                    {numInput("Lipid (fat)", "lipid", "g")}
                                    {numInput("Glucid (carbs)", "glucid", "g")}
                                    {numInput("Fiber", "fiber", "g")}
                                    {numInput("Water", "water", "g")}
                                    {numInput("Ash", "ash", "g")}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex gap-2">
                            <Button className="flex-1" onClick={handleSave} disabled={saving || !form.name_vi.trim() || !form.code.trim()}>
                                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Food"}
                            </Button>
                            <Button variant="outline" onClick={() => setViewMode("list")}>Cancel</Button>
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
                    <h1 className="text-2xl font-bold">Foods</h1>
                    <p className="text-muted-foreground">{totalCount} total foods</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <div className="relative w-full sm:w-60">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Search foods..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                    </div>
                    <select title="Filter by food group" className="border rounded-md px-3 py-2 text-sm bg-white" value={filterGroup}
                        onChange={(e) => { setFilterGroup(e.target.value); setPage(0); }}>
                        <option value="all">All Groups</option>
                        {foodGroups.map((g) => (
                            <option key={String(g._id)} value={String(g._id)}>{g.name_vi}</option>
                        ))}
                    </select>
                    <Button variant="outline" onClick={openImportDialog}>
                        <Upload className="w-4 h-4 mr-2" /> Import CSV
                    </Button>
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
                                    <th className="px-4 py-3 text-left font-medium">Code</th>
                                    <th className="px-4 py-3 text-left font-medium">Name</th>
                                    <th className="px-4 py-3 text-left font-medium">Group</th>
                                    <th className="px-4 py-3 text-left font-medium">Kcal</th>
                                    <th className="px-4 py-3 text-left font-medium">P / L / G</th>
                                    <th className="px-4 py-3 text-left font-medium">Creator</th>
                                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} className="px-4 py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
                                ) : foods.length === 0 ? (
                                    <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No foods found</td></tr>
                                ) : (
                                    foods.map((f) => (
                                        <tr key={f._id} className="border-b last:border-0 hover:bg-gray-50/50">
                                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{f.code}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {f.image_url && (
                                                        <img src={getOptimizedUrl(f.image_url, 40)} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                                                    )}
                                                    <div>
                                                        <p className="font-medium">{f.name_vi}</p>
                                                        {f.name_en && <p className="text-xs text-muted-foreground">{f.name_en}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {f.food_group_id ? (
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                                        {f.food_group_id.name_vi || "—"}
                                                    </span>
                                                ) : <span className="text-muted-foreground text-xs">—</span>}
                                            </td>
                                            <td className="px-4 py-3">{f.energy_kcal ?? "—"}</td>
                                            <td className="px-4 py-3 text-xs">{f.protein ?? 0}g / {f.lipid ?? 0}g / {f.glucid ?? 0}g</td>
                                            <td className="px-4 py-3 text-muted-foreground text-xs">{f.creator?.display_name || "System"}</td>
                                            <td className="px-4 py-3">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleViewDetail(f)}>
                                                            <Eye className="w-4 h-4 mr-2" /> View Detail
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEdit(f)}>
                                                            <Pencil className="w-4 h-4 mr-2" /> Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(f._id)}>
                                                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between px-4 py-3 border-t">
                        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                        <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages || 1} ({totalCount} items)</span>
                        <Button variant="outline" size="sm" disabled={foods.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>Next</Button>
                    </div>
                </CardContent>
            </Card>

            {/* ── CSV Import Dialog ── */}
            <Dialog open={showImport} onOpenChange={(o) => { if (!importing) setShowImport(o); }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5" /> Import Foods from CSV
                        </DialogTitle>
                    </DialogHeader>

                    {!importResult ? (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Upload a CSV exported from PostgreSQL. Columns required:{" "}
                                <code className="text-xs bg-gray-100 px-1 rounded">
                                    code, name_vi, name_en, food_group_id, energy_kcal, protein, lipid, glucid, fiber, water, ash, waste_percentage, search_keywords, nutrients_extended, source_reference, notes, is_approved, image_url
                                </code>
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Upserts by <strong>code</strong>. food_group_id is matched via FoodGroup.code (integer).
                            </p>

                            {/* Drop zone */}
                            <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${csvFile ? "border-primary bg-primary/5" : "hover:bg-gray-50"}`}>
                                {csvFile ? (
                                    <div className="flex items-center gap-2 text-primary">
                                        <FileText className="w-5 h-5" />
                                        <span className="text-sm font-medium">{csvFile.name}</span>
                                        <span className="text-xs text-muted-foreground">({(csvFile.size / 1024).toFixed(1)} KB)</span>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                                        <span className="text-sm text-muted-foreground">Click or drag CSV file here</span>
                                    </>
                                )}
                                <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden"
                                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
                            </label>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowImport(false)}>Cancel</Button>
                                <Button onClick={handleImport} disabled={!csvFile || importing}>
                                    {importing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...</> : "Import"}
                                </Button>
                            </DialogFooter>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Summary */}
                            <div className={`flex items-start gap-3 p-4 rounded-lg ${importResult.errors.length === 0 ? "bg-green-50" : "bg-yellow-50"}`}>
                                {importResult.errors.length === 0
                                    ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    : <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />}
                                <div className="text-sm">
                                    <p className="font-medium">{importResult.message}</p>
                                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                                        <span>Total rows: <strong>{importResult.total}</strong></span>
                                        <span className="text-green-600">New: <strong>{importResult.imported}</strong></span>
                                        <span className="text-blue-600">Updated: <strong>{importResult.updated}</strong></span>
                                        {importResult.errors.length > 0 && (
                                            <span className="text-red-600">Errors: <strong>{importResult.errors.length}</strong></span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Errors table */}
                            {importResult.errors.length > 0 && (
                                <div className="max-h-48 overflow-y-auto border rounded-lg">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Row</th>
                                                <th className="px-3 py-2 text-left">Code</th>
                                                <th className="px-3 py-2 text-left">Error</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importResult.errors.map((e, i) => (
                                                <tr key={i} className="border-t">
                                                    <td className="px-3 py-1.5 text-muted-foreground">{e.row}</td>
                                                    <td className="px-3 py-1.5 font-mono">{e.code}</td>
                                                    <td className="px-3 py-1.5 text-red-600">{e.error}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <DialogFooter>
                                <Button variant="outline" onClick={() => { setCsvFile(null); setImportResult(null); }}>
                                    Import Another
                                </Button>
                                <Button onClick={() => setShowImport(false)}>Done</Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete confirm */}
            <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Delete Food?</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        This will soft-delete the food item. It won't appear in lists but data is preserved.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Foods;
