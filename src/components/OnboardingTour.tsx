import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, ArrowRight, Camera, BookOpen, Calendar, Heart, ScanLine, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOUR_KEY = "calocare_tour_v1_done";

interface TourStep {
    icon: React.ReactNode;
    title: string;
    description: string;
    color: string;
    action?: { label: string; path: string };
}

const steps: TourStep[] = [
    {
        icon: <Camera className="w-10 h-10 text-white" />,
        title: "AI Food Scanner",
        description:
            "Chụp ảnh bữa ăn của bạn và AI sẽ tự động nhận diện món ăn, tính toán calories và dinh dưỡng chỉ trong vài giây.",
        color: "from-primary to-emerald-400",
    },
    {
        icon: <ScanLine className="w-10 h-10 text-white" />,
        title: "Quét mã vạch",
        description:
            "Quét mã vạch trên bao bì thực phẩm đóng gói để tra cứu thông tin dinh dưỡng ngay lập tức từ cơ sở dữ liệu toàn cầu.",
        color: "from-blue-500 to-cyan-400",
    },
    {
        icon: <BookOpen className="w-10 h-10 text-white" />,
        title: "Nhật ký ăn uống",
        description:
            "Theo dõi mọi bữa ăn theo ngày. Xem lịch sử, tổng calo và các chỉ số dinh dưỡng của bạn.",
        color: "from-orange-500 to-amber-400",
        action: { label: "Mở nhật ký", path: "/diary" },
    },
    {
        icon: <Calendar className="w-10 h-10 text-white" />,
        title: "Kế hoạch ăn uống",
        description:
            "Khám phá và áp dụng các thực đơn được chuyên gia dinh dưỡng thiết kế, hoặc tạo thực đơn cá nhân cho riêng bạn.",
        color: "from-purple-500 to-violet-400",
        action: { label: "Khám phá thực đơn", path: "/community-plans" },
    },
    {
        icon: <Heart className="w-10 h-10 text-white" />,
        title: "Thực phẩm yêu thích",
        description:
            "Lưu thực phẩm và công thức nấu ăn yêu thích để truy cập nhanh khi ghi nhật ký hoặc lên thực đơn.",
        color: "from-red-500 to-rose-400",
        action: { label: "Xem yêu thích", path: "/favorites" },
    },
];

interface OnboardingTourProps {
    onDone?: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onDone }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const done = localStorage.getItem(TOUR_KEY);
        if (!done) {
            // Small delay so the app has loaded before showing tour
            const t = setTimeout(() => setVisible(true), 800);
            return () => clearTimeout(t);
        }
    }, []);

    const handleDone = () => {
        localStorage.setItem(TOUR_KEY, "1");
        setVisible(false);
        onDone?.();
    };

    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            handleDone();
        }
    };

    const handleSkip = () => {
        handleDone();
    };

    const handleAction = (path: string) => {
        handleDone();
        navigate(path);
    };

    if (!visible) return null;

    const current = steps[step];
    const isLast = step === steps.length - 1;

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleSkip}
            />

            {/* Tour card */}
            <div
                className="relative w-full max-w-lg mx-auto bg-card rounded-t-3xl shadow-2xl overflow-hidden"
                style={{ maxHeight: "85vh" }}
            >
                {/* Gradient header */}
                <div className={`bg-gradient-to-br ${current.color} p-8 flex flex-col items-center`}>
                    <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                        {current.icon}
                    </div>
                    <h2 className="text-xl font-bold text-white text-center">{current.title}</h2>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-muted-foreground text-center leading-relaxed mb-6">
                        {current.description}
                    </p>

                    {/* Step dots */}
                    <div className="flex justify-center gap-2 mb-6">
                        {steps.map((_, i) => (
                            <div
                                key={i}
                                className={`rounded-full transition-all duration-300 ${
                                    i === step
                                        ? "w-6 h-2 bg-primary"
                                        : i < step
                                        ? "w-2 h-2 bg-primary/50"
                                        : "w-2 h-2 bg-muted"
                                }`}
                            />
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                        {current.action && (
                            <Button
                                variant="outline"
                                className="w-full border-primary/30 text-primary"
                                onClick={() => handleAction(current.action!.path)}
                            >
                                {current.action.label}
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        )}
                        <Button className="w-full" onClick={handleNext}>
                            {isLast ? "Bắt đầu sử dụng!" : "Tiếp theo"}
                            {!isLast && <ArrowRight className="w-4 h-4 ml-2" />}
                        </Button>
                    </div>

                    {/* Skip */}
                    {!isLast && (
                        <button
                            onClick={handleSkip}
                            className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                        >
                            Bỏ qua hướng dẫn
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Hook to manually trigger the tour (e.g., from a settings button)
export function useOnboardingTour() {
    const reset = () => localStorage.removeItem(TOUR_KEY);
    const isDone = () => !!localStorage.getItem(TOUR_KEY);
    return { reset, isDone };
}
