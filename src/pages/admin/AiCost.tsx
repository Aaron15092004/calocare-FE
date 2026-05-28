import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    DollarSign,
    MessageSquare,
    Calendar,
    Camera,
    AlertTriangle,
    Users,
    RefreshCw,
    Bot,
    TrendingUp,
    ShieldAlert,
} from "lucide-react";
import {
    BarChart,
    Bar,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell,
} from "recharts";

const USD_TO_VND = 25000;

interface AiCostStats {
    total_chat_messages: number;
    chat_messages_by_tier: { free: number; premium: number; pro: number };
    avg_messages_per_premium_user: number;
    premium_users_count: number;
    total_meal_plans: number;
    total_scans: number;
    total_embeds: number;
    cost_chat_usd: number;
    cost_meal_plans_usd: number;
    cost_scans_usd: number;
    cost_voyage_usd: number;
    total_cost_usd: number;
    risk_level: "low" | "medium" | "high";
    premium_at_risk: number;
}

interface AiCostCharts {
    cost_by_service: { name: string; cost_usd: number }[];
    chat_trend_6m: { name: string; messages: number; cost_usd: number }[];
}

interface TopUser {
    user_id: string;
    display_name: string;
    email: string;
    tier: string;
    message_count: number;
    chat_limit: number;
    estimated_cost_usd: number;
}

interface AiCostData {
    period: { start: string; end: string };
    stats: AiCostStats;
    charts: AiCostCharts;
    top_users: TopUser[];
}

const fmt = (usd: number) =>
    `$${usd.toFixed(2)} (~${(usd * USD_TO_VND).toLocaleString("vi-VN")}₫)`;

const fmtUsd = (usd: number) => `$${usd.toFixed(2)}`;

const TIER_COLORS: Record<string, string> = {
    free: "bg-gray-100 text-gray-600",
    premium: "bg-purple-100 text-purple-700",
    pro: "bg-blue-100 text-blue-700",
};

const SERVICE_COLORS = ["#8b5cf6", "#10b981", "#f59e0b", "#6b7280"];

const RISK_CONFIG = {
    low: { bg: "bg-green-50 border-green-200", icon: "text-green-600", text: "text-green-800", label: "Thấp" },
    medium: { bg: "bg-amber-50 border-amber-200", icon: "text-amber-600", text: "text-amber-800", label: "Trung bình" },
    high: { bg: "bg-red-50 border-red-200", icon: "text-red-600", text: "text-red-800", label: "Cao" },
};

