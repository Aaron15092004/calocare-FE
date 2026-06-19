import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
    Zap, Check, BarChart2, MessageSquare, QrCode, Upload,
    Sparkles, BadgeCheck, Download, Store, Loader2,
    CreditCard, ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

const PRICE_PER_MONTH = 49000;

const DURATIONS = [
    { months: 1,  label: "1 tháng",   discount: 0 },
    { months: 3,  label: "3 tháng",   discount: 5 },
    { months: 6,  label: "6 tháng",   discount: 10 },
    { months: 12, label: "12 tháng",  discount: 15 },
];

const PRO_FEATURES = [
    { icon: Store,          label: "Thêm nhiều quán (không giới hạn)" },
    { icon: BarChart2,      label: "Analytics chi tiết + Check-in heatmap" },
    { icon: Zap,            label: "Promoted listing (ưu tiên hiển thị)" },
    { icon: MessageSquare,  label: "Phản hồi review công khai" },
    { icon: QrCode,         label: "QR Code menu" },
    { icon: Upload,         label: "Bulk upload menu CSV" },
    { icon: Sparkles,       label: "AI ước tính dinh dưỡng" },
    { icon: BadgeCheck,     label: "Badge 'Verified Nutrition'" },
    { icon: Download,       label: "Export analytics CSV" },
];

interface StoreInfo {
    _id: string;
    subscription_tier?: "basic" | "pro";
    subscription_expires_at?: string;
}

interface StoreQuote {
    amount: number;
    final_amount: number;
    duration_discount_amount: number;
}

interface StoreOrder {
    transaction_id?: string;
    status?: string;
    payment_method?: StorePaymentMethod;
    payment_ref?: string;
    checkout_url?: string;
    final_amount?: number;
    message?: string;
}

type StorePaymentMethod = "payos";

interface ApiError {
    response?: {
        status?: number;
        data?: StoreOrder & {
            error?: string;
            message?: string;
        };
    };
}

const getApiErrorMessage = (error: unknown) => {
    const apiError = error as ApiError;
    return apiError.response?.data?.message || apiError.response?.data?.error;
};

