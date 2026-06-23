import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
    Plus, Pencil, Trash2, Zap, Upload, QrCode,
    Sparkles, Loader2, Flame, Check, X, ImagePlus, Search, Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import { uploadFile } from "@/utils/cloudinary";

interface MenuItem {
    _id: string;
    name_vi: string;
    name_en?: string;
    price?: number;
    description?: string;
    ingredient_summary?: string;
    image_url?: string;
    menu_category?: "breakfast" | "main" | "snack" | "drink" | "dessert" | "other";
    serving_label?: string;
    serving_weight_grams?: number;
    search_keywords?: string[];
    dietary_tags?: string[];
    allergens?: string[];
    energy_kcal?: number;
    protein?: number;
    lipid?: number;
    glucid?: number;
    fiber?: number;
    nutrition_status?: "not_provided" | "owner_provided" | "ai_estimated" | "admin_verified";
    nutrition_source_reference?: string;
    nutrition_updated_at?: string;
    nutrition_verified?: boolean;
    is_available: boolean;
}

interface StoreRecord {
    _id: string;
    subscription_tier?: "basic" | "pro";
    menu_items?: MenuItem[];
}

interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
    };
}

const EMPTY_ITEM: Omit<MenuItem, "_id"> = {
    name_vi: "", name_en: "", price: undefined, description: "",
    ingredient_summary: "", menu_category: "main", serving_label: "1 khẩu phần", serving_weight_grams: undefined,
    search_keywords: [], dietary_tags: [], allergens: [], nutrition_status: "not_provided", nutrition_source_reference: "",
    image_url: "", energy_kcal: undefined, protein: undefined,
    lipid: undefined, glucid: undefined, fiber: undefined,
    nutrition_verified: false, is_available: true,
};

const MENU_CATEGORIES = [
    { value: "breakfast", label: "Bữa sáng" },
    { value: "main", label: "Món chính" },
    { value: "snack", label: "Ăn nhẹ" },
    { value: "drink", label: "Đồ uống" },
    { value: "dessert", label: "Tráng miệng" },
    { value: "other", label: "Khác" },
] as const;

const DIETARY_TAGS = [
    { value: "vegetarian", label: "Chay" },
    { value: "vegan", label: "Thuần chay" },
    { value: "high_protein", label: "Giàu protein" },
    { value: "low_carb", label: "Ít carb" },
    { value: "gluten_free", label: "Không gluten" },
    { value: "dairy_free", label: "Không sữa" },
] as const;

const ALLERGEN_TAGS = [
    { value: "milk", label: "Sữa" },
    { value: "egg", label: "Trứng" },
    { value: "peanut", label: "Đậu phộng" },
    { value: "nuts", label: "Hạt cây" },
    { value: "shellfish", label: "Giáp xác" },
    { value: "seafood", label: "Hải sản" },
    { value: "soy", label: "Đậu nành" },
    { value: "gluten", label: "Gluten" },
] as const;

