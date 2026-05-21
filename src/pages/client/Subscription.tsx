import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
    Gift,
    Users,
    AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

interface SystemDiscount {
    discount_pct: number;
    is_active: boolean;
    expires_at: string | null;
    applicable_plans: string[];
}

// ── Static plan styling config (no hardcoded text) ────────────────────────────

const PLAN_CONFIG = [
    {
        id: "free" as PlanId,
        price: 0,
        icon: Star,
        cardClass: "border-border",
        headerClass: "bg-muted/60",
        headerTextClass: "text-foreground",
        subTextClass: "text-muted-foreground",
        badgeClass: "bg-muted text-muted-foreground",
        recommended: false,
    },
    {
        id: "premium" as PlanId,
        price: 59000,
        icon: Zap,
        cardClass: "border-primary/50 shadow-lg shadow-primary/10",
        headerClass: "bg-primary/10",
        headerTextClass: "text-primary",
        subTextClass: "text-primary/70",
        badgeClass: "bg-primary/20 text-primary",
        recommended: true,
    },
    {
        id: "pro" as PlanId,
        price: 119000,
        icon: Crown,
        cardClass: "border-primary shadow-xl shadow-primary/20",
        headerClass: "gradient-primary",
        headerTextClass: "text-primary-foreground",
        subTextClass: "text-primary-foreground/80",
        badgeClass: "bg-white/20 text-white",
        recommended: false,
    },
];

// ── Component ─────────────────────────────────────────────────────────────────

