import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ReceiptText, Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";

interface Transaction {
    _id: string;
    plan_type: string;
    status: "pending" | "completed" | "failed" | "refunded" | "cancelled";
    amount: number;
    final_amount: number;
    payment_method: string;
    payment_ref?: string;
    duration_months: number;
    discount_code?: string;
    created_at: string;
}

const STATUS_META: Record<string, { icon: React.ReactNode; label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    completed: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "Thành công", variant: "default" },
    pending:   { icon: <Clock className="w-3.5 h-3.5" />, label: "Chờ xác nhận", variant: "secondary" },
    failed:    { icon: <XCircle className="w-3.5 h-3.5" />, label: "Thất bại", variant: "destructive" },
    cancelled: { icon: <XCircle className="w-3.5 h-3.5" />, label: "Đã hủy", variant: "outline" },
    refunded:  { icon: <XCircle className="w-3.5 h-3.5" />, label: "Đã hoàn tiền", variant: "outline" },
};

const PLAN_NAMES: Record<string, string> = { free: "Free", premium: "Premium", family: "Family", pro: "Family" };
const METHOD_LABELS: Record<string, string> = {
    bank_transfer: "Chuyển khoản",
    momo: "MoMo",
    payos: "PayOS",
};

export default function TransactionHistory() {
    const navigate = useNavigate();

    const { data, isLoading } = useQuery<{ data: Transaction[] }>({
        queryKey: ["transactions"],
        queryFn: async () => {
            const res = await api.get("/subscription/transactions");
            return res.data as { data: Transaction[] };
        },
    });

    const txs = data?.data ?? [];

    const fmt = (n: number) => n.toLocaleString("vi-VN") + "₫";
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
                <h1 className="page-title">Lịch sử thanh toán</h1>
            </div>

            <div className="max-w-md mx-auto px-5 py-6 space-y-3">
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : txs.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center py-12 gap-3">
                            <ReceiptText className="w-10 h-10 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Chưa có giao dịch nào</p>
                        </CardContent>
                    </Card>
                ) : (
                    txs.map((tx) => {
                        const meta = STATUS_META[tx.status] ?? STATUS_META.pending;
                        return (
                            <Card key={tx._id} className="overflow-hidden">
                                <CardContent className="py-4">
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div>
                                            <p className="font-semibold text-sm">
                                                {PLAN_NAMES[tx.plan_type] ?? tx.plan_type}
                                                {tx.duration_months > 1 && (
                                                    <span className="text-muted-foreground font-normal ml-1">
                                                        × {tx.duration_months} tháng
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {fmtDate(tx.created_at)}
                                            </p>
                                        </div>
                                        <Badge variant={meta.variant} className="flex items-center gap-1 shrink-0">
                                            {meta.icon}
                                            {meta.label}
                                        </Badge>
                                    </div>

                                    <div className="space-y-1.5 text-xs border-t border-border pt-3">
                                        <Row label="Số tiền" value={
                                            <span className="font-semibold">
                                                {fmt(tx.final_amount ?? tx.amount)}
                                                {tx.discount_code && (
                                                    <span className="text-green-600 ml-1">(giảm giá)</span>
                                                )}
                                            </span>
                                        } />
                                        <Row label="Phương thức" value={METHOD_LABELS[tx.payment_method] ?? tx.payment_method} />
                                        {tx.payment_ref && (
                                            <Row label="Mã GD" value={<code className="bg-muted px-1 py-0.5 rounded">{tx.payment_ref}</code>} />
                                        )}
                                        {tx.discount_code && (
                                            <Row label="Mã giảm giá" value={<span className="text-green-700">{tx.discount_code}</span>} />
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right">{value}</span>
        </div>
    );
}
