import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Check,
    X,
    Loader2,
    Crown,
    Zap,
    Star,
    ChevronDown,
    ChevronUp,
    Clock,
    Copy,
    Smartphone,
    Landmark,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import api from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type PlanId = "free" | "premium" | "pro";
type PaymentMethod = "momo" | "bank_transfer";

interface SubscriptionStatus {
    tier: "free" | "premium" | "pro";
    expires_at: string | null;
    is_active: boolean;
    latest_transaction: {
        plan_type: string;
        status: string;
        final_amount: number;
        created_at: string;
    } | null;
}

// ── Plan definitions ──────────────────────────────────────────────────────────

const PLANS = [
    {
        id: "free" as PlanId,
        name: "Free",
        price: 0,
        icon: Star,
        cardClass: "border-border",
        headerClass: "bg-muted/60",
        headerTextClass: "text-foreground",
        subTextClass: "text-muted-foreground",
        badgeClass: "bg-muted text-muted-foreground",
        features: [
            { label: "AI scan 2 lần/ngày", ok: true },
            { label: "Log thủ công 5 bữa/ngày", ok: true },
            { label: "Water & Fasting tracker", ok: true },
            { label: "Allergen alerts", ok: true },
            { label: "Lịch sử 7 ngày", ok: true },
            { label: "Barcode scanner", ok: false },
            { label: "Bản đồ nhà hàng (5km)", ok: true },
            { label: "Meal plan AI", ok: false },
            { label: "Exercise tracker", ok: false },
            { label: "Grocery list", ok: false },
            { label: "Export CSV/PDF", ok: false },
            { label: "Biểu đồ 7 ngày", ok: true },
            { label: "Có quảng cáo", ok: false, negative: true },
        ],
    },
    {
        id: "premium" as PlanId,
        name: "Premium",
        price: 79000,
        icon: Zap,
        cardClass: "border-primary/50 shadow-lg shadow-primary/10",
        headerClass: "bg-primary/10",
        headerTextClass: "text-primary",
        subTextClass: "text-primary/70",
        badgeClass: "bg-primary/20 text-primary",
        recommended: true,
        features: [
            { label: "AI scan 10 lần/ngày", ok: true },
            { label: "Cooldown 30 phút giữa scan", ok: true },
            { label: "Log thủ công không giới hạn", ok: true },
            { label: "Water & Fasting tracker", ok: true },
            { label: "Allergen alerts", ok: true },
            { label: "Lịch sử 30 ngày", ok: true },
            { label: "Barcode scanner", ok: true },
            { label: "Bản đồ không giới hạn", ok: true },
            { label: "Meal plan AI", ok: true },
            { label: "Exercise tracker", ok: true },
            { label: "Grocery list", ok: true },
            { label: "Export CSV/PDF", ok: true },
            { label: "Biểu đồ 3 tháng", ok: true },
            { label: "Không có quảng cáo", ok: true },
        ],
    },
    {
        id: "pro" as PlanId,
        name: "Pro",
        price: 179000,
        icon: Crown,
        cardClass: "border-primary shadow-xl shadow-primary/20",
        headerClass: "gradient-primary",
        headerTextClass: "text-primary-foreground",
        subTextClass: "text-primary-foreground/80",
        badgeClass: "bg-white/20 text-white",
        features: [
            { label: "AI scan 20 lần/ngày", ok: true },
            { label: "Cooldown 15 phút giữa scan", ok: true },
            { label: "Batch scan 3 ảnh/lần", ok: true },
            { label: "Log thủ công không giới hạn", ok: true },
            { label: "Lịch sử 90 ngày", ok: true },
            { label: "Barcode scanner", ok: true },
            { label: "Bản đồ không giới hạn", ok: true },
            { label: "Meal plan AI", ok: true },
            { label: "Exercise + Health metrics", ok: true },
            { label: "Grocery list", ok: true },
            { label: "Export CSV/PDF", ok: true },
            { label: "Biểu đồ không giới hạn", ok: true },
            { label: "AI Nutritionist chatbot", ok: true },
            { label: "Đặt lịch chuyên gia dinh dưỡng", ok: true },
            { label: "API access", ok: true },
            { label: "Hỗ trợ Chat & Email 2h", ok: true },
            { label: "Không có quảng cáo", ok: true },
        ],
    },
];

const PAYMENT_METHODS: { id: PaymentMethod; label: string; Icon: React.FC<{ className?: string }> }[] = [
    { id: "momo", label: "MoMo", Icon: Smartphone },
    { id: "bank_transfer", label: "Chuyển khoản ngân hàng", Icon: Landmark },
];

