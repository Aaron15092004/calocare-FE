import { useEffect, useState } from "react";
import {
    Zap, Check, BarChart2, MessageSquare, QrCode, Upload,
    Sparkles, BadgeCheck, Download, Store, Loader2, Copy,
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

const BANKS = [
    { name: "Vietcombank", number: "1234567890", owner: "CALOCARE COMPANY" },
];

const OwnerUpgrade = () => {
    const { toast } = useToast();

    const [store, setStore]       = useState<any>(null);
    const [loading, setLoading]   = useState(true);
    const [duration, setDuration] = useState(1);
    const [method, setMethod]     = useState<"bank_transfer" | "momo">("bank_transfer");
    const [ordering, setOrdering] = useState(false);
    const [order, setOrder]       = useState<any>(null);

    useEffect(() => {
        api.get("/stores/mine")
            .then(({ data }) => setStore(data.data?.[0]))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const isPro = store?.subscription_tier === "pro";

    const selectedDuration = DURATIONS.find((d) => d.months === duration)!;
    const baseAmount       = PRICE_PER_MONTH * duration;
    const discountAmt      = Math.round(baseAmount * selectedDuration.discount / 100);
    const finalAmount      = baseAmount - discountAmt;

    const handleOrder = async () => {
        if (!store) return;
        setOrdering(true);
        try {
            const { data } = await api.post(`/stores/${store._id}/upgrade`, {
                duration_months: duration,
                payment_method:  method,
            });
            setOrder(data);
        } catch (err: any) {
            toast({ title: "Lỗi", description: err.response?.data?.message, variant: "destructive" });
        } finally {
            setOrdering(false);
        }
    };

    const copyText = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Đã sao chép" });
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
                        <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bank_transfer">Chuyển khoản ngân hàng</SelectItem>
                                <SelectItem value="momo">MoMo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {!order ? (
                        <Button className="w-full gap-2" onClick={handleOrder} disabled={ordering}>
                            {ordering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                            Đặt hàng — {finalAmount.toLocaleString("vi-VN")}₫
                        </Button>
                    ) : (
                        <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="font-semibold text-green-700">Đơn hàng đã tạo! Vui lòng chuyển khoản:</p>
                            {BANKS.map((b) => (
                                <div key={b.number} className="space-y-1.5 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Ngân hàng</span>
                                        <span className="font-medium">{b.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Số TK</span>
                                        <div className="flex items-center gap-1">
                                            <span className="font-mono font-medium">{b.number}</span>
                                            <button type="button" onClick={() => copyText(b.number)}>
                                                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Số tiền</span>
                                        <span className="font-bold text-primary">{order.payment_instructions.amount}₫</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Nội dung CK</span>
                                        <div className="flex items-center gap-1">
                                            <span className="font-mono font-medium text-primary">{order.payment_instructions.note}</span>
                                            <button type="button" onClick={() => copyText(order.payment_instructions.note)}>
                                                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <p className="text-xs text-muted-foreground">
                                Sau khi chuyển khoản, admin sẽ kích hoạt Store Pro trong vòng 24 giờ làm việc.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default OwnerUpgrade;
