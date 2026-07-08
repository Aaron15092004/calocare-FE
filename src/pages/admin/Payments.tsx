// src/pages/admin/Payments.tsx — Thanh toán & Doanh thu (merged)
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Banknote,
    Bot,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    CreditCard,
    Crown,
    ReceiptText,
    RefreshCw,
    Search,
    ShieldCheck,
    TrendingUp,
    Users,
    Wallet,
    XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type RangeDays = 7 | 30 | 90 | 180;
type Granularity = "day" | "week" | "month";

interface PeriodRow {
    period: string;
    revenue: number;
    completed_count: number;
    pending_amount: number;
    pending_count: number;
    refunded_amount: number;
    failed_count: number;
}

interface RevenueSummary {
    range: { start_date: string; end_date: string; days: number };
    generated_at?: string;
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
        weekly_revenue: PeriodRow[];
        monthly_revenue: PeriodRow[];
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
        formulas: { revenue: string; ai_cost: string; net_profit: string };
    };
    automation: {
        payos_configured: boolean;
        payos_webhook_path: string;
        payos_webhook_url: string | null;
    };
    top_customers: Array<{
        user_id: string;
        display_name: string;
        email: string;
        subscription_tier: string;
        subscription_expires_at: string | null;
        total_spent: number;
        tx_count: number;
        first_payment_at: string;
        last_payment_at: string;
        plans: string[];
        methods: string[];
    }>;
    recent_transactions: TransactionRow[];
}

interface TransactionRow {
    _id: string;
    user: { display_name?: string; email?: string; subscription_tier?: string } | null;
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
    notes?: string;
    created_at: string;
    updated_at: string;
}

interface TransactionsResponse {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    transactions: TransactionRow[];
}

interface PendingTransaction {
    _id: string;
    user_id?: { display_name?: string; email?: string };
    store_id?: string;
    target_type?: "user" | "store";
    plan_type: string;
    payment_method?: string;
    duration_months?: number;
    amount: number;
    final_amount?: number;
    created_at: string;
}

interface ApiError {
    response?: { data?: { error?: string; message?: string } };
}

const RANGE_OPTIONS: RangeDays[] = [7, 30, 90, 180];

const PLAN_LABELS: Record<string, string> = {
    premium: "Premium",
    family: "Family",
    pro: "Family",
    store_pro: "Store Pro",
};

const METHOD_LABELS: Record<string, string> = {
    payos: "PayOS (tự động)",
    bank_transfer: "Ngân hàng",
    momo: "MoMo",
    unknown: "Chưa rõ",
};

const TARGET_LABELS: Record<string, string> = {
    user: "Người dùng",
    store: "Quán ăn",
};

const STATUS_LABELS: Record<string, string> = {
    completed: "Thành công",
    pending: "Đang chờ",
    failed: "Thất bại",
    refunded: "Hoàn tiền",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
    completed: "bg-green-100 text-green-700 border-green-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    failed: "bg-red-100 text-red-700 border-red-200",
    refunded: "bg-slate-100 text-slate-700 border-slate-200",
};

