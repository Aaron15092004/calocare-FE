// src/pages/admin/Payments.tsx
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
    CheckCircle2,
    XCircle,
    Clock,
    CreditCard,
    RefreshCw,
    ExternalLink,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

const PLAN_LABELS: Record<string, string> = {
    premium: "Premium",
    pro: "Pro",
    store_pro: "Store Pro",
};

const METHOD_LABELS: Record<string, string> = {
    momo: "MoMo",
    bank_transfer: "Ngân hàng",
};

const Payments = () => {
    const { toast } = useToast();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; tx: any | null }>({
        open: false,
        tx: null,
    });
    const [paymentRef, setPaymentRef] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchPending();
    }, []);

    const fetchPending = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/subscription/admin/pending");
            setTransactions(data.data || []);
        } catch (err) {
            console.error(err);
            toast({ title: "Lỗi tải dữ liệu", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const openConfirm = (tx: any) => {
        setConfirmDialog({ open: true, tx });
        setPaymentRef("");
    };

    const handleConfirm = async () => {
        if (!confirmDialog.tx) return;
        setSubmitting(true);
        try {
            await api.post(`/subscription/confirm/${confirmDialog.tx._id}`, {
                payment_ref: paymentRef || undefined,
            });
            toast({ title: "Xác nhận thành công", description: "Gói đã được kích hoạt cho người dùng." });
            setConfirmDialog({ open: false, tx: null });
            fetchPending();
        } catch (err: any) {
            toast({
                title: "Lỗi xác nhận",
                description: err?.response?.data?.error || "Vui lòng thử lại.",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (amount: number) =>
        amount.toLocaleString("vi-VN") + "₫";

    const formatDate = (date: string) =>
        new Date(date).toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Thanh toán</h1>
                    <p className="text-muted-foreground">
                        Xác nhận các giao dịch đang chờ xử lý
                    </p>
                </div>
                <Button variant="outline" onClick={fetchPending} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Làm mới
                </Button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{transactions.length}</p>
                                <p className="text-sm text-muted-foreground">Đang chờ</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <CreditCard className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(
                                        transactions.reduce((s, t) => s + (t.final_amount || t.amount || 0), 0),
                                    )}
                                </p>
                                <p className="text-sm text-muted-foreground">Tổng cần xác nhận</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {transactions.filter((t) => t.target_type === "user").length}
                                </p>
                                <p className="text-sm text-muted-foreground">Gói người dùng</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Giao dịch đang chờ</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-12">
                            <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-3 opacity-50" />
                            <p className="text-muted-foreground">Không có giao dịch nào đang chờ</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
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
                                    {transactions.map((tx) => (
                                        <tr key={tx._id} className="border-b last:border-0 hover:bg-muted/30">
                                            <td className="py-3">
                                                <div>
                                                    <p className="font-medium">
                                                        {tx.user_id?.display_name || "—"}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {tx.user_id?.email || "—"}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                                    {PLAN_LABELS[tx.plan_type] || tx.plan_type}
                                                </span>
                                            </td>
                                            <td className="py-3 text-muted-foreground text-xs">
                                                {tx.target_type === "store" ? "Quán ăn" : "Cá nhân"}
                                            </td>
                                            <td className="py-3">
                                                <div>
                                                    <p className="font-medium">{formatCurrency(tx.final_amount || tx.amount)}</p>
                                                    {tx.final_amount !== tx.amount && (
                                                        <p className="text-xs text-muted-foreground line-through">
                                                            {formatCurrency(tx.amount)}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 text-muted-foreground text-xs">
                                                {METHOD_LABELS[tx.payment_method] || tx.payment_method || "—"}
                                            </td>
                                            <td className="py-3 text-muted-foreground text-xs">
                                                {tx.duration_months} tháng
                                            </td>
                                            <td className="py-3 text-muted-foreground text-xs">
                                                {formatDate(tx.created_at)}
                                            </td>
                                            <td className="py-3">
                                                <Button
                                                    size="sm"
                                                    onClick={() => openConfirm(tx)}
                                                    className="h-7 text-xs"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
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
                            <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Người dùng</span>
                                    <span className="font-medium">
                                        {confirmDialog.tx.user_id?.display_name || "—"}
                                    </span>
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
                                        {formatCurrency(confirmDialog.tx.final_amount || confirmDialog.tx.amount)}
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
                                    <span className="text-muted-foreground font-normal">(tùy chọn)</span>
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
                            <XCircle className="w-4 h-4 mr-2" />
                            Hủy
                        </Button>
                        <Button onClick={handleConfirm} disabled={submitting}>
                            {submitting ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                            )}
                            Xác nhận
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Payments;
