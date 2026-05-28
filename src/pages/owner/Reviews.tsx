import { useEffect, useState } from "react";
import {
    Star, MessageSquare, Send, ChevronDown, ChevronUp,
    Loader2, Zap, User,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";

interface ReviewItem {
    _id: string;
    user: { display_name?: string; avatar_url?: string };
    rating: number;
    content?: string;
    images?: string[];
    store_reply?: string;
    store_reply_at?: string;
    created_at: string;
}

const StarRow = ({ rating }: { rating: number }) => (
    <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s}
                className={`w-3.5 h-3.5 ${s <= rating ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted"}`} />
        ))}
    </div>
);

const OwnerReviews = () => {
    const { toast } = useToast();
    const { t } = useTranslation();

    const [store, setStore]         = useState<any>(null);
    const [reviews, setReviews]     = useState<ReviewItem[]>([]);
    const [loading, setLoading]     = useState(true);
    const [replyText, setReplyText] = useState<Record<string, string>>({});
    const [replyOpen, setReplyOpen] = useState<string | null>(null);
    const [replying, setReplying]   = useState<string | null>(null);

    const isPro = store?.subscription_tier === "pro";

    useEffect(() => {
        const load = async () => {
            try {
                const { data: storeData } = await api.get("/stores/mine");
                const s = storeData.data?.[0];
                setStore(s);
                if (s) {
                    const { data: rv } = await api.get("/reviews", {
                        params: { target_type: "store", target_id: s._id, limit: 50 },
                    });
                    setReviews(rv.data || []);
                }
            } catch { /* ignore */ }
            finally { setLoading(false); }
        };
        load();
    }, []);

    const handleReply = async (reviewId: string) => {
        const text = replyText[reviewId]?.trim();
        if (!text) return;
        setReplying(reviewId);
        try {
            await api.post(`/reviews/${reviewId}/reply`, { reply: text });
            setReviews((prev) =>
                prev.map((r) => r._id === reviewId
                    ? { ...r, store_reply: text, store_reply_at: new Date().toISOString() }
                    : r),
            );
            setReplyText((p) => ({ ...p, [reviewId]: "" }));
            setReplyOpen(null);
            toast({ title: "Đã phản hồi" });
        } catch (err: any) {
            toast({ title: "Lỗi", description: err.response?.data?.message, variant: "destructive" });
        } finally {
            setReplying(null);
        }
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    const avg = reviews.length
        ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
        : "—";

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Đánh giá</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <StarRow rating={Math.round(Number(avg))} />
                        <span className="font-semibold">{avg}</span>
                        <span className="text-muted-foreground text-sm">({reviews.length} đánh giá)</span>
                    </div>
                </div>
                {!isPro && (
                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                        <Zap className="w-3 h-3" /> Phản hồi cần Pro
                    </Badge>
                )}
            </div>

            {reviews.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>{t("owner.reviews.noReviews")}</p>
                </div>
            )}

            <div className="space-y-4">
                {reviews.map((review) => (
                    <Card key={review._id}>
                        <CardContent className="p-4 space-y-3">
                            {/* Review header */}
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    {review.user?.avatar_url
                                        ? <img src={review.user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                        : <User className="w-4 h-4 text-primary" />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-medium text-sm">{review.user?.display_name || "Ẩn danh"}</p>
                                        <StarRow rating={review.rating} />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(review.created_at).toLocaleDateString("vi-VN")}
                                    </p>
                                </div>
                            </div>

                            {review.content && (
                                <p className="text-sm text-muted-foreground">{review.content}</p>
                            )}

                            {review.images && review.images.length > 0 && (
                                <div className="flex gap-2 flex-wrap">
                                    {review.images.map((img, i) => (
                                        <img key={i} src={img} alt="" className="w-20 h-20 rounded-lg object-cover" />
                                    ))}
                                </div>
                            )}

                            {/* Store reply */}
                            {review.store_reply && (
                                <div className="mt-2 pl-3 border-l-2 border-primary/30 bg-primary/5 rounded-r-lg p-2">
                                    <p className="text-xs font-semibold text-primary mb-0.5">Phản hồi của quán:</p>
                                    <p className="text-sm">{review.store_reply}</p>
                                    {review.store_reply_at && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {new Date(review.store_reply_at).toLocaleDateString("vi-VN")}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Reply input (Pro) */}
                            {isPro && !review.store_reply && (
                                <div>
                                    {replyOpen === review._id ? (
                                        <div className="space-y-2">
                                            <Textarea
                                                value={replyText[review._id] || ""}
                                                onChange={(e) => setReplyText((p) => ({ ...p, [review._id]: e.target.value }))}
                                                placeholder="Phản hồi khách hàng một cách chuyên nghiệp..."
                                                rows={3}
                                                className="text-sm"
                                            />
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={() => handleReply(review._id)}
                                                    disabled={replying === review._id || !replyText[review._id]?.trim()}>
                                                    {replying === review._id
                                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                                                        : <Send className="w-3.5 h-3.5 mr-1" />}
                                                    Gửi
                                                </Button>
                                                <Button size="sm" variant="ghost"
                                                    onClick={() => setReplyOpen(null)}>Huỷ</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button size="sm" variant="outline" className="gap-1"
                                            onClick={() => setReplyOpen(review._id)}>
                                            <MessageSquare className="w-3.5 h-3.5" />Phản hồi
                                        </Button>
                                    )}
                                </div>
                            )}

                            {/* Pro gate */}
                            {!isPro && !review.store_reply && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Zap className="w-3 h-3 text-amber-500" />
                                    Nâng cấp Store Pro để phản hồi đánh giá công khai
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default OwnerReviews;
