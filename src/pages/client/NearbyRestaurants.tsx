import React, { useState, useEffect, useCallback, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useNavigate } from "react-router-dom";
import {
    Search, MapPin, ChevronDown, ChevronUp, Flame, Phone, Globe,
    Store, Loader2, Filter, X, UtensilsCrossed, Coffee, ShoppingBag,
    Zap, BadgeCheck, Star, Map, List, ExternalLink, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { ReviewSection } from "@/components/ReviewSection";
import api from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MenuItem {
    _id: string;
    name_vi: string;
    price?: number;
    energy_kcal?: number;
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
    is_verified: boolean;
    views_count: number;
    average_rating: number;
    rating_count: number;
    location?: { lat: number; lng: number };
    google_maps_url?: string;
}

const CATEGORIES = [
    { value: "", label: "Tất cả" },
    { value: "restaurant", label: "Nhà hàng" },
    { value: "cafe", label: "Cà phê" },
    { value: "bakery", label: "Bánh" },
    { value: "fastfood", label: "Fast food" },
    { value: "other", label: "Khác" },
];

const CATEGORY_ICON: Record<string, React.ReactNode> = {
    restaurant: <UtensilsCrossed className="w-5 h-5 text-primary" />,
    cafe:       <Coffee className="w-5 h-5 text-primary" />,
    bakery:     <ShoppingBag className="w-5 h-5 text-primary" />,
    fastfood:   <Zap className="w-5 h-5 text-primary" />,
    other:      <Store className="w-5 h-5 text-primary" />,
};

// ── Image Carousel ────────────────────────────────────────────────────────────

const ImageCarousel: React.FC<{ images: string[]; name: string }> = ({ images, name }) => {
    const [idx, setIdx] = useState(0);
    if (!images.length) return null;
    return (
        <div className="relative w-full aspect-video bg-muted overflow-hidden">
            <img src={images[idx]} alt={name} className="absolute inset-0 w-full h-full object-cover" />
            {images.length > 1 && (
                <>
                    <button type="button" title="Ảnh trước" onClick={(e) => { e.stopPropagation(); setIdx((idx - 1 + images.length) % images.length); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center">
                        <ChevronLeft className="w-4 h-4 text-white" />
                    </button>
                    <button type="button" title="Ảnh tiếp theo" onClick={(e) => { e.stopPropagation(); setIdx((idx + 1) % images.length); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center">
                        <ChevronRight className="w-4 h-4 text-white" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {images.map((_, i) => (
                            <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? "bg-white" : "bg-white/40"}`} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

// ── Stars display ─────────────────────────────────────────────────────────────

const StarRow: React.FC<{ rating: number; count: number }> = ({ rating, count }) => (
    <div className="flex items-center gap-1.5">
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted"}`} />
            ))}
        </div>
        <span className="text-xs font-semibold">{rating > 0 ? rating.toFixed(1) : "—"}</span>
        {count > 0 && <span className="text-xs text-muted-foreground">({count})</span>}
    </div>
);

// ── Mapbox view ───────────────────────────────────────────────────────────────

const MapView: React.FC<{ stores: StoreAPI[] }> = ({ stores }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const [mapError, setMapError] = useState("");
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const token = import.meta.env.VITE_MAPBOX_TOKEN;
        if (!token) { setMapError("no_key"); return; }

        const storesWithCoords = stores.filter((s) => s.location?.lat && s.location?.lng);
        if (!storesWithCoords.length) { setMapError("no_coords"); return; }

        if (!mapContainerRef.current) return;

        mapboxgl.accessToken = token;

        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: "mapbox://styles/mapbox/streets-v12",
            center: [storesWithCoords[0].location!.lng, storesWithCoords[0].location!.lat],
            zoom: 13,
        });
        mapRef.current = map;

        map.addControl(new mapboxgl.NavigationControl(), "top-right");

        map.on("load", () => {
            storesWithCoords.forEach((store) => {
                const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
                    `<div style="max-width:180px"><strong>${store.name}</strong><br/><small>${store.address}</small>${store.average_rating > 0 ? `<br/>⭐ ${store.average_rating.toFixed(1)}` : ""}</div>`,
                );
                new mapboxgl.Marker({ color: "#22c55e" })
                    .setLngLat([store.location!.lng, store.location!.lat])
                    .setPopup(popup)
                    .addTo(map);
            });
            setLoaded(true);
        });

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, [stores]);

    if (mapError === "no_key") {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-4">
                <MapPin className="w-10 h-10 text-muted-foreground" />
                <p className="text-sm font-medium">Chưa cấu hình Mapbox</p>
                <p className="text-xs text-muted-foreground">Thêm <code className="bg-muted px-1 rounded">VITE_MAPBOX_TOKEN</code> vào file <code className="bg-muted px-1 rounded">.env</code></p>
            </div>
        );
    }
    if (mapError === "no_coords") {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-center px-4">
                <MapPin className="w-10 h-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Chưa có toạ độ cho quán nào.<br/>Chủ quán cần nhập địa chỉ khi đăng ký quán.</p>
            </div>
        );
    }

    return (
        <div className="relative w-full h-[calc(100vh-200px)]">
            <div ref={mapContainerRef} className="w-full h-full" />
            {!loaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/60">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            )}
        </div>
    );
};

// ── Store card ────────────────────────────────────────────────────────────────

const StoreCard: React.FC<{ store: StoreAPI }> = ({ store }) => {
    const [expanded, setExpanded] = useState(false);
    const [showReviews, setShowReviews] = useState(false);
    const availableMenu = store.menu_items?.filter((m) => m.is_available) || [];

    return (
        <Card className={`overflow-hidden transition-shadow hover:shadow-md ${store.subscription_tier === "pro" ? "border-l-4 border-l-primary" : ""}`}>
            <CardContent className="p-0">
                {/* Hero image carousel */}
                {store.images?.length > 0 && <ImageCarousel images={store.images} name={store.name} />}

                <div className="p-4">
                    {/* Name + badges */}
                    <div className="flex items-start gap-2 mb-1">
                        {!store.images?.length && (
                            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                                {CATEGORY_ICON[store.category || "other"]}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="font-bold text-base leading-tight">{store.name}</h3>
                                {store.is_verified && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                                        <BadgeCheck className="w-3 h-3" /> Xác minh
                                    </span>
                                )}
                                {store.subscription_tier === "pro" && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-accent text-primary rounded-full font-medium border border-primary/20">Pro</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Rating row */}
                    <div className="flex items-center gap-3 mb-2">
                        <StarRow rating={store.average_rating ?? 0} count={store.rating_count ?? 0} />
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{availableMenu.length} món</span>
                    </div>

                    {/* Address */}
                    <div className="flex items-start gap-1 mb-2">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-muted-foreground leading-relaxed">{store.address}</span>
                        {store.google_maps_url && (
                            <a href={store.google_maps_url} target="_blank" rel="noreferrer"
                                title="Xem trên Google Maps"
                                className="ml-1 flex-shrink-0 text-primary">
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </div>

                    {store.description && (
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{store.description}</p>
                    )}

                    {/* Contact */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                        {store.phone && (
                            <a href={`tel:${store.phone}`} className="flex items-center gap-1 hover:text-primary">
                                <Phone className="w-3 h-3" /> {store.phone}
                            </a>
                        )}
                        {store.website && (
                            <a href={store.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary">
                                <Globe className="w-3 h-3" /> Website
                            </a>
                        )}
                    </div>

                    {/* Menu preview */}
                    {availableMenu.length > 0 && (
                        <div className="space-y-1.5 mb-3">
                            {(expanded ? availableMenu : availableMenu.slice(0, 3)).map((item) => (
                                <div key={item._id} className="flex items-center justify-between py-1.5 px-2.5 bg-muted/50 rounded-lg">
                                    <span className="text-sm truncate flex-1 mr-2">{item.name_vi}</span>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {item.energy_kcal && (
                                            <span className="flex items-center gap-0.5 text-xs text-orange-500 font-medium">
                                                <Flame className="w-3 h-3" />{item.energy_kcal}
                                            </span>
                                        )}
                                        {item.price && (
                                            <span className="text-xs text-muted-foreground">{item.price.toLocaleString("vi-VN")}₫</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {availableMenu.length > 3 && (
                                <button type="button" className="w-full text-xs text-primary flex items-center justify-center gap-1 py-1"
                                    onClick={() => setExpanded(!expanded)}>
                                    {expanded ? <><ChevronUp className="w-3 h-3" /> Thu gọn</> : <><ChevronDown className="w-3 h-3" /> Xem thêm {availableMenu.length - 3} món</>}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Reviews toggle */}
                    <button
                        type="button"
                        onClick={() => setShowReviews(!showReviews)}
                        className="w-full flex items-center justify-between py-2 border-t border-border/50 text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                        <span className="flex items-center gap-2">
                            <Star className="w-4 h-4" />
                            Đánh giá &amp; nhận xét
                            {(store.rating_count ?? 0) > 0 && (
                                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                                    {store.rating_count}
                                </span>
                            )}
                        </span>
                        {showReviews ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showReviews && (
                        <div className="pt-3">
                            <ReviewSection
                                targetType="store"
                                targetId={store._id}
                                averageRating={store.average_rating ?? 0}
                                ratingCount={store.rating_count ?? 0}
                            />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

// ── Main component ─────────────────────────────────────────────────────────────

const NearbyRestaurants: React.FC = () => {
    const navigate = useNavigate();

    const [stores, setStores] = useState<StoreAPI[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("");
    const [showFilter, setShowFilter] = useState(false);
    const [viewMode, setViewMode] = useState<"list" | "map">("list");

    const fetchStores = useCallback(async (q: string, cat: string) => {
        setLoading(true);
        try {
            const params: Record<string, string> = { limit: "50" };
            if (q.trim()) params.q = q.trim();
            if (cat) params.category = cat;
            const res = await api.get("/stores", { params });
            setStores(res.data?.data || []);
        } catch {
            setStores([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => fetchStores(query, category), 300);
        return () => clearTimeout(timeout);
    }, [query, category, fetchStores]);

    return (
        <div className="min-h-screen bg-background pb-nav-safe">
            {/* Header */}
            <div className="glass border-b border-border/50 sticky top-0 z-10">
                <div className="px-5 pt-4 pb-3 space-y-2">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                        <h1 className="page-title flex-1">Quán ăn</h1>
                        {/* List / Map toggle */}
                        <div className="flex items-center border border-border rounded-lg overflow-hidden">
                            <button type="button"
                                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors ${viewMode === "list" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
                                onClick={() => setViewMode("list")}>
                                <List className="w-3.5 h-3.5" /> Danh sách
                            </button>
                            <button type="button"
                                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors ${viewMode === "map" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
                                onClick={() => setViewMode("map")}>
                                <Map className="w-3.5 h-3.5" /> Bản đồ
                            </button>
                        </div>
                        <Button size="sm" variant="outline" className="gap-1 text-xs"
                            onClick={() => { setCategory(""); setShowFilter(!showFilter); }}>
                            <Filter className="w-3.5 h-3.5" />
                            {category ? CATEGORIES.find((c) => c.value === category)?.label : "Lọc"}
                        </Button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                        <Input value={query} onChange={(e) => setQuery(e.target.value)}
                            placeholder="Tìm quán ăn, địa chỉ..." className="pl-9 pr-9" />
                        {query && (
                            <button type="button" aria-label="Xóa" className="absolute right-3 top-2.5" onClick={() => setQuery("")}>
                                <X className="w-4 h-4 text-muted-foreground" />
                            </button>
                        )}
                    </div>

                    {/* Category pills */}
                    {showFilter && (
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {CATEGORIES.map((c) => (
                                <button type="button" key={c.value}
                                    onClick={() => { setCategory(c.value); setShowFilter(false); }}
                                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                        category === c.value
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-background text-muted-foreground border-border hover:border-primary"
                                    }`}>
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Map view */}
            {viewMode === "map" && (
                <div className="max-w-4xl mx-auto">
                    {loading ? (
                        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                    ) : (
                        <MapView stores={stores} />
                    )}
                </div>
            )}

            {/* List view */}
            {viewMode === "list" && (
                <div className="max-w-lg mx-auto px-5 py-4 space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : stores.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-3">
                                <UtensilsCrossed className="w-8 h-8 text-primary" />
                            </div>
                            <p className="text-muted-foreground font-medium">Không tìm thấy quán nào</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {query ? `Không có kết quả cho "${query}"` : "Chưa có quán nào trong khu vực"}
                            </p>
                            <Button size="sm" variant="outline" className="mt-4"
                                onClick={() => navigate("/store-registration")}>
                                Đăng ký quán của bạn
                            </Button>
                        </div>
                    ) : (
                        <>
                            <p className="text-xs text-muted-foreground px-1">
                                {stores.length} quán{category ? ` · ${CATEGORIES.find((c) => c.value === category)?.label}` : ""}
                            </p>
                            {stores.map((store) => <StoreCard key={store._id} store={store} />)}
                        </>
                    )}
                </div>
            )}

            <BottomNav />
        </div>
    );
};

export default NearbyRestaurants;
