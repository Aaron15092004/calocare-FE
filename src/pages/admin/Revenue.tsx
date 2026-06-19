import { useCallback, useEffect, useState } from "react";
import {
    ArrowUpRight,
    Banknote,
    Bot,
    Clock,
    CreditCard,
    ReceiptText,
    RefreshCw,
    ShieldCheck,
    TrendingUp,
    Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type RangeDays = 7 | 30 | 90 | 180;

interface RevenueSummary {
    range: {
        start_date: string;
        end_date: string;
        days: number;
    };
    totals: {
        completed_revenue: number;
        estimated_ai_cost_vnd: number;
        estimated_ai_cost_usd: number;
        estimated_net_profit_vnd: number;
        gross_margin_pct: number | null;
        completed_count: number;
        pending_amount: number;
        pending_count: number;
        failed_count: number;
        refunded_amount: number;
        refunded_count: number;
        today_revenue: number;
        today_count: number;
        month_to_date_revenue: number;
        month_to_date_count: number;
        previous_revenue: number;
        revenue_growth_pct: number | null;
    };
    charts: {
        daily_revenue: Array<{ date: string; revenue: number; count: number }>;
        by_plan: Array<{ plan_type: string; revenue: number; count: number }>;
        by_method: Array<{
            payment_method: string;
            revenue: number;
            pending_amount: number;
            count: number;
            completed_count: number;
        }>;
        by_target: Array<{ target_type: string; revenue: number; count: number }>;
        ai_cost_by_service: Array<{
            service: string;
            label: string;
            usage_count: number;
            total_days?: number;
            cost_usd: number;
            cost_vnd: number;
        }>;
    };
    accounting: {
        currency: "VND";
        usd_to_vnd: number;
        revenue_vnd: number;
        direct_ai_cost_vnd: number;
        estimated_net_profit_vnd: number;
        gross_margin_pct: number | null;
        formulas: {
            revenue: string;
            ai_cost: string;
            net_profit: string;
        };
    };
    automation: {
        payos_configured: boolean;
        payos_user_auto_activation: boolean;
        payos_store_auto_activation: boolean;
        bank_webhook_configured: boolean;
        bank_or_momo_auto_requires_provider_webhook: boolean;
        payos_webhook_path: string;
        payos_webhook_url: string | null;
    };
    recent_transactions: Array<{
        _id: string;
        user: { display_name?: string; email?: string } | null;
        store: { name?: string } | null;
        plan_type: string;
        target_type: string;
        status: string;
        amount: number;
        final_amount: number;
        discount_code?: string;
        payment_method?: string;
        payment_ref?: string;
        duration_months?: number;
        created_at: string;
        updated_at: string;
    }>;
}

const RANGE_OPTIONS: RangeDays[] = [7, 30, 90, 180];

const PLAN_LABELS: Record<string, string> = {
    premium: "Premium",
    family: "Family",
    pro: "Family",
    store_pro: "Store Pro",
};

const METHOD_LABELS: Record<string, string> = {
    payos: "Thanh toán tự động",
    bank_transfer: "Ngân hàng",
    momo: "MoMo",
    unknown: "Chưa rõ",
};

const TARGET_LABELS: Record<string, string> = {
    user: "Người dùng",
    store: "Quán ăn",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
    completed: "bg-green-100 text-green-700 border-green-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    failed: "bg-red-100 text-red-700 border-red-200",
    refunded: "bg-slate-100 text-slate-700 border-slate-200",
};

const formatVnd = (amount: number) => `${Math.round(amount || 0).toLocaleString("vi-VN")}₫`;
const formatUsd = (amount: number) => `$${Number(amount || 0).toFixed(4)}`;

const compactVnd = (amount: number) => {
    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `${Math.round(amount / 1_000)}K`;
    return `${amount || 0}`;
};

const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
    });

const formatDateTime = (date: string) =>
    new Date(date).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

