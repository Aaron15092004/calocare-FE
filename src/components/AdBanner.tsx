import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, X, Zap, Sparkles, ArrowRight } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";

interface AdBannerProps {
    variant?: "strip" | "card";
    storageKey?: string;
}

const PLANS = [
    { tier: "Premium", price: "79.000₫", scans: "10 lần/ngày", color: "from-violet-500 to-purple-600" },
    { tier: "Pro", price: "179.000₫", scans: "20 lần/ngày", color: "from-amber-500 to-orange-600" },
];

export const AdBanner: React.FC<AdBannerProps> = ({
    variant = "strip",
    storageKey = "ad_dismissed",
}) => {
    const { profile } = useAuthContext();
    const navigate = useNavigate();
    const [dismissed, setDismissed] = useState(
        () => sessionStorage.getItem(storageKey) === "1",
    );

    if (profile?.subscription_tier !== "free" || dismissed) return null;

    const dismiss = () => {
        sessionStorage.setItem(storageKey, "1");
        setDismissed(true);
    };

    /* ── Strip variant ─────────────────────────────────────────────────── */
    if (variant === "strip") {
        return (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-[1.5px] shadow-lg shadow-violet-200">
                <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600/95 via-purple-600/95 to-indigo-600/95 px-4 py-3">
                    {/* Sparkle icon */}
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-white leading-tight">
                            Mở khóa Premium — Scan không giới hạn
                        </p>
                        <p className="text-[11px] text-white/75 mt-0.5 truncate">
                            Phân tích vitamin · Không quảng cáo · AI dinh dưỡng
                        </p>
                    </div>

                    {/* CTA */}
                    <button
                        type="button"
                        onClick={() => navigate("/subscription")}
                        className="shrink-0 flex items-center gap-1 bg-white text-violet-700 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-violet-50 active:scale-95 transition-all"
                    >
                        Upgrade <ArrowRight className="w-3 h-3" />
                    </button>

                    {/* Dismiss */}
                    <button
                        type="button"
                        aria-label="Đóng"
                        onClick={dismiss}
                        className="shrink-0 w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                    >
                        <X className="w-3 h-3 text-white" />
                    </button>
                </div>

                {/* Decorative blobs */}
                <div className="pointer-events-none absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10 blur-lg" />
                <div className="pointer-events-none absolute -bottom-4 -left-2 w-12 h-12 rounded-full bg-white/10 blur-md" />
            </div>
        );
    }

    /* ── Card variant ──────────────────────────────────────────────────── */
    return (
        <div className="relative overflow-hidden rounded-2xl shadow-xl shadow-violet-100 border border-violet-100">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-700" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />

            {/* Floating circles */}
            <div className="pointer-events-none absolute -top-8 -right-8 w-36 h-36 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -bottom-6 -left-6 w-24 h-24 rounded-full border border-white/10" />

            <div className="relative p-5">
                {/* Dismiss */}
                <button
                    type="button"
                    aria-label="Đóng"
                    onClick={dismiss}
                    className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                >
                    <X className="w-3.5 h-3.5 text-white" />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Crown className="w-6 h-6 text-amber-300" />
                    </div>
                    <div>
                        <p className="text-white font-bold text-base leading-tight">CaloVie Premium</p>
                        <p className="text-white/70 text-xs mt-0.5">Nâng cấp để mở khóa toàn bộ tính năng</p>
                    </div>
                </div>

                {/* Feature list */}
                <ul className="space-y-1.5 mb-5">
                    {[
                        "Scan không giới hạn mỗi ngày",
                        "Phân tích vitamin & khoáng chất",
                        "Không quảng cáo",
                        "AI ước tính dinh dưỡng",
                    ].map((f) => (
                        <li key={f} className="flex items-center gap-2 text-[13px] text-white/90">
                            <span className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center shrink-0 text-[9px] font-bold text-white">✓</span>
                            {f}
                        </li>
                    ))}
                </ul>

                {/* Plan buttons */}
                <div className="grid grid-cols-2 gap-2">
                    {PLANS.map((plan) => (
                        <button
                            key={plan.tier}
                            type="button"
                            onClick={() => navigate("/subscription")}
                            className={`flex flex-col items-center py-3 px-2 rounded-xl bg-gradient-to-b ${plan.color} hover:opacity-90 active:scale-95 transition-all shadow-md`}
                        >
                            <span className="text-white font-bold text-sm">{plan.tier}</span>
                            <span className="text-white/80 text-[10px] mt-0.5">{plan.scans}</span>
                            <span className="text-white font-semibold text-xs mt-1.5">{plan.price}/tháng</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

/* ── Compact inline upgrade nudge (used between diary entries) ─────────── */
export const UpgradeNudge: React.FC<{ message: string; storageKey?: string }> = ({
    message,
    storageKey = "nudge_dismissed",
}) => {
    const { profile } = useAuthContext();
    const navigate = useNavigate();
    const [dismissed, setDismissed] = useState(
        () => sessionStorage.getItem(storageKey) === "1",
    );

    if (profile?.subscription_tier !== "free" || dismissed) return null;

    return (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-violet-50 border border-violet-100">
            <Zap className="w-4 h-4 text-violet-500 shrink-0" />
            <p className="flex-1 text-xs text-violet-700 font-medium">{message}</p>
            <button
                type="button"
                onClick={() => navigate("/subscription")}
                className="text-[11px] font-bold text-white bg-violet-500 hover:bg-violet-600 px-2.5 py-1 rounded-lg transition-colors shrink-0"
            >
                Upgrade
            </button>
            <button
                type="button"
                aria-label="Đóng"
                onClick={() => { sessionStorage.setItem(storageKey, "1"); setDismissed(true); }}
                className="text-violet-300 hover:text-violet-500"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
};