const TierBadge = ({ tier }: { tier: string }) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[tier] ?? TIER_COLORS.free}`}>
        {tier}
    </span>
);

const ChatUsageBar = ({ count, limit }: { count: number; limit: number }) => {
    if (limit < 0) {
        return <span className="text-xs text-muted-foreground">{count} / ∞</span>;
    }
    const pct = Math.min(100, Math.round((count / limit) * 100));
    const color = pct >= 80 ? "bg-red-500" : pct >= 50 ? "bg-amber-500" : "bg-green-500";
    return (
        <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-16 shrink-0">
                {count} / {limit}
            </span>
            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-medium w-8 text-right">{pct}%</span>
        </div>
    );
};

const StatCard = ({
    icon: Icon,
    label,
    value,
    sub,
    color,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    sub?: string;
    color: string;
}) => (
    <Card>
        <CardContent className="p-4 lg:p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-xl font-bold mt-0.5 break-all">{value}</p>
                    {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </CardContent>
    </Card>
);

const AiCost = () => {
    const [data, setData] = useState<AiCostData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const { data: res } = await api.get("/admin/ai-cost");
            setData(res);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
                Không thể tải dữ liệu
            </div>
        );
    }

    const { stats, charts, top_users } = data;
    const risk = RISK_CONFIG[stats.risk_level];
    const periodLabel = new Date(data.period.start).toLocaleString("vi-VN", {
        month: "long",
        year: "numeric",
    });
    const premiumPct =
        stats.premium_users_count > 0
            ? Math.min(100, Math.round((stats.avg_messages_per_premium_user / 100) * 100))
            : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Bot className="w-6 h-6 text-primary" />
                        AI Cost Monitor
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Chi phí AI ước tính — {periodLabel}
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchData(true)}
                    disabled={refreshing}
                    className="shrink-0"
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                    Làm mới
                </Button>
            </div>

            {/* Risk banner */}
            {stats.risk_level !== "low" && (
                <div className={`border rounded-lg p-4 flex items-start gap-3 ${risk.bg}`}>
                    <ShieldAlert className={`w-5 h-5 mt-0.5 shrink-0 ${risk.icon}`} />
                    <div>
                        <p className={`font-semibold text-sm ${risk.text}`}>
                            Mức rủi ro chi phí: {risk.label}
                        </p>
                        <p className={`text-sm mt-0.5 ${risk.text} opacity-80`}>
                            Trung bình <strong>{stats.avg_messages_per_premium_user}</strong> chat/tháng
                            mỗi user Premium (giới hạn 100). Có{" "}
                            <strong>{stats.premium_at_risk}</strong> user đã dùng ≥ 80 messages tháng
                            này — nếu xu hướng tiếp diễn, chi phí chat sẽ tăng đáng kể tháng sau.
                        </p>
                    </div>
                </div>
            )}

            {/* Stat cards row 1 — tổng quan */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                    icon={DollarSign}
                    label="Tổng chi phí AI / tháng*"
                    value={fmtUsd(stats.total_cost_usd)}
                    sub={`~${(stats.total_cost_usd * USD_TO_VND).toLocaleString("vi-VN")}₫ (bao gồm ước tính scan)`}
                    color="bg-purple-100 text-purple-600"
                />
                <StatCard
                    icon={Users}
                    label="Avg chat / Premium user"
                    value={`${stats.avg_messages_per_premium_user} / 100`}
                    sub={`${premiumPct}% giới hạn • ${stats.premium_at_risk} user ≥ 80 msgs`}
                    color={
                        stats.risk_level === "high"
                            ? "bg-red-100 text-red-600"
                            : stats.risk_level === "medium"
                            ? "bg-amber-100 text-amber-600"
                            : "bg-green-100 text-green-600"
                    }
                />
                <StatCard
                    icon={MessageSquare}
                    label="Tổng chat messages"
                    value={stats.total_chat_messages.toLocaleString()}
                    sub={`Free ${stats.chat_messages_by_tier.free} · Pre ${stats.chat_messages_by_tier.premium} · Pro ${stats.chat_messages_by_tier.pro}`}
                    color="bg-blue-100 text-blue-600"
                />
                <StatCard
                    icon={Calendar}
                    label="Meal plans tạo ra"
                    value={stats.total_meal_plans.toLocaleString()}
                    sub="Bởi user qua AI"
                    color="bg-green-100 text-green-600"
                />
            </div>

            {/* Stat cards row 2 — breakdown by service */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                    icon={MessageSquare}
                    label="Chat — Groq"
                    value={fmtUsd(stats.cost_chat_usd)}
                    sub={`${stats.total_chat_messages} msgs × $0.004`}
                    color="bg-violet-100 text-violet-600"
                />
                <StatCard
                    icon={Calendar}
                    label="Meal Plan — Groq"
                    value={fmtUsd(stats.cost_meal_plans_usd)}
                    sub={`${stats.total_meal_plans} plans`}
                    color="bg-emerald-100 text-emerald-600"
                />
                <StatCard
                    icon={Camera}
                    label="Scan — Gemini"
                    value={fmtUsd(stats.cost_scans_usd)}
                    sub={`${stats.total_scans.toLocaleString()} scans`}
                    color="bg-amber-100 text-amber-600"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Embed — Voyage AI"
                    value={fmtUsd(stats.cost_voyage_usd)}
                    sub={`${stats.total_embeds.toLocaleString()} embeddings`}
                    color="bg-gray-100 text-gray-600"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Cost by service */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Chi phí theo dịch vụ (USD)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart
                                data={charts.cost_by_service}
                                margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis
                                    tick={{ fontSize: 11 }}
                                    tickFormatter={(v) => `$${v.toFixed(2)}`}
                                />
                                <Tooltip
                                    formatter={(v: number) => [`$${v.toFixed(4)}`, "Chi phí"]}
                                />
                                <Bar dataKey="cost_usd" radius={[4, 4, 0, 0]} name="Chi phí">
                                    {charts.cost_by_service.map((_, i) => (
                                        <Cell key={i} fill={SERVICE_COLORS[i % SERVICE_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        <p className="text-[11px] text-muted-foreground mt-2">
                            * Scan (Gemini) là ước tính dựa trên số user theo tier — không có scan
                            history trong DB.
                        </p>
                    </CardContent>
                </Card>

                {/* Chat trend 6 months */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                            Chat messages 6 tháng gần nhất
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart
                                data={charts.chat_trend_6m}
                                margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis
                                    yAxisId="msg"
                                    tick={{ fontSize: 11 }}
                                    allowDecimals={false}
                                />
                                <YAxis
                                    yAxisId="cost"
                                    orientation="right"
                                    tick={{ fontSize: 11 }}
                                    tickFormatter={(v) => `$${v}`}
                                />
                                <Tooltip
                                    formatter={(value: number, name: string) =>
                                        name === "messages"
                                            ? [value, "Messages"]
                                            : [`$${value.toFixed(2)}`, "Cost"]
                                    }
                                />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Area
                                    yAxisId="msg"
                                    type="monotone"
                                    dataKey="messages"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    fill="url(#colorMsg)"
                                    name="messages"
                                />
                                <Area
                                    yAxisId="cost"
                                    type="monotone"
                                    dataKey="cost_usd"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    fill="url(#colorCost)"
                                    name="cost_usd"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                        <p className="text-[11px] text-muted-foreground mt-2">
                            Lưu ý: dữ liệu tháng cũ có thể thiếu do auto-summarize xóa messages cũ
                            khỏi session.
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Top users by chat volume */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Top users dùng chat nhiều nhất tháng này
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {top_users.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            Chưa có chat session nào tháng này
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="pb-2 font-medium">User</th>
                                        <th className="pb-2 font-medium">Tier</th>
                                        <th className="pb-2 font-medium">Messages / Giới hạn</th>
                                        <th className="pb-2 font-medium text-right">Chi phí chat</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {top_users.map((u) => (
                                        <tr key={u.user_id} className="border-b last:border-0">
                                            <td className="py-2.5">
                                                <p className="font-medium truncate max-w-[160px]">
                                                    {u.display_name}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                                                    {u.email}
                                                </p>
                                            </td>
                                            <td className="py-2.5">
                                                <TierBadge tier={u.tier} />
                                            </td>
                                            <td className="py-2.5 w-56">
                                                <ChatUsageBar
                                                    count={u.message_count}
                                                    limit={u.chat_limit}
                                                />
                                            </td>
                                            <td className="py-2.5 text-right font-mono text-xs">
                                                {fmtUsd(u.estimated_cost_usd)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Summary footer */}
                    <div className="mt-4 pt-3 border-t flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span>
                            Tổng AI tháng này:{" "}
                            <strong className="text-foreground">{fmt(stats.total_cost_usd)}</strong>
                        </span>
                        <span>
                            Chat chiếm{" "}
                            <strong className="text-foreground">
                                {stats.total_cost_usd > 0
                                    ? Math.round((stats.cost_chat_usd / stats.total_cost_usd) * 100)
                                    : 0}
                                %
                            </strong>{" "}
                            tổng chi phí AI
                        </span>
                        <span>
                            Ngưỡng an toàn:{" "}
                            <strong className="text-foreground">avg ≤ 50 msgs / Premium user</strong>
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AiCost;
