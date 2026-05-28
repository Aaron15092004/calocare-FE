import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    ArrowLeft, Loader2, Flame, TrendingUp, Award, Crown,
    AlertTriangle, CheckCircle2, Lightbulb, Sparkles, RefreshCw, ChevronDown, ChevronUp,
} from "lucide-react";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthContext } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { format, parseISO } from "date-fns";
import { AdherenceGauge } from "@/components/AdherenceGauge";

interface ReportData {
    period_days: number;
    daily_trend: {
        date: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        logged: boolean;
    }[];
    avg_calories: number;
    avg_macros: { protein: number; carbs: number; fat: number };
    adherence_pct: number;
    logged_days: number;
    streak_days: number;
    meal_type_counts: Record<string, number>;
}

interface Insight {
    type: "warning" | "success" | "tip";
    title: string;
    body: string;
    suggestion?: string;
}

interface DigestContent {
    nhan_xet_tong_quan: string;
    diem_manh: string[];
    can_cai_thien: string[];
    thuc_pham_nen_them: string[];
    thuc_pham_nen_giam: string[];
    ke_hoach_tuan_toi: string;
}

interface DigestResponse {
    content: DigestContent;
    generated_at: string;
    cached: boolean;
}

const MACRO_COLORS = { protein: "#3b82f6", carbs: "#22c55e", fat: "#f59e0b" };
const MACRO_LABELS = { protein: "Protein", carbs: "Carbs", fat: "Chất béo" };

const PERIOD_OPTIONS = [
    { label: "7 ngày", value: 7 },
    { label: "30 ngày", value: 30 },
    { label: "90 ngày", value: 90 },
];

const MEAL_LABEL: Record<string, string> = {
    breakfast: "Sáng",
    lunch: "Trưa",
    dinner: "Tối",
    snack: "Phụ",
};

const INSIGHT_STYLES = {
    warning: {
        border: "border-amber-200 bg-amber-50",
        icon: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />,
        badge: "bg-amber-100 text-amber-700",
    },
    success: {
        border: "border-green-200 bg-green-50",
        icon: <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />,
        badge: "bg-green-100 text-green-700",
    },
    tip: {
        border: "border-blue-200 bg-blue-50",
        icon: <Lightbulb className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />,
        badge: "bg-blue-100 text-blue-700",
    },
};