// ── Component ─────────────────────────────────────────────────────────────────

const Subscription: React.FC = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { profile, refreshProfile } = useAuthContext();

    const [status, setStatus] = useState<SubscriptionStatus | null>(null);
    const [loadingStatus, setLoadingStatus] = useState(true);

    // Checkout state
    const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
    const [selectedMonths, setSelectedMonths] = useState(1);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
    const [discountCode, setDiscountCode] = useState("");
    const [showCheckout, setShowCheckout] = useState(false);
    const [ordering, setOrdering] = useState(false);
    const [orderResult, setOrderResult] = useState<any>(null);
    const orderingRef = useRef(false); // prevents double-submit before state update

    // Expanded feature list
    const [expandedPlan, setExpandedPlan] = useState<PlanId | null>(null);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await api.get("/subscription/status");
            setStatus(res.data);
        } catch {
            // not critical
        } finally {
            setLoadingStatus(false);
        }
    };

    const currentTier = status?.tier || profile?.subscription_tier || "free";

    const openCheckout = (planId: PlanId) => {
        setSelectedPlan(planId);
        setSelectedMonths(1);
        setDiscountCode("");
        setOrderResult(null);
        setShowCheckout(true);
    };

    const getTotal = () => {
        const plan = PLANS.find((p) => p.id === selectedPlan);
        if (!plan) return 0;
        return plan.price * selectedMonths;
    };

    const handleOrder = async () => {
        if (!selectedPlan || orderingRef.current) return;
        orderingRef.current = true;
        setOrdering(true);
        try {
            const res = await api.post("/subscription/upgrade", {
                plan_type: selectedPlan,
                duration_months: selectedMonths,
                payment_method: paymentMethod,
                discount_code: discountCode.trim().toUpperCase() || undefined,
            });
            setOrderResult(res.data);
            // Update latest_transaction so the pending notice shows on the main page
            setStatus((prev) => prev
                ? {
                    ...prev,
                    latest_transaction: {
                        plan_type: selectedPlan,
                        status: "pending",
                        final_amount: res.data.final_amount,
                        created_at: new Date().toISOString(),
                    },
                  }
                : prev,
            );
        } catch (err: any) {
            toast({
                title: "Lỗi",
                description: err?.response?.data?.error || "Không thể tạo đơn hàng",
                variant: "destructive",
            });
        } finally {
            orderingRef.current = false;
            setOrdering(false);
        }
    };

    const copyText = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Đã sao chép" });
    };

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-background pb-16">
            {/* Header */}
            <div className="glass border-b border-border/50 sticky top-0 z-10 px-4 py-3 flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="font-semibold text-lg">Nâng cấp tài khoản</h1>
                    {!loadingStatus && (
                        <p className="text-xs text-muted-foreground">
                            Gói hiện tại:{" "}
                            <span className="font-medium capitalize">{currentTier}</span>
                            {status?.expires_at && (
                                <> · Hết hạn {new Date(status.expires_at).toLocaleDateString("vi-VN")}</>
                            )}
                        </p>
                    )}
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
                {/* Hero */}
                <div className="text-center py-4">
                    <h2 className="text-2xl font-bold text-foreground">Chọn gói phù hợp</h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Mở khóa toàn bộ tính năng để theo dõi dinh dưỡng hiệu quả hơn
                    </p>
                </div>

                {/* Plan cards */}
                {PLANS.map((plan) => {
                    const Icon = plan.icon;
                    const isCurrent = currentTier === plan.id;
                    const isExpanded = expandedPlan === plan.id;
                    const visibleFeatures = isExpanded ? plan.features : plan.features.slice(0, 5);

                    return (
                        <Card key={plan.id} className={`border-2 ${plan.cardClass} overflow-hidden`}>
                            {/* Header */}
                            <div className={`${plan.headerClass} px-4 py-4`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Icon className={`w-5 h-5 ${plan.headerTextClass}`} />
                                        <span className={`font-bold text-lg ${plan.headerTextClass}`}>
                                            {plan.name}
                                        </span>
                                        {plan.recommended && (
                                            <Badge className={`text-xs font-semibold border-0 ${plan.id === "pro" ? "bg-white/20 text-white" : "bg-primary/15 text-primary"}`}>
                                                Phổ biến nhất
                                            </Badge>
                                        )}
                                        {isCurrent && (
                                            <Badge className={`${plan.badgeClass} text-xs border-0`}>
                                                Đang dùng
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        {plan.price === 0 ? (
                                            <span className={`text-xl font-bold ${plan.headerTextClass}`}>
                                                Miễn phí
                                            </span>
                                        ) : (
                                            <>
                                                <span className={`text-xl font-bold ${plan.headerTextClass}`}>
                                                    {plan.price.toLocaleString("vi-VN")}₫
                                                </span>
                                                <span className={`text-xs ${plan.subTextClass}`}>
                                                    /tháng
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <CardContent className="pt-4 pb-4">
                                {/* Feature list */}
                                <ul className="space-y-1.5">
                                    {visibleFeatures.map((f, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm">
                                            {f.ok && !f.negative ? (
                                                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                                            ) : f.negative ? (
                                                <X className="w-4 h-4 text-destructive flex-shrink-0" />
                                            ) : (
                                                <X className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                                            )}
                                            <span className={f.ok && !f.negative ? "text-foreground" : "text-muted-foreground"}>
                                                {f.label}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                {/* Show more/less */}
                                {plan.features.length > 5 && (
                                    <button
                                        type="button"
                                        className="text-xs text-primary flex items-center gap-1 mt-2"
                                        onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                                    >
                                        {isExpanded ? (
                                            <><ChevronUp className="w-3 h-3" /> Thu gọn</>
                                        ) : (
                                            <><ChevronDown className="w-3 h-3" /> Xem thêm {plan.features.length - 5} tính năng</>
                                        )}
                                    </button>
                                )}

                                {/* CTA */}
                                {plan.id !== "free" && (
                                    <Button
                                        className="w-full mt-4"
                                        disabled={isCurrent}
                                        onClick={() => openCheckout(plan.id)}
                                    >
                                        {isCurrent ? "Đang sử dụng" : `Nâng cấp lên ${plan.name}`}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}

                {/* Pending transaction notice */}
                {status?.latest_transaction?.status === "pending" && (
                    <Card className="border-primary/30 bg-primary/5">
                        <CardContent className="pt-4 pb-4">
                            <div className="flex items-start gap-3">
                                <Clock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-foreground">
                                        Đơn hàng đang chờ xác nhận
                                    </p>
                                    <p className="text-xs text-primary mt-0.5">
                                        Gói {status.latest_transaction.plan_type.toUpperCase()} ·{" "}
                                        {status.latest_transaction.final_amount.toLocaleString("vi-VN")}₫ ·{" "}
                                        {new Date(status.latest_transaction.created_at).toLocaleDateString("vi-VN")}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Hệ thống sẽ tự động kích hoạt gói sau khi xác nhận giao dịch theo mã chuyển khoản.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Store owner link */}
                <Card className="border-dashed">
                    <CardContent className="pt-4 pb-4 text-center">
                        <p className="text-sm font-medium text-foreground">Bạn là chủ nhà hàng / quán ăn?</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Đăng ký cửa hàng miễn phí, hiển thị trên bản đồ và quản lý menu dinh dưỡng
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => navigate("/store-registration")}
                        >
                            Đăng ký cửa hàng
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Checkout dialog */}
            <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>
                            {orderResult ? "Hướng dẫn thanh toán" : "Thanh toán"}
                        </DialogTitle>
                    </DialogHeader>

                    {!orderResult ? (
                        <div className="space-y-4">
                            {/* Plan summary */}
                            <div className="bg-muted/60 rounded-lg p-3">
                                <p className="text-sm font-medium capitalize">
                                    Gói {selectedPlan} · {PLANS.find(p => p.id === selectedPlan)?.price.toLocaleString("vi-VN")}₫/tháng
                                </p>
                            </div>

                            {/* Duration */}
                            <div>
                                <Label className="text-xs">Thời hạn</Label>
                                <div className="flex gap-2 mt-1">
                                    {[1, 3, 6, 12].map((m) => {
                                        const plan = PLANS.find((p) => p.id === selectedPlan);
                                        const discount = m >= 12 ? 0.15 : m >= 6 ? 0.1 : m >= 3 ? 0.05 : 0;
                                        return (
                                            <button
                                                type="button"
                                                key={m}
                                                onClick={() => setSelectedMonths(m)}
                                                className={`flex-1 rounded-lg p-2 text-center text-xs border transition-colors ${selectedMonths === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                                            >
                                                <p className="font-semibold">{m} tháng</p>
                                                {discount > 0 && (
                                                    <p className="text-primary/70 text-[10px]">-{discount * 100}%</p>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Discount code */}
                            <div>
                                <Label className="text-xs">Mã giảm giá (nếu có)</Label>
                                <Input
                                    className="mt-1 uppercase"
                                    placeholder="SUMMER2025..."
                                    value={discountCode}
                                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                                />
                            </div>

                            {/* Payment method */}
                            <div>
                                <Label className="text-xs">Phương thức thanh toán</Label>
                                <div className="flex gap-2 mt-1">
                                    {PAYMENT_METHODS.map((m) => (
                                        <button
                                            type="button"
                                            key={m.id}
                                            onClick={() => setPaymentMethod(m.id)}
                                            className={`flex-1 rounded-lg p-2 text-center text-xs border transition-colors ${paymentMethod === m.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                                        >
                                            <m.Icon className="w-4 h-4 mx-auto mb-0.5" />
                                            <p className="font-medium">{m.label}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Total */}
                            <div className="flex justify-between items-center py-2 border-t">
                                <span className="text-sm font-medium">Tổng cộng</span>
                                <span className="text-lg font-bold text-primary">
                                    {getTotal().toLocaleString("vi-VN")}₫
                                </span>
                            </div>
                        </div>
                    ) : (
                        /* Payment instructions — pending state */
                        <div className="space-y-3">
                            {/* Status badge */}
                            <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                                <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                                <div>
                                    <p className="text-xs font-semibold text-foreground">
                                        ��ơn hàng đang chờ thanh toán
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        Gói sẽ được kích hoạt ngay sau khi hệ thống xác nhận giao dịch.
                                    </p>
                                </div>
                            </div>

                            {/* Payment details */}
                            <div className="bg-muted/50 rounded-lg p-3 space-y-2.5">
                                <p className="text-xs font-semibold text-foreground">
                                    {orderResult.payment_instructions?.method}
                                </p>

                                {/* Bank account */}
                                {orderResult.payment_instructions?.account && (
                                    <div className="flex items-center justify-between bg-background rounded-md px-3 py-2 border">
                                        <div>
                                            <p className="text-[10px] text-muted-foreground">
                                                {orderResult.payment_instructions.bank} · {orderResult.payment_instructions.owner}
                                            </p>
                                            <p className="text-sm font-mono font-bold">
                                                {orderResult.payment_instructions.account}
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0"
                                            onClick={() => copyText(orderResult.payment_instructions.account)}
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                )}

                                {/* MoMo phone */}
                                {orderResult.payment_instructions?.phone && (
                                    <div className="flex items-center justify-between bg-background rounded-md px-3 py-2 border">
                                        <div>
                                            <p className="text-[10px] text-muted-foreground">Số điện thoại MoMo</p>
                                            <p className="text-sm font-mono font-bold">
                                                {orderResult.payment_instructions.phone}
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0"
                                            onClick={() => copyText(orderResult.payment_instructions.phone)}
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                )}

                                {/* Amount */}
                                <div className="flex items-center justify-between bg-background rounded-md px-3 py-2 border">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground">Số tiền</p>
                                        <p className="text-sm font-bold text-primary">
                                            {orderResult.payment_instructions?.amount}₫
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        onClick={() => copyText(orderResult.payment_instructions?.amount || "")}
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </Button>
                                </div>

                                {/* Reference code — most important */}
                                <div className="flex items-center justify-between bg-primary/5 border border-primary/30 rounded-md px-3 py-2">
                                    <div>
                                        <p className="text-[10px] text-primary font-medium">
                                            Nội dung chuyển khoản (bắt buộc)
                                        </p>
                                        <p className="text-sm font-mono font-bold text-primary tracking-wider">
                                            {orderResult.payment_ref_code}
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 text-primary"
                                        onClick={() => copyText(orderResult.payment_ref_code || "")}
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>

                            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                                Nhập đúng nội dung chuyển khoản để hệ thống tự động xác nhận.
                            </p>
                        </div>
                    )}

                    <DialogFooter>
                        {!orderResult ? (
                            <>
                                <Button variant="outline" onClick={() => setShowCheckout(false)}>Hủy</Button>
                                <Button onClick={handleOrder} disabled={ordering}>
                                    {ordering ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang xử lý...</>
                                    ) : (
                                        `Thanh toán · ${getTotal().toLocaleString("vi-VN")}₫`
                                    )}
                                </Button>
                            </>
                        ) : (
                            <Button className="w-full" onClick={() => setShowCheckout(false)}>
                                Đã chuyển khoản
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Subscription;
