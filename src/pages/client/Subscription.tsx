import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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

type PlanId = "free" | "premium" | "family";
type PaymentMethod = "momo" | "bank_transfer";

interface SubscriptionQuote {
    plan_type: "premium" | "family";
    plan_name: string;
    duration_months: number;
    price_monthly: number;
    amount: number;
    final_amount: number;
    currency: "VND";
    duration_discount_pct: number;
    duration_discount_amount: number;
    global_discount_pct: number;
    global_discount_amount: number;
    discount_code?: string;
    discount_code_amount: number;
}

interface SubscriptionStatus {
    tier: "free" | "premium" | "family" | "pro";
    expires_at: string | null;
    is_active: boolean;
    latest_transaction: {
        _id?: string;
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

interface PaymentInstructions {
    method?: string;
    bank?: string;
    account?: string;
    owner?: string;
    phone?: string;
    amount?: string;
    note?: string;
}

interface OrderResult {
    transaction_id?: string;
    tx_id?: string;
    plan_type?: string;
    status?: string;
    final_amount?: number;
    created_at?: string;
    payment_ref?: string;
    payment_ref_code?: string;
    payment_instructions?: PaymentInstructions;
    quote?: SubscriptionQuote;
    message?: string;
}

interface FamilyUser {
    _id?: string;
    display_name?: string;
    email?: string;
}

interface FamilyMember {
    user_id?: FamilyUser | string;
    role: "owner" | "member";
    joined_at: string;
}

interface FamilyInvite {
    code: string;
    expires_at: string;
}

interface FamilyGroup {
    seats_used: number;
    seats_available: number;
    max_members: number;
    members: FamilyMember[];
    invites: FamilyInvite[];
}

interface FamilyData {
    is_family_active?: boolean;
    role?: string | null;
    owned_group?: FamilyGroup | null;
    member_group?: FamilyGroup | null;
}

interface ApiError {
    response?: {
        status?: number;
        data?: (Partial<OrderResult> & {
            error?: string;
            message?: string;
        });
    };
}

const getApiErrorMessage = (error: unknown) => {
    const apiError = error as ApiError;
    return apiError.response?.data?.message || apiError.response?.data?.error;
};

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
        id: "family" as PlanId,
        price: 199000,
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
    const [searchParams] = useSearchParams();
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
    const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
    const [checkoutQuote, setCheckoutQuote] = useState<SubscriptionQuote | null>(null);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [quoteError, setQuoteError] = useState<string | null>(null);
    const orderingRef = useRef(false);

    const [expandedPlan, setExpandedPlan] = useState<PlanId | null>(null);

    const [referralData, setReferralData] = useState<{
        code: string; total_referrals: number; bonus_days_earned: number;
        referrer_bonus_days: number; referee_bonus_days: number;
    } | null>(null);
    const [applyCode, setApplyCode] = useState("");
    const [applyingCode, setApplyingCode] = useState(false);
    const [familyData, setFamilyData] = useState<FamilyData | null>(null);
    const [familyLoading, setFamilyLoading] = useState(false);
    const [familyInviteLoading, setFamilyInviteLoading] = useState(false);
    const [familyJoinCode, setFamilyJoinCode] = useState(searchParams.get("familyCode")?.toUpperCase() || "");
    const [familyJoining, setFamilyJoining] = useState(false);
    const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await api.get("/subscription/status");
            setStatus(res.data);
        } catch {
            // not critical
        } finally {
            setLoadingStatus(false);
        }
    }, []);

    const fetchFamily = useCallback(async () => {
        setFamilyLoading(true);
        try {
            const res = await api.get("/family");
            setFamilyData(res.data);
        } catch {
            setFamilyData(null);
        } finally {
            setFamilyLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        fetchFamily();
        api.get("/referrals/my-code").then((r) => setReferralData(r.data)).catch(() => {});
        api.get("/system-discount").then((r) => {
            if (r.data.is_active) setSysDiscount(r.data);
        }).catch(() => {});
    }, [fetchFamily, fetchStatus]);

    useEffect(() => {
        if (!showCheckout || !selectedPlan || selectedPlan === "free" || orderResult) return;

        const timer = window.setTimeout(async () => {
            setQuoteLoading(true);
            setQuoteError(null);
            try {
                const res = await api.post("/subscription/quote", {
                    plan_type: selectedPlan,
                    duration_months: selectedMonths,
                    discount_code: discountCode.trim().toUpperCase() || undefined,
                });
                setCheckoutQuote(res.data);
            } catch (err) {
                setCheckoutQuote(null);
                setQuoteError(
                    getApiErrorMessage(err) ||
                    t("subscription.errorOrder"),
                );
            } finally {
                setQuoteLoading(false);
            }
        }, 250);

        return () => window.clearTimeout(timer);
    }, [discountCode, orderResult, selectedMonths, selectedPlan, showCheckout, t]);

    const currentTier = (status?.tier === "pro" ? "family" : status?.tier)
        || (profile?.subscription_tier === "pro" ? "family" : profile?.subscription_tier)
        || "free";

    const openCheckout = (planId: PlanId) => {
        setSelectedPlan(planId);
        setSelectedMonths(1);
        setDiscountCode("");
        setOrderResult(null);
        setCheckoutQuote(null);
        setQuoteError(null);
        setShowCheckout(true);
    };

    const getTotal = () => {
        if (checkoutQuote) return checkoutQuote.final_amount;
        const plan = PLAN_CONFIG.find((p) => p.id === selectedPlan);
        if (!plan) return 0;
        return plan.price * selectedMonths;
    };

    const formatVnd = (amount: number) => amount.toLocaleString("vi-VN") + "₫";

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
            if (res.data.quote) setCheckoutQuote(res.data.quote);
            setStatus((prev) => prev
                ? {
                    ...prev,
                    latest_transaction: {
                        _id: res.data.transaction_id,
                        plan_type: selectedPlan,
                        status: "pending",
                        final_amount: res.data.final_amount,
                        created_at: new Date().toISOString(),
                    },
                  }
                : prev,
            );
        } catch (err) {
            const apiError = err as ApiError;
            const responseData = apiError.response?.data;
            if (apiError.response?.status === 409 && responseData?.transaction_id) {
                setOrderResult(responseData);
                setStatus((prev) => prev
                    ? {
                        ...prev,
                        latest_transaction: {
                            _id: responseData.transaction_id,
                            plan_type: responseData.plan_type || selectedPlan,
                            status: "pending",
                            final_amount: responseData.final_amount || 0,
                            created_at: responseData.created_at || new Date().toISOString(),
                        },
                      }
                    : prev,
                );
                toast({
                    title: t("subscription.pendingTitle"),
                    description: responseData.message,
                });
                return;
            }
            toast({
                title: t("subscription.errorTitle"),
                description: getApiErrorMessage(err) || t("subscription.errorOrder"),
                variant: "destructive",
            });
        } finally {
            orderingRef.current = false;
            setOrdering(false);
        }
    };

    useEffect(() => {
        const txId = orderResult?.transaction_id || orderResult?.tx_id;
        if (!txId || orderResult?.status === "completed") return;

        let stopped = false;
        const poll = async () => {
            try {
                const res = await api.get(`/subscription/transactions/${txId}`);
                if (stopped) return;
                const tx = res.data.transaction;
                if (tx) {
                    setOrderResult((prev) => ({ ...(prev || {}), status: tx.status, payment_ref: tx.payment_ref }));
                }
                if (tx?.status === "completed") {
                    await Promise.all([fetchStatus(), fetchFamily()]);
                    toast({
                        title: t("subscription.paymentSuccessTitle", "Thanh toán thành công"),
                        description: t("subscription.paymentSuccessDesc", "Gói của bạn đã được kích hoạt."),
                    });
                    stopped = true;
                }
            } catch {
                // Keep polling; transient network errors should not interrupt checkout.
            }
        };

        void poll();
        const interval = window.setInterval(poll, 2500);
        return () => {
            stopped = true;
            window.clearInterval(interval);
        };
    }, [fetchFamily, fetchStatus, orderResult?.status, orderResult?.transaction_id, orderResult?.tx_id, t, toast]);

    const handleApplyReferral = async () => {
        if (!applyCode.trim() || applyingCode) return;
        setApplyingCode(true);
        try {
            const res = await api.post("/referrals/apply", { code: applyCode.trim() });
            toast({ title: t("subscription.applySuccess"), description: res.data.message });
            setApplyCode("");
            await fetchStatus();
            api.get("/referrals/my-code").then((r) => setReferralData(r.data)).catch(() => {});
        } catch (err) {
            toast({
                title: t("subscription.errorTitle"),
                description: getApiErrorMessage(err) || t("subscription.errorApply"),
                variant: "destructive",
            });
        } finally {
            setApplyingCode(false);
        }
    };

    const handleCreateFamilyInvite = async () => {
        if (familyInviteLoading) return;
        setFamilyInviteLoading(true);
        try {
            const res = await api.post("/family/invites");
            await fetchFamily();
            if (res.data.invite_url) {
                navigator.clipboard.writeText(res.data.invite_url);
                toast({ title: "Đã tạo mã mời", description: "Link mời đã được sao chép." });
            } else {
                toast({ title: "Đã tạo mã mời" });
            }
        } catch (err) {
            toast({
                title: "Không tạo được mã mời",
                description: getApiErrorMessage(err),
                variant: "destructive",
            });
        } finally {
            setFamilyInviteLoading(false);
        }
    };

    const handleJoinFamily = async () => {
        if (!familyJoinCode.trim() || familyJoining) return;
        setFamilyJoining(true);
        try {
            const res = await api.post("/family/join", { code: familyJoinCode.trim().toUpperCase() });
            toast({ title: "Đã tham gia Family", description: res.data.message });
            setFamilyJoinCode("");
            await Promise.all([fetchFamily(), fetchStatus()]);
        } catch (err) {
            toast({
                title: "Không tham gia được Family",
                description: getApiErrorMessage(err),
                variant: "destructive",
            });
        } finally {
            setFamilyJoining(false);
        }
    };

    const handleRemoveFamilyMember = async (userId: string) => {
        if (!userId || removingMemberId) return;
        setRemovingMemberId(userId);
        try {
            await api.delete(`/family/members/${userId}`);
            toast({ title: "Đã xóa thành viên" });
            await fetchFamily();
        } catch (err) {
            toast({
                title: "Không xóa được thành viên",
                description: getApiErrorMessage(err),
                variant: "destructive",
            });
        } finally {
            setRemovingMemberId(null);
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

    const familyGroup = familyData?.owned_group || familyData?.member_group;
    const isFamilyOwner = Boolean(familyData?.owned_group);

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
                                            <Badge className={`text-xs font-semibold border-0 ${plan.id === "family" ? "bg-white/20 text-white" : "bg-primary/15 text-primary"}`}>
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

                {/* Family members */}
                <Card className="border-amber-300/50 bg-gradient-to-br from-amber-50/80 to-background dark:from-amber-950/20">
                    <CardContent className="pt-4 pb-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-amber-600" />
                                <p className="text-sm font-semibold text-foreground">Gói Family 5 người</p>
                            </div>
                            {familyLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        </div>

                        {familyGroup ? (
                            <div className="space-y-3">
                                <div className="rounded-xl border bg-background/70 p-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">
                                            {isFamilyOwner ? "Bạn là chủ gói Family" : "Bạn là thành viên Family"}
                                        </span>
                                        <Badge variant="secondary">
                                            {familyGroup.seats_used}/{familyGroup.max_members} chỗ
                                        </Badge>
                                    </div>
                                    <div className="mt-3 space-y-2">
                                        {(familyGroup.members || []).map((member: FamilyMember) => {
                                            const memberUser = typeof member.user_id === "object" && member.user_id !== null
                                                ? member.user_id
                                                : {};
                                            const userId = String(memberUser._id || member.user_id || "");
                                            const isOwnerMember = member.role === "owner";
                                            return (
                                                <div key={userId} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs">
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium text-foreground">
                                                            {memberUser.display_name || memberUser.email || "Thành viên"}
                                                        </p>
                                                        <p className="text-muted-foreground">
                                                            {isOwnerMember ? "Chủ gói" : "Thành viên"} · tham gia {new Date(member.joined_at).toLocaleDateString("vi-VN")}
                                                        </p>
                                                    </div>
                                                    {isFamilyOwner && !isOwnerMember && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                                                            disabled={removingMemberId === userId}
                                                            onClick={() => handleRemoveFamilyMember(userId)}
                                                        >
                                                            {removingMemberId === userId ? <Loader2 className="w-3 h-3 animate-spin" /> : "Xóa"}
                                                        </Button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {isFamilyOwner && (
                                    <div className="space-y-2">
                                        {(familyGroup.invites || []).length > 0 && (
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-muted-foreground">Mã mời đang hoạt động</p>
                                                {(familyGroup.invites || []).map((invite: FamilyInvite) => {
                                                    const inviteUrl = `${window.location.origin}/subscription?familyCode=${invite.code}`;
                                                    return (
                                                        <div key={invite.code} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-xs">
                                                            <div>
                                                                <p className="font-mono font-bold tracking-widest text-foreground">{invite.code}</p>
                                                                <p className="text-muted-foreground">
                                                                    Hết hạn {new Date(invite.expires_at).toLocaleDateString("vi-VN")}
                                                                </p>
                                                            </div>
                                                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => copyText(inviteUrl)}>
                                                                <Copy className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full"
                                            disabled={familyInviteLoading || familyGroup.seats_available <= 0}
                                            onClick={handleCreateFamilyInvite}
                                        >
                                            {familyInviteLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Gift className="w-4 h-4 mr-2" />}
                                            Tạo link mời thành viên
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">
                                    Nếu bạn được chủ gói Family mời, nhập mã tại đây để dùng chung quyền Family và báo cáo riêng theo tài khoản của bạn.
                                </p>
                                <div className="flex gap-2">
                                    <Input
                                        value={familyJoinCode}
                                        onChange={(e) => setFamilyJoinCode(e.target.value.toUpperCase())}
                                        placeholder="Mã mời Family"
                                        className="h-9 font-mono uppercase tracking-widest"
                                    />
                                    <Button size="sm" className="h-9 shrink-0" disabled={familyJoinCode.length < 6 || familyJoining} onClick={handleJoinFamily}>
                                        {familyJoining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Tham gia"}
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
                                        {t("subscription.planLabel", {
                                            plan: (status.latest_transaction.plan_type === "pro" ? "FAMILY" : status.latest_transaction.plan_type.toUpperCase()),
                                        })} ·{" "}
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
                                        price: (checkoutQuote?.price_monthly ?? PLAN_CONFIG.find(p => p.id === selectedPlan)?.price ?? 0).toLocaleString("vi-VN"),
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
                                {quoteError && (
                                    <p className="mt-1 text-xs text-destructive">{quoteError}</p>
                                )}
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
                            <div className="space-y-1.5 py-3 border-t text-sm">
                                {quoteLoading && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Đang cập nhật giá...
                                    </div>
                                )}
                                {checkoutQuote && (
                                    <>
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Giá gốc</span>
                                            <span>{formatVnd(checkoutQuote.amount)}</span>
                                        </div>
                                        {checkoutQuote.duration_discount_amount > 0 && (
                                            <div className="flex justify-between text-green-600">
                                                <span>Giảm thời hạn ({checkoutQuote.duration_discount_pct}%)</span>
                                                <span>-{formatVnd(checkoutQuote.duration_discount_amount)}</span>
                                            </div>
                                        )}
                                        {checkoutQuote.global_discount_amount > 0 && (
                                            <div className="flex justify-between text-green-600">
                                                <span>Ưu đãi hệ thống ({checkoutQuote.global_discount_pct}%)</span>
                                                <span>-{formatVnd(checkoutQuote.global_discount_amount)}</span>
                                            </div>
                                        )}
                                        {checkoutQuote.discount_code_amount > 0 && (
                                            <div className="flex justify-between text-green-600">
                                                <span>Mã {checkoutQuote.discount_code}</span>
                                                <span>-{formatVnd(checkoutQuote.discount_code_amount)}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                                <div className="flex justify-between items-center border-t pt-2">
                                    <span className="text-sm font-medium">{t("subscription.totalAmount")}</span>
                                    <span className="text-lg font-bold text-primary">
                                        {formatVnd(getTotal())}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Payment instructions — pending state */
                        <div className="space-y-3">
                            {/* Status badge */}
                            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                                orderResult?.status === "completed"
                                    ? "bg-green-50 border border-green-200 text-green-700"
                                    : "bg-primary/5 border border-primary/20"
                            }`}>
                                {orderResult?.status === "completed" ? (
                                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                                ) : (
                                    <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                                )}
                                <div>
                                    <p className="text-xs font-semibold text-foreground">
                                        {orderResult?.status === "completed" ? "Đã kích hoạt gói" : t("subscription.orderPending")}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {orderResult?.status === "completed"
                                            ? "CaloVie đã xác nhận thanh toán và cập nhật quyền sử dụng."
                                            : "CaloVie sẽ tự kiểm tra trạng thái thanh toán sau mỗi 2.5 giây."}
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
                                <Button onClick={handleOrder} disabled={ordering || quoteLoading || Boolean(quoteError)}>
                                    {ordering ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("subscription.processing")}</>
                                    ) : (
                                        t("subscription.pay", { amount: getTotal().toLocaleString("vi-VN") })
                                    )}
                                </Button>
                            </>
                        ) : (
                            <Button
                                className="w-full"
                                onClick={() => {
                                    const txId = orderResult?.transaction_id || orderResult?.tx_id;
                                    setShowCheckout(false);
                                    if (txId) navigate(`/subscription/status?txId=${txId}`);
                                }}
                            >
                                {orderResult?.status === "completed" ? "Xem gói đã kích hoạt" : t("subscription.transferred")}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Subscription;