const Revenue = () => {
    const { toast } = useToast();
    const [rangeDays, setRangeDays] = useState<RangeDays>(30);
    const [summary, setSummary] = useState<RevenueSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [confirmingWebhook, setConfirmingWebhook] = useState(false);

    const fetchRevenue = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get<RevenueSummary>("/admin/revenue", {
                params: { days: rangeDays },
            });
            setSummary(data);
        } catch (error) {
            console.error(error);
            toast({
                title: "Không tải được doanh thu",
                description: "Vui lòng kiểm tra quyền admin hoặc thử lại sau.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [rangeDays, toast]);

    useEffect(() => {
        fetchRevenue();
    }, [fetchRevenue]);

    const confirmPayOSWebhook = useCallback(async () => {
        if (!summary?.automation.payos_webhook_url) {
            toast({
                title: "Thiếu public webhook URL",
                description: "Hãy cấu hình PUBLIC_API_URL hoặc API_PUBLIC_URL ở backend production.",
                variant: "destructive",
            });
            return;
        }

        setConfirmingWebhook(true);
        try {
            await api.post("/admin/revenue/payos/confirm-webhook", {
                webhook_url: summary.automation.payos_webhook_url,
            });
            toast({
                title: "Đã xác nhận webhook PayOS",
                description: "PayOS sẽ gửi thông báo thanh toán về backend CaloVie.",
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Không xác nhận được webhook",
                description: "Kiểm tra PayOS env, public API URL và endpoint webhook production.",
                variant: "destructive",
            });
        } finally {
            setConfirmingWebhook(false);
        }
    }, [summary?.automation.payos_webhook_url, toast]);

    const dailyChart = (summary?.charts.daily_revenue || []).map((row) => ({
        ...row,
        label: formatDate(row.date),
    }));

    const totalMethodRevenue = (summary?.charts.by_method || []).reduce((sum, item) => sum + item.revenue, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Quản lý doanh thu</h1>
                    <p className="text-muted-foreground">
                        Theo dõi doanh thu, giao dịch và trạng thái tự động kích hoạt gói.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-xl border bg-background p-1">
                        {RANGE_OPTIONS.map((days) => (
                            <button
                                key={days}
                                type="button"
                                onClick={() => setRangeDays(days)}
                                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                    rangeDays === days
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:bg-muted"
                                }`}
                            >
                                {days} ngày
                            </button>
                        ))}
                    </div>
                    <Button variant="outline" onClick={fetchRevenue} disabled={loading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Làm mới
                    </Button>
                </div>
            </div>

            {loading && !summary ? (
                <div className="flex h-64 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                </div>
            ) : summary ? (
                <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
                        <MetricCard
                            icon={Banknote}
                            label={`Doanh thu ${summary.range.days} ngày`}
                            value={formatVnd(summary.totals.completed_revenue)}
                            helper={
                                summary.totals.revenue_growth_pct == null
                                    ? "Chưa đủ dữ liệu kỳ trước"
                                    : `${summary.totals.revenue_growth_pct >= 0 ? "+" : ""}${summary.totals.revenue_growth_pct}% so với kỳ trước`
                            }
                            tone="emerald"
                        />
                        <MetricCard
                            icon={Clock}
                            label="Đang chờ thanh toán"
                            value={formatVnd(summary.totals.pending_amount)}
                            helper={`${summary.totals.pending_count} giao dịch chờ`}
                            tone="amber"
                        />
                        <MetricCard
                            icon={Bot}
                            label="Chi phí AI ước tính"
                            value={formatVnd(summary.totals.estimated_ai_cost_vnd)}
                            helper={`~$${summary.totals.estimated_ai_cost_usd.toFixed(4)} trong kỳ`}
                            tone="violet"
                        />
                        <MetricCard
                            icon={Wallet}
                            label="Lợi nhuận sau AI"
                            value={formatVnd(summary.totals.estimated_net_profit_vnd)}
                            helper={summary.totals.gross_margin_pct == null ? "Chưa có doanh thu" : `${summary.totals.gross_margin_pct}% biên gộp`}
                            tone="slate"
                        />
                        <MetricCard
                            icon={TrendingUp}
                            label="Tháng này"
                            value={formatVnd(summary.totals.month_to_date_revenue)}
                            helper={`${summary.totals.month_to_date_count} giao dịch thành công`}
                            tone="cyan"
                        />
                        <MetricCard
                            icon={CreditCard}
                            label="Hôm nay"
                            value={formatVnd(summary.totals.today_revenue)}
                            helper={`${summary.totals.today_count} giao dịch thành công`}
                            tone="blue"
                        />
                    </div>

                    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-emerald-50/50">
                        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-semibold">Tự động kích hoạt thanh toán</p>
                                    <p className="text-sm text-muted-foreground">
                                        PayOS đã được nối với webhook để tự chuyển Premium, Family và Store Pro sau khi nhận tiền.
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Webhook:{" "}
                                        <code className="rounded bg-background px-1 py-0.5">
                                            {summary.automation.payos_webhook_url || summary.automation.payos_webhook_path}
                                        </code>
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Badge className={summary.automation.payos_configured ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                                    PayOS {summary.automation.payos_configured ? "đã cấu hình" : "chưa có env"}
                                </Badge>
                                <Badge className="bg-slate-100 text-slate-700">
                                    Bank/MoMo đã khóa
                                </Badge>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!summary.automation.payos_configured || !summary.automation.payos_webhook_url || confirmingWebhook}
                                    onClick={confirmPayOSWebhook}
                                >
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    {confirmingWebhook ? "Đang xác nhận..." : "Xác nhận PayOS webhook"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <ReceiptText className="h-4 w-4 text-primary" />
                                Luồng kế toán sau chi phí AI
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-3">
                                <div className="rounded-2xl border bg-muted/30 p-4">
                                    <p className="text-xs font-medium text-muted-foreground">Doanh thu ghi nhận</p>
                                    <p className="mt-1 text-xl font-bold">{formatVnd(summary.accounting.revenue_vnd)}</p>
                                    <p className="mt-1 text-[11px] text-muted-foreground">{summary.accounting.formulas.revenue}</p>
                                </div>
                                <div className="rounded-2xl border bg-violet-50/60 p-4">
                                    <p className="text-xs font-medium text-violet-700">Chi phí AI trực tiếp</p>
                                    <p className="mt-1 text-xl font-bold text-violet-800">{formatVnd(summary.accounting.direct_ai_cost_vnd)}</p>
                                    <p className="mt-1 text-[11px] text-violet-700">
                                        {summary.accounting.formulas.ai_cost} · tỷ giá {summary.accounting.usd_to_vnd.toLocaleString("vi-VN")} VND/USD
                                    </p>
                                </div>
                                <div className="rounded-2xl border bg-emerald-50/60 p-4">
                                    <p className="text-xs font-medium text-emerald-700">Lợi nhuận ước tính</p>
                                    <p className="mt-1 text-xl font-bold text-emerald-800">{formatVnd(summary.accounting.estimated_net_profit_vnd)}</p>
                                    <p className="mt-1 text-[11px] text-emerald-700">{summary.accounting.formulas.net_profit}</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-2xl border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/40 text-left text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Dịch vụ</th>
                                            <th className="px-4 py-3 font-medium">Lượt dùng</th>
                                            <th className="px-4 py-3 font-medium">USD</th>
                                            <th className="px-4 py-3 font-medium">Quy đổi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summary.charts.ai_cost_by_service.map((item) => (
                                            <tr key={item.service} className="border-t">
                                                <td className="px-4 py-3 font-medium">{item.label}</td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {item.usage_count.toLocaleString("vi-VN")}
                                                    {item.total_days ? ` · ${item.total_days} ngày plan` : ""}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">{formatUsd(item.cost_usd)}</td>
                                                <td className="px-4 py-3 font-semibold">{formatVnd(item.cost_vnd)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                        <Card className="xl:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-base">Doanh thu theo ngày</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={280}>
                                    <AreaChart data={dailyChart} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => compactVnd(Number(value))} />
                                        <Tooltip
                                            formatter={(value: number, name: string) =>
                                                name === "revenue"
                                                    ? [formatVnd(value), "Doanh thu"]
                                                    : [value, "Giao dịch"]
                                            }
                                            labelFormatter={(label) => `Ngày ${label}`}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="revenue"
                                            stroke="#059669"
                                            strokeWidth={2}
                                            fill="url(#revenueGradient)"
                                            name="revenue"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Theo gói</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {summary.charts.by_plan.length === 0 ? (
                                    <EmptyText>Chưa có giao dịch thành công</EmptyText>
                                ) : (
                                    summary.charts.by_plan.map((item) => (
                                        <BreakdownRow
                                            key={item.plan_type}
                                            label={PLAN_LABELS[item.plan_type] || item.plan_type}
                                            amount={item.revenue}
                                            count={item.count}
                                            total={summary.totals.completed_revenue}
                                        />
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Phương thức thanh toán</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={summary.charts.by_method.map((row) => ({
                                        ...row,
                                        label: METHOD_LABELS[row.payment_method] || row.payment_method,
                                    }))} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => compactVnd(Number(value))} />
                                        <Tooltip formatter={(value: number) => formatVnd(value)} />
                                        <Bar dataKey="revenue" fill="#0f766e" radius={[6, 6, 0, 0]} name="Đã nhận" />
                                        <Bar dataKey="pending_amount" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Đang chờ" />
                                    </BarChart>
                                </ResponsiveContainer>
                                <div className="mt-4 space-y-2">
                                    {summary.charts.by_method.map((item) => (
                                        <BreakdownRow
                                            key={item.payment_method}
                                            label={METHOD_LABELS[item.payment_method] || item.payment_method}
                                            amount={item.revenue}
                                            count={item.completed_count}
                                            total={totalMethodRevenue}
                                            pending={item.pending_amount}
                                        />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Nguồn doanh thu</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {summary.charts.by_target.length === 0 ? (
                                    <EmptyText>Chưa có nguồn doanh thu</EmptyText>
                                ) : (
                                    summary.charts.by_target.map((item) => (
                                        <BreakdownRow
                                            key={item.target_type}
                                            label={TARGET_LABELS[item.target_type] || item.target_type}
                                            amount={item.revenue}
                                            count={item.count}
                                            total={summary.totals.completed_revenue}
                                        />
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base">Giao dịch gần đây</CardTitle>
                            <Badge variant="outline">{summary.recent_transactions.length} giao dịch</Badge>
                        </CardHeader>
                        <CardContent>
                            {summary.recent_transactions.length === 0 ? (
                                <EmptyText>Chưa có giao dịch trong khoảng thời gian này</EmptyText>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left text-muted-foreground">
                                                <th className="pb-3 font-medium">Khách hàng</th>
                                                <th className="pb-3 font-medium">Gói</th>
                                                <th className="pb-3 font-medium">Số tiền</th>
                                                <th className="pb-3 font-medium">Phương thức</th>
                                                <th className="pb-3 font-medium">Trạng thái</th>
                                                <th className="pb-3 font-medium">Thời gian</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {summary.recent_transactions.map((tx) => (
                                                <tr key={tx._id} className="border-b last:border-0">
                                                    <td className="py-3">
                                                        <div>
                                                            <p className="font-medium">
                                                                {tx.target_type === "store"
                                                                    ? tx.store?.name || "Quán ăn"
                                                                    : tx.user?.display_name || "Người dùng"}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {tx.user?.email || TARGET_LABELS[tx.target_type] || tx.target_type}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="py-3">
                                                        <Badge variant="secondary">
                                                            {PLAN_LABELS[tx.plan_type] || tx.plan_type}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3">
                                                        <p className="font-semibold">{formatVnd(tx.final_amount ?? tx.amount)}</p>
                                                        {tx.discount_code && (
                                                            <p className="text-xs text-green-600">Mã {tx.discount_code}</p>
                                                        )}
                                                    </td>
                                                    <td className="py-3 text-muted-foreground">
                                                        {METHOD_LABELS[tx.payment_method || "unknown"] || tx.payment_method || "Chưa rõ"}
                                                    </td>
                                                    <td className="py-3">
                                                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[tx.status] || "bg-muted text-muted-foreground"}`}>
                                                            {tx.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 text-muted-foreground">
                                                        {formatDateTime(tx.created_at)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            ) : null}
        </div>
    );
};

const toneClass: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    cyan: "bg-cyan-100 text-cyan-700",
    blue: "bg-blue-100 text-blue-700",
    violet: "bg-violet-100 text-violet-700",
    slate: "bg-slate-100 text-slate-700",
};

function MetricCard({
    icon: Icon,
    label,
    value,
    helper,
    tone,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    helper: string;
    tone: keyof typeof toneClass;
}) {
    return (
        <Card>
            <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className="mt-1 text-2xl font-bold">{value}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <ArrowUpRight className="h-3 w-3" />
                            {helper}
                        </p>
                    </div>
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass[tone]}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function BreakdownRow({
    label,
    amount,
    count,
    total,
    pending,
}: {
    label: string;
    amount: number;
    count: number;
    total: number;
    pending?: number;
}) {
    const pct = total > 0 ? Math.min(100, Math.round((amount / total) * 100)) : 0;
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">
                        {count} giao dịch thành công
                        {pending ? ` · ${formatVnd(pending)} đang chờ` : ""}
                    </p>
                </div>
                <p className="font-semibold">{formatVnd(amount)}</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function EmptyText({ children }: { children: string }) {
    return (
        <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
            {children}
        </div>
    );
}

export default Revenue;
