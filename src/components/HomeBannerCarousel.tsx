import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Crown, Zap } from "lucide-react";
import api from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";

interface Banner {
    _id: string;
    title: string;
    subtitle?: string;
    image_url?: string;
    link_url?: string;
    cta_text?: string;
    bg_gradient?: string;
    show_text?: boolean;
}

/* Default house-ad slides shown when no admin banners exist or user is free */
const DEFAULT_SLIDES = [
    {
        _id: "default-1",
        title: "Scan món ăn với AI",
        subtitle: "Nhận diện dinh dưỡng chính xác chỉ bằng 1 tấm ảnh",
        cta_text: "Thử ngay",
        link_url: "/",
        bg_gradient: "from-emerald-500 to-teal-600",
        icon: "scan",
    },
    {
        _id: "default-2",
        title: "Mở khóa Premium",
        subtitle: "Scan không giới hạn · Phân tích vitamin · Không quảng cáo",
        cta_text: "Xem gói",
        link_url: "/subscription",
        bg_gradient: "from-violet-600 to-purple-700",
        icon: "crown",
    },
    {
        _id: "default-3",
        title: "Quán ăn xung quanh bạn",
        subtitle: "Khám phá nhà hàng, cafe với thực đơn dinh dưỡng gần đây",
        cta_text: "Khám phá",
        link_url: "/nearby",
        bg_gradient: "from-amber-500 to-orange-600",
        icon: "map",
    },
];

const INTERVAL_MS = 4500;

export const HomeBannerCarousel: React.FC = () => {
    const navigate = useNavigate();
    const { profile } = useAuthContext();
    const [slides, setSlides] = useState<any[]>(DEFAULT_SLIDES);
    const [current, setCurrent] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    /* Fetch admin banners; merge with defaults if any exist */
    useEffect(() => {
        api.get("/banners")
            .then(({ data }) => {
                if (Array.isArray(data) && data.length > 0) {
                    /* Free users see admin banners + default upgrade slide */
                    if (profile?.subscription_tier === "free") {
                        setSlides([...data, DEFAULT_SLIDES[1]]);
                    } else {
                        setSlides(data);
                    }
                }
            })
            .catch(() => { /* keep defaults */ });
    }, [profile?.subscription_tier]);

    /* Auto-rotate */
    useEffect(() => {
        timerRef.current = setInterval(() => {
            setCurrent((c) => (c + 1) % slides.length);
        }, INTERVAL_MS);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [slides.length]);

    const goTo = (idx: number) => {
        if (timerRef.current) clearInterval(timerRef.current);
        setCurrent(idx);
        timerRef.current = setInterval(() => {
            setCurrent((c) => (c + 1) % slides.length);
        }, INTERVAL_MS);
    };

    const handleClick = (slide: any) => {
        if (!slide.link_url) return;
        if (slide.link_url.startsWith("http")) {
            window.open(slide.link_url, "_blank", "noopener");
        } else {
            navigate(slide.link_url);
        }
    };

    const slide = slides[current];
    const showText = slide.show_text !== false; // default true for legacy & default slides
    const gradientClass = slide.bg_gradient?.startsWith("from-")
        ? `bg-gradient-to-br ${slide.bg_gradient}`
        : "bg-gradient-to-br from-violet-600 to-purple-700";

    return (
        <div className="relative select-none">
            {/* Card */}
            <div
                className={`relative overflow-hidden rounded-2xl cursor-pointer shadow-lg transition-all duration-500 ${!slide.image_url ? gradientClass : ""}`}
                style={
                    slide.image_url
                        ? { backgroundImage: `url(${slide.image_url})`, backgroundSize: "cover", backgroundPosition: "center", minHeight: "120px" }
                        : undefined
                }
                onClick={() => handleClick(slide)}
            >
                {/* Scrim — only when image present AND text overlay is on */}
                {slide.image_url && showText && (
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                )}

                {/* Decorative bubbles (gradient-only slides) */}
                {!slide.image_url && (
                    <>
                        <div className="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
                        <div className="pointer-events-none absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/10" />
                    </>
                )}

                {/* Text overlay — shown when show_text is true (or legacy/default slides) */}
                {showText && (
                    <div className="relative p-5 flex items-center gap-4 min-h-[120px]">
                        {/* Icon (only for default slides) */}
                        {!slide.image_url && slide.icon && (
                            <div className="shrink-0 w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                {slide.icon === "crown" ? (
                                    <Crown className="w-6 h-6 text-amber-300" />
                                ) : (
                                    <Zap className="w-6 h-6 text-white" />
                                )}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-base leading-tight line-clamp-1">
                                {slide.title}
                            </p>
                            {slide.subtitle && (
                                <p className="text-white/75 text-xs mt-1 line-clamp-2">{slide.subtitle}</p>
                            )}
                            {slide.cta_text && (
                                <div className="mt-3 inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors">
                                    {slide.cta_text} <ArrowRight className="w-3 h-3" />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Image-only mode spacer — keeps card height */}
                {!showText && slide.image_url && (
                    <div className="min-h-[120px]" />
                )}
            </div>

            {/* Dot indicator */}
            {slides.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-2.5">
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            aria-label={`Slide ${i + 1}`}
                            onClick={() => goTo(i)}
                            className={`rounded-full transition-all duration-300 ${
                                i === current
                                    ? "w-5 h-1.5 bg-primary"
                                    : "w-1.5 h-1.5 bg-muted-foreground/30"
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
