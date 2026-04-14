import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    MapPin,
    Store as StoreIcon,
    Crown,
    ChevronDown,
    ChevronUp,
    X,
    Check,
    Copy,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MenuItem {
    _id?: string;
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
    is_available: boolean;
}

interface StoreAPI {
    _id: string;
    name: string;
    description?: string;
    address: string;
    city?: string;
    phone?: string;
    website?: string;
    category?: string;
    images: string[];
    menu_items: MenuItem[];
    subscription_tier: "basic" | "pro";
    subscription_expires_at?: string;
    is_verified: boolean;
    is_active: boolean;
    views_count: number;
}

interface StoreForm {
    id?: string;
    name: string;
    description: string;
    address: string;
    city: string;
    phone: string;
    website: string;
    category: string;
}

const emptyStoreForm: StoreForm = {
    name: "",
    description: "",
    address: "",
    city: "",
    phone: "",
    website: "",
    category: "restaurant",
};

interface MenuForm {
    name_vi: string;
    name_en: string;
    price: string;
    description: string;
    image_url: string;
    energy_kcal: string;
    protein: string;
    lipid: string;
    glucid: string;
    fiber: string;
}

const emptyMenuForm: MenuForm = {
    name_vi: "",
    name_en: "",
    price: "",
    description: "",
    image_url: "",
    energy_kcal: "",
    protein: "",
    lipid: "",
    glucid: "",
    fiber: "",
};

const CATEGORIES = [
    { value: "restaurant", label: "Nhà hàng" },
    { value: "cafe", label: "Cà phê" },
    { value: "bakery", label: "Bánh & Tiệm ngọt" },
    { value: "fastfood", label: "Đồ ăn nhanh" },
    { value: "other", label: "Khác" },
];

const PAYMENT_METHODS = [
    { id: "momo", label: "MoMo" },
    { id: "bank_transfer", label: "Chuyển khoản" },
];

type ViewMode = "list" | "store_form" | "menu_manage";

// ── Component ─────────────────────────────────────────────────────────────────

