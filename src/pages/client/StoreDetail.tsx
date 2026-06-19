import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    BadgeCheck,
    ExternalLink,
    Flame,
    Globe,
    Loader2,
    MapPin,
    Phone,
    ShoppingBag,
    Star,
    UtensilsCrossed,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { ReviewSection } from "@/components/ReviewSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/api";

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
    is_available: boolean;
}

interface StoreDetailAPI {
    _id: string;
    name: string;
    description?: string;
    address: string;
    city?: string;
    phone?: string;
    website?: string;
    category?: string;
    images?: string[];
    menu_items?: MenuItem[];
    subscription_tier?: "basic" | "pro";
    is_verified?: boolean;
    views_count?: number;
    average_rating?: number;
    rating_count?: number;
    google_maps_url?: string;
}

const formatVnd = (amount?: number) =>
    amount ? `${Math.round(amount).toLocaleString("vi-VN")}₫` : "Hỏi quán";

const normalizeExternalUrl = (url?: string) => {
    if (!url?.trim()) return "";
    const trimmed = url.trim();
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const StarRow: React.FC<{ rating: number; count: number }> = ({ rating, count }) => (
    <div className="flex items-center gap-1.5">
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
                <Star
                    key={s}
                    className={`h-3.5 w-3.5 ${
                        s <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted"
                    }`}
                />
            ))}
        </div>
        <span className="text-xs font-semibold">{rating > 0 ? rating.toFixed(1) : "Mới"}</span>
        {count > 0 && <span className="text-xs text-muted-foreground">({count})</span>}
    </div>
);

