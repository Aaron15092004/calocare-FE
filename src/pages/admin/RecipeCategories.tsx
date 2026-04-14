// src/pages/admin/RecipeCategories.tsx
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
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
    GripVertical,
    X,
    Save,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
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
    name_vi: "",
    name_en: "",
    sort_order: "0",
};

const RecipeCategories = () => {
    const { toast } = useToast();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState<{ open: boolean; mode: "create" | "edit"; cat: any | null }>({
        open: false,
        mode: "create",
        cat: null,
    });
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({
        open: false,
        id: null,
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/recipe-categories");
            setCategories(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            toast({ title: "Lỗi tải dữ liệu", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setForm({ ...EMPTY_FORM, sort_order: String(categories.length) });
        setDialog({ open: true, mode: "create", cat: null });
    };

    const openEdit = (cat: any) => {
        setForm({
            name_vi: cat.name_vi || "",
            name_en: cat.name_en || "",
            sort_order: String(cat.sort_order ?? 0),
        });
        setDialog({ open: true, mode: "edit", cat });
    };

    const handleSubmit = async () => {
        if (!form.name_vi.trim()) {
            toast({ title: "Vui lòng nhập tên danh mục (tiếng Việt)", variant: "destructive" });
            return;
        }
        setSubmitting(true);
        const payload: Record<string, unknown> = {
            name_vi: form.name_vi.trim(),
            sort_order: Number(form.sort_order) || 0,
        };
        if (form.name_en.trim()) payload.name_en = form.name_en.trim();

        try {
            if (dialog.mode === "create") {
                await api.post("/recipe-categories", payload);
                toast({ title: "Tạo danh mục thành công" });
            } else {
                await api.put(`/recipe-categories/${dialog.cat._id}`, payload);
                toast({ title: "Cập nhật thành công" });
            }
            setDialog({ open: false, mode: "create", cat: null });
            fetchCategories();
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
            await api.delete(`/recipe-categories/${deleteDialog.id}`);
            toast({ title: "Đã xóa danh mục" });
            setDeleteDialog({ open: false, id: null });
            fetchCategories();
        } catch (err: any) {
            toast({
                title: "Lỗi",
                description: err?.response?.data?.error || "Vui lòng thử lại.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Danh mục công thức</h1>
                    <p className="text-muted-foreground">
                        Quản lý danh mục phân loại công thức nấu ăn
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchCategories} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        Làm mới
                    </Button>
                    <Button onClick={openCreate}>
                        <Plus className="w-4 h-4 mr-2" />
                        Thêm danh mục
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="text-center py-12">
                            <Tag className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                            <p className="text-muted-foreground">Chưa có danh mục nào</p>
                            <Button onClick={openCreate} className="mt-4">
                                <Plus className="w-4 h-4 mr-2" /> Tạo danh mục đầu tiên
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {categories.map((cat) => (
                                <div
                                    key={cat._id}
                                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                                >
                                    <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <Tag className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium">{cat.name_vi}</p>
                                        {cat.name_en && (
                                            <p className="text-xs text-muted-foreground">{cat.name_en}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <span className="text-xs text-muted-foreground mr-2">
                                            #{cat.sort_order ?? 0}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => openEdit(cat)}
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => setDeleteDialog({ open: true, id: cat._id })}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create / Edit Dialog */}
            <Dialog
                open={dialog.open}
                onOpenChange={(open) => setDialog({ ...dialog, open })}
            >
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>
                            {dialog.mode === "create" ? "Thêm danh mục mới" : "Chỉnh sửa danh mục"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>
                                Tên danh mục (tiếng Việt){" "}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                placeholder="VD: Món chính"
                                value={form.name_vi}
                                onChange={(e) => setForm({ ...form, name_vi: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Tên danh mục (tiếng Anh)</Label>
                            <Input
                                placeholder="VD: Main Dishes"
                                value={form.name_en}
                                onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Thứ tự sắp xếp</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={form.sort_order}
                                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">Số nhỏ hơn hiển thị trước</p>
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
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            {dialog.mode === "create" ? "Tạo danh mục" : "Lưu thay đổi"}
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
                        <AlertDialogTitle>Xóa danh mục?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Hành động này không thể hoàn tác. Các công thức thuộc danh mục này sẽ không còn được phân loại.
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

export default RecipeCategories;
