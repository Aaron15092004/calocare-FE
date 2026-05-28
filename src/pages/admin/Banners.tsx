import React, { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { uploadFile } from "@/utils/cloudinary";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
    GripVertical, Image, Upload, Loader2, X, Link2, Type,
} from "lucide-react";

const GRADIENT_PRESETS = [
    { label: "Violet",  value: "from-violet-600 to-purple-700" },
    { label: "Emerald", value: "from-emerald-500 to-teal-600" },
    { label: "Amber",   value: "from-amber-500 to-orange-600" },
    { label: "Blue",    value: "from-blue-500 to-indigo-600" },
    { label: "Rose",    value: "from-rose-500 to-pink-600" },
    { label: "Slate",   value: "from-slate-600 to-gray-700" },
];

const emptyForm = {
    title: "",
    subtitle: "",
    image_url: "",
    link_url: "",
    cta_text: "Xem ngay",
    bg_gradient: "from-violet-600 to-purple-700",
    sort_order: 0,
    show_text: true,
};

/* ── Single image upload field ─────────────────────────────────────── */
const ImageUploadField: React.FC<{
    value: string;
    onChange: (url: string) => void;
}> = ({ value, onChange }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [tab, setTab] = useState<"upload" | "url">("upload");

    const handleFile = async (file: File) => {
        setUploading(true);
        try {
            const result = await uploadFile(file, "calocare/banners");
            onChange(result.url);
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) handleFile(file);
    };

    return (
        <div className="space-y-2">
            <Label className="text-xs">Hình nền banner (tuỳ chọn)</Label>

            {/* Tab switcher */}
            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                <button
                    type="button"
                    onClick={() => setTab("upload")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 transition-colors ${tab === "upload" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                    <Upload className="w-3 h-3" /> Upload ảnh
                </button>
                <button
                    type="button"
                    onClick={() => setTab("url")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 transition-colors ${tab === "url" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                    <Link2 className="w-3 h-3" /> Dán URL
                </button>
            </div>

            {tab === "upload" ? (
                <>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                    />
                    {value ? (
                        /* Preview with remove button */
                        <div className="relative group rounded-xl overflow-hidden border border-border">
                            <img src={value} alt="Banner preview" className="w-full h-24 object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                <button
                                    type="button"
                                    onClick={() => inputRef.current?.click()}
                                    className="bg-white/90 text-foreground text-xs font-medium px-2.5 py-1 rounded-lg flex items-center gap-1"
                                >
                                    <Upload className="w-3 h-3" /> Đổi ảnh
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onChange("")}
                                    className="bg-red-500 text-white text-xs font-medium px-2.5 py-1 rounded-lg flex items-center gap-1"
                                >
                                    <X className="w-3 h-3" /> Xoá
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Drop zone */
                        <button
                            type="button"
                            disabled={uploading}
                            onClick={() => inputRef.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            className="w-full h-24 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                                    <span className="text-xs text-muted-foreground">Đang upload...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-5 h-5 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">Click hoặc kéo thả ảnh vào đây</span>
                                </>
                            )}
                        </button>
                    )}
                </>
            ) : (
                <div className="space-y-1.5">
                    <Input
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="https://..."
                        className="text-xs"
                    />
                    {value && (
                        <img src={value} alt="" className="w-full h-16 object-cover rounded-lg border border-border" onError={() => {}} />
                    )}
                </div>
            )}
        </div>
    );
};

/* ── Main component ─────────────────────────────────────────────────── */
const Banners: React.FC = () => {
    const [banners, setBanners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchBanners(); }, []);

    const fetchBanners = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/admin/banners");
            setBanners(data);
        } finally {
            setLoading(false);
        }
    };

    const openNew = () => {
        setEditing(null);
        setForm(emptyForm);
        setOpen(true);
    };

    const openEdit = (b: any) => {
        setEditing(b);
        setForm({
            title:       b.title,
            subtitle:    b.subtitle || "",
            image_url:   b.image_url || "",
            link_url:    b.link_url || "",
            cta_text:    b.cta_text || "Xem ngay",
            bg_gradient: b.bg_gradient || "from-violet-600 to-purple-700",
            sort_order:  b.sort_order ?? 0,
            show_text:   b.show_text !== false,
        });
        setOpen(true);
    };

    const handleSave = async () => {
        if (!form.title.trim() && form.show_text) return;
        if (!form.image_url && !form.show_text) return; // image-only mode needs an image
        setSaving(true);
        try {
            if (editing) {
                await api.put(`/admin/banners/${editing._id}`, form);
            } else {
                await api.post("/admin/banners", form);
            }
            setOpen(false);
            fetchBanners();
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (b: any) => {
        await api.put(`/admin/banners/${b._id}`, { is_active: !b.is_active });
        fetchBanners();
    };

    const deleteBanner = async (id: string) => {
        if (!confirm("Xóa banner này?")) return;
        await api.delete(`/admin/banners/${id}`);
        fetchBanners();
    };

    /* ── Preview ── */
    const gradientClass = form.bg_gradient?.startsWith("from-")
        ? `bg-gradient-to-br ${form.bg_gradient}`
        : "bg-gradient-to-br from-violet-600 to-purple-700";

    const previewStyle: React.CSSProperties = form.image_url
        ? { backgroundImage: `url(${form.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
        : {};

    const canSave = form.show_text
        ? form.title.trim().length > 0
        : form.image_url.length > 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Banners</h1>
                    <p className="text-muted-foreground">Quản lý banner hiển thị trên trang chủ</p>
                </div>
                <Button onClick={openNew}>
                    <Plus className="w-4 h-4 mr-2" /> Thêm banner
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                        </div>
                    ) : banners.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Image className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Chưa có banner nào. Thêm banner đầu tiên!</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {banners.map((b) => {
                                const gc = b.bg_gradient?.startsWith("from-")
                                    ? `bg-gradient-to-br ${b.bg_gradient}`
                                    : "bg-gradient-to-br from-violet-600 to-purple-700";
                                return (
                                    <div key={b._id} className="flex items-center gap-4 px-4 py-3">
                                        <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 cursor-grab" />

                                        {/* Preview swatch */}
                                        <div
                                            className={`w-16 h-10 rounded-lg shrink-0 overflow-hidden ${b.image_url ? "" : gc}`}
                                            style={b.image_url
                                                ? { backgroundImage: `url(${b.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                                                : undefined}
                                        >
                                            {!b.image_url && (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <span className="text-white text-[8px] font-bold px-1 text-center leading-tight">
                                                        {b.title.slice(0, 12)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate">{b.title}</p>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                {b.show_text === false && (
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Ảnh thuần</span>
                                                )}
                                                {b.link_url && (
                                                    <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                                                        {b.link_url}
                                                    </span>
                                                )}
                                                <span className="text-xs text-muted-foreground">
                                                    #{b.sort_order}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                                            b.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                                        }`}>
                                            {b.is_active ? "Active" : "Hidden"}
                                        </span>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Button variant="ghost" size="icon" className="h-8 w-8"
                                                title={b.is_active ? "Ẩn" : "Hiện"}
                                                onClick={() => toggleActive(b)}>
                                                {b.is_active
                                                    ? <ToggleRight className="w-4 h-4 text-green-600" />
                                                    : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(b)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon"
                                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => deleteBanner(b._id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Create / Edit dialog ────────────────────────────────────── */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Sửa banner" : "Thêm banner mới"}</DialogTitle>
                    </DialogHeader>

                    {/* Live preview */}
                    <div
                        className={`relative overflow-hidden rounded-xl min-h-[100px] ${!form.image_url ? gradientClass : ""}`}
                        style={previewStyle}
                    >
                        {/* Decorative bubbles (gradient only) */}
                        {!form.image_url && (
                            <>
                                <div className="pointer-events-none absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/10" />
                                <div className="pointer-events-none absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/10" />
                            </>
                        )}

                        {/* Scrim — only when image present AND show_text is on */}
                        {form.image_url && form.show_text && (
                            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                        )}

                        {/* Text overlay — only when show_text is on */}
                        {form.show_text && (
                            <div className="relative p-4 flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-bold text-sm line-clamp-1">
                                        {form.title || "Tiêu đề banner"}
                                    </p>
                                    {form.subtitle && (
                                        <p className="text-white/75 text-xs mt-0.5 line-clamp-2">{form.subtitle}</p>
                                    )}
                                    {form.cta_text && (
                                        <div className="mt-2 inline-block bg-white/25 text-white text-xs font-semibold px-2.5 py-1 rounded-lg">
                                            {form.cta_text}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Image-only mode: show placeholder text when no image yet */}
                        {!form.show_text && !form.image_url && (
                            <div className="relative p-4 flex items-center justify-center min-h-[100px]">
                                <p className="text-white/60 text-xs text-center">Chế độ ảnh thuần — upload ảnh bên dưới để xem trước</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 mt-1">
                        {/* show_text toggle */}
                        <div className="flex items-center justify-between rounded-lg border border-border p-3">
                            <div className="flex items-center gap-2.5">
                                <Type className="w-4 h-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">Hiển thị chữ lên banner</p>
                                    <p className="text-xs text-muted-foreground">
                                        {form.show_text
                                            ? "Tiêu đề, mô tả và nút CTA sẽ được in lên ảnh"
                                            : "Chỉ hiển thị ảnh — không chèn chữ hay scrim"}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setForm({ ...form, show_text: !form.show_text })}
                                className="shrink-0"
                            >
                                {form.show_text
                                    ? <ToggleRight className="w-8 h-8 text-primary" />
                                    : <ToggleLeft className="w-8 h-8 text-muted-foreground" />}
                            </button>
                        </div>

                        {/* Image upload */}
                        <ImageUploadField
                            value={form.image_url}
                            onChange={(url) => setForm({ ...form, image_url: url })}
                        />

                        {/* Text fields — only shown when show_text is on */}
                        {form.show_text && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <Label className="text-xs">Tiêu đề *</Label>
                                    <Input
                                        value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        placeholder="VD: Khuyến mãi tháng 5"
                                        className="mt-1"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-xs">Mô tả phụ</Label>
                                    <Input
                                        value={form.subtitle}
                                        onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                                        placeholder="VD: Giảm 30% gói Premium"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Text nút CTA</Label>
                                    <Input
                                        value={form.cta_text}
                                        onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
                                        placeholder="Xem ngay"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Thứ tự hiển thị</Label>
                                    <Input
                                        type="number"
                                        value={form.sort_order}
                                        onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Sort order — shown in image-only mode as well */}
                        {!form.show_text && (
                            <div>
                                <Label className="text-xs">Thứ tự hiển thị</Label>
                                <Input
                                    type="number"
                                    value={form.sort_order}
                                    onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                                    className="mt-1"
                                />
                            </div>
                        )}

                        {/* Link */}
                        <div>
                            <Label className="text-xs">Link khi click</Label>
                            <Input
                                value={form.link_url}
                                onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                                placeholder="/subscription hoặc https://..."
                                className="mt-1"
                            />
                        </div>

                        {/* Gradient picker — only when no image and text mode */}
                        {!form.image_url && form.show_text && (
                            <div>
                                <Label className="text-xs mb-2 block">Màu nền</Label>
                                <div className="flex flex-wrap gap-2">
                                    {GRADIENT_PRESETS.map((g) => (
                                        <button
                                            key={g.value}
                                            type="button"
                                            title={g.label}
                                            className={`w-8 h-8 rounded-lg bg-gradient-to-br ${g.value} ring-2 ring-offset-1 transition-all ${
                                                form.bg_gradient === g.value ? "ring-primary" : "ring-transparent"
                                            }`}
                                            onClick={() => setForm({ ...form, bg_gradient: g.value })}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Validation hint */}
                        {!canSave && (
                            <p className="text-xs text-destructive">
                                {form.show_text
                                    ? "Vui lòng nhập tiêu đề banner."
                                    : "Chế độ ảnh thuần cần upload ảnh trước."}
                            </p>
                        )}

                        <div className="flex gap-2 pt-1">
                            <Button className="flex-1" onClick={handleSave} disabled={saving || !canSave}>
                                {saving ? "Đang lưu..." : editing ? "Cập nhật" : "Tạo banner"}
                            </Button>
                            <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Banners;