export default function Reports() {
    const navigate = useNavigate();
    const { user } = useAuthContext();
    const [period, setPeriod] = useState(30);
    const [digestState, setDigestState] = useState<{ data: DigestResponse | null; loading: boolean; error: string | null }>({
        data: null, loading: false, error: null,
    });
    const [digestOpen, setDigestOpen] = useState<Record<string, boolean>>({});

    const isPremium = user?.subscription_tier !== "free";

    const { data, isLoading } = useQuery<ReportData>({
        queryKey: ["reports-premium", period],
        queryFn: async () => {
            const res = await api.get(`/reports/premium?days=${period}`);
            return res.data as ReportData;
        },
        enabled: isPremium,
    });

    const { data: insightsData, isLoading: insightsLoading } = useQuery<{ insights: Insight[] }>({
        queryKey: ["reports-insights", period],
        queryFn: async () => {
            const res = await api.get(`/reports/insights?days=${period}`);
            return res.data;
        },
        enabled: isPremium,
    });

    const fmtDate = (s: string) => {
        const d = new Date(s);
        return `${d.getDate()}/${d.getMonth() + 1}`;
    };

    const macroTotal = (data?.avg_macros.protein ?? 0) * 4
        + (data?.avg_macros.carbs ?? 0) * 4
        + (data?.avg_macros.fat ?? 0) * 9;

    const macroPie = macroTotal > 0
        ? [
            { name: "Protein",   value: Math.round(((data!.avg_macros.protein * 4) / macroTotal) * 100), color: MACRO_COLORS.protein },
            { name: "Carbs",     value: Math.round(((data!.avg_macros.carbs   * 4) / macroTotal) * 100), color: MACRO_COLORS.carbs   },
            { name: "Chất béo",  value: Math.round(((data!.avg_macros.fat     * 9) / macroTotal) * 100), color: MACRO_COLORS.fat      },
        ]
        : [];

    const mealCounts = data?.meal_type_counts ?? {};
    const mealBar = Object.entries(mealCounts)
        .map(([k, v]) => ({ name: MEAL_LABEL[k] ?? k, count: v }))
        .sort((a, b) => b.count - a.count);

    const trendData = (data?.daily_trend ?? []).map((d) => ({
        ...d,
        label: fmtDate(d.date),
    }));

    const handleGenerateDigest = async () => {
        setDigestState({ data: null, loading: true, error: null });
        try {
            const res = await api.post(`/reports/ai-digest?days=${period}`);
            setDigestState({ data: res.data as DigestResponse, loading: false, error: null });
        } catch (err: any) {
            setDigestState({
                data: null,
                loading: false,
                error: err?.response?.data?.error ?? "Không thể tạo phân tích. Thử lại sau.",
            });
        }
    };

    const digestFresh = digestState.data
        ? new Date(digestState.data.generated_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        : false;

    const toggleDigestSection = (key: string) =>
        setDigestOpen((prev) => ({ ...prev, [key]: !prev[key] }));

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-5 py-3 flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    title="Quay lại"
                    className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <h1 className="page-title flex-1">Báo cáo dinh dưỡng</h1>
                <Badge variant="secondary" className="gap-1">
                    <Crown className="w-3 h-3" />
                    Premium
                </Badge>
            </div>

            {!isPremium ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-4 text-center">
                    <Crown className="w-12 h-12 text-amber-500" />
                    <p className="text-lg font-bold">Tính năng Premium</p>
                    <p className="text-sm text-muted-foreground">
                        Nâng cấp lên Premium để xem báo cáo chi tiết về xu hướng calo, phân tích macro, nhận xét dinh dưỡng và phân tích AI cá nhân hoá.
                    </p>
                    <Button onClick={() => navigate("/subscription")}>Nâng cấp ngay</Button>
                </div>
            ) : (
                <div className="max-w-2xl mx-auto px-5 py-6 space-y-5">
                    {/* Period selector */}
                    <div className="flex gap-2">
                        {PERIOD_OPTIONS.map((o) => (
                            <button
                                key={o.value}
                                type="button"
                                onClick={() => setPeriod(o.value)}
                                className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-colors ${
                                    period === o.value
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border text-muted-foreground hover:bg-muted/50"
                                }`}
                            >
                                {o.label}
                            </button>
                        ))}
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            {/* KPI row */}
                            <div className="grid grid-cols-3 gap-3">
                                <KpiCard
                                    icon={<Flame className="w-4 h-4 text-orange-500" />}
                                    label="TB Calo/ngày"
                                    value={`${data?.avg_calories ?? 0}`}
                                    unit="kcal"
                                />
                                <KpiCard
                                    icon={<TrendingUp className="w-4 h-4 text-green-500" />}
                                    label="Tuân thủ"
                                    value={`${data?.adherence_pct ?? 0}`}
                                    unit="%"
                                />
                                <KpiCard
                                    icon={<Award className="w-4 h-4 text-amber-500" />}
                                    label="Streak"
                                    value={`${data?.streak_days ?? 0}`}
                                    unit="ngày"
                                />
                            </div>

                            {/* Adherence gauge */}
                            <Card>
                                <CardContent className="py-4">
                                    <AdherenceGauge pct={data?.adherence_pct ?? 0} />
                                </CardContent>
                            </Card>

                            {/* Calorie trend chart */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">Xu hướng Calo ({period} ngày)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={180}>
                                        <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis
                                                dataKey="label"
                                                tick={{ fontSize: 10, fill: "#9ca3af" }}
                                                interval={Math.floor(trendData.length / 6)}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                contentStyle={{
                                                    fontSize: 12,
                                                    borderRadius: 12,
                                                    border: "none",
                                                    boxShadow: "0 4px 12px 0 rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)",
                                                    background: "rgba(255,255,255,0.95)",
                                                }}
                                                formatter={(v: number) => [`${v} kcal`, "Calo"]}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="calories"
                                                stroke="#22c55e"
                                                strokeWidth={2}
                                                fill="url(#calGrad)"
                                                dot={false}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Macro breakdown */}
                            {macroPie.length > 0 && (
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">Phân bổ Macro (trung bình)</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex items-center gap-4">
                                        <PieChart width={120} height={120}>
                                            <Pie
                                                data={macroPie}
                                                cx={55}
                                                cy={55}
                                                innerRadius={32}
                                                outerRadius={52}
                                                dataKey="value"
                                                strokeWidth={1}
                                            >
                                                {macroPie.map((entry) => (
                                                    <Cell key={entry.name} fill={entry.color} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                        <div className="flex-1 space-y-2 text-sm">
                                            {(["protein", "carbs", "fat"] as const).map((key) => (
                                                <div key={key} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MACRO_COLORS[key] }} />
                                                        <span className="text-muted-foreground">{MACRO_LABELS[key]}</span>
                                                    </div>
                                                    <span className="font-semibold">{data?.avg_macros[key] ?? 0}g</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Meal type distribution */}
                            {mealBar.length > 0 && (
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">Bữa ăn thường xuyên</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {mealBar.map(({ name, count }) => {
                                            const max = mealBar[0].count;
                                            return (
                                                <div key={name} className="flex items-center gap-3 text-sm">
                                                    <span className="w-10 text-right text-muted-foreground shrink-0">{name}</span>
                                                    <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-primary"
                                                            style={{ width: `${Math.round((count / max) * 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="w-8 text-right font-medium">{count}</span>
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Adherence detail */}
                            <Card>
                                <CardContent className="py-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Ngày đã ghi ({period} ngày)</span>
                                        <span className="font-semibold">{data?.logged_days ?? 0} / {period}</span>
                                    </div>
                                    <div className="mt-2 bg-muted rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-green-500 transition-all"
                                            style={{ width: `${data?.adherence_pct ?? 0}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1.5">
                                        {(data?.adherence_pct ?? 0) >= 80
                                            ? "Xuất sắc! Bạn duy trì thói quen ghi nhật ký rất tốt."
                                            : (data?.adherence_pct ?? 0) >= 50
                                            ? "Khá tốt. Cố gắng ghi nhật ký đều đặn hơn nha."
                                            : "Bắt đầu ghi nhật ký mỗi ngày để theo dõi tiến trình tốt hơn."}
                                    </p>
                                </CardContent>
                            </Card>

                            {/* ── Insight cards ──────────────────────────────────── */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Lightbulb className="w-4 h-4 text-primary" />
                                    <h2 className="text-sm font-bold">Nhận xét dinh dưỡng</h2>
                                </div>
                                {insightsLoading ? (
                                    <div className="space-y-2">
                                        {[1, 2, 3].map((i) => (
                                            <Skeleton key={i} className="h-16 w-full rounded-xl" />
                                        ))}
                                    </div>
                                ) : (insightsData?.insights ?? []).length === 0 ? (
                                    <Card>
                                        <CardContent className="py-4 text-center text-sm text-muted-foreground">
                                            Chưa đủ dữ liệu để tạo nhận xét. Hãy ghi nhật ký thêm vài ngày nữa.
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="space-y-2">
                                        {(insightsData?.insights ?? []).map((insight, i) => {
                                            const style = INSIGHT_STYLES[insight.type];
                                            return (
                                                <div
                                                    key={i}
                                                    className={cn("rounded-xl border p-3.5 flex gap-3", style.border)}
                                                >
                                                    {style.icon}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">{insight.body}</p>
                                                        {insight.suggestion && (
                                                            <p className="text-xs text-foreground/70 mt-1 italic">
                                                                💡 {insight.suggestion}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* ── AI Deep-dive digest ────────────────────────────── */}
                            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/10">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-primary" />
                                            <CardTitle className="text-sm">Phân tích chuyên sâu AI</CardTitle>
                                        </div>
                                        {digestState.data && (
                                            <span className="text-[10px] text-muted-foreground">
                                                {digestState.data.cached ? "Đã lưu cache" : "Vừa tạo"} •{" "}
                                                {format(parseISO(digestState.data.generated_at), "dd/MM/yyyy")}
                                            </span>
                                        )}
                                    </div>
                                    {!digestState.data && !digestState.loading && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            AI phân tích {period} ngày nhật ký và đưa ra lời khuyên cá nhân hoá. Làm mới tối đa 1 lần/tuần.
                                        </p>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {digestState.loading ? (
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-full" />
                                            <Skeleton className="h-4 w-3/4" />
                                            <Skeleton className="h-4 w-5/6" />
                                            <p className="text-xs text-muted-foreground text-center pt-2">
                                                AI đang phân tích nhật ký của bạn...
                                            </p>
                                        </div>
                                    ) : digestState.error ? (
                                        <p className="text-sm text-destructive">{digestState.error}</p>
                                    ) : digestState.data ? (
                                        <DigestView content={digestState.data.content} open={digestOpen} toggle={toggleDigestSection} />
                                    ) : null}

                                    <Button
                                        onClick={handleGenerateDigest}
                                        disabled={digestState.loading || digestFresh}
                                        size="sm"
                                        className="w-full"
                                        variant={digestState.data ? "outline" : "default"}
                                    >
                                        {digestState.loading ? (
                                            <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Đang phân tích...</>
                                        ) : digestFresh ? (
                                            <><CheckCircle2 className="w-3.5 h-3.5 mr-2" />Đã cập nhật (7 ngày/lần)</>
                                        ) : (
                                            <><RefreshCw className="w-3.5 h-3.5 mr-2" />{digestState.data ? "Làm mới phân tích" : "Tạo phân tích AI"}</>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function DigestView({
    content,
    open,
    toggle,
}: {
    content: DigestContent;
    open: Record<string, boolean>;
    toggle: (key: string) => void;
}) {
    const sections: { key: keyof DigestContent; label: string; isList: boolean }[] = [
        { key: "nhan_xet_tong_quan", label: "Nhận xét tổng quan", isList: false },
        { key: "diem_manh", label: "Điểm mạnh", isList: true },
        { key: "can_cai_thien", label: "Cần cải thiện", isList: true },
        { key: "thuc_pham_nen_them", label: "Thực phẩm nên thêm", isList: true },
        { key: "thuc_pham_nen_giam", label: "Thực phẩm nên giảm", isList: true },
        { key: "ke_hoach_tuan_toi", label: "Kế hoạch tuần tới", isList: false },
    ];

    return (
        <div className="space-y-2">
            {sections.map(({ key, label, isList }) => {
                const value = content[key];
                if (!value || (Array.isArray(value) && value.length === 0)) return null;
                const isOpen = open[key] !== false; // default open

                return (
                    <div key={key} className="rounded-lg border border-border bg-background overflow-hidden">
                        <button
                            type="button"
                            className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
                            onClick={() => toggle(key)}
                        >
                            <span>{label}</span>
                            {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                        </button>
                        {isOpen && (
                            <div className="px-3 pb-3 text-sm text-muted-foreground">
                                {isList && Array.isArray(value) ? (
                                    <ul className="space-y-1">
                                        {(value as string[]).map((item, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p>{value as string}</p>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function KpiCard({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string; unit: string }) {
    return (
        <Card>
            <CardContent className="py-4 flex flex-col items-center gap-1 text-center">
                {icon}
                <p className="text-xl font-bold leading-none">
                    {value}<span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
            </CardContent>
        </Card>
    );
}
