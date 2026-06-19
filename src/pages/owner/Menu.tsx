import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
    Plus, Pencil, Trash2, Zap, Upload, QrCode, BadgeCheck,
    Sparkles, Loader2, Flame, Check, X, ChevronDown, ChevronUp,
    ImagePlus,
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
    image_url?: string;
    energy_kcal?: number;
    protein?: number;
    lipid?: number;
    glucid?: number;
    fiber?: number;
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
    image_url: "", energy_kcal: undefined, protein: undefined,
    lipid: undefined, glucid: undefined, fiber: undefined,
    nutrition_verified: false, is_available: true,
};

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
    const [expandedNutrition, setExpandedNutrition] = useState<string | null>(null);
    const [imageUploading, setImageUploading] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const isPro = store?.subscription_tier === "pro";
    const isBasic = !isPro;
    const menuLimit = 20;
    const atLimit = isBasic && items.length >= menuLimit;

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

            {/* Menu list */}
            <div className="space-y-3">
                {items.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <UtensilsIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>{t("owner.menu.noItems")} {t("owner.menu.addFirst")}</p>
                    </div>
                )}
                {items.map((item) => (
                    <Card key={item._id} className="overflow-hidden">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                {item.image_url && (
                                    <img src={item.image_url} alt={item.name_vi}
                                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-semibold">{item.name_vi}</p>
                                        {item.name_en && <p className="text-xs text-muted-foreground">{item.name_en}</p>}
                                        {item.nutrition_verified && (
                                            <Badge className="gap-1 text-[10px] bg-green-500">
                                                <BadgeCheck className="w-3 h-3" />Verified Nutrition
                                            </Badge>
                                        )}
                                        {!item.is_available && <Badge variant="secondary" className="text-[10px]">Hết</Badge>}
                                    </div>
                                    {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                        {item.price && <span className="font-medium text-foreground">{item.price.toLocaleString("vi-VN")}₫</span>}
                                        {item.energy_kcal && (
                                            <span className="flex items-center gap-0.5 text-orange-500">
                                                <Flame className="w-3 h-3" />{item.energy_kcal} kcal
                                            </span>
                                        )}
                                    </div>

                                    {/* Nutrition detail toggle */}
                                    {(item.protein || item.lipid || item.glucid) && (
                                        <button type="button"
                                            className="text-xs text-primary mt-1 flex items-center gap-0.5"
                                            onClick={() => setExpandedNutrition(expandedNutrition === item._id ? null : item._id)}>
                                            Dinh dưỡng
                                            {expandedNutrition === item._id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                        </button>
                                    )}
                                    {expandedNutrition === item._id && (
                                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                                            {item.protein  !== undefined && <span>Đạm: {item.protein}g</span>}
                                            {item.lipid    !== undefined && <span>Béo: {item.lipid}g</span>}
                                            {item.glucid   !== undefined && <span>Bột: {item.glucid}g</span>}
                                            {item.fiber    !== undefined && <span>Xơ: {item.fiber}g</span>}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {isPro && (
                                        <Button size="icon" variant="ghost" className="w-7 h-7"
                                            title="AI ước tính dinh dưỡng"
                                            onClick={() => handleAiNutrition(item._id)}
                                            disabled={aiLoading === item._id}>
                                            {aiLoading === item._id
                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                : <Sparkles className="w-3.5 h-3.5 text-purple-500" />}
                                        </Button>
                                    )}
                                    <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => openEdit(item)}>
                                        <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="w-7 h-7 text-red-500 hover:text-red-600"
                                        onClick={() => handleDelete(item._id)}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

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
                        <div className="space-y-1.5">
                            <Label>Mô tả</Label>
                            <Textarea value={form.description || ""} rows={2}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
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

                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="available" checked={form.is_available}
                                onChange={(e) => setForm((f) => ({ ...f, is_available: e.target.checked }))} />
                            <Label htmlFor="available">Còn phục vụ</Label>
                        </div>

                        {isPro && (
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="verified" checked={!!form.nutrition_verified}
                                    onChange={(e) => setForm((f) => ({ ...f, nutrition_verified: e.target.checked }))} />
                                <Label htmlFor="verified" className="flex items-center gap-1">
                                    <BadgeCheck className="w-3.5 h-3.5 text-green-500" />
                                    Badge "Verified Nutrition"
                                </Label>
                            </div>
                        )}
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
