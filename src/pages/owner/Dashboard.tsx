import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    Eye, Star, UtensilsCrossed, Store, TrendingUp, AlertCircle,
    CheckCircle2, Clock, XCircle, Zap, ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";

interface StoreAPI {
    _id: string;
    name: string;
    is_active: boolean;
    is_verified: boolean;
    reject_reason?: string;
    subscription_tier: "basic" | "pro";
    views_count: number;
    average_rating: number;
    rating_count: number;
    menu_items: unknown[];
}

interface Analytics {
    total_views: number;
    average_rating: number;
    rating_count: number;
    total_menu_items: number;
    tier: string;
}

const StatusBadge = ({ store }: { store: StoreAPI }) => {
    const { t } = useTranslation();
    if (!store.is_active && !store.reject_reason)
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />{t("common.pending")}</Badge>;
    if (store.reject_reason)
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />{t("common.rejected")}</Badge>;
    return <Badge className="gap-1 bg-green-500"><CheckCircle2 className="w-3 h-3" />{t("common.active")}</Badge>;
};

const OwnerDashboard = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [stores, setStores]       = useState<StoreAPI[]>([]);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading]     = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await api.get("/stores/mine");
                const list: StoreAPI[] = data.data || [];
                setStores(list);
                if (list.length > 0) {
                    const { data: a } = await api.get(`/stores/${list[0]._id}/analytics`);
                    setAnalytics(a);
                }
            } catch { /* ignore */ }
            finally { setLoading(false); }
        };
        load();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (stores.length === 0) {
        return (
            <div className="max-w-lg mx-auto text-center py-16">
                <Store className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">{t("owner.storeDetails.newStore")}</h2>
                <p className="text-muted-foreground mb-6">{t("owner.dashboard.editStore")}</p>
                <Button onClick={() => navigate("/owner/store")}>
                    {t("owner.storeDetails.createStore")} <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
            </div>
        );
    }

    const store  = stores[0];
    const isPro  = store.subscription_tier === "pro";

    const statCards = [
        { label: t("owner.dashboard.totalViews"),  value: analytics?.total_views ?? 0,                    icon: Eye,            color: "text-blue-500" },
        { label: t("owner.dashboard.avgRating"),   value: analytics?.average_rating?.toFixed(1) ?? "—",   icon: Star,           color: "text-yellow-500" },
        { label: t("owner.dashboard.totalReviews"),value: analytics?.rating_count ?? 0,                   icon: TrendingUp,     color: "text-green-500" },
        { label: t("owner.dashboard.menuItems"),   value: analytics?.total_menu_items ?? 0,               icon: UtensilsCrossed,color: "text-purple-500" },
    ];

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{store.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <StatusBadge store={store} />
                        {isPro
                            ? <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white gap-1"><Zap className="w-3 h-3" />Store Pro</Badge>
                            : <Badge variant="outline">Basic</Badge>
                        }
                        {store.is_verified && <Badge variant="outline" className="text-green-600 border-green-300 gap-1"><CheckCircle2 className="w-3 h-3" />Xác minh</Badge>}
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/owner/store")}>
                    {t("owner.dashboard.editStore")}
                </Button>
            </div>

            {/* Rejection notice */}
            {store.reject_reason && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-red-700">{t("owner.dashboard.rejected")}</p>
                        <p className="text-sm text-red-600">{store.reject_reason}</p>
                        <Button size="sm" variant="outline" className="mt-2 text-red-600 border-red-300"
                            onClick={() => navigate("/owner/store")}>
                            {t("owner.dashboard.editStore")}
                        </Button>
                    </div>
                </div>
            )}

            {/* Pending notice */}
            {!store.is_active && !store.reject_reason && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-amber-700">{t("owner.dashboard.pending")}</p>
                        <p className="text-sm text-amber-600">{t("owner.storeDetails.pendingNotice")}</p>
                    </div>
                </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((s) => (
                    <Card key={s.label}>
                        <CardContent className="pt-4 pb-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-muted-foreground">{s.label}</p>
                                <s.icon className={`w-4 h-4 ${s.color}`} />
                            </div>
                            <p className="text-2xl font-bold">{s.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick actions */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">{t("owner.dashboard.quickActions")}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Button variant="outline" className="justify-start gap-2 h-auto py-3"
                        onClick={() => navigate("/owner/menu")}>
                        <UtensilsCrossed className="w-4 h-4 text-primary" />
                        <div className="text-left"><p className="text-sm font-medium">{t("owner.nav.menu")}</p><p className="text-xs text-muted-foreground">{analytics?.total_menu_items ?? 0}</p></div>
                    </Button>
                    <Button variant="outline" className="justify-start gap-2 h-auto py-3"
                        onClick={() => navigate("/owner/reviews")}>
                        <Star className="w-4 h-4 text-yellow-500" />
                        <div className="text-left"><p className="text-sm font-medium">{t("owner.nav.reviews")}</p><p className="text-xs text-muted-foreground">{analytics?.rating_count ?? 0}</p></div>
                    </Button>
                    {isPro
                        ? (
                            <Button variant="outline" className="justify-start gap-2 h-auto py-3"
                                onClick={() => navigate("/owner/analytics")}>
                                <TrendingUp className="w-4 h-4 text-green-500" />
                                <div className="text-left"><p className="text-sm font-medium">{t("owner.nav.analytics")}</p><p className="text-xs text-muted-foreground">{t("owner.analytics.proRequired")}</p></div>
                            </Button>
                        ) : (
                            <Button variant="outline" className="justify-start gap-2 h-auto py-3 border-dashed border-amber-300"
                                onClick={() => navigate("/owner/upgrade")}>
                                <Zap className="w-4 h-4 text-amber-500" />
                                <div className="text-left"><p className="text-sm font-medium text-amber-600">{t("owner.nav.upgrade")}</p></div>
                            </Button>
                        )
                    }
                </CardContent>
            </Card>

            {/* Multiple stores (Pro) */}
            {stores.length > 1 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Quán của bạn ({stores.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {stores.map((s) => (
                            <div key={s._id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                                <div>
                                    <p className="font-medium text-sm">{s.name}</p>
                                    <StatusBadge store={s} />
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => navigate(`/owner/store?id=${s._id}`)}>
                                    Quản lý
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default OwnerDashboard;
