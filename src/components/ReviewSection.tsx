import React, { useState, useEffect, useCallback } from "react";
import { Star, ThumbsUp, Pencil, Trash2, ImagePlus, X, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import { uploadFile } from "@/utils/cloudinary";
import api from "@/lib/api";
import { formatDistanceToNow, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReviewUser {
    _id: string;
    display_name: string;
    avatar_url?: string;
}

interface Review {
    _id: string;
    user: ReviewUser;
    rating: number;
    content?: string;
    images?: string[];
    helpful_count: number;
    is_helpful: boolean;
    is_own: boolean;
    created_at: string;
    updated_at: string;
}

// ── Star Rating Input ─────────────────────────────────────────────────────────

const StarInput: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => {
    const [hovered, setHovered] = useState(0);
    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
                <button
                    key={s}
                    type="button"
                    onClick={() => onChange(s)}
                    onMouseEnter={() => setHovered(s)}
                    onMouseLeave={() => setHovered(0)}
                    className="focus:outline-none"
                >
                    <Star
                        className={`w-6 h-6 transition-colors ${
                            s <= (hovered || value) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                        }`}
                    />
                </button>
            ))}
        </div>
    );
};

// ── Star Display ──────────────────────────────────────────────────────────────

const StarDisplay: React.FC<{ value: number; size?: "sm" | "md" }> = ({ value, size = "sm" }) => {
    const cls = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
                <Star
                    key={s}
                    className={`${cls} ${s <= Math.round(value) ? "fill-yellow-400 text-yellow-400" : "text-muted-200 fill-muted"}`}
                />
            ))}
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────

interface ReviewSectionProps {
    targetType: "recipe" | "store";
    targetId: string;
    averageRating?: number;
    ratingCount?: number;
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({
    targetType, targetId, averageRating = 0, ratingCount = 0,
}) => {
    const { user } = useAuthContext();
    const { toast } = useToast();

    const [reviews, setReviews] = useState<Review[]>([]);
    const [total, setTotal]     = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const offset = reviews.length;
    const LIMIT  = 10;

    // Form state
    const [rating, setRating]   = useState(0);
    const [content, setContent] = useState("");
    const [images, setImages]   = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving]   = useState(false);
    const [editId, setEditId]   = useState<string | null>(null);
    const imgInputRef = React.useRef<HTMLInputElement>(null);

    // ── Load reviews ──────────────────────────────────────────────────────────

