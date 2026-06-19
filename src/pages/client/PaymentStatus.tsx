import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle2, XCircle, Loader2, ReceiptText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";

interface SubStatus {
    tier: string;
    expires_at: string | null;
    is_active: boolean;
    latest_transaction: {
        plan_type: string;
        status: "pending" | "completed" | "failed" | "refunded" | "cancelled";
        amount: number;
        final_amount: number;
        payment_method: string;
        payment_ref?: string;
        duration_months?: number;
        created_at: string;
    } | null;
}

const STATUS_UI: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
    pending: {
        icon: <Clock className="w-8 h-8" />,
        label: "Đang chờ thanh toán",
        color: "text-amber-600",
        bg: "bg-amber-50 border-amber-200",
    },
    completed: {
        icon: <CheckCircle2 className="w-8 h-8" />,
        label: "Thanh toán thành công",
        color: "text-green-600",
        bg: "bg-green-50 border-green-200",
    },
    failed: {
        icon: <XCircle className="w-8 h-8" />,
        label: "Thanh toán thất bại",
        color: "text-red-600",
        bg: "bg-red-50 border-red-200",
    },
    cancelled: {
        icon: <XCircle className="w-8 h-8" />,
        label: "Đã hủy",
        color: "text-muted-foreground",
        bg: "bg-muted/40 border-border",
    },
    refunded: {
        icon: <XCircle className="w-8 h-8" />,
        label: "Đã hoàn tiền",
        color: "text-muted-foreground",
        bg: "bg-muted/40 border-border",
    },
};

const PLAN_NAMES: Record<string, string> = {
    free: "Free",
    premium: "Premium",
    family: "Family",
    pro: "Family",
};

const METHOD_LABELS: Record<string, string> = {
    bank_transfer: "Chuyển khoản ngân hàng",
    momo: "MoMo",
    payos: "PayOS",
};

export default function PaymentStatus() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const txId = params.get("txId");

    const { data, isLoading, refetch } = useQuery<SubStatus>({
        queryKey: ["subscription-status", txId],
        queryFn: async () => {
            if (txId) {
                const res = await api.get(`/subscription/transactions/${txId}`);
                return {
                    tier: res.data.subscription?.tier ?? "free",
                    expires_at: res.data.subscription?.expires_at ?? null,
                    is_active: res.data.subscription?.is_active ?? false,
                    latest_transaction: res.data.transaction,
                } as SubStatus;
            }
            const res = await api.get("/subscription/status");
            return res.data as SubStatus;
        },
        refetchInterval: (query) =>
            query.state.data?.latest_transaction?.status === "pending" ? 2_500 : false,
    });

    const tx = data?.latest_transaction;
    const statusKey = tx?.status ?? "pending";
    const ui = STATUS_UI[statusKey] ?? STATUS_UI.pending;

    const fmt = (n: number) =>
        n.toLocaleString("vi-VN") + "₫";

    const fmtDate = (s: string) =>
        new Date(s).toLocaleString("vi-VN", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        });

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
                <h1 className="page-title">Trạng thái thanh toán</h1>
            </div>

            <div className="max-w-md mx-auto px-5 py-6 space-y-4">
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : !tx ? (
                    <Card>
                        <CardContent className="flex flex-col items-center py-12 gap-3">
                            <ReceiptText className="w-10 h-10 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Chưa có giao dịch nào</p>
                            <Button variant="outline" size="sm" onClick={() => navigate("/subscription")}>
                                Nâng cấp ngay
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Status card */}
                        <Card className={`border-2 ${ui.bg}`}>
                            <CardContent className="flex flex-col items-center py-8 gap-2">
                                <div className={ui.color}>{ui.icon}</div>
                                <p className={`text-lg font-bold ${ui.color}`}>{ui.label}</p>
                                {statusKey === "pending" && (
                                    <p className="text-xs text-muted-foreground text-center max-w-[260px]">
                                        Trang này tự cập nhật mỗi 2.5 giây. Sau khi thanh toán, hệ thống sẽ kích hoạt gói ngay khi webhook xác nhận.
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Transaction details */}
                        <Card>
                            <CardContent className="py-4 space-y-3">
                                <h2 className="text-sm font-semibold">Chi tiết giao dịch</h2>
                                <div className="space-y-2 text-sm">
                                    <Row label="Gói" value={<Badge variant="secondary">{PLAN_NAMES[tx.plan_type] ?? tx.plan_type}</Badge>} />
                                    {tx.duration_months && <Row label="Thời hạn" value={`${tx.duration_months} tháng`} />}
                                    <Row label="Số tiền" value={<span className="font-semibold">{fmt(tx.final_amount ?? tx.amount)}</span>} />
                                    {tx.final_amount !== tx.amount && (
                                        <Row label="Giá gốc" value={<span className="line-through text-muted-foreground">{fmt(tx.amount)}</span>} />
                                    )}
                                    <Row label="Phương thức" value={METHOD_LABELS[tx.payment_method] ?? tx.payment_method} />
                                    {tx.payment_ref && <Row label="Mã tham chiếu" value={<code className="text-xs bg-muted px-1 py-0.5 rounded">{tx.payment_ref}</code>} />}
                                    <Row label="Thời gian" value={fmtDate(tx.created_at)} />
                                    <Row
                                        label="Trạng thái TK"
                                        value={
                                            <span className="font-medium">
                                                {data?.tier === "free" ? "Free" : `${PLAN_NAMES[data?.tier ?? ""] ?? data?.tier} — hết hạn ${data?.expires_at ? fmtDate(data.expires_at) : "N/A"}`}
                                            </span>
                                        }
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex gap-2">
                            {statusKey === "pending" && (
                                <Button variant="outline" className="flex-1" onClick={() => refetch()}>
                                    Làm mới
                                </Button>
                            )}
                            <Button className="flex-1" onClick={() => navigate("/subscription/history")}>
                                Lịch sử thanh toán
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground shrink-0">{label}</span>
            <span className="text-right">{value}</span>
        </div>
    );
}
