import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    Search,
    MapPin,
    ChevronDown,
    ChevronUp,
    Flame,
    Phone,
    Globe,
    Store,
    Loader2,
    Filter,
    X,
    UtensilsCrossed,
    Coffee,
    ShoppingBag,
    Zap,
    BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
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
    cafe:        <Coffee className="w-5 h-5 text-primary" />,
    bakery:      <ShoppingBag className="w-5 h-5 text-primary" />,
    fastfood:    <Zap className="w-5 h-5 text-primary" />,
    other:       <Store className="w-5 h-5 text-primary" />,
};

// ── Component ─────────────────────────────────────────────────────────────────

const NearbyRestaurants: React.FC = () => {
    const navigate = useNavigate();

    const [stores, setStores] = useState<StoreAPI[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showFilter, setShowFilter] = useState(false);

    const fetchStores = useCallback(async (q: string, cat: string) => {
        setLoading(true);
        try {
            const params: Record<string, string> = { limit: "30" };
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
        <div className="min-h-screen bg-background pb-24">
            {/* Header */}
            <div className="glass border-b border-border/50 sticky top-0 z-10">
                <div className="px-4 pt-4 pb-3 space-y-2">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                        <h1 className="text-xl font-bold flex-1">Quán ăn gần đây</h1>
                        <Button
                            variant="outline"
                            size="sm"
                            className={`gap-1 ${category ? "border-primary text-primary" : ""}`}
                            onClick={() => setShowFilter(!showFilter)}
                        >
                            <Filter className="w-3.5 h-3.5" />
                            {category ? CATEGORIES.find(c => c.value === category)?.label : "Lọc"}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate("/store-registration")}
                        >
                            + Thêm quán
                        </Button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Tìm quán ăn, cà phê..."
                            className="pl-9 pr-9"
                        />
                        {query && (
                            <button type="button" aria-label="Xóa tìm kiếm" className="absolute right-3 top-2.5" onClick={() => setQuery("")}>
                                <X className="w-4 h-4 text-muted-foreground" />
                            </button>
                        )}
                    </div>

                    {/* Category filter pills */}
                    {showFilter && (
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {CATEGORIES.map((c) => (
                                <button
                                    type="button"
                                    key={c.value}
                                    onClick={() => { setCategory(c.value); setShowFilter(false); }}
                                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                        category === c.value
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-background text-muted-foreground border-border hover:border-primary"
                                    }`}
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
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
                        <Button
                            size="sm"
                            variant="outline"
                            className="mt-4"
                            onClick={() => navigate("/store-registration")}
                        >
                            Đăng ký quán của bạn
                        </Button>
                    </div>
                ) : (
                    <>
                        <p className="text-xs text-muted-foreground px-1">
                            {stores.length} quán{category ? ` • ${CATEGORIES.find(c => c.value === category)?.label}` : ""}
                        </p>
                        {stores.map((store) => {
                            const isExpanded = expandedId === store._id;
                            const availableMenu = store.menu_items?.filter(m => m.is_available) || [];

                            return (
                                <Card key={store._id} className={`overflow-hidden transition-shadow hover:shadow-md ${store.subscription_tier === "pro" ? "border-l-4 border-l-primary" : ""}`}>
                                    <CardContent className="p-0">
                                        {/* Store image */}
                                        {store.images?.[0] && (
                                            <div className="w-full h-36 overflow-hidden">
                                                <img
                                                    src={store.images[0]}
                                                    alt={store.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}

                                        <div className="p-4">
                                            {/* Name row */}
                                            <div className="flex items-start gap-2 mb-2">
                                                {!store.images?.[0] && (
                                                    <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                                                        {CATEGORY_ICON[store.category || "other"] ?? <Store className="w-5 h-5 text-primary" />}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <h3 className="font-semibold text-base leading-tight">{store.name}</h3>
                                                        {store.is_verified && (
                                                            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                                                                <BadgeCheck className="w-3 h-3" /> Xác minh
                                                            </span>
                                                        )}
                                                        {store.subscription_tier === "pro" && (
                                                            <span className="text-[10px] px-1.5 py-0.5 bg-accent text-primary rounded-full font-medium border border-primary/20">
                                                                Pro
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                                                        <MapPin className="w-3 h-3 flex-shrink-0" />
                                                        <span className="truncate">{store.address}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {store.description && (
                                                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{store.description}</p>
                                            )}

                                            {/* Contact row */}
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                                                {store.phone && (
                                                    <a href={`tel:${store.phone}`} className="flex items-center gap-1 hover:text-primary">
                                                        <Phone className="w-3 h-3" />
                                                        {store.phone}
                                                    </a>
                                                )}
                                                {store.website && (
                                                    <a href={store.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary">
                                                        <Globe className="w-3 h-3" />
                                                        Website
                                                    </a>
                                                )}
                                                <span className="ml-auto flex items-center gap-1">
                                                    <Store className="w-3 h-3" />
                                                    {availableMenu.length} món
                                                </span>
                                            </div>

                                            {/* Menu preview — top 3 */}
                                            {availableMenu.length > 0 && (
                                                <>
                                                    <div className="space-y-1.5">
                                                        {(isExpanded ? availableMenu : availableMenu.slice(0, 3)).map((item) => (
                                                            <div
                                                                key={item._id}
                                                                className="flex items-center justify-between py-1.5 px-2.5 bg-gray-50 rounded-lg"
                                                            >
                                                                <span className="text-sm text-gray-700 truncate flex-1 mr-2">{item.name_vi}</span>
                                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                                    {item.energy_kcal && (
                                                                        <span className="flex items-center gap-0.5 text-xs text-orange-500 font-medium">
                                                                            <Flame className="w-3 h-3" />
                                                                            {item.energy_kcal}
                                                                        </span>
                                                                    )}
                                                                    {item.price && (
                                                                        <span className="text-xs text-gray-500">
                                                                            {item.price.toLocaleString("vi-VN")}₫
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {availableMenu.length > 3 && (
                                                        <button
                                                            type="button"
                                                            className="w-full mt-2 text-xs text-primary flex items-center justify-center gap-1 py-1"
                                                            onClick={() => setExpandedId(isExpanded ? null : store._id)}
                                                        >
                                                            {isExpanded ? (
                                                                <><ChevronUp className="w-3 h-3" /> Thu gọn</>
                                                            ) : (
                                                                <><ChevronDown className="w-3 h-3" /> Xem thêm {availableMenu.length - 3} món</>
                                                            )}
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </>
                )}
            </div>

            <BottomNav />
        </div>
    );
};

export default NearbyRestaurants;
