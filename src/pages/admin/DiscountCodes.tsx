// src/pages/admin/DiscountCodes.tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
    Plus,
    Pencil,
    Trash2,
    RefreshCw,
    Tag,
    ToggleLeft,
    ToggleRight,
    X,
    Zap,
    ZapOff,
} from "lucide-react";
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SystemDiscount {
    discount_pct: number;
    expires_at: string | null;
    is_active: boolean;
    applicable_plans: string[];
}

const EMPTY_FORM = {
    code: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: "",
    description: "",
    min_purchase: "",
    max_uses: "",
    starts_at: "",
    expires_at: "",
    is_active: true,
};

const DiscountCodes = () => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [codes, setCodes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState<{ open: boolean; mode: "create" | "edit"; code: any | null }>({
        open: false,
        mode: "create",
        code: null,
    });
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({
        open: false,
        id: null,
    });
    const [submitting, setSubmitting] = useState(false);

    // System-wide discount state
    const [sysDiscount, setSysDiscount] = useState<SystemDiscount | null>(null);
    const [sysDialog, setSysDialog] = useState(false);
    const [sysForm, setSysForm] = useState({ discount_pct: "", expires_at: "", applicable_plans: [] as string[] });
    const [sysSubmitting, setSysSubmitting] = useState(false);
    const [removeSysDialog, setRemoveSysDialog] = useState(false);

    useEffect(() => {
        fetchCodes();
        fetchSysDiscount();
    }, []);

    const fetchSysDiscount = async () => {
        try {
            const { data } = await api.get("/admin/system-discount");
            setSysDiscount(data);
        } catch {
            // non-critical
        }
    };

    const handleSetSysDiscount = async () => {
        const pct = Number(sysForm.discount_pct);
        if (!pct || pct <= 0 || pct > 100) {
            toast({ title: t("adminDiscount.systemDiscount.discountPct"), description: "1–100", variant: "destructive" });
            return;
        }
        setSysSubmitting(true);
        try {
            const { data } = await api.put("/admin/system-discount", {
                discount_pct: pct,
                expires_at: sysForm.expires_at || null,
                applicable_plans: sysForm.applicable_plans,
            });
            setSysDiscount(data);
            setSysDialog(false);
            toast({ title: t("adminDiscount.systemDiscount.setSuccess", { n: pct }) });
        } catch (err: any) {
            toast({ title: t("common.error"), description: err?.response?.data?.error, variant: "destructive" });
        } finally {
            setSysSubmitting(false);
        }
    };

    const handleRemoveSysDiscount = async () => {
        try {
            await api.delete("/admin/system-discount");
            setSysDiscount({ discount_pct: 0, expires_at: null, is_active: false });
            setRemoveSysDialog(false);
            toast({ title: t("adminDiscount.systemDiscount.removeSuccess") });
        } catch (err: any) {
            toast({ title: t("common.error"), description: err?.response?.data?.error, variant: "destructive" });
        }
    };

    const fetchCodes = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/discount-codes");
            setCodes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            toast({ title: "Lỗi tải dữ liệu", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setForm({ ...EMPTY_FORM });
        setDialog({ open: true, mode: "create", code: null });
    };

    const openEdit = (code: any) => {
        setForm({
            code: code.code || "",
            discount_type: code.discount_type || "percentage",
            discount_value: String(code.discount_value ?? ""),
            description: code.description || "",
            min_purchase: String(code.min_purchase ?? ""),
            max_uses: String(code.max_uses ?? ""),
            starts_at: code.starts_at ? code.starts_at.slice(0, 16) : "",
            expires_at: code.expires_at ? code.expires_at.slice(0, 16) : "",
            is_active: code.is_active !== false,
        });
        setDialog({ open: true, mode: "edit", code });
    };

    const handleSubmit = async () => {
        if (!form.code || !form.discount_value) {
            toast({ title: "Vui lòng điền đầy đủ thông tin bắt buộc", variant: "destructive" });
            return;
        }
        setSubmitting(true);
        const payload: Record<string, unknown> = {
            code: form.code.toUpperCase(),
            discount_type: form.discount_type,
            discount_value: Number(form.discount_value),
            is_active: form.is_active,
        };
        if (form.description) payload.description = form.description;
        if (form.min_purchase) payload.min_purchase = Number(form.min_purchase);
        if (form.max_uses) payload.max_uses = Number(form.max_uses);
        if (form.starts_at) payload.starts_at = new Date(form.starts_at).toISOString();
        if (form.expires_at) payload.expires_at = new Date(form.expires_at).toISOString();

        try {
            if (dialog.mode === "create") {
                await api.post("/discount-codes", payload);
                toast({ title: "Tạo mã giảm giá thành công" });
            } else {
                await api.put(`/discount-codes/${dialog.code._id}`, payload);
                toast({ title: "Cập nhật thành công" });
            }
            setDialog({ open: false, mode: "create", code: null });
            fetchCodes();
        } catch (err: any) {
            toast({
                title: "Lỗi",
                description: err?.response?.data?.error || "Vui lòng thử lại.",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteDialog.id) return;
        try {
            await api.delete(`/discount-codes/${deleteDialog.id}`);
            toast({ title: "Đã xóa mã giảm giá" });
            setDeleteDialog({ open: false, id: null });
            fetchCodes();
        } catch (err: any) {
            toast({
                title: "Lỗi",
                description: err?.response?.data?.error || "Vui lòng thử lại.",
                variant: "destructive",
            });
        }
    };

    const toggleActive = async (code: any) => {
        try {
            await api.put(`/discount-codes/${code._id}`, { is_active: !code.is_active });
            fetchCodes();
        } catch (err) {
            toast({ title: "Lỗi", variant: "destructive" });
        }
    };

    const formatDate = (date?: string) =>
        date ? new Date(date).toLocaleDateString("vi-VN") : "—";

    const isExpired = (code: any) =>
        code.expires_at && new Date(code.expires_at) < new Date();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">{t("adminDiscount.title")}</h1>
                    <p className="text-muted-foreground">{t("adminDiscount.subtitle")}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchCodes} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        {t("adminDiscount.refresh")}
                    </Button>
                    <Button onClick={openCreate}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t("adminDiscount.createNew")}
                    </Button>
                </div>
            </div>

            {/* ── System-wide discount card ─────────────────────────────────── */}
            <Card className={sysDiscount?.is_active ? "border-amber-400 bg-amber-50/40" : ""}>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                            {sysDiscount?.is_active
                                ? <Zap className="w-4 h-4 text-amber-500" />
                                : <ZapOff className="w-4 h-4 text-muted-foreground" />}
                            {t("adminDiscount.systemDiscount.sectionTitle")}
                        </CardTitle>
                        <div className="flex gap-2">
                            {sysDiscount?.is_active && (
                                <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => setRemoveSysDialog(true)}>
                                    <ZapOff className="w-3.5 h-3.5 mr-1.5" />
                                    {t("adminDiscount.systemDiscount.removeDiscount")}
                                </Button>
                            )}
                            <Button size="sm" onClick={() => { setSysForm({ discount_pct: String(sysDiscount?.discount_pct || ""), expires_at: sysDiscount?.expires_at ? new Date(sysDiscount.expires_at).toISOString().slice(0, 16) : "", applicable_plans: sysDiscount?.applicable_plans || [] }); setSysDialog(true); }}>
                                <Zap className="w-3.5 h-3.5 mr-1.5" />
                                {t("adminDiscount.systemDiscount.setDiscount")}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground mb-3">{t("adminDiscount.systemDiscount.sectionSub")}</p>
                    {sysDiscount?.is_active ? (
                        <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-amber-600">{sysDiscount.discount_pct}%</span>
                            <div>
                                <p className="text-sm font-semibold text-amber-800">
                                    {t("adminDiscount.systemDiscount.discountValue", { n: sysDiscount.discount_pct })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {sysDiscount.expires_at
                                        ? t("adminDiscount.systemDiscount.expiresAt", { date: new Date(sysDiscount.expires_at).toLocaleDateString("vi-VN") })
                                        : t("adminDiscount.systemDiscount.neverExpires")}
                                </p>
                                <p className="text-xs text-amber-700 mt-0.5">
                                    {sysDiscount.applicable_plans?.length > 0
                                        ? `Áp dụng: ${sysDiscount.applicable_plans.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")}`
                                        : "Áp dụng: Tất cả gói trả phí"}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">{t("adminDiscount.systemDiscount.noDiscount")}</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                        </div>
                    ) : codes.length === 0 ? (
                        <div className="text-center py-12">
                            <Tag className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                            <p className="text-muted-foreground">{t("adminDiscount.noCodesYet")}</p>
                            <Button onClick={openCreate} className="mt-4">
                                <Plus className="w-4 h-4 mr-2" /> {t("adminDiscount.createFirst")}
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="pb-3 font-medium">{t("adminDiscount.columns.code")}</th>
                                        <th className="pb-3 font-medium">{t("adminDiscount.columns.type")}</th>
                                        <th className="pb-3 font-medium">{t("adminDiscount.columns.value")}</th>
                                        <th className="pb-3 font-medium">{t("adminDiscount.columns.used")}</th>
                                        <th className="pb-3 font-medium">{t("adminDiscount.columns.validity")}</th>
                                        <th className="pb-3 font-medium">{t("adminDiscount.columns.status")}</th>
                                        <th className="pb-3 font-medium">{t("adminDiscount.columns.actions")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {codes.map((code) => (
                                        <tr key={code._id} className="border-b last:border-0 hover:bg-muted/30">
                                            <td className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                                        {code.code}
                                                    </span>
                                                </div>
                                                {code.description && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">{code.description}</p>
                                                )}
                                            </td>
                                            <td className="py-3 text-muted-foreground">
                                                {code.discount_type === "percentage" ? t("adminDiscount.typePercentage") : t("adminDiscount.typeFixed")}
                                            </td>
                                            <td className="py-3 font-medium">
                                                {code.discount_type === "percentage"
                                                    ? `${code.discount_value}%`
                                                    : `${(code.discount_value || 0).toLocaleString("vi-VN")}₫`}
                                            </td>
                                            <td className="py-3 text-muted-foreground">
                                                {code.used_count || 0}
                                                {code.max_uses ? ` / ${code.max_uses}` : ""}
                                            </td>
                                            <td className="py-3 text-xs text-muted-foreground">
                                                <div>
                                                    {code.starts_at && <p>Từ: {formatDate(code.starts_at)}</p>}
                                                    {code.expires_at && (
                                                        <p className={isExpired(code) ? "text-destructive" : ""}>
                                                            Đến: {formatDate(code.expires_at)}
                                                            {isExpired(code) && " (hết hạn)"}
                                                        </p>
                                                    )}
                                                    {!code.starts_at && !code.expires_at && "Không giới hạn"}
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleActive(code)}
                                                    className="flex items-center gap-1.5"
                                                >
                                                    {code.is_active ? (
                                                        <ToggleRight className="w-5 h-5 text-primary" />
                                                    ) : (
                                                        <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                                                    )}
                                                    <span className={`text-xs ${code.is_active ? "text-primary" : "text-muted-foreground"}`}>
                                                        {code.is_active ? t("adminDiscount.statusActive") : t("adminDiscount.statusOff")}
                                                    </span>
                                                </button>
                                            </td>
                                            <td className="py-3">
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => openEdit(code)}
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                        onClick={() => setDeleteDialog({ open: true, id: code._id })}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create / Edit Dialog */}
            <Dialog
                open={dialog.open}
                onOpenChange={(open) => setDialog({ ...dialog, open })}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {dialog.mode === "create" ? t("adminDiscount.createDialog") : t("adminDiscount.editDialog")}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>
                                    Mã <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    placeholder="SUMMER20"
                                    value={form.code}
                                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                    disabled={dialog.mode === "edit"}
                                    className="font-mono"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>
                                    Loại <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={form.discount_type}
                                    onValueChange={(v: "percentage" | "fixed") =>
                                        setForm({ ...form, discount_type: v })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">Phần trăm (%)</SelectItem>
                                        <SelectItem value="fixed">Cố định (₫)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>
                                    Giá trị{" "}
                                    {form.discount_type === "percentage" ? "(%)" : "(₫)"}{" "}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    type="number"
                                    placeholder={form.discount_type === "percentage" ? "20" : "50000"}
                                    value={form.discount_value}
                                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Số lần dùng tối đa</Label>
                                <Input
                                    type="number"
                                    placeholder="Không giới hạn"
                                    value={form.max_uses}
                                    onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Mô tả</Label>
                            <Input
                                placeholder="VD: Giảm 20% cho gói Premium"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label>Đơn hàng tối thiểu (₫)</Label>
                            <Input
                                type="number"
                                placeholder="Không yêu cầu"
                                value={form.min_purchase}
                                onChange={(e) => setForm({ ...form, min_purchase: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Ngày bắt đầu</Label>
                                <Input
                                    type="datetime-local"
                                    value={form.starts_at}
                                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Ngày hết hạn</Label>
                                <Input
                                    type="datetime-local"
                                    value={form.expires_at}
                                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setForm({ ...form, is_active: !form.is_active })}
                                className="flex items-center gap-2"
                            >
                                {form.is_active ? (
                                    <ToggleRight className="w-6 h-6 text-primary" />
                                ) : (
                                    <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                                )}
                                <span className="text-sm">
                                    {form.is_active ? "Kích hoạt ngay" : "Tắt (không dùng được)"}
                                </span>
                            </button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDialog({ ...dialog, open: false })}
                            disabled={submitting}
                        >
                            <X className="w-4 h-4 mr-2" /> {t("common.cancel")}
                        </Button>
                        <Button onClick={handleSubmit} disabled={submitting}>
                            {submitting ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4 mr-2" />
                            )}
                            {dialog.mode === "create" ? t("adminDiscount.createBtn") : t("adminDiscount.saveBtn")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <AlertDialog
                open={deleteDialog.open}
                onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("adminDiscount.deleteTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("adminDiscount.deleteDesc")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {t("common.delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* System Discount — Set/Edit Dialog */}
            <Dialog open={sysDialog} onOpenChange={setSysDialog}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-500" />
                            {t("adminDiscount.systemDiscount.dialogTitle")}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>
                                {t("adminDiscount.systemDiscount.discountPct")}{" "}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                type="number"
                                min={1}
                                max={100}
                                placeholder={t("adminDiscount.systemDiscount.discountPctPlaceholder")}
                                value={sysForm.discount_pct}
                                onChange={(e) => setSysForm({ ...sysForm, discount_pct: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t("adminDiscount.systemDiscount.expiryDate")}</Label>
                            <Input
                                type="datetime-local"
                                value={sysForm.expires_at}
                                onChange={(e) => setSysForm({ ...sysForm, expires_at: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t("adminDiscount.systemDiscount.applicablePlansLabel")}</Label>
                            <div className="flex gap-4">
                                {["premium", "family"].map((plan) => (
                                    <label key={plan} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 accent-amber-500"
                                            checked={sysForm.applicable_plans.includes(plan)}
                                            onChange={(e) => {
                                                const updated = e.target.checked
                                                    ? [...sysForm.applicable_plans, plan]
                                                    : sysForm.applicable_plans.filter((p) => p !== plan);
                                                setSysForm({ ...sysForm, applicable_plans: updated });
                                            }}
                                        />
                                        <span className="text-sm capitalize font-medium">{plan}</span>
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground">{t("adminDiscount.systemDiscount.applicablePlansHint")}</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSysDialog(false)} disabled={sysSubmitting}>
                            <X className="w-4 h-4 mr-2" /> {t("common.cancel")}
                        </Button>
                        <Button onClick={handleSetSysDiscount} disabled={sysSubmitting} className="bg-amber-500 hover:bg-amber-600">
                            {sysSubmitting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                            {t("adminDiscount.systemDiscount.saveBtn")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* System Discount — Remove Confirm */}
            <AlertDialog open={removeSysDialog} onOpenChange={setRemoveSysDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("adminDiscount.systemDiscount.removeConfirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("adminDiscount.systemDiscount.removeConfirmDesc")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveSysDiscount}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {t("adminDiscount.systemDiscount.removeDiscount")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default DiscountCodes;
