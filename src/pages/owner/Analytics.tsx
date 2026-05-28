import { useEffect, useState } from "react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    LineChart, Line, CartesianGrid,
} from "recharts";
import { Download, Loader2, Zap, Eye, Star, TrendingUp, UtensilsCrossed } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";

interface AnalyticsData {
    tier: "basic" | "pro";
    total_views: number;
    average_rating: number;
    rating_count: number;
    total_menu_items: number;
    is_active: boolean;
    is_verified: boolean;
    // Pro only
    daily_views?: { date: string; views: number }[];
    rating_distribution?: Record<string, number>;
    checkin_heatmap?: { day: number; hour: number; count: number }[];
}

const DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const HOURS = Array.from({ length: 24 }, (_, i) => `${i}h`);

const HeatmapCell = ({ count, maxCount }: { count: number; maxCount: number }) => {
    const intensity = maxCount > 0 ? count / maxCount : 0;
    const bg = intensity === 0
        ? "bg-muted"
        : intensity < 0.33 ? "bg-primary/20"
        : intensity < 0.66 ? "bg-primary/50"
        : "bg-primary";
    return <div className={`w-4 h-4 rounded-sm ${bg}`} title={`${count} lượt`} />;
};

const OwnerAnalytics = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [storeId, setStoreId]   = useState<string | null>(null);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading]   = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const { data: s } = await api.get("/stores/mine");
                const store = s.data?.[0];
                if (!store) return;
                setStoreId(store._id);
                const { data } = await api.get(`/stores/${store._id}/analytics`);
                setAnalytics(data);
            } catch { /* ignore */ }
            finally { setLoading(false); }
        };
        load();
    }, []);

    const handleExport = async () => {
        if (!storeId) return;
        setExporting(true);
        try {
            const response = await api.get(`/stores/${storeId}/analytics/export`, { responseType: "blob" });
            const url = URL.createObjectURL(response.data);
            const a   = document.createElement("a");
            a.href = url;
            a.download = `analytics-${storeId}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch { /* ignore */ }
        finally { setExporting(false); }
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    if (!analytics) {
        return <div className="text-center py-20 text-muted-foreground">Không tìm thấy dữ liệu.</div>;
    }

    if (analytics.tier === "basic") {
        return (
            <div className="max-w-lg space-y-6">
                <h1 className="text-2xl font-bold">Thống kê chi tiết</h1>

                {/* Basic metrics */}
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { label: "Tổng lượt xem", value: analytics.total_views, icon: Eye, color: "text-blue-500" },
                        { label: "Đánh giá TB",   value: analytics.average_rating?.toFixed(1) || "—", icon: Star, color: "text-yellow-500" },
                        { label: "Số đánh giá",   value: analytics.rating_count, icon: TrendingUp, color: "text-green-500" },
                        { label: "Số món",         value: analytics.total_menu_items, icon: UtensilsCrossed, color: "text-purple-500" },
                    ].map((s) => (
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

                {/* Pro gate */}
                <Card className="border-dashed border-amber-300 bg-amber-50/50">
                    <CardContent className="pt-6 text-center space-y-3">
                        <Zap className="w-8 h-8 text-amber-500 mx-auto" />
                        <h3 className="font-semibold">{t("owner.analytics.proRequired")}</h3>
                        <ul className="text-sm text-muted-foreground text-left space-y-1 mx-auto max-w-xs">
                            <li>• Biểu đồ lượt xem theo ngày (30 ngày)</li>
                            <li>• Phân bố đánh giá theo sao</li>
                            <li>• Check-in heatmap theo giờ/ngày</li>
                            <li>• Export dữ liệu CSV</li>
                        </ul>
                        <Button onClick={() => navigate("/owner/upgrade")} className="gap-1">
                            <Zap className="w-4 h-4" />Nâng cấp 49.000₫/tháng
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Pro analytics
    const ratingData = Object.entries(analytics.rating_distribution || {})
        .map(([star, count]) => ({ star: `${star}★`, count }))
        .sort((a, b) => b.star.localeCompare(a.star));

    // Build heatmap grid [day][hour]
    const heatGrid: Record<string, number> = {};
    analytics.checkin_heatmap?.forEach(({ day, hour, count }) => {
        heatGrid[`${day}-${hour}`] = count;
    });
    const maxCount = Math.max(...(analytics.checkin_heatmap?.map((h) => h.count) || [1]));

    return (
        <div className="space-y-8 max-w-4xl">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Thống kê chi tiết</h1>
                    <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white mt-1">Store Pro</Badge>
                </div>
                <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-1">
                    {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Export CSV
                </Button>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Tổng lượt xem", value: analytics.total_views, icon: Eye, color: "text-blue-500" },
                    { label: "Đánh giá TB",   value: analytics.average_rating?.toFixed(1) || "—", icon: Star, color: "text-yellow-500" },
                    { label: "Số đánh giá",   value: analytics.rating_count, icon: TrendingUp, color: "text-green-500" },
                    { label: "Số món",         value: analytics.total_menu_items, icon: UtensilsCrossed, color: "text-purple-500" },
                ].map((s) => (
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

            {/* Daily views chart */}
            {analytics.daily_views && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t("owner.analytics.dailyViews")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={analytics.daily_views}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="date"
                                    tickFormatter={(d) => d.slice(5)}
                                    tick={{ fontSize: 11 }} interval={4} />
                                <YAxis tick={{ fontSize: 11 }} width={30} />
                                <Tooltip labelFormatter={(l) => `Ngày ${l}`} formatter={(v) => [`${v} lượt`, "Lượt xem"]} />
                                <Line type="monotone" dataKey="views" stroke="#22c55e" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Rating distribution */}
                {ratingData.length > 0 && (
                    <Card>
                        <CardHeader><CardTitle className="text-base">Phân bố đánh giá</CardTitle></CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={160}>
                                <BarChart data={ratingData} layout="vertical">
                                    <XAxis type="number" tick={{ fontSize: 11 }} />
                                    <YAxis dataKey="star" type="category" tick={{ fontSize: 11 }} width={28} />
                                    <Tooltip formatter={(v) => [`${v} đánh giá`]} />
                                    <Bar dataKey="count" fill="#fbbf24" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

                {/* Check-in heatmap */}
                <Card>
                    <CardHeader><CardTitle className="text-base">Check-in Heatmap (giờ × ngày)</CardTitle></CardHeader>
                    <CardContent className="overflow-x-auto">
                        <div className="flex gap-1 mb-1">
                            <div className="w-6" />
                            {HOURS.filter((_, i) => i % 3 === 0).map((h) => (
                                <div key={h} className="w-4 text-[9px] text-muted-foreground text-center">{h}</div>
                            ))}
                        </div>
                        <div className="space-y-1">
                            {DAYS.map((day, d) => (
                                <div key={day} className="flex items-center gap-1">
                                    <div className="w-6 text-[10px] text-muted-foreground text-right">{day}</div>
                                    <div className="flex gap-0.5">
                                        {Array.from({ length: 24 }, (_, h) => (
                                            <HeatmapCell key={h} count={heatGrid[`${d}-${h}`] || 0} maxCount={maxCount} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                            <div className="w-3 h-3 rounded-sm bg-muted" />Ít
                            <div className="w-3 h-3 rounded-sm bg-primary/20" />
                            <div className="w-3 h-3 rounded-sm bg-primary/50" />
                            <div className="w-3 h-3 rounded-sm bg-primary" />Nhiều
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default OwnerAnalytics;