const StoreDetail: React.FC = () => {
    const { storeId } = useParams();
    const navigate = useNavigate();
    const [store, setStore] = useState<StoreDetailAPI | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!storeId) return;
        let mounted = true;
        setLoading(true);
        setError("");

        api.get<StoreDetailAPI>(`/stores/${storeId}`)
            .then((res) => {
                if (mounted) setStore(res.data);
            })
            .catch(() => {
                if (mounted) setError("Không mở được thông tin quán. Bạn thử lại sau nhé.");
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [storeId]);

    const availableMenu = useMemo(
        () => (store?.menu_items || []).filter((item) => item.is_available),
        [store?.menu_items],
    );
    const orderUrl = normalizeExternalUrl(store?.website);

    if (loading) {
        return (
            <div className="calovie-ios-surface min-h-screen pb-nav-safe">
                <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl">
                    <div className="flex h-16 items-center gap-3 px-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <p className="font-semibold">Đang mở quán...</p>
                    </div>
                </header>
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
                <BottomNav />
            </div>
        );
    }

    if (error || !store) {
        return (
            <div className="calovie-ios-surface min-h-screen pb-nav-safe">
                <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl">
                    <div className="flex h-16 items-center gap-3 px-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <p className="font-semibold">Quán ăn</p>
                    </div>
                </header>
                <main className="mx-auto max-w-lg px-5 py-16 text-center">
                    <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-primary/10">
                        <UtensilsCrossed className="h-8 w-8 text-primary" />
                    </div>
                    <p className="font-semibold text-foreground">{error || "Không tìm thấy quán"}</p>
                    <Button className="mt-5" onClick={() => navigate("/nearby")}>Quay lại danh sách</Button>
                </main>
                <BottomNav />
            </div>
        );
    }

    return (
        <div className="calovie-ios-surface min-h-screen pb-nav-safe text-foreground">
            <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl">
                <div className="flex h-16 items-center gap-3 px-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{store.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{store.address}</p>
                    </div>
                    {orderUrl && (
                        <Button size="sm" onClick={() => window.open(orderUrl, "_blank", "noopener,noreferrer")}>
                            Đặt ngay
                        </Button>
                    )}
                </div>
            </header>

            <main className="mx-auto max-w-lg space-y-4 px-5 py-4">
                <section className="overflow-hidden rounded-[2rem] bg-card shadow-ios-sm ring-1 ring-border/60">
                    <div className="relative aspect-[4/3] bg-muted">
                        {store.images?.[0] ? (
                            <img src={store.images[0]} alt={store.name} className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary/12 to-emerald-100/70">
                                <UtensilsCrossed className="h-14 w-14 text-primary" />
                                <p className="text-sm font-semibold text-primary">Menu CaloVie</p>
                            </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 text-white">
                            <div className="flex flex-wrap items-center gap-2">
                                {store.is_verified && (
                                    <Badge className="bg-white/20 text-white backdrop-blur">
                                        <BadgeCheck className="mr-1 h-3.5 w-3.5" />
                                        Xác minh
                                    </Badge>
                                )}
                                {store.subscription_tier === "pro" && (
                                    <Badge className="bg-primary text-primary-foreground">Đối tác nổi bật</Badge>
                                )}
                            </div>
                            <h1 className="mt-3 text-2xl font-extrabold leading-tight">{store.name}</h1>
                        </div>
                    </div>

                    <div className="space-y-4 p-5">
                        <div className="flex items-center justify-between gap-3">
                            <StarRow rating={store.average_rating ?? 0} count={store.rating_count ?? 0} />
                            <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                                {availableMenu.length} món
                            </span>
                        </div>

                        {store.description && (
                            <p className="text-sm leading-6 text-muted-foreground">{store.description}</p>
                        )}

                        <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-start gap-2">
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                <span>{store.address}</span>
                            </div>
                            {store.phone && (
                                <a href={`tel:${store.phone}`} className="flex items-center gap-2 hover:text-primary">
                                    <Phone className="h-4 w-4 text-primary" />
                                    {store.phone}
                                </a>
                            )}
                            {store.website && (
                                <a href={orderUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-primary">
                                    <Globe className="h-4 w-4 text-primary" />
                                    Website đặt món
                                </a>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {orderUrl ? (
                                <Button className="gap-2" onClick={() => window.open(orderUrl, "_blank", "noopener,noreferrer")}>
                                    <ShoppingBag className="h-4 w-4" />
                                    Đặt ngay
                                </Button>
                            ) : (
                                <Button className="gap-2" disabled>
                                    <ShoppingBag className="h-4 w-4" />
                                    Chưa có link
                                </Button>
                            )}
                            {store.google_maps_url ? (
                                <Button variant="outline" className="gap-2" onClick={() => window.open(store.google_maps_url, "_blank", "noopener,noreferrer")}>
                                    <MapPin className="h-4 w-4" />
                                    Chỉ đường
                                </Button>
                            ) : (
                                <Button variant="outline" className="gap-2" disabled>
                                    <MapPin className="h-4 w-4" />
                                    Chỉ đường
                                </Button>
                            )}
                        </div>
                    </div>
                </section>

                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-extrabold">Menu hôm nay</h2>
                        <span className="text-xs font-medium text-muted-foreground">{availableMenu.length} món có sẵn</span>
                    </div>

                    {availableMenu.length === 0 ? (
                        <Card>
                            <CardContent className="p-6 text-center">
                                <UtensilsCrossed className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
                                <p className="text-sm font-semibold">Quán chưa cập nhật menu</p>
                                <p className="mt-1 text-xs text-muted-foreground">Bạn có thể đặt qua website hoặc gọi quán để hỏi món hôm nay.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        availableMenu.map((item) => (
                            <Card key={item._id} className="overflow-hidden">
                                <CardContent className="flex gap-3 p-3">
                                    {item.image_url ? (
                                        <img src={item.image_url} alt={item.name_vi} className="h-24 w-24 shrink-0 rounded-2xl object-cover" />
                                    ) : (
                                        <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-primary/10">
                                            <UtensilsCrossed className="h-8 w-8 text-primary" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="truncate font-bold">{item.name_vi}</p>
                                                {item.name_en && <p className="truncate text-xs text-muted-foreground">{item.name_en}</p>}
                                            </div>
                                            <span className="shrink-0 text-sm font-extrabold text-primary">{formatVnd(item.price)}</span>
                                        </div>
                                        {item.description && (
                                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.description}</p>
                                        )}
                                        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                                            {item.energy_kcal != null && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-1 text-orange-600">
                                                    <Flame className="h-3 w-3" />
                                                    {Math.round(item.energy_kcal)} kcal
                                                </span>
                                            )}
                                            {item.protein != null && <span className="rounded-full bg-blue-500/10 px-2 py-1 text-blue-600">P {item.protein}g</span>}
                                            {item.glucid != null && <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-700">C {item.glucid}g</span>}
                                            {item.lipid != null && <span className="rounded-full bg-red-500/10 px-2 py-1 text-red-600">F {item.lipid}g</span>}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </section>

                <section className="rounded-[1.75rem] bg-card p-4 shadow-ios-sm ring-1 ring-border/60">
                    <ReviewSection
                        targetType="store"
                        targetId={store._id}
                        averageRating={store.average_rating ?? 0}
                        ratingCount={store.rating_count ?? 0}
                    />
                </section>
            </main>

            <BottomNav />
        </div>
    );
};

export default StoreDetail;