const NUTRITION_STATUS: Record<NonNullable<MenuItem["nutrition_status"]>, { label: string; className: string }> = {
    not_provided: { label: "Chưa có dữ liệu", className: "bg-muted text-muted-foreground" },
    owner_provided: { label: "Quán cung cấp", className: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
    ai_estimated: { label: "AI ước tính", className: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
    admin_verified: { label: "Đã xác minh", className: "bg-emerald-600 text-white" },
};

const toggleTag = (tags: string[] | undefined, tag: string) => {
    const current = tags ?? [];
    return current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag];
};

const getNutritionStatus = (item: MenuItem) => item.nutrition_status
    || (item.nutrition_verified ? "admin_verified" : Number(item.energy_kcal) > 0 ? "owner_provided" : "not_provided");

const NutritionField = ({ label, value, onChange, unit = "g" }: {
    label: string; value: number | undefined; onChange: (v: number | undefined) => void; unit?: string;
}) => (
    <div className="space-y-1">
        <Label className="text-xs">{label} ({unit})</Label>
        <Input type="number" min={0} value={value ?? ""} placeholder="—"
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            className="h-8 text-sm" />
    </div>
);

const OwnerMenu = () => {
    const { toast } = useToast();
    const { t } = useTranslation();

    const [stores, setStores]         = useState<StoreRecord[]>([]);
    const [storeId, setStoreId]       = useState<string | null>(null);
    const [store, setStore]           = useState<StoreRecord | null>(null);
    const [items, setItems]           = useState<MenuItem[]>([]);
    const [loading, setLoading]       = useState(true);
    const [showForm, setShowForm]     = useState(false);
    const [editItem, setEditItem]     = useState<MenuItem | null>(null);
    const [form, setForm]             = useState<Omit<MenuItem, "_id">>(EMPTY_ITEM);
    const [saving, setSaving]         = useState(false);
    const [aiLoading, setAiLoading]   = useState<string | null>(null);
    const [showBulk, setShowBulk]     = useState(false);
    const [csvText, setCsvText]       = useState("");
    const [bulkLoading, setBulkLoading] = useState(false);
    const [qrUrl, setQrUrl]           = useState<string | null>(null);
    const [showQr, setShowQr]         = useState(false);
    const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
    const [menuQuery, setMenuQuery] = useState("");
    const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "unavailable">("all");
    const [nutritionFilter, setNutritionFilter] = useState<"all" | "complete" | "missing">("all");
    const [imageUploading, setImageUploading] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const isPro = store?.subscription_tier === "pro";
    const isBasic = !isPro;
    const menuLimit = 20;
    const atLimit = isBasic && items.length >= menuLimit;
    const filteredItems = items.filter((item) => {
        const searchText = [
            item.name_vi, item.name_en, item.description, item.ingredient_summary,
            ...(item.search_keywords ?? []), ...(item.dietary_tags ?? []),
        ].filter(Boolean).join(" ").toLocaleLowerCase("vi-VN");
        const matchesQuery = !menuQuery.trim() || searchText.includes(menuQuery.trim().toLocaleLowerCase("vi-VN"));
        const matchesAvailability = availabilityFilter === "all"
            || (availabilityFilter === "available" && item.is_available)
            || (availabilityFilter === "unavailable" && !item.is_available);
        const hasNutrition = Number(item.energy_kcal) > 0;
        const matchesNutrition = nutritionFilter === "all"
            || (nutritionFilter === "complete" && hasNutrition)
            || (nutritionFilter === "missing" && !hasNutrition);
        return matchesQuery && matchesAvailability && matchesNutrition;
    });

    const loadStore = async () => {
        try {
            const { data } = await api.get<{ data: StoreRecord[] }>("/stores/mine");
            const list = data.data || [];
            setStores(list);
            const sid = storeId || list[0]?._id;
            setStoreId(sid);
            if (sid) {
                const s = list.find((x) => x._id === sid) || list[0];
                setStore(s);
                setItems(s?.menu_items || []);
            }
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    useEffect(() => { loadStore(); }, []);

    const openAdd = () => {
        setEditItem(null);
        setForm(EMPTY_ITEM);
        setShowForm(true);
    };

    const openEdit = (item: MenuItem) => {
        setEditItem(item);
        setForm({ ...item });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.name_vi.trim()) {
            toast({ title: "Thiếu tên món", variant: "destructive" });
            return;
        }
        setSaving(true);
        try {
            if (editItem) {
                await api.put(`/stores/${storeId}/menu/${editItem._id}`, form);
            } else {
                await api.post(`/stores/${storeId}/menu`, form);
            }
            await loadStore();
            setShowForm(false);
            toast({ title: editItem ? "Đã cập nhật món" : "Đã thêm món" });
        } catch (err: unknown) {
            const apiError = err as ApiError;
            const msg = apiError.response?.data?.message || "Không thể lưu";
            toast({ title: "Lỗi", description: msg, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (itemId: string) => {
        if (!confirm("Xoá món này?")) return;
        try {
            await api.delete(`/stores/${storeId}/menu/${itemId}`);
            await loadStore();
            toast({ title: "Đã xoá món" });
        } catch {
            toast({ title: "Lỗi", variant: "destructive" });
        }
    };

    const handleAiNutrition = async (itemId: string) => {
        if (!isPro) return;
        setAiLoading(itemId);
        try {
            const { data } = await api.post(`/stores/${storeId}/menu/${itemId}/ai-nutrition`);
            await loadStore();
            toast({ title: "AI đã ước tính dinh dưỡng", description: `${data.estimate.energy_kcal} kcal ước tính` });
        } catch (err: unknown) {
            const apiError = err as ApiError;
            toast({ title: "Lỗi AI", description: apiError.response?.data?.message, variant: "destructive" });
        } finally {
            setAiLoading(null);
        }
    };

    const handleBulkUpload = async () => {
        if (!csvText.trim()) return;
        setBulkLoading(true);
        try {
            const { data } = await api.post(`/stores/${storeId}/menu/bulk`, { csv_data: csvText });
            await loadStore();
            setShowBulk(false);
            setCsvText("");
            toast({ title: `Đã nhập ${data.added} món từ CSV` });
        } catch (err: unknown) {
            const apiError = err as ApiError;
            toast({ title: "Lỗi", description: apiError.response?.data?.message, variant: "destructive" });
        } finally {
            setBulkLoading(false);
        }
    };

    const handleQrCode = async () => {
        const url = `${window.location.origin}/nearby`;
        const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 });
        setQrUrl(dataUrl);
        setShowQr(true);
    };

    const handleImageFile = async (file: File) => {
        if (!file.type.startsWith("image/")) {
            toast({ title: "File không hợp lệ", description: "Vui lòng chọn file ảnh.", variant: "destructive" });
            return;
        }

        setImageUploading(true);
        try {
            const uploaded = await uploadFile(file, "calovie/store-menu");
            setForm((f) => ({ ...f, image_url: uploaded.url }));
            toast({ title: "Đã upload ảnh món" });
        } catch {
            toast({ title: "Upload lỗi", description: "Không thể upload ảnh, thử lại.", variant: "destructive" });
        } finally {
            setImageUploading(false);
            if (imageInputRef.current) imageInputRef.current.value = "";
        }
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold">{t("owner.menu.title")}</h1>
                    <p className="text-sm text-muted-foreground">
                        {items.length} món{isBasic && ` / ${menuLimit} (Basic)`}
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {isPro && (
                        <>
                            <Button variant="outline" size="sm" onClick={() => setShowBulk(true)} className="gap-1">
                                <Upload className="w-3.5 h-3.5" />Bulk CSV
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleQrCode} className="gap-1">
                                <QrCode className="w-3.5 h-3.5" />QR Menu
                            </Button>
                        </>
                    )}
                    <Button size="sm" onClick={openAdd} disabled={atLimit} className="gap-1">
                        <Plus className="w-3.5 h-3.5" />{t("owner.menu.addItem")}
                    </Button>
                </div>
            </div>

            {atLimit && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                    <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span className="text-amber-700">Đã đạt giới hạn {menuLimit} món của gói Basic.</span>
                    <Button size="sm" variant="outline" className="text-amber-600 border-amber-300 ml-auto"
                        onClick={() => {}}>
                        Nâng cấp Pro
                    </Button>
                </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={menuQuery} onChange={(event) => setMenuQuery(event.target.value)} className="pl-9" placeholder="Tìm tên món, tiếng Anh hoặc mô tả..." />
                </div>
                <select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value as typeof availabilityFilter)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="all">Tất cả trạng thái</option>
                    <option value="available">Đang phục vụ</option>
                    <option value="unavailable">Tạm hết</option>
                </select>
                <select value={nutritionFilter} onChange={(event) => setNutritionFilter(event.target.value as typeof nutritionFilter)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="all">Tất cả dinh dưỡng</option>
                    <option value="complete">Đủ kcal để log</option>
                    <option value="missing">Thiếu kcal</option>
                </select>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[780px] text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                                    <th className="px-4 py-3">Món</th>
                                    <th className="px-4 py-3">Giá</th>
                                    <th className="px-4 py-3">Dinh dưỡng / khẩu phần</th>
                                    <th className="px-4 py-3">Trạng thái</th>
                                    <th className="px-4 py-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground"><UtensilsIcon className="mx-auto mb-2 h-10 w-10 opacity-30" />{t("owner.menu.noItems")} {t("owner.menu.addFirst")}</td></tr>
                                ) : filteredItems.length === 0 ? (
                                    <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Không có món phù hợp với bộ lọc.</td></tr>
                                ) : filteredItems.map((item) => (
                                    <tr key={item._id} className="border-b last:border-0 hover:bg-muted/40">
                                        <td className="px-4 py-3">
                                            <button type="button" onClick={() => setDetailItem(item)} className="flex max-w-[300px] items-center gap-3 text-left">
                                                {item.image_url ? <img src={item.image_url} alt="" className="h-11 w-11 rounded-lg object-cover" /> : <div className="grid h-11 w-11 place-items-center rounded-lg bg-muted text-muted-foreground"><UtensilsIcon className="h-5 w-5" /></div>}
                                                <span className="min-w-0">
                                                    <span className="block truncate font-semibold">{item.name_vi}</span>
                                                    {item.name_en && <span className="block truncate text-xs text-muted-foreground">{item.name_en}</span>}
                                                </span>
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 font-medium">{item.price != null ? `${item.price.toLocaleString("vi-VN")}₫` : "—"}</td>
                                        <td className="px-4 py-3">
                                            {item.energy_kcal ? (
                                                <div>
                                                    <p className="flex items-center gap-1 font-medium text-orange-500"><Flame className="h-3.5 w-3.5" />{item.energy_kcal} kcal</p>
                                                    <p className="mt-0.5 text-xs text-muted-foreground">P {item.protein ?? 0}g · C {item.glucid ?? 0}g · F {item.lipid ?? 0}g · Xơ {item.fiber ?? 0}g</p>
                                                    <p className="mt-0.5 text-xs text-muted-foreground">{item.serving_label || "1 khẩu phần"}{item.serving_weight_grams ? ` · ${item.serving_weight_grams}g` : ""}</p>
                                                </div>
                                            ) : <Badge variant="secondary">Chưa có kcal</Badge>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1.5">
                                                <Badge variant={item.is_available ? "default" : "secondary"}>{item.is_available ? "Đang phục vụ" : "Tạm hết"}</Badge>
                                                <Badge className={NUTRITION_STATUS[getNutritionStatus(item)].className}>{NUTRITION_STATUS[getNutritionStatus(item)].label}</Badge>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                <Button size="icon" variant="ghost" className="h-8 w-8" title="Xem chi tiết" onClick={() => setDetailItem(item)}><Eye className="h-4 w-4" /></Button>
                                                {isPro && <Button size="icon" variant="ghost" className="h-8 w-8" title="AI ước tính dinh dưỡng" onClick={() => handleAiNutrition(item._id)} disabled={aiLoading === item._id}>{aiLoading === item._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-purple-500" />}</Button>}
                                                <Button size="icon" variant="ghost" className="h-8 w-8" title="Sửa món" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title="Xóa món" onClick={() => handleDelete(item._id)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="border-t px-4 py-3 text-xs text-muted-foreground">Hiển thị {filteredItems.length}/{items.length} món. Chỉ món có kcal mới có thể được người dùng ghi vào nhật ký.</p>
                </CardContent>
            </Card>

            <Dialog open={!!detailItem} onOpenChange={(open) => { if (!open) setDetailItem(null); }}>
                <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                    {detailItem && (
                        <>
                            <DialogHeader>
                                <div className="flex items-start justify-between gap-3 pr-7">
                                    <div>
                                        <DialogTitle className="text-left text-xl">{detailItem.name_vi}</DialogTitle>
                                        {detailItem.name_en && <p className="mt-1 text-sm text-muted-foreground">{detailItem.name_en}</p>}
                                    </div>
                                    <div className="flex gap-1">
                                        {isPro && <Button size="icon" variant="outline" title="AI ước tính dinh dưỡng" onClick={() => handleAiNutrition(detailItem._id)} disabled={aiLoading === detailItem._id}>{aiLoading === detailItem._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-purple-500" />}</Button>}
                                        <Button size="icon" variant="outline" title="Sửa món" onClick={() => { setDetailItem(null); openEdit(detailItem); }}><Pencil className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            </DialogHeader>

                            {detailItem.image_url && <img src={detailItem.image_url} alt={detailItem.name_vi} className="h-52 w-full rounded-xl object-cover" />}
                            {detailItem.description && <p className="text-sm leading-6 text-muted-foreground">{detailItem.description}</p>}

                            {detailItem.ingredient_summary && (
                                <section className="rounded-xl border bg-muted/30 p-3">
                                    <p className="text-xs font-semibold text-muted-foreground">Thành phần chính</p>
                                    <p className="mt-1 text-sm">{detailItem.ingredient_summary}</p>
                                </section>
                            )}

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="rounded-xl bg-muted/60 p-3">
                                    <p className="text-xs text-muted-foreground">Giá bán</p>
                                    <p className="mt-1 text-lg font-bold">{detailItem.price != null ? `${detailItem.price.toLocaleString("vi-VN")}₫` : "Chưa cập nhật"}</p>
                                </div>
                                <div className="rounded-xl bg-muted/60 p-3">
                                    <p className="text-xs text-muted-foreground">Khẩu phần</p>
                                    <p className="mt-1 text-sm font-semibold">{detailItem.serving_label || "1 khẩu phần"}</p>
                                    {detailItem.serving_weight_grams && <p className="text-xs text-muted-foreground">{detailItem.serving_weight_grams}g</p>}
                                </div>
                                <div className="rounded-xl bg-muted/60 p-3">
                                    <p className="text-xs text-muted-foreground">Nhóm món</p>
                                    <p className="mt-1 text-sm font-semibold">{MENU_CATEGORIES.find((category) => category.value === detailItem.menu_category)?.label || "Món chính"}</p>
                                </div>
                                <div className="rounded-xl bg-muted/60 p-3">
                                    <p className="text-xs text-muted-foreground">Trạng thái</p>
                                    <div className="mt-1 flex flex-wrap gap-1.5"><Badge variant={detailItem.is_available ? "default" : "secondary"}>{detailItem.is_available ? "Đang phục vụ" : "Tạm hết"}</Badge><Badge className={NUTRITION_STATUS[getNutritionStatus(detailItem)].className}>{NUTRITION_STATUS[getNutritionStatus(detailItem)].label}</Badge></div>
                                </div>
                            </div>

                            <section>
                                <p className="mb-2 text-sm font-semibold">Dinh dưỡng mỗi khẩu phần</p>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                                    {[
                                        ["Năng lượng", detailItem.energy_kcal, "kcal", "bg-orange-500/10 text-orange-600 dark:text-orange-300"],
                                        ["Protein", detailItem.protein, "g", "bg-blue-500/10 text-blue-600 dark:text-blue-300"],
                                        ["Carbs", detailItem.glucid, "g", "bg-yellow-500/10 text-yellow-600 dark:text-yellow-300"],
                                        ["Fat", detailItem.lipid, "g", "bg-pink-500/10 text-pink-600 dark:text-pink-300"],
                                        ["Chất xơ", detailItem.fiber, "g", "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"],
                                    ].map(([label, value, unit, color]) => (
                                        <div key={String(label)} className={`rounded-xl p-3 ${color}`}>
                                            <p className="text-lg font-bold">{value ?? "—"}{value != null ? unit : ""}</p>
                                            <p className="text-[10px] opacity-75">{label}</p>
                                        </div>
                                    ))}
                                </div>
                                {!detailItem.energy_kcal && <p className="mt-3 text-xs text-amber-600 dark:text-amber-300">Bổ sung kcal để món này có thể xuất hiện như một lựa chọn log meal cho khách.</p>}
                            </section>

                            {Boolean(detailItem.dietary_tags?.length || detailItem.allergens?.length) && (
                                <section className="space-y-2">
                                    {detailItem.dietary_tags?.length ? <div><p className="text-xs font-semibold text-muted-foreground">Phù hợp chế độ ăn</p><div className="mt-1 flex flex-wrap gap-1.5">{detailItem.dietary_tags.map((tag) => <Badge key={tag} variant="secondary">{DIETARY_TAGS.find((item) => item.value === tag)?.label || tag}</Badge>)}</div></div> : null}
                                    {detailItem.allergens?.length ? <div><p className="text-xs font-semibold text-muted-foreground">Có thể chứa</p><div className="mt-1 flex flex-wrap gap-1.5">{detailItem.allergens.map((tag) => <Badge key={tag} className="bg-amber-500/15 text-amber-700 dark:text-amber-300">{ALLERGEN_TAGS.find((item) => item.value === tag)?.label || tag}</Badge>)}</div></div> : null}
                                </section>
                            )}

                            {detailItem.nutrition_source_reference && <p className="text-xs text-muted-foreground">Nguồn dinh dưỡng: {detailItem.nutrition_source_reference}</p>}
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Add/Edit Dialog */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editItem ? t("owner.menu.title") : t("owner.menu.addItem")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2 space-y-1.5">
                                <Label>Tên món (tiếng Việt) *</Label>
                                <Input value={form.name_vi} onChange={(e) => setForm((f) => ({ ...f, name_vi: e.target.value }))}
                                    placeholder="Cơm sườn, Phở bò..." />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Tên (tiếng Anh)</Label>
                                <Input value={form.name_en || ""} onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
                                    placeholder="Grilled pork rice..." />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Giá (₫)</Label>
                                <Input type="number" min={0} value={form.price ?? ""}
                                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value ? Number(e.target.value) : undefined }))}
                                    placeholder="45000" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Nhóm món</Label>
                                <select
                                    value={form.menu_category || "main"}
                                    onChange={(e) => setForm((f) => ({ ...f, menu_category: e.target.value as MenuItem["menu_category"] }))}
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    {MENU_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Khẩu phần *</Label>
                                <Input value={form.serving_label || ""} onChange={(e) => setForm((f) => ({ ...f, serving_label: e.target.value }))} placeholder="1 tô, 1 phần, 1 ly..." />
                            </div>
                            <div className="col-span-2 space-y-1.5">
                                <Label>Khối lượng khẩu phần (g, tuỳ chọn)</Label>
                                <Input type="number" min={0} value={form.serving_weight_grams ?? ""} onChange={(e) => setForm((f) => ({ ...f, serving_weight_grams: e.target.value ? Number(e.target.value) : undefined }))} placeholder="Ví dụ: 450" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Mô tả</Label>
                            <Textarea value={form.description || ""} rows={2}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Thành phần chính</Label>
                            <Textarea value={form.ingredient_summary || ""} rows={2}
                                onChange={(e) => setForm((f) => ({ ...f, ingredient_summary: e.target.value }))}
                                placeholder="Ví dụ: cơm gạo lứt, ức gà nướng, rau củ, sốt mè..." />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Từ khóa để khách tìm món</Label>
                            <Input
                                value={(form.search_keywords || []).join(", ")}
                                onChange={(e) => setForm((f) => ({ ...f, search_keywords: e.target.value.split(",").map((keyword) => keyword.trim()).filter(Boolean) }))}
                                placeholder="Ví dụ: cơm gà, chicken rice, eat clean"
                            />
                            <p className="text-xs text-muted-foreground">Ngăn cách bằng dấu phẩy. Giúp khách tìm đúng món khi log bữa ăn.</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Hình ảnh món ăn</Label>
                            <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) void handleImageFile(file);
                                }}
                            />

                            {form.image_url ? (
                                <div className="overflow-hidden rounded-xl border bg-muted/30">
                                    <div className="relative aspect-video bg-muted">
                                        <img src={form.image_url} alt={form.name_vi || "Ảnh món ăn"} className="h-full w-full object-cover" />
                                        <button
                                            type="button"
                                            aria-label="Xóa ảnh"
                                            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                                            onClick={() => setForm((f) => ({ ...f, image_url: "" }))}
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-2 p-3">
                                        <p className="text-xs text-muted-foreground">Ảnh này sẽ hiển thị trong menu quán.</p>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={imageUploading}
                                            onClick={() => imageInputRef.current?.click()}
                                        >
                                            {imageUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                                            Đổi ảnh
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    disabled={imageUploading}
                                    onClick={() => imageInputRef.current?.click()}
                                    className="flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-60"
                                >
                                    {imageUploading ? (
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    ) : (
                                        <ImagePlus className="h-7 w-7" />
                                    )}
                                    <span>{imageUploading ? "Đang upload ảnh..." : "Bấm để tải ảnh món ăn"}</span>
                                </button>
                            )}

                            <div className="space-y-1.5 rounded-xl border border-dashed bg-muted/20 p-3">
                                <Label className="text-xs text-muted-foreground">Hoặc dán URL hình ảnh</Label>
                                <Input
                                    value={form.image_url || ""}
                                    onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        {/* Nutrition */}
                        <div>
                            <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                Thông tin dinh dưỡng (mỗi khẩu phần)
                                {isPro && <Badge className="text-[10px] bg-purple-500">AI có thể ước tính sau khi tạo</Badge>}
                            </p>
                            <div className="grid grid-cols-3 gap-3">
                                <NutritionField label="Năng lượng" unit="kcal"
                                    value={form.energy_kcal}
                                    onChange={(v) => setForm((f) => ({ ...f, energy_kcal: v }))} />
                                <NutritionField label="Đạm (Protein)"
                                    value={form.protein}
                                    onChange={(v) => setForm((f) => ({ ...f, protein: v }))} />
                                <NutritionField label="Béo (Lipid)"
                                    value={form.lipid}
                                    onChange={(v) => setForm((f) => ({ ...f, lipid: v }))} />
                                <NutritionField label="Bột đường (Glucid)"
                                    value={form.glucid}
                                    onChange={(v) => setForm((f) => ({ ...f, glucid: v }))} />
                                <NutritionField label="Chất xơ (Fiber)"
                                    value={form.fiber}
                                    onChange={(v) => setForm((f) => ({ ...f, fiber: v }))} />
                            </div>
                        </div>

                        <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
                            <div>
                                <p className="text-sm font-medium">Nhãn dinh dưỡng & dị ứng</p>
                                <p className="text-xs text-muted-foreground">Thông tin này giúp CaloVie không gợi ý món không phù hợp với khách.</p>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Phù hợp chế độ ăn</Label>
                                <div className="flex flex-wrap gap-1.5">{DIETARY_TAGS.map((tag) => <Button key={tag.value} type="button" size="sm" variant={form.dietary_tags?.includes(tag.value) ? "default" : "outline"} className="h-7 px-2 text-xs" onClick={() => setForm((f) => ({ ...f, dietary_tags: toggleTag(f.dietary_tags, tag.value) }))}>{tag.label}</Button>)}</div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Có thể chứa chất gây dị ứng</Label>
                                <div className="flex flex-wrap gap-1.5">{ALLERGEN_TAGS.map((tag) => <Button key={tag.value} type="button" size="sm" variant={form.allergens?.includes(tag.value) ? "destructive" : "outline"} className="h-7 px-2 text-xs" onClick={() => setForm((f) => ({ ...f, allergens: toggleTag(f.allergens, tag.value) }))}>{tag.label}</Button>)}</div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Nguồn dữ liệu dinh dưỡng (tuỳ chọn)</Label>
                            <Input value={form.nutrition_source_reference || ""} onChange={(e) => setForm((f) => ({ ...f, nutrition_source_reference: e.target.value }))} placeholder="Ví dụ: công thức quán, nhãn nhà cung cấp..." />
                            <p className="text-xs text-muted-foreground">CaloVie hiển thị nguồn này cho mục đích minh bạch. Chỉ quản trị viên mới có thể xác minh dinh dưỡng.</p>
                        </div>

                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="available" checked={form.is_available}
                                onChange={(e) => setForm((f) => ({ ...f, is_available: e.target.checked }))} />
                            <Label htmlFor="available">Còn phục vụ</Label>
                        </div>

                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowForm(false)}>Huỷ</Button>
                        <Button onClick={handleSave} disabled={saving || imageUploading}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            {editItem ? " Lưu" : " Thêm"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Upload Dialog */}
            <Dialog open={showBulk} onOpenChange={setShowBulk}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>Bulk Upload CSV</DialogTitle></DialogHeader>
                    <div className="space-y-3 py-2">
                        <p className="text-sm text-muted-foreground">
                            Dán nội dung CSV vào đây. Cột bắt buộc: <code className="bg-muted px-1 rounded">name_vi</code>.
                            Cột tuỳ chọn: <code className="bg-muted px-1 rounded">name_en, price, description, energy_kcal, protein, lipid, glucid, fiber</code>
                        </p>
                        <Textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={8}
                            placeholder={`name_vi,price,energy_kcal\nCơm sườn,45000,480\nPhở bò,55000,420`}
                            className="font-mono text-xs" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBulk(false)}>Huỷ</Button>
                        <Button onClick={handleBulkUpload} disabled={bulkLoading || !csvText.trim()}>
                            {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                            Nhập CSV
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* QR Code Dialog */}
            <Dialog open={showQr} onOpenChange={setShowQr}>
                <DialogContent className="max-w-sm text-center">
                    <DialogHeader><DialogTitle>QR Code Menu</DialogTitle></DialogHeader>
                    {qrUrl && (
                        <div className="flex flex-col items-center gap-3 py-2">
                            <img src={qrUrl} alt="QR Code" className="w-56 h-56" />
                            <p className="text-xs text-muted-foreground">Quét để xem thực đơn quán trên CaloVie</p>
                            <a href={qrUrl} download={`qr-menu-${storeId}.png`}>
                                <Button size="sm" variant="outline">Tải xuống PNG</Button>
                            </a>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

// Placeholder icon
const UtensilsIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 10c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
    </svg>
);

export default OwnerMenu;