const OwnerUpgrade = () => {
    const { toast } = useToast();
    const [searchParams] = useSearchParams();

    const [store, setStore]       = useState<StoreInfo | null>(null);
    const [loading, setLoading]   = useState(true);
    const [duration, setDuration] = useState(1);
    const [method, setMethod]     = useState<StorePaymentMethod>("payos");
    const [ordering, setOrdering] = useState(false);
    const [order, setOrder]       = useState<StoreOrder | null>(null);
    const [quote, setQuote]       = useState<StoreQuote | null>(null);

    useEffect(() => {
        api.get("/stores/mine")
            .then(({ data }) => setStore(data.data?.[0]))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const isPro = store?.subscription_tier === "pro";

    const selectedDuration = DURATIONS.find((d) => d.months === duration)!;
    const baseAmount       = quote?.amount ?? PRICE_PER_MONTH * duration;
    const discountAmt      = quote?.duration_discount_amount ?? Math.round(baseAmount * selectedDuration.discount / 100);
    const finalAmount      = quote?.final_amount ?? baseAmount - discountAmt;

    useEffect(() => {
        if (!store?._id) return;
        api.post(`/stores/${store._id}/upgrade/quote`, { duration_months: duration })
            .then(({ data }) => setQuote(data))
            .catch(() => setQuote(null));
    }, [duration, store?._id]);

    useEffect(() => {
        const txId = searchParams.get("txId") || order?.transaction_id;
        if (!store?._id || !txId || order?.status === "completed") return;

        let stopped = false;
        const poll = async () => {
            if (stopped) return;
            try {
                const { data } = await api.get(`/stores/${store._id}/upgrade/transactions/${txId}`);
                if (stopped) return;
                setOrder((prev) => ({
                    ...(prev || {}),
                    transaction_id: txId,
                    status: data.transaction?.status,
                    payment_method: data.transaction?.payment_method,
                    payment_ref: data.transaction?.payment_ref,
                    final_amount: data.transaction?.final_amount,
                }));
                if (data.store) setStore(data.store);
                if (data.transaction?.status === "completed") {
                    stopped = true;
                    toast({
                        title: "Store Pro đã được kích hoạt",
                        description: "Thanh toán đã được xác nhận tự động.",
                    });
                }
            } catch {
                // Keep polling through transient network/provider delays.
            }
        };

        void poll();
        const interval = window.setInterval(poll, 2500);
        return () => {
            stopped = true;
            window.clearInterval(interval);
        };
    }, [order?.status, order?.transaction_id, searchParams, store?._id, toast]);

    const handleOrder = async () => {
        if (!store) return;
        setOrdering(true);
        try {
            const { data } = await api.post(`/stores/${store._id}/upgrade`, {
                duration_months: duration,
                payment_method:  method,
            });
            setOrder(data);
        } catch (err) {
            const apiError = err as ApiError;
            if (apiError.response?.status === 409 && apiError.response.data?.transaction_id) {
                setOrder(apiError.response.data);
                toast({ title: "Đã có giao dịch chờ", description: apiError.response.data.message });
                return;
            }
            toast({ title: "Lỗi", description: getApiErrorMessage(err), variant: "destructive" });
        } finally {
            setOrdering(false);
        }
    };

    const renderPaymentInstructions = () => {
        if (order?.payment_method === "payos" || order?.checkout_url) {
            const amount = order.final_amount ?? finalAmount;
            return (
                <div className="space-y-4 rounded-lg border border-green-200 bg-green-50 p-4">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
                            <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-semibold text-green-800">
                                {order.status === "completed" ? "Store Pro đã kích hoạt" : "Thanh toán tự động"}
                            </p>
                            <p className="text-sm text-green-700/80">
                                {order.status === "completed"
                                    ? "CaloVie đã xác nhận thanh toán và nâng cấp quán."
                                    : "Sau khi thanh toán thành công, Store Pro sẽ tự bật mà không cần admin duyệt."}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-md border bg-background px-3 py-2 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Số tiền</span>
                            <span className="font-bold text-primary">{amount.toLocaleString("vi-VN")}₫</span>
                        </div>
                        {order.payment_ref && (
                            <div className="mt-1 flex items-center justify-between">
                                <span className="text-muted-foreground">Mã đơn</span>
                                <code className="rounded bg-muted px-1 py-0.5 text-xs">{order.payment_ref}</code>
                            </div>
                        )}
                    </div>

                    {order.checkout_url ? (
                        <Button className="w-full gap-2" onClick={() => window.location.assign(order.checkout_url!)}>
                            <ExternalLink className="h-4 w-4" />
                            Mở trang thanh toán an toàn
                        </Button>
                    ) : order.status !== "completed" ? (
                        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            Đơn thanh toán tự động đang chờ. Nếu đã thanh toán, màn này sẽ tự cập nhật trong vài giây.
                        </p>
                    ) : null}

                    {order.status !== "completed" && (
                        <p className="text-center text-xs text-green-700/80">
                            Màn này tự kiểm tra trạng thái mỗi 2.5 giây.
                        </p>
                    )}
                </div>
            );
        }

        if (!order) return null;
        return (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Phương thức thanh toán cũ đã tạm khóa. Hãy tạo lại đơn bằng thanh toán tự động để Store Pro được kích hoạt ngay sau khi thanh toán thành công.
            </div>
        );
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    if (isPro) {
        const expiry = store?.subscription_expires_at
            ? new Date(store.subscription_expires_at).toLocaleDateString("vi-VN")
            : "—";
        return (
            <div className="max-w-lg space-y-6">
                <h1 className="text-2xl font-bold">Store Pro</h1>
                <Card className="border-primary/30 bg-gradient-to-br from-amber-50 to-orange-50">
                    <CardContent className="pt-6 text-center space-y-2">
                        <Zap className="w-10 h-10 text-amber-500 mx-auto" />
                        <h2 className="font-bold text-lg">Bạn đang dùng Store Pro</h2>
                        <p className="text-muted-foreground text-sm">Hết hạn: <strong>{expiry}</strong></p>
                        <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white">Đang hoạt động</Badge>
                    </CardContent>
                </Card>
                <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Tính năng của bạn:</p>
                    {PRO_FEATURES.map((f) => (
                        <div key={f.label} className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                            {f.label}
                        </div>
                    ))}
                </div>
                <Button variant="outline" onClick={handleOrder} disabled={ordering} className="w-full">
                    {ordering ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                    Gia hạn Store Pro
                </Button>
                {renderPaymentInstructions()}
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <h1 className="text-2xl font-bold">Nâng cấp Store Pro</h1>

            {/* Features grid */}
            <Card>
                <CardHeader><CardTitle className="text-base">Tất cả tính năng Pro</CardTitle></CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-2">
                    {PRO_FEATURES.map((f) => (
                        <div key={f.label} className="flex items-center gap-2 text-sm">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <f.icon className="w-4 h-4 text-primary" />
                            </div>
                            {f.label}
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
                <CardHeader><CardTitle className="text-base">Chọn thời hạn</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {DURATIONS.map((d) => (
                            <button key={d.months} type="button"
                                className={`relative p-3 rounded-lg border text-sm text-center transition-colors
                                    ${duration === d.months ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                                onClick={() => setDuration(d.months)}>
                                {d.discount > 0 && (
                                    <span className="absolute -top-2 -right-2 text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-full">
                                        -{d.discount}%
                                    </span>
                                )}
                                <p className="font-semibold">{d.label}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {(PRICE_PER_MONTH * d.months * (1 - d.discount / 100)).toLocaleString("vi-VN")}₫
                                </p>
                            </button>
                        ))}
                    </div>

                    <div className="p-4 bg-muted/40 rounded-lg space-y-1.5 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Giá gốc</span>
                            <span>{baseAmount.toLocaleString("vi-VN")}₫</span>
                        </div>
                        {discountAmt > 0 && (
                            <div className="flex justify-between text-green-600">
                                <span>Giảm giá ({selectedDuration.discount}%)</span>
                                <span>-{discountAmt.toLocaleString("vi-VN")}₫</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-base border-t pt-1.5">
                            <span>Tổng thanh toán</span>
                            <span className="text-primary">{finalAmount.toLocaleString("vi-VN")}₫</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm font-medium">Phương thức thanh toán</p>
                        <Select value={method} onValueChange={(v) => setMethod(v as StorePaymentMethod)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="payos">Thanh toán tự động</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Store Pro sẽ tự kích hoạt sau khi thanh toán thành công. Không cần admin duyệt.
                        </p>
                    </div>

                    {!order ? (
                        <Button className="w-full gap-2" onClick={handleOrder} disabled={ordering}>
                            {ordering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                            Đặt hàng — {finalAmount.toLocaleString("vi-VN")}₫
                        </Button>
                    ) : renderPaymentInstructions()}
                </CardContent>
            </Card>
        </div>
    );
};

export default OwnerUpgrade;