    const loadReviews = useCallback(async (reset = false) => {
        if (reset) setLoading(true); else setLoadingMore(true);
        try {
            const res = await api.get("/reviews", {
                params: { target_type: targetType, target_id: targetId, limit: LIMIT, offset: reset ? 0 : offset },
            });
            const fresh: Review[] = res.data.data;
            setReviews(reset ? fresh : (prev) => [...prev, ...fresh]);
            setTotal(res.data.total);
        } catch {
            toast({ title: "Lỗi", description: "Không thể tải đánh giá", variant: "destructive" });
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [targetType, targetId, offset]);

    useEffect(() => { loadReviews(true); }, [targetType, targetId]);

    // ── Image upload ──────────────────────────────────────────────────────────

    const handleImageFiles = async (files: FileList) => {
        const toUpload = Array.from(files).slice(0, 3 - images.length);
        if (!toUpload.length) return;
        setUploading(true);
        try {
            const results = await Promise.all(toUpload.map((f) => uploadFile(f, "calocare/reviews")));
            setImages((prev) => [...prev, ...results.map((r) => r.url)]);
        } catch {
            toast({ title: "Upload lỗi", description: "Không thể upload ảnh", variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    // ── Submit review ─────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        if (!rating) { toast({ title: "Chọn số sao", variant: "destructive" }); return; }
        setSaving(true);
        try {
            await api.post("/reviews", { target_type: targetType, target_id: targetId, rating, content, images });
            toast({ title: "Đã gửi đánh giá!" });
            setRating(0); setContent(""); setImages([]); setEditId(null);
            await loadReviews(true);
        } catch {
            toast({ title: "Lỗi", description: "Không thể gửi đánh giá", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (review: Review) => {
        setEditId(review._id);
        setRating(review.rating);
        setContent(review.content ?? "");
        setImages(review.images ?? []);
    };

    const handleUpdate = async () => {
        if (!editId) return;
        setSaving(true);
        try {
            await api.put(`/reviews/${editId}`, { rating, content, images });
            toast({ title: "Đã cập nhật đánh giá" });
            setRating(0); setContent(""); setImages([]); setEditId(null);
            await loadReviews(true);
        } catch {
            toast({ title: "Lỗi", description: "Không thể cập nhật", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/reviews/${id}`);
            toast({ title: "Đã xóa đánh giá" });
            await loadReviews(true);
        } catch {
            toast({ title: "Lỗi", description: "Không thể xóa", variant: "destructive" });
        }
    };

    const handleHelpful = async (id: string) => {
        if (!user) return;
        try {
            const res = await api.post(`/reviews/${id}/helpful`);
            setReviews((prev) => prev.map((r) =>
                r._id === id ? { ...r, helpful_count: res.data.helpful_count, is_helpful: res.data.is_helpful } : r,
            ));
        } catch { /* silent */ }
    };

    const hasOwnReview = reviews.some((r) => r.is_own);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-3">
                <div className="text-center">
                    <p className="text-3xl font-bold text-foreground">{averageRating.toFixed(1)}</p>
                    <StarDisplay value={averageRating} size="md" />
                    <p className="text-xs text-muted-foreground mt-0.5">{ratingCount} đánh giá</p>
                </div>
                <div className="h-12 w-px bg-border" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {ratingCount === 0
                        ? "Chưa có đánh giá nào. Hãy là người đầu tiên!"
                        : `Dựa trên ${ratingCount} đánh giá từ cộng đồng CaloCare`}
                </p>
            </div>

            {/* Write review form (only if logged in and haven't reviewed yet) */}
            {user && (!hasOwnReview || editId) && (
                <div className="bg-muted/40 border border-border/50 rounded-2xl p-4 space-y-3">
                    <h4 className="text-sm font-semibold">{editId ? "Chỉnh sửa đánh giá" : "Viết đánh giá"}</h4>
                    <StarInput value={rating} onChange={setRating} />
                    <Textarea
                        rows={3}
                        placeholder="Chia sẻ trải nghiệm của bạn..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="resize-none text-sm"
                    />

                    {/* Image attachments */}
                    <div className="flex flex-wrap gap-2">
                        {images.map((url, i) => (
                            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted group">
                                <img src={url} alt="" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                >
                                    <X className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        ))}
                        {images.length < 3 && (
                            <button
                                type="button"
                                onClick={() => imgInputRef.current?.click()}
                                disabled={uploading}
                                className="w-16 h-16 rounded-lg border-2 border-dashed border-border hover:border-primary/40 flex items-center justify-center text-muted-foreground"
                            >
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                            </button>
                        )}
                        <input ref={imgInputRef} type="file" accept="image/*" multiple className="hidden"
                            onChange={(e) => e.target.files && handleImageFiles(e.target.files)} />
                    </div>

                    <div className="flex gap-2">
                        <Button size="sm" onClick={editId ? handleUpdate : handleSubmit} disabled={saving || !rating}>
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                            {editId ? "Cập nhật" : "Gửi đánh giá"}
                        </Button>
                        {editId && (
                            <Button size="sm" variant="ghost" onClick={() => { setEditId(null); setRating(0); setContent(""); setImages([]); }}>
                                Hủy
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Review list */}
            {loading ? (
                <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <div key={review._id} className="flex gap-3">
                            <Avatar className="w-9 h-9 flex-shrink-0">
                                <AvatarImage src={review.user.avatar_url} />
                                <AvatarFallback className="text-xs">{review.user.display_name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-semibold">{review.user.display_name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <StarDisplay value={review.rating} />
                                            <span className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(parseISO(review.created_at), { addSuffix: true, locale: vi })}
                                            </span>
                                        </div>
                                    </div>
                                    {review.is_own && (
                                        <div className="flex gap-1 flex-shrink-0">
                                            <Button variant="ghost" size="icon" className="w-7 h-7"
                                                onClick={() => handleEdit(review)}>
                                                <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive"
                                                onClick={() => handleDelete(review._id)}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                {review.content && (
                                    <p className="text-sm text-foreground mt-1.5 leading-relaxed">{review.content}</p>
                                )}
                                {review.images && review.images.length > 0 && (
                                    <div className="flex gap-1.5 mt-2">
                                        {review.images.map((img, i) => (
                                            <img key={i} src={img} alt="" className="w-16 h-16 rounded-lg object-cover" />
                                        ))}
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleHelpful(review._id)}
                                    className={`flex items-center gap-1.5 mt-2 text-xs transition-colors ${
                                        review.is_helpful ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    <ThumbsUp className={`w-3.5 h-3.5 ${review.is_helpful ? "fill-primary" : ""}`} />
                                    Hữu ích {review.helpful_count > 0 && `(${review.helpful_count})`}
                                </button>
                            </div>
                        </div>
                    ))}

                    {reviews.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">Chưa có đánh giá nào.</p>
                    )}

                    {reviews.length < total && (
                        <Button variant="ghost" size="sm" className="w-full text-muted-foreground"
                            onClick={() => loadReviews(false)} disabled={loadingMore}>
                            {loadingMore
                                ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                : <ChevronDown className="w-4 h-4 mr-2" />}
                            Xem thêm ({total - reviews.length} đánh giá)
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
};