const TIER_BADGE_CLASS: Record<string, string> = {
    free: "bg-gray-100 text-gray-600",
    premium: "bg-purple-100 text-purple-700",
    family: "bg-blue-100 text-blue-700",
    pro: "bg-blue-100 text-blue-700",
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
    new Date(date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

const formatDateTime = (date: string) =>
    new Date(date).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

const formatFullDate = (date: string) =>
    new Date(date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

// "2026-07" → "Th 07/2026"; "2026-W28" → "Tuần 28 '26"
const formatPeriodLabel = (period: string) => {
    if (period.includes("-W")) {
        const [year, week] = period.split("-W");
        return `Tuần ${week} '${year.slice(2)}`;
    }
    const [year, month] = period.split("-");
    return `Th ${month}/${year}`;
};

const StatusBadge = ({ status }: { status: string }) => (
    <span
        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
            STATUS_BADGE_CLASS[status] || "bg-muted text-muted-foreground"
        }`}
    >
        {STATUS_LABELS[status] || status}
    </span>
);

const Payments = () => {
    const { toast } = useToast();

    // ---- Overview / summary state ----
    const [rangeDays, setRangeDays] = useState<RangeDays>(30);
    const [summary, setSummary] = useState<RevenueSummary | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [granularity, setGranularity] = useState<Granularity>("day");
    const [confirmingWebhook, setConfirmingWebhook] = useState(false);

    // ---- Pending confirmations state ----
    const [pending, setPending] = useState<PendingTransaction[]>([]);
    const [pendingLoading, setPendingLoading] = useState(true);
    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; tx: PendingTransaction | null }>({
        open: false,
        tx: null,
    });
    const [paymentRef, setPaymentRef] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // ---- Transactions tab state ----
    const [txData, setTxData] = useState<TransactionsResponse | null>(null);
    const [txLoading, setTxLoading] = useState(false);
    const [txPage, setTxPage] = useState(1);
    const [txStatus, setTxStatus] = useState("all");
    const [txMethod, setTxMethod] = useState("all");
    const [txSearch, setTxSearch] = useState("");
    const [txSearchInput, setTxSearchInput] = useState("");

    const fetchSummary = useCallback(async () => {
        setSummaryLoading(true);
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
            setSummaryLoading(false);
        }
    }, [rangeDays, toast]);

    const fetchPending = useCallback(async () => {
        setPendingLoading(true);
        try {
            const { data } = await api.get("/subscription/admin/pending");
            setPending(data.data || []);
        } catch (err) {
            console.error(err);
            toast({ title: "Lỗi tải giao dịch chờ", variant: "destructive" });
        } finally {
            setPendingLoading(false);
        }
    }, [toast]);

    const fetchTransactions = useCallback(async () => {
        setTxLoading(true);
        try {
            const { data } = await api.get<TransactionsResponse>("/admin/revenue/transactions", {
                params: {
                    page: txPage,
                    limit: 20,
                    status: txStatus === "all" ? undefined : txStatus,
                    method: txMethod === "all" ? undefined : txMethod,
                    search: txSearch || undefined,
                },
            });
            setTxData(data);
        } catch (err) {
            console.error(err);
            toast({ title: "Lỗi tải lịch sử giao dịch", variant: "destructive" });
        } finally {
            setTxLoading(false);
        }
    }, [txPage, txStatus, txMethod, txSearch, toast]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    useEffect(() => {
        fetchPending();
    }, [fetchPending]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const refreshAll = () => {
        fetchSummary();
        fetchPending();
        fetchTransactions();
    };

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

    const openConfirm = (tx: PendingTransaction) => {
        setConfirmDialog({ open: true, tx });
        setPaymentRef("");
    };

    const handleConfirm = async () => {
        if (!confirmDialog.tx) return;
        setSubmitting(true);
        try {
            if (confirmDialog.tx.target_type === "store") {
                await api.post(`/stores/${confirmDialog.tx.store_id}/confirm-upgrade`, {
                    tx_id: confirmDialog.tx._id,
                    payment_ref: paymentRef || undefined,
                });
            } else {
                await api.post(`/subscription/confirm/${confirmDialog.tx._id}`, {
                    payment_ref: paymentRef || undefined,
                });
            }
            toast({ title: "Xác nhận thành công", description: "Gói đã được kích hoạt cho người dùng." });
            setConfirmDialog({ open: false, tx: null });
            refreshAll();
        } catch (err: unknown) {
            const apiError = err as ApiError;
            toast({
                title: "Lỗi xác nhận",
                description: apiError.response?.data?.message || apiError.response?.data?.error || "Vui lòng thử lại.",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const dailyChart = useMemo(
        () =>
            (summary?.charts.daily_revenue || []).map((row) => ({
                label: formatDate(row.date),
                revenue: row.revenue,
                count: row.count,
            })),
        [summary],
    );

    const periodRows: PeriodRow[] =
        granularity === "week"
            ? summary?.charts.weekly_revenue || []
            : summary?.charts.monthly_revenue || [];

    const periodChart = periodRows.map((row) => ({
        label: formatPeriodLabel(row.period),
        revenue: row.revenue,
        pending_amount: row.pending_amount,
    }));

    const totalMethodRevenue = (summary?.charts.by_method || []).reduce((sum, item) => sum + item.revenue, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Thanh toán & Doanh thu</h1>
                    <p className="text-muted-foreground">
                        Tài chính, giao dịch, xác nhận thanh toán và chăm sóc khách hàng — một nơi duy nhất.
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
                    <Button variant="outline" onClick={refreshAll} disabled={summaryLoading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${summaryLoading ? "animate-spin" : ""}`} />
                        Làm mới
                    </Button>
                </div>
            </div>

            {/* Metric cards — always visible above tabs */}
            {summary && (
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
                        helper={
                            summary.totals.gross_margin_pct == null
                                ? "Chưa có doanh thu"
                                : `${summary.totals.gross_margin_pct}% biên gộp`
                        }
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
            )}

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
                    <TabsTrigger value="overview" className="gap-1.5">
                        <TrendingUp className="h-4 w-4" />
                        Tổng quan
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="gap-1.5">
                        <Clock className="h-4 w-4" />
                        Chờ xác nhận
                        {pending.length > 0 && (
                            <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                {pending.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="transactions" className="gap-1.5">
                        <ReceiptText className="h-4 w-4" />
                        Giao dịch
                    </TabsTrigger>
                    <TabsTrigger value="customers" className="gap-1.5">
                        <Users className="h-4 w-4" />
                        Khách hàng
                    </TabsTrigger>
                </TabsList>

                {/* ============ TAB: TỔNG QUAN ============ */}
                <TabsContent value="overview" className="space-y-4">
                    {summaryLoading && !summary ? (
                        <div className="flex h-64 items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                        </div>
                    ) : summary ? (
                        <>
                            {/* Automation banner */}
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
                                        <Badge className="bg-slate-100 text-slate-700">Bank/MoMo đã khóa</Badge>
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

                            {/* Revenue chart with day/week/month granularity */}
                            <Card>
                                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <CardTitle className="text-base">Doanh thu theo thời gian</CardTitle>
                                    <div className="flex rounded-lg border bg-background p-0.5">
                                        {(
                                            [
                                                ["day", "Ngày"],
                                                ["week", "Tuần"],
                                                ["month", "Tháng"],
                                            ] as Array<[Granularity, string]>
                                        ).map(([value, label]) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => setGranularity(value)}
                                                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                                                    granularity === value
                                                        ? "bg-primary text-primary-foreground shadow-sm"
                                                        : "text-muted-foreground hover:bg-muted"
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {granularity === "day" ? (
                                        <ResponsiveContainer width="100%" height={280}>
                                            <AreaChart data={dailyChart} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => compactVnd(Number(value))} />
                                                <Tooltip
                                                    formatter={(value: number, name: string) =>
                                                        name === "revenue" ? [formatVnd(value), "Doanh thu"] : [value, "Giao dịch"]
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
                                    ) : (
                                        <>
                                            <ResponsiveContainer width="100%" height={280}>
                                                <BarChart data={periodChart} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => compactVnd(Number(value))} />
                                                    <Tooltip formatter={(value: number, name: string) => [formatVnd(value), name === "revenue" ? "Đã nhận" : "Đang chờ"]} />
                                                    <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => (value === "revenue" ? "Đã nhận" : "Đang chờ")} />
                                                    <Bar dataKey="revenue" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={44} name="revenue" />
                                                    <Bar dataKey="pending_amount" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={44} name="pending_amount" />
                                                </BarChart>
                                            </ResponsiveContainer>

                                            {/* Financial breakdown table for week/month */}
                                            <div className="mt-4 overflow-x-auto rounded-2xl border">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-muted/40 text-left text-muted-foreground">
                                                        <tr>
                                                            <th className="px-4 py-2.5 font-medium">{granularity === "week" ? "Tuần" : "Tháng"}</th>
                                                            <th className="px-4 py-2.5 font-medium text-right">Doanh thu</th>
                                                            <th className="px-4 py-2.5 font-medium text-right">GD thành công</th>
                                                            <th className="px-4 py-2.5 font-medium text-right">Đang chờ</th>
                                                            <th className="px-4 py-2.5 font-medium text-right">Hoàn tiền</th>
                                                            <th className="px-4 py-2.5 font-medium text-right">Thất bại</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {periodRows.map((row) => (
                                                            <tr key={row.period} className="border-t">
                                                                <td className="px-4 py-2.5 font-medium">{formatPeriodLabel(row.period)}</td>
                                                                <td className="px-4 py-2.5 text-right font-semibold">{formatVnd(row.revenue)}</td>
                                                                <td className="px-4 py-2.5 text-right text-muted-foreground">{row.completed_count}</td>
                                                                <td className="px-4 py-2.5 text-right text-amber-600">
                                                                    {row.pending_amount > 0 ? `${formatVnd(row.pending_amount)} (${row.pending_count})` : "—"}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-right text-slate-500">
                                                                    {row.refunded_amount > 0 ? formatVnd(row.refunded_amount) : "—"}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-right text-red-500">
                                                                    {row.failed_count > 0 ? row.failed_count : "—"}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Accounting flow */}
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

                            {/* Breakdown: plan / method / target */}
                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
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

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Phương thức thanh toán</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {summary.charts.by_method.length === 0 ? (
                                            <EmptyText>Chưa có giao dịch</EmptyText>
                                        ) : (
                                            summary.charts.by_method.map((item) => (
                                                <BreakdownRow
                                                    key={item.payment_method}
                                                    label={METHOD_LABELS[item.payment_method] || item.payment_method}
                                                    amount={item.revenue}
                                                    count={item.completed_count}
                                                    total={totalMethodRevenue}
                                                    pending={item.pending_amount}
                                                />
                                            ))
                                        )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Nguồn doanh thu</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
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
                        </>
                    ) : null}
                </TabsContent>

                {/* ============ TAB: CHỜ XÁC NHẬN ============ */}
                <TabsContent value="pending" className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <MetricCard
                            icon={Clock}
                            label="Giao dịch đang chờ"
                            value={String(pending.length)}
                            helper="Cần xác nhận thủ công"
                            tone="amber"
                        />
                        <MetricCard
                            icon={CreditCard}
                            label="Tổng cần xác nhận"
                            value={formatVnd(pending.reduce((s, t) => s + (t.final_amount || t.amount || 0), 0))}
                            helper="Giá trị các giao dịch chờ"
                            tone="emerald"
                        />
                        <MetricCard
                            icon={Users}
                            label="Gói người dùng"
                            value={String(pending.filter((t) => t.target_type !== "store").length)}
                            helper={`${pending.filter((t) => t.target_type === "store").length} gói quán ăn`}
                            tone="blue"
                        />
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Giao dịch đang chờ xác nhận</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {pendingLoading ? (
                                <div className="flex justify-center py-12">
                                    <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
                                </div>
                            ) : pending.length === 0 ? (
                                <div className="py-12 text-center">
                                    <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-primary opacity-50" />
                                    <p className="text-muted-foreground">Không có giao dịch nào đang chờ</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left text-muted-foreground">
                                                <th className="pb-3 font-medium">Người dùng</th>
                                                <th className="pb-3 font-medium">Gói</th>
                                                <th className="pb-3 font-medium">Loại</th>
                                                <th className="pb-3 font-medium">Số tiền</th>
                                                <th className="pb-3 font-medium">P.thức</th>
                                                <th className="pb-3 font-medium">Thời hạn</th>
                                                <th className="pb-3 font-medium">Ngày tạo</th>
                                                <th className="pb-3 font-medium">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pending.map((tx) => (
                                                <tr key={tx._id} className="border-b last:border-0 hover:bg-muted/30">
                                                    <td className="py-3">
                                                        <p className="font-medium">{tx.user_id?.display_name || "—"}</p>
                                                        <p className="text-xs text-muted-foreground">{tx.user_id?.email || "—"}</p>
                                                    </td>
                                                    <td className="py-3">
                                                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                                            {PLAN_LABELS[tx.plan_type] || tx.plan_type}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 text-xs text-muted-foreground">
                                                        {tx.target_type === "store" ? "Quán ăn" : "Cá nhân"}
                                                    </td>
                                                    <td className="py-3">
                                                        <p className="font-medium">{formatVnd(tx.final_amount || tx.amount)}</p>
                                                        {tx.final_amount !== undefined && tx.final_amount !== tx.amount && (
                                                            <p className="text-xs text-muted-foreground line-through">{formatVnd(tx.amount)}</p>
                                                        )}
                                                    </td>
                                                    <td className="py-3 text-xs text-muted-foreground">
                                                        {METHOD_LABELS[tx.payment_method || "unknown"] || tx.payment_method || "—"}
                                                    </td>
                                                    <td className="py-3 text-xs text-muted-foreground">{tx.duration_months} tháng</td>
                                                    <td className="py-3 text-xs text-muted-foreground">{formatDateTime(tx.created_at)}</td>
                                                    <td className="py-3">
                                                        <Button size="sm" onClick={() => openConfirm(tx)} className="h-7 text-xs">
                                                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                                            Xác nhận
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ============ TAB: GIAO DỊCH ============ */}
                <TabsContent value="transactions" className="space-y-4">
                    <Card>
                        <CardHeader className="space-y-3">
                            <CardTitle className="text-base">Lịch sử giao dịch</CardTitle>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <div className="relative flex-1 sm:max-w-xs">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Tên, email, mã tham chiếu, mã giảm giá..."
                                        className="pl-9"
                                        value={txSearchInput}
                                        onChange={(e) => setTxSearchInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                setTxPage(1);
                                                setTxSearch(txSearchInput.trim());
                                            }
                                        }}
                                    />
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                        setTxPage(1);
                                        setTxSearch(txSearchInput.trim());
                                    }}
                                >
                                    Tìm
                                </Button>
                                <Select
                                    value={txStatus}
                                    onValueChange={(value) => {
                                        setTxPage(1);
                                        setTxStatus(value);
                                    }}
                                >
                                    <SelectTrigger className="w-[150px]">
                                        <SelectValue placeholder="Trạng thái" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Mọi trạng thái</SelectItem>
                                        <SelectItem value="completed">Thành công</SelectItem>
                                        <SelectItem value="pending">Đang chờ</SelectItem>
                                        <SelectItem value="failed">Thất bại</SelectItem>
                                        <SelectItem value="refunded">Hoàn tiền</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={txMethod}
                                    onValueChange={(value) => {
                                        setTxPage(1);
                                        setTxMethod(value);
                                    }}
                                >
                                    <SelectTrigger className="w-[160px]">
                                        <SelectValue placeholder="Phương thức" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Mọi phương thức</SelectItem>
                                        <SelectItem value="payos">PayOS</SelectItem>
                                        <SelectItem value="bank_transfer">Ngân hàng</SelectItem>
                                        <SelectItem value="momo">MoMo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {txLoading && !txData ? (
                                <div className="flex justify-center py-12">
                                    <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
                                </div>
                            ) : !txData || txData.transactions.length === 0 ? (
                                <EmptyText>Không có giao dịch phù hợp bộ lọc</EmptyText>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b text-left text-muted-foreground">
                                                    <th className="pb-3 font-medium">Khách hàng</th>
                                                    <th className="pb-3 font-medium">Gói</th>
                                                    <th className="pb-3 font-medium">Số tiền</th>
                                                    <th className="pb-3 font-medium">Phương thức / Mã tham chiếu</th>
                                                    <th className="pb-3 font-medium">Trạng thái</th>
                                                    <th className="pb-3 font-medium">Thời hạn</th>
                                                    <th className="pb-3 font-medium">Thời gian</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {txData.transactions.map((tx) => (
                                                    <tr key={tx._id} className="border-b last:border-0 hover:bg-muted/30">
                                                        <td className="py-3">
                                                            <p className="font-medium">
                                                                {tx.target_type === "store"
                                                                    ? tx.store?.name || "Quán ăn"
                                                                    : tx.user?.display_name || "Người dùng"}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {tx.user?.email || TARGET_LABELS[tx.target_type] || tx.target_type}
                                                            </p>
                                                        </td>
                                                        <td className="py-3">
                                                            <Badge variant="secondary">{PLAN_LABELS[tx.plan_type] || tx.plan_type}</Badge>
                                                        </td>
                                                        <td className="py-3">
                                                            <p className="font-semibold">{formatVnd(tx.final_amount ?? tx.amount)}</p>
                                                            {tx.discount_code && (
                                                                <p className="text-xs text-green-600">Mã {tx.discount_code}</p>
                                                            )}
                                                        </td>
                                                        <td className="py-3">
                                                            <p className="text-muted-foreground">
                                                                {METHOD_LABELS[tx.payment_method || "unknown"] || tx.payment_method || "Chưa rõ"}
                                                            </p>
                                                            {tx.payment_ref && (
                                                                <p className="font-mono text-xs text-muted-foreground">{tx.payment_ref}</p>
                                                            )}
                                                            {tx.notes && (
                                                                <p className="max-w-[200px] truncate text-xs text-muted-foreground" title={tx.notes}>
                                                                    {tx.notes}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="py-3">
                                                            <StatusBadge status={tx.status} />
                                                        </td>
                                                        <td className="py-3 text-xs text-muted-foreground">
                                                            {tx.duration_months ? `${tx.duration_months} tháng` : "—"}
                                                        </td>
                                                        <td className="py-3 text-xs text-muted-foreground">{formatDateTime(tx.created_at)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    <div className="mt-4 flex items-center justify-between border-t pt-3">
                                        <p className="text-xs text-muted-foreground">
                                            {txData.total.toLocaleString("vi-VN")} giao dịch · trang {txData.page}/{txData.total_pages}
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={txPage <= 1 || txLoading}
                                                onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                                Trước
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={txPage >= txData.total_pages || txLoading}
                                                onClick={() => setTxPage((p) => p + 1)}
                                            >
                                                Sau
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ============ TAB: KHÁCH HÀNG ============ */}
                <TabsContent value="customers" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Crown className="h-4 w-4 text-amber-500" />
                                Khách hàng chi tiêu nhiều nhất (toàn thời gian)
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Ưu tiên chăm sóc các khách hàng này — liên hệ trước khi gói hết hạn để giữ chân.
                            </p>
                        </CardHeader>
                        <CardContent>
                            {!summary ? (
                                <div className="flex justify-center py-12">
                                    <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
                                </div>
                            ) : summary.top_customers.length === 0 ? (
                                <EmptyText>Chưa có khách hàng thanh toán thành công</EmptyText>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left text-muted-foreground">
                                                <th className="pb-3 font-medium">#</th>
                                                <th className="pb-3 font-medium">Khách hàng</th>
                                                <th className="pb-3 font-medium">Gói hiện tại</th>
                                                <th className="pb-3 font-medium text-right">Tổng chi tiêu</th>
                                                <th className="pb-3 font-medium text-right">Số GD</th>
                                                <th className="pb-3 font-medium">Đã mua</th>
                                                <th className="pb-3 font-medium">Lần cuối</th>
                                                <th className="pb-3 font-medium">Hết hạn</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {summary.top_customers.map((customer, index) => {
                                                const expires = customer.subscription_expires_at
                                                    ? new Date(customer.subscription_expires_at)
                                                    : null;
                                                const expiringSoon =
                                                    expires !== null &&
                                                    expires.getTime() - Date.now() < 7 * 86_400_000 &&
                                                    expires.getTime() > Date.now();
                                                return (
                                                    <tr key={customer.user_id} className="border-b last:border-0 hover:bg-muted/30">
                                                        <td className="py-3 text-muted-foreground">{index + 1}</td>
                                                        <td className="py-3">
                                                            <p className="font-medium">{customer.display_name}</p>
                                                            <p className="text-xs text-muted-foreground">{customer.email}</p>
                                                        </td>
                                                        <td className="py-3">
                                                            <span
                                                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                                                    TIER_BADGE_CLASS[customer.subscription_tier] || TIER_BADGE_CLASS.free
                                                                }`}
                                                            >
                                                                {customer.subscription_tier}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 text-right font-semibold">{formatVnd(customer.total_spent)}</td>
                                                        <td className="py-3 text-right text-muted-foreground">{customer.tx_count}</td>
                                                        <td className="py-3">
                                                            <div className="flex flex-wrap gap-1">
                                                                {customer.plans.map((plan) => (
                                                                    <Badge key={plan} variant="outline" className="text-[10px]">
                                                                        {PLAN_LABELS[plan] || plan}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 text-xs text-muted-foreground">
                                                            {formatFullDate(customer.last_payment_at)}
                                                        </td>
                                                        <td className="py-3 text-xs">
                                                            {expires ? (
                                                                <span className={expiringSoon ? "font-semibold text-amber-600" : "text-muted-foreground"}>
                                                                    {formatFullDate(customer.subscription_expires_at!)}
                                                                    {expiringSoon && " ⚠"}
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Confirm Dialog */}
            <Dialog
                open={confirmDialog.open}
                onOpenChange={(open) => setConfirmDialog({ open, tx: confirmDialog.tx })}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Xác nhận thanh toán</DialogTitle>
                    </DialogHeader>
                    {confirmDialog.tx && (
                        <div className="space-y-4 py-2">
                            <div className="space-y-2 rounded-lg bg-muted/50 p-4 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Người dùng</span>
                                    <span className="font-medium">{confirmDialog.tx.user_id?.display_name || "—"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Gói</span>
                                    <span className="font-medium">
                                        {PLAN_LABELS[confirmDialog.tx.plan_type] || confirmDialog.tx.plan_type}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Số tiền</span>
                                    <span className="font-bold text-primary">
                                        {formatVnd(confirmDialog.tx.final_amount || confirmDialog.tx.amount)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Thời hạn</span>
                                    <span className="font-medium">{confirmDialog.tx.duration_months} tháng</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="payment_ref">
                                    Mã tham chiếu thanh toán{" "}
                                    <span className="font-normal text-muted-foreground">(tùy chọn)</span>
                                </Label>
                                <Input
                                    id="payment_ref"
                                    placeholder="VD: VCB123456789"
                                    value={paymentRef}
                                    onChange={(e) => setPaymentRef(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setConfirmDialog({ open: false, tx: null })}
                            disabled={submitting}
                        >
                            <XCircle className="mr-2 h-4 w-4" />
                            Hủy
                        </Button>
                        <Button onClick={handleConfirm} disabled={submitting}>
                            {submitting ? (
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                            )}
                            Xác nhận
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
                    <div className="min-w-0">
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className="mt-1 text-2xl font-bold break-all">{value}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
                    </div>
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClass[tone]}`}>
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

export default Payments;
