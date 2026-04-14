// src/pages/admin/DiscountCodes.tsx
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

    useEffect(() => {
        fetchCodes();
    }, []);

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
                    <h1 className="text-2xl font-bold">Mã giảm giá</h1>
                    <p className="text-muted-foreground">Tạo và quản lý mã khuyến mãi</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchCodes} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        Làm mới
                    </Button>
                    <Button onClick={openCreate}>
                        <Plus className="w-4 h-4 mr-2" />
                        Tạo mã mới
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                        </div>
                    ) : codes.length === 0 ? (
                        <div className="text-center py-12">
                            <Tag className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                            <p className="text-muted-foreground">Chưa có mã giảm giá nào</p>
                            <Button onClick={openCreate} className="mt-4">
                                <Plus className="w-4 h-4 mr-2" /> Tạo mã đầu tiên
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="pb-3 font-medium">Mã</th>
                                        <th className="pb-3 font-medium">Loại</th>
                                        <th className="pb-3 font-medium">Giá trị</th>
                                        <th className="pb-3 font-medium">Đã dùng</th>
                                        <th className="pb-3 font-medium">Hiệu lực</th>
                                        <th className="pb-3 font-medium">Trạng thái</th>
                                        <th className="pb-3 font-medium">Thao tác</th>
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
                                                {code.discount_type === "percentage" ? "Phần trăm" : "Cố định"}
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
                                                        {code.is_active ? "Hoạt động" : "Tắt"}
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
                            {dialog.mode === "create" ? "Tạo mã giảm giá mới" : "Chỉnh sửa mã giảm giá"}
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
                            <X className="w-4 h-4 mr-2" /> Hủy
                        </Button>
                        <Button onClick={handleSubmit} disabled={submitting}>
                            {submitting ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4 mr-2" />
                            )}
                            {dialog.mode === "create" ? "Tạo mã" : "Lưu thay đổi"}
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
                        <AlertDialogTitle>Xóa mã giảm giá?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Hành động này không thể hoàn tác. Mã giảm giá sẽ bị xóa vĩnh viễn.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Xóa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default DiscountCodes;