const Subscription: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { toast } = useToast();
    const { profile } = useAuthContext();

    const [status, setStatus] = useState<SubscriptionStatus | null>(null);
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [sysDiscount, setSysDiscount] = useState<SystemDiscount | null>(null);

    // Checkout state
    const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
    const [selectedMonths, setSelectedMonths] = useState(1);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
    const [discountCode, setDiscountCode] = useState("");
    const [showCheckout, setShowCheckout] = useState(false);
    const [ordering, setOrdering] = useState(false);
    const [orderResult, setOrderResult] = useState<any>(null);
    const orderingRef = useRef(false);

    const [expandedPlan, setExpandedPlan] = useState<PlanId | null>(null);

    const [referralData, setReferralData] = useState<{
        code: string; total_referrals: number; bonus_days_earned: number;
        referrer_bonus_days: number; referee_bonus_days: number;
    } | null>(null);
    const [applyCode, setApplyCode] = useState("");
    const [applyingCode, setApplyingCode] = useState(false);

    useEffect(() => {
        fetchStatus();
        api.get("/referrals/my-code").then((r) => setReferralData(r.data)).catch(() => {});
        api.get("/system-discount").then((r) => {
            if (r.data.is_active) setSysDiscount(r.data);
        }).catch(() => {});
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
        const plan = PLAN_CONFIG.find((p) => p.id === selectedPlan);
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
                title: t("subscription.errorTitle"),
                description: err?.response?.data?.error || t("subscription.errorOrder"),
                variant: "destructive",
            });
        } finally {
            orderingRef.current = false;
            setOrdering(false);
        }
    };

    const handleApplyReferral = async () => {
        if (!applyCode.trim() || applyingCode) return;
        setApplyingCode(true);
        try {
            const res = await api.post("/referrals/apply", { code: applyCode.trim() });
            toast({ title: t("subscription.applySuccess"), description: res.data.message });
            setApplyCode("");
            await fetchStatus();
            api.get("/referrals/my-code").then((r) => setReferralData(r.data)).catch(() => {});
        } catch (err: any) {
            toast({
                title: t("subscription.errorTitle"),
                description: err?.response?.data?.error || t("subscription.errorApply"),
                variant: "destructive",
            });
        } finally {
            setApplyingCode(false);
        }
    };

    const copyText = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: t("subscription.copied") });
    };

    // Build plans list with i18n features
    const PLANS = PLAN_CONFIG.map((cfg) => {
        const features = t(`subscription.plans.${cfg.id}.features`, { returnObjects: true }) as string[];
        const missing = t(`subscription.plans.${cfg.id}.missing`, { returnObjects: true }) as string[];
        return {
            ...cfg,
            name: t(`subscription.${cfg.id}`),
            allFeatures: [
                ...features.map((label) => ({ label, ok: true })),
                ...missing.map((label) => ({ label, ok: false })),
            ],
        };
    });

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-background pb-16">
            {/* Header */}
            <div className="glass border-b border-border/50 sticky top-0 z-10 px-5 py-3 flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="page-title">{t("subscription.headerTitle")}</h1>
                    {!loadingStatus && (
                        <p className="text-xs text-muted-foreground">
                            {t("subscription.currentPlan")}:{" "}
                            <span className="font-medium capitalize">{currentTier}</span>
                            {status?.expires_at && (
                                <> · {t("subscription.expiresOn")} {new Date(status.expires_at).toLocaleDateString("vi-VN")}</>
                            )}
                        </p>
                    )}
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-5 py-6 space-y-5">
                {/* System discount banner */}
                {sysDiscount && (
                    <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-2.5 flex items-center gap-2 text-amber-800 dark:bg-amber-900/20 dark:border-amber-600 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <p className="text-sm font-medium">
                            {t("subscription.systemDiscount", { n: sysDiscount.discount_pct })}
                        </p>
                    </div>
                )}

                {/* Hero */}
                <div className="text-center py-4">
                    <h2 className="text-2xl font-bold text-foreground">{t("subscription.heroTitle")}</h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {t("subscription.heroSub")}
                    </p>
                </div>

                {/* Plan cards */}
                {PLANS.map((plan) => {
                    const Icon = plan.icon;
                    const isCurrent = currentTier === plan.id;
                    const isExpanded = expandedPlan === plan.id;
                    const visibleFeatures = isExpanded ? plan.allFeatures : plan.allFeatures.slice(0, 5);

                    const planDiscountPct = sysDiscount && plan.price > 0 && (
                        !sysDiscount.applicable_plans.length ||
                        sysDiscount.applicable_plans.includes(plan.id)
                    ) ? sysDiscount.discount_pct : 0;
                    const discountedPrice = planDiscountPct > 0
                        ? Math.round(plan.price * (1 - planDiscountPct / 100))
                        : plan.price;

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
                                                {t("subscription.popular")}
                                            </Badge>
                                        )}
                                        {isCurrent && (
                                            <Badge className={`${plan.badgeClass} text-xs border-0`}>
                                                {t("subscription.inUseBadge")}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        {plan.price === 0 ? (
                                            <span className={`text-xl font-bold ${plan.headerTextClass}`}>
                                                {t("subscription.free")}
                                            </span>
                                        ) : (
                                            <div className="flex flex-col items-end">
                                                {planDiscountPct > 0 && (
                                                    <span className={`text-sm line-through opacity-60 ${plan.subTextClass}`}>
                                                        {plan.price.toLocaleString("vi-VN")}₫
                                                    </span>
                                                )}
                                                <div className="flex items-baseline gap-1">
                                                    <span className={`text-xl font-bold ${plan.headerTextClass}`}>
                                                        {discountedPrice.toLocaleString("vi-VN")}₫
                                                    </span>
                                                    <span className={`text-xs ${plan.subTextClass}`}>
                                                        {t("subscription.perMonth")}
                                                    </span>
                                                </div>
                                                {planDiscountPct > 0 && (
                                                    <span className="text-[10px] font-semibold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-full mt-0.5">
                                                        -{planDiscountPct}%
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <CardContent className="pt-4 pb-4">
                                {/* Feature list */}
                                <ul className="space-y-1.5">
                                    {visibleFeatures.map((f, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm">
                                            {f.ok ? (
                                                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                                            ) : (
                                                <X className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                                            )}
                                            <span className={f.ok ? "text-foreground" : "text-muted-foreground"}>
                                                {f.label}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                {/* Show more/less */}
                                {plan.allFeatures.length > 5 && (
                                    <button
                                        type="button"
                                        className="text-xs text-primary flex items-center gap-1 mt-2"
                                        onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                                    >
                                        {isExpanded ? (
                                            <><ChevronUp className="w-3 h-3" /> {t("subscription.showLess")}</>
                                        ) : (
                                            <><ChevronDown className="w-3 h-3" /> {t("subscription.showMore", { n: plan.allFeatures.length - 5 })}</>
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
                                        {isCurrent ? t("subscription.inUseBtn") : t("subscription.upgradeBtn", { plan: plan.name })}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}

                {/* Referral section */}
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
                    <CardContent className="pt-4 pb-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <Gift className="w-4 h-4 text-primary" />
                            <p className="text-sm font-semibold text-foreground">{t("subscription.referralTitle")}</p>
                        </div>

                        {referralData && (
                            <>
                                <p className="text-xs text-muted-foreground">
                                    {t("subscription.referralDesc", {
                                        referee: referralData.referee_bonus_days,
                                        referrer: referralData.referrer_bonus_days,
                                    })}
                                </p>

                                {/* My referral code */}
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-muted rounded-lg px-3 py-2 font-mono text-base font-bold tracking-widest text-foreground text-center border border-border">
                                        {referralData.code}
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className="shrink-0 h-10 w-10"
                                        onClick={() => copyText(referralData.code)}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>

                                {referralData.total_referrals > 0 && (
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Users className="w-3.5 h-3.5" />
                                            <span>{t("subscription.peopleUsed", { n: referralData.total_referrals })}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Gift className="w-3.5 h-3.5 text-primary" />
                                            <span className="text-primary font-medium">
                                                {t("subscription.daysEarned", { n: referralData.bonus_days_earned })}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Apply referral code (only if not already premium) */}
                        {currentTier === "free" && (
                            <div className="border-t border-border/50 pt-3 space-y-2">
                                <p className="text-xs text-muted-foreground font-medium">
                                    {t("subscription.haveReferralCode")}
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        value={applyCode}
                                        onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
                                        placeholder={t("subscription.referralPlaceholder")}
                                        maxLength={8}
                                        className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm font-mono uppercase tracking-widest focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                    <Button
                                        size="sm"
                                        onClick={handleApplyReferral}
                                        disabled={applyCode.length < 6 || applyingCode}
                                        className="h-9 px-3 shrink-0"
                                    >
                                        {applyingCode
                                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            : t("subscription.apply")}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pending transaction notice */}
                {status?.latest_transaction?.status === "pending" && (
                    <Card className="border-primary/30 bg-primary/5">
                        <CardContent className="pt-4 pb-4">
                            <div className="flex items-start gap-3">
                                <Clock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-foreground">
                                        {t("subscription.pendingTitle")}
                                    </p>
                                    <p className="text-xs text-primary mt-0.5">
                                        {t("subscription.planLabel", { plan: status.latest_transaction.plan_type.toUpperCase() })} ·{" "}
                                        {status.latest_transaction.final_amount.toLocaleString("vi-VN")}₫ ·{" "}
                                        {new Date(status.latest_transaction.created_at).toLocaleDateString("vi-VN")}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {t("subscription.pendingDesc")}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Store owner link */}
                <Card className="border-dashed">
                    <CardContent className="pt-4 pb-4 text-center">
                        <p className="text-sm font-medium text-foreground">{t("subscription.storeTitle")}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t("subscription.storeDesc")}
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => navigate("/store-registration")}
                        >
                            {t("subscription.registerStore")}
                        </Button>
                    </CardContent>
                </Card>

                {/* Payment shortcuts */}
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate("/subscription/status")}
                    >
                        <Clock className="w-3.5 h-3.5 mr-1.5" />
                        {t("subscription.txStatus")}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate("/subscription/history")}
                    >
                        <Landmark className="w-3.5 h-3.5 mr-1.5" />
                        {t("subscription.history")}
                    </Button>
                </div>
            </div>

            {/* Checkout dialog */}
            <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>
                            {orderResult ? t("subscription.paymentGuide") : t("subscription.checkoutTitle")}
                        </DialogTitle>
                    </DialogHeader>

                    {!orderResult ? (
                        <div className="space-y-4">
                            {/* Plan summary */}
                            <div className="bg-muted/60 rounded-lg p-3">
                                <p className="text-sm font-medium capitalize">
                                    {t("subscription.planSummary", {
                                        plan: selectedPlan,
                                        price: PLAN_CONFIG.find(p => p.id === selectedPlan)?.price.toLocaleString("vi-VN") || "0",
                                    })}
                                </p>
                            </div>

                            {/* Duration */}
                            <div>
                                <Label className="text-xs">{t("subscription.chooseDuration")}</Label>
                                <div className="flex gap-2 mt-1">
                                    {[1, 3, 6, 12].map((m) => {
                                        const discount = m >= 12 ? 0.15 : m >= 6 ? 0.1 : m >= 3 ? 0.05 : 0;
                                        return (
                                            <button
                                                type="button"
                                                key={m}
                                                onClick={() => setSelectedMonths(m)}
                                                className={`flex-1 rounded-lg p-2 text-center text-xs border transition-colors ${selectedMonths === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                                            >
                                                <p className="font-semibold">{m} {t("subscription.month")}</p>
                                                {discount > 0 && (
                                                    <p className="text-primary/70 text-[10px]">
                                                        {t("subscription.discount", { n: discount * 100 })}
                                                    </p>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Discount code */}
                            <div>
                                <Label className="text-xs">{t("subscription.discountCode")}</Label>
                                <Input
                                    className="mt-1 uppercase"
                                    placeholder={t("subscription.discountCodePlaceholder")}
                                    value={discountCode}
                                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                                />
                            </div>

                            {/* Payment method */}
                            <div>
                                <Label className="text-xs">{t("subscription.paymentMethod")}</Label>
                                <div className="flex gap-2 mt-1">
                                    {[
                                        { id: "momo" as PaymentMethod, label: "MoMo", Icon: Smartphone },
                                        { id: "bank_transfer" as PaymentMethod, label: t("subscription.bankTransfer"), Icon: Landmark },
                                    ].map((m) => (
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
                                <span className="text-sm font-medium">{t("subscription.totalAmount")}</span>
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
                                        {t("subscription.orderPending")}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {t("subscription.orderPendingDesc")}
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
                                            <p className="text-[10px] text-muted-foreground">{t("subscription.momoPhone")}</p>
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
                                        <p className="text-[10px] text-muted-foreground">{t("subscription.amount")}</p>
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
                                            {t("subscription.transferRequired")}
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
                                {t("subscription.transferNote")}
                            </p>
                        </div>
                    )}

                    <DialogFooter>
                        {!orderResult ? (
                            <>
                                <Button variant="outline" onClick={() => setShowCheckout(false)}>
                                    {t("common.cancel")}
                                </Button>
                                <Button onClick={handleOrder} disabled={ordering}>
                                    {ordering ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("subscription.processing")}</>
                                    ) : (
                                        t("subscription.pay", { amount: getTotal().toLocaleString("vi-VN") })
                                    )}
                                </Button>
                            </>
                        ) : (
                            <Button className="w-full" onClick={() => setShowCheckout(false)}>
                                {t("subscription.transferred")}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Subscription;