const StoreRegistration: React.FC = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [stores, setStores] = useState<StoreAPI[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [activeStore, setActiveStore] = useState<StoreAPI | null>(null);

    // Store form
    const [storeForm, setStoreForm] = useState<StoreForm>(emptyStoreForm);
    const [storeSaving, setStoreSaving] = useState(false);

    // Menu management
    const [showMenuForm, setShowMenuForm] = useState(false);
    const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
    const [menuForm, setMenuForm] = useState<MenuForm>(emptyMenuForm);
    const [menuSaving, setMenuSaving] = useState(false);
    const [expandedItem, setExpandedItem] = useState<string | null>(null);

    // Delete
    const [deleteTarget, setDeleteTarget] = useState<{ type: "store" | "menu"; id: string } | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Store Pro upgrade
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [upgradeStore, setUpgradeStore] = useState<StoreAPI | null>(null);
    const [upgradeMonths, setUpgradeMonths] = useState(1);
    const [upgradeMethod, setUpgradeMethod] = useState("bank_transfer");
    const [upgrading, setUpgrading] = useState(false);
    const [upgradeResult, setUpgradeResult] = useState<any>(null);

    // ── Data ────────────────────────────────────────────────────────────────

    const fetchStores = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get("/stores/mine");
            setStores(res.data?.data || []);
        } catch {
            toast({ title: "Lỗi", description: "Không thể tải danh sách cửa hàng", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchStores(); }, [fetchStores]);

    // ── Store CRUD ───────────────────────────────────────────────────────────

    const openCreateStore = () => {
        setStoreForm(emptyStoreForm);
        setViewMode("store_form");
    };

    const openEditStore = (store: StoreAPI) => {
        setStoreForm({
            id: store._id,
            name: store.name,
            description: store.description || "",
            address: store.address,
            city: store.city || "",
            phone: store.phone || "",
            website: store.website || "",
            category: store.category || "restaurant",
        });
        setViewMode("store_form");
    };

    const handleSaveStore = async () => {
        if (!storeForm.name.trim() || !storeForm.address.trim()) {
            toast({ title: "Thiếu thông tin", description: "Tên và địa chỉ là bắt buộc", variant: "destructive" });
            return;
        }
        setStoreSaving(true);
        try {
            const payload = {
                name: storeForm.name.trim(),
                description: storeForm.description.trim() || undefined,
                address: storeForm.address.trim(),
                city: storeForm.city.trim() || undefined,
                phone: storeForm.phone.trim() || undefined,
                website: storeForm.website.trim() || undefined,
                category: storeForm.category,
            };

            if (storeForm.id) {
                await api.put(`/stores/${storeForm.id}`, payload);
                toast({ title: "Đã lưu", description: "Thông tin cửa hàng đã được cập nhật." });
            } else {
                await api.post("/stores", payload);
                toast({ title: "Đã đăng ký", description: "Cửa hàng của bạn đã được tạo thành công!" });
            }
            await fetchStores();
            setViewMode("list");
        } catch {
            toast({ title: "Lỗi", description: "Không thể lưu cửa hàng", variant: "destructive" });
        } finally {
            setStoreSaving(false);
        }
    };

    const handleDeleteStore = async () => {
        if (!deleteTarget || deleteTarget.type !== "store") return;
        setDeleting(true);
        try {
            await api.delete(`/stores/${deleteTarget.id}`);
            toast({ title: "Đã xóa", description: "Cửa hàng đã bị xóa." });
            setDeleteTarget(null);
            await fetchStores();
        } catch {
            toast({ title: "Lỗi", description: "Không thể xóa cửa hàng", variant: "destructive" });
        } finally {
            setDeleting(false);
        }
    };

    // ── Menu CRUD ────────────────────────────────────────────────────────────

    const openAddMenuItem = () => {
        setEditingMenuItem(null);
        setMenuForm(emptyMenuForm);
        setShowMenuForm(true);
    };

    const openEditMenuItem = (item: MenuItem) => {
        setEditingMenuItem(item);
        setMenuForm({
            name_vi: item.name_vi,
            name_en: item.name_en || "",
            price: item.price?.toString() || "",
            description: item.description || "",
            image_url: item.image_url || "",
            energy_kcal: item.energy_kcal?.toString() || "",
            protein: item.protein?.toString() || "",
            lipid: item.lipid?.toString() || "",
            glucid: item.glucid?.toString() || "",
            fiber: item.fiber?.toString() || "",
        });
        setShowMenuForm(true);
    };

    const handleSaveMenuItem = async () => {
        if (!activeStore || !menuForm.name_vi.trim()) return;
        setMenuSaving(true);
        try {
            const payload = {
                name_vi: menuForm.name_vi.trim(),
                name_en: menuForm.name_en.trim() || undefined,
                price: menuForm.price ? parseFloat(menuForm.price) : undefined,
                description: menuForm.description.trim() || undefined,
                image_url: menuForm.image_url.trim() || undefined,
                energy_kcal: menuForm.energy_kcal ? parseFloat(menuForm.energy_kcal) : undefined,
                protein: menuForm.protein ? parseFloat(menuForm.protein) : undefined,
                lipid: menuForm.lipid ? parseFloat(menuForm.lipid) : undefined,
                glucid: menuForm.glucid ? parseFloat(menuForm.glucid) : undefined,
                fiber: menuForm.fiber ? parseFloat(menuForm.fiber) : undefined,
                is_available: true,
            };

            if (editingMenuItem?._id) {
                const res = await api.put(`/stores/${activeStore._id}/menu/${editingMenuItem._id}`, payload);
                setActiveStore(res.data);
            } else {
                const res = await api.post(`/stores/${activeStore._id}/menu`, payload);
                setActiveStore(res.data);
            }
            setShowMenuForm(false);
            await fetchStores();
        } catch (err: any) {
            if (err?.response?.data?.error === "menu_limit_reached") {
                toast({
                    title: "Đã đạt giới hạn menu",
                    description: err.response.data.message,
                    variant: "destructive",
                });
            } else {
                toast({ title: "Lỗi", description: "Không thể lưu món", variant: "destructive" });
            }
        } finally {
            setMenuSaving(false);
        }
    };

    const handleDeleteMenuItem = async () => {
        if (!deleteTarget || deleteTarget.type !== "menu" || !activeStore) return;
        setDeleting(true);
        try {
            const res = await api.delete(`/stores/${activeStore._id}/menu/${deleteTarget.id}`);
            setActiveStore(res.data as any);
            setDeleteTarget(null);
            await fetchStores();
            toast({ title: "Đã xóa", description: "Món ăn đã được xóa." });
        } catch {
            toast({ title: "Lỗi", description: "Không thể xóa món", variant: "destructive" });
        } finally {
            setDeleting(false);
        }
    };

    // ── Store Pro upgrade ────────────────────────────────────────────────────

    const openUpgrade = (store: StoreAPI) => {
        setUpgradeStore(store);
        setUpgradeMonths(1);
        setUpgradeMethod("bank_transfer");
        setUpgradeResult(null);
        setShowUpgrade(true);
    };

    const handleUpgrade = async () => {
        if (!upgradeStore) return;
        setUpgrading(true);
        try {
            const res = await api.post(`/stores/${upgradeStore._id}/upgrade`, {
                duration_months: upgradeMonths,
                payment_method: upgradeMethod,
            });
            setUpgradeResult(res.data);
        } catch {
            toast({ title: "Lỗi", description: "Không thể tạo đơn nâng cấp", variant: "destructive" });
        } finally {
            setUpgrading(false);
        }
    };

    const copyText = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Đã sao chép" });
    };

    // ── Render: Menu manage view ─────────────────────────────────────────────

    if (viewMode === "menu_manage" && activeStore) {
        const isBasic = activeStore.subscription_tier === "basic";
        const menuCount = activeStore.menu_items?.length || 0;

        return (
            <div className="min-h-screen bg-gray-50 pb-24">
                <div className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => { setViewMode("list"); setActiveStore(null); }}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="font-semibold text-base">{activeStore.name}</h1>
                        <p className="text-xs text-muted-foreground">{menuCount} món{isBasic ? ` / 20 (Basic)` : ""}</p>
                    </div>
                    <Button size="sm" onClick={openAddMenuItem}>
                        <Plus className="w-4 h-4 mr-1" /> Thêm món
                    </Button>
                </div>

                <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
                    {/* Upgrade banner for basic */}
                    {isBasic && (
                        <Card className="border-primary/30 bg-primary/5">
                            <CardContent className="pt-3 pb-3 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-foreground">Nâng cấp Store Pro</p>
                                    <p className="text-xs text-primary">Menu không giới hạn + Analytics + QR Menu</p>
                                </div>
                                <Button size="sm" onClick={() => openUpgrade(activeStore)}>
                                    <Crown className="w-3 h-3 mr-1" /> 49k/tháng
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {menuCount === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground text-sm">Chưa có món nào.</p>
                            <Button className="mt-3" onClick={openAddMenuItem}>
                                <Plus className="w-4 h-4 mr-1" /> Thêm món đầu tiên
                            </Button>
                        </div>
                    ) : (
                        activeStore.menu_items.map((item) => (
                            <Card key={item._id}>
                                <CardContent className="pt-3 pb-3">
                                    <div className="flex items-start gap-2">
                                        {item.image_url && (
                                            <img src={item.image_url} alt={item.name_vi} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium truncate">{item.name_vi}</p>
                                                {!item.is_available && (
                                                    <Badge variant="secondary" className="text-xs">Hết</Badge>
                                                )}
                                            </div>
                                            {item.price && (
                                                <p className="text-xs text-foreground font-medium">
                                                    {item.price.toLocaleString("vi-VN")}₫
                                                </p>
                                            )}
                                            {item.energy_kcal && (
                                                <p className="text-xs text-muted-foreground">{item.energy_kcal} kcal/100g</p>
                                            )}
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpandedItem(expandedItem === item._id ? null : item._id!)}>
                                                {expandedItem === item._id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditMenuItem(item)}>
                                                <Pencil className="w-3 h-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => setDeleteTarget({ type: "menu", id: item._id! })}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    {expandedItem === item._id && (
                                        <div className="mt-2 pt-2 border-t text-xs text-muted-foreground space-y-1">
                                            {item.description && <p>{item.description}</p>}
                                            {(item.protein || item.lipid || item.glucid) && (
                                                <p>P: {item.protein || 0}g · F: {item.lipid || 0}g · C: {item.glucid || 0}g · Fiber: {item.fiber || 0}g</p>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* Menu item form dialog */}
                <Dialog open={showMenuForm} onOpenChange={setShowMenuForm}>
                    <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingMenuItem ? "Sửa món" : "Thêm món"}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 py-1">
                            <div>
                                <Label className="text-xs">Tên món (Tiếng Việt) *</Label>
                                <Input className="mt-1" value={menuForm.name_vi} onChange={(e) => setMenuForm({ ...menuForm, name_vi: e.target.value })} placeholder="Phở bò..." />
                            </div>
                            <div>
                                <Label className="text-xs">Tên món (Tiếng Anh)</Label>
                                <Input className="mt-1" value={menuForm.name_en} onChange={(e) => setMenuForm({ ...menuForm, name_en: e.target.value })} placeholder="Beef Pho..." />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-xs">Giá (₫)</Label>
                                    <Input type="number" min={0} className="mt-1" value={menuForm.price} onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })} placeholder="45000" />
                                </div>
                                <div>
                                    <Label className="text-xs">Calories (kcal/100g)</Label>
                                    <Input type="number" min={0} className="mt-1" value={menuForm.energy_kcal} onChange={(e) => setMenuForm({ ...menuForm, energy_kcal: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs">Mô tả</Label>
                                <Textarea rows={2} className="mt-1" value={menuForm.description} onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })} />
                            </div>
                            <div>
                                <Label className="text-xs">Ảnh (URL)</Label>
                                <Input className="mt-1" value={menuForm.image_url} onChange={(e) => setMenuForm({ ...menuForm, image_url: e.target.value })} placeholder="https://..." />
                            </div>
                            <p className="text-xs font-medium text-gray-500">Dinh dưỡng per 100g</p>
                            <div className="grid grid-cols-3 gap-2">
                                {(["protein", "lipid", "glucid", "fiber"] as const).map((field) => (
                                    <div key={field}>
                                        <Label className="text-xs capitalize">{field === "glucid" ? "Carbs" : field === "lipid" ? "Fat" : field} (g)</Label>
                                        <Input type="number" min={0} step={0.1} className="mt-1" value={menuForm[field]} onChange={(e) => setMenuForm({ ...menuForm, [field]: e.target.value })} />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowMenuForm(false)}>Hủy</Button>
                            <Button onClick={handleSaveMenuItem} disabled={menuSaving || !menuForm.name_vi.trim()}>
                                {menuSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lưu"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete confirmation */}
                <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Xóa món?</DialogTitle></DialogHeader>
                        <p className="text-sm text-muted-foreground">Bạn có chắc muốn xóa món này không?</p>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Hủy</Button>
                            <Button variant="destructive" onClick={handleDeleteMenuItem} disabled={deleting}>
                                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xóa"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    // ── Render: Store form view ──────────────────────────────────────────────

    if (viewMode === "store_form") {
        return (
            <div className="min-h-screen bg-gray-50 pb-24">
                <div className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => setViewMode("list")}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="font-semibold text-lg flex-1">
                        {storeForm.id ? "Chỉnh sửa cửa hàng" : "Đăng ký cửa hàng"}
                    </h1>
                    <Button size="sm" onClick={handleSaveStore} disabled={storeSaving}>
                        {storeSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lưu"}
                    </Button>
                </div>

                <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
                    <Card>
                        <CardContent className="pt-4 space-y-3">
                            <div>
                                <Label className="text-xs">Tên cửa hàng *</Label>
                                <Input className="mt-1" value={storeForm.name} onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })} placeholder="Phở Hà Nội..." />
                            </div>
                            <div>
                                <Label className="text-xs">Mô tả</Label>
                                <Textarea rows={2} className="mt-1" value={storeForm.description} onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })} placeholder="Chuyên các món ăn truyền thống..." />
                            </div>
                            <div>
                                <Label className="text-xs">Loại hình</Label>
                                <Select value={storeForm.category} onValueChange={(v) => setStoreForm({ ...storeForm, category: v })}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map((c) => (
                                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs">Địa chỉ *</Label>
                                <Input className="mt-1" value={storeForm.address} onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })} placeholder="123 Nguyễn Huệ, Q.1..." />
                            </div>
                            <div>
                                <Label className="text-xs">Thành phố</Label>
                                <Input className="mt-1" value={storeForm.city} onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })} placeholder="Hà Nội, TP. Hồ Chí Minh..." />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-xs">Số điện thoại</Label>
                                    <Input className="mt-1" value={storeForm.phone} onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })} placeholder="0901..." />
                                </div>
                                <div>
                                    <Label className="text-xs">Website</Label>
                                    <Input className="mt-1" value={storeForm.website} onChange={(e) => setStoreForm({ ...storeForm, website: e.target.value })} placeholder="https://..." />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Free tier note */}
                    {!storeForm.id && (
                        <Card className="border-primary/20 bg-primary/5">
                            <CardContent className="pt-3 pb-3">
                                <p className="text-sm font-medium text-foreground">Store Basic — Miễn phí</p>
                                <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                    <li className="flex items-center gap-1"><Check className="w-3 h-3 text-primary" /> Hiển thị trên bản đồ</li>
                                    <li className="flex items-center gap-1"><Check className="w-3 h-3 text-primary" /> Menu tối đa 20 món</li>
                                    <li className="flex items-center gap-1"><Check className="w-3 h-3 text-primary" /> Nhận & đọc review</li>
                                    <li className="flex items-center gap-1"><Check className="w-3 h-3 text-primary" /> Analytics cơ bản</li>
                                </ul>
                                <p className="text-xs text-primary mt-2">Nâng cấp Store Pro 49k/tháng để mở khóa tất cả tính năng.</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        );
    }

    // ── Render: List view ────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <div className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="font-semibold text-lg flex-1">Cửa hàng của tôi</h1>
                <Button size="sm" onClick={openCreateStore}>
                    <Plus className="w-4 h-4 mr-1" /> Đăng ký
                </Button>
            </div>

            <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : stores.length === 0 ? (
                    <div className="text-center py-16">
                        <StoreIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-muted-foreground text-sm">Bạn chưa có cửa hàng nào.</p>
                        <p className="text-xs text-muted-foreground mt-1">Đăng ký miễn phí để hiển thị trên bản đồ CaloCare!</p>
                        <Button className="mt-4" onClick={openCreateStore}>
                            <Plus className="w-4 h-4 mr-1" /> Đăng ký cửa hàng
                        </Button>
                    </div>
                ) : (
                    stores.map((store) => (
                        <Card key={store._id}>
                            <CardContent className="pt-4 pb-4">
                                <div className="flex items-start gap-3">
                                    {store.images?.[0] ? (
                                        <img src={store.images[0]} alt={store.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                            <StoreIcon className="w-8 h-8 text-gray-400" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-semibold text-sm">{store.name}</p>
                                            {store.is_verified && (
                                                <Badge className="bg-primary/10 text-primary text-xs">Đã xác minh</Badge>
                                            )}
                                            <Badge className={`text-xs ${store.subscription_tier === "pro" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                                {store.subscription_tier === "pro" ? "Store Pro" : "Basic"}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                                            <MapPin className="w-3 h-3" />
                                            <span className="truncate">{store.address}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {store.menu_items?.length || 0} món · {store.views_count} lượt xem
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 mt-3">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1 text-xs"
                                        onClick={() => { setActiveStore(store); setViewMode("menu_manage"); }}
                                    >
                                        Quản lý menu
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs"
                                        onClick={() => openEditStore(store)}
                                    >
                                        <Pencil className="w-3 h-3" />
                                    </Button>
                                    {store.subscription_tier === "basic" && (
                                        <Button
                                            size="sm"
                                            className="text-xs"
                                            onClick={() => openUpgrade(store)}
                                        >
                                            <Crown className="w-3 h-3 mr-1" /> Pro
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-red-400 text-xs"
                                        onClick={() => setDeleteTarget({ type: "store", id: store._id })}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Delete store confirmation */}
            <Dialog open={deleteTarget?.type === "store"} onOpenChange={() => setDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Xóa cửa hàng?</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">Cửa hàng sẽ bị ẩn khỏi bản đồ. Dữ liệu vẫn có thể khôi phục.</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>Hủy</Button>
                        <Button variant="destructive" onClick={handleDeleteStore} disabled={deleting}>
                            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xóa"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Store Pro upgrade dialog */}
            <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{upgradeResult ? "Hướng dẫn thanh toán" : "Nâng cấp Store Pro"}</DialogTitle>
                    </DialogHeader>

                    {!upgradeResult ? (
                        <div className="space-y-4">
                            <div className="bg-primary/5 rounded-lg p-3 text-sm border border-primary/20">
                                <p className="font-medium text-foreground">Store Pro — 49.000₫/tháng</p>
                                <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary flex-shrink-0" /> Menu không giới hạn</li>
                                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary flex-shrink-0" /> Analytics chi tiết + heatmap</li>
                                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary flex-shrink-0" /> Promoted listing (ưu tiên hiển thị)</li>
                                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary flex-shrink-0" /> QR Code menu + Phản hồi review</li>
                                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary flex-shrink-0" /> Badge Verified Nutrition</li>
                                </ul>
                            </div>
                            <div>
                                <Label className="text-xs">Thời hạn</Label>
                                <div className="flex gap-2 mt-1">
                                    {[1, 3, 6, 12].map((m) => (
                                        <button type="button" key={m} onClick={() => setUpgradeMonths(m)}
                                            className={`flex-1 rounded-lg p-2 text-xs border text-center transition-colors ${upgradeMonths === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                                            {m}th
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs">Thanh toán</Label>
                                <div className="flex gap-2 mt-1">
                                    {PAYMENT_METHODS.map((m) => (
                                        <button type="button" key={m.id} onClick={() => setUpgradeMethod(m.id)}
                                            className={`flex-1 rounded-lg p-2 text-xs border text-center transition-colors ${upgradeMethod === m.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t">
                                <span className="text-sm font-medium">Tổng</span>
                                <span className="text-lg font-bold text-primary">
                                    {(49000 * upgradeMonths).toLocaleString("vi-VN")}₫
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="bg-green-50 rounded-lg p-3 text-center">
                                <p className="text-sm font-semibold text-green-700">Đơn hàng đã được tạo!</p>
                                <p className="text-xs text-green-600 mt-1 font-mono font-bold">{upgradeResult.payment_instructions?.note}</p>
                            </div>
                            <div className="bg-muted/60 rounded-lg p-3 space-y-2">
                                <p className="text-xs text-muted-foreground leading-relaxed">{upgradeResult.payment_instructions?.message}</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-muted-foreground">Nội dung CK</p>
                                    <div className="flex items-center gap-1">
                                        <p className="text-xs font-mono font-bold">{upgradeResult.payment_instructions?.note}</p>
                                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => copyText(upgradeResult.payment_instructions?.note || "")}>
                                            <Copy className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-muted-foreground">Số tiền</p>
                                    <p className="text-sm font-bold text-primary">{upgradeResult.final_amount?.toLocaleString("vi-VN")}₫</p>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground text-center">Admin sẽ kích hoạt trong 1–4 giờ sau khi xác nhận.</p>
                        </div>
                    )}

                    <DialogFooter>
                        {!upgradeResult ? (
                            <>
                                <Button variant="outline" onClick={() => setShowUpgrade(false)}>Hủy</Button>
                                <Button onClick={handleUpgrade} disabled={upgrading}>
                                    {upgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Đặt hàng · ${(49000 * upgradeMonths).toLocaleString("vi-VN")}₫`}
                                </Button>
                            </>
                        ) : (
                            <Button className="w-full" onClick={() => setShowUpgrade(false)}>Đã hiểu</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default StoreRegistration;
