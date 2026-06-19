import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Ban,
    Check,
    ChevronRight,
    Clock,
    ExternalLink,
    MapPin,
    Plus,
    Search,
    Send,
    Settings,
    ShoppingBag,
    Star,
    StopCircle,
    Trash2,
    Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { useSSEChat, type ChatSearchResults, type DiaryProposal, type MealScheduleProposal, type ProfileUpdateProposal, type StoreRecommendationResults } from "@/hooks/useSSEChat";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MEAL_ORDER } from "@/types/mealPlan";
import { CaloVieFaceMascot, type MascotFaceMood } from "@/components/brand/CaloVieMascot";

const MEAL_LABELS: Record<string, string> = {
    breakfast: "Bữa sáng",
    lunch: "Bữa trưa",
    dinner: "Bữa tối",
    snack: "Bữa phụ",
};

const STARTER_CHIPS = [
    "Hôm nay mình nên ăn gì?",
    "Tóm tắt nhanh hôm nay của tôi",
    "Chỉ tôi cách dùng app này",
    "Tìm quán healthy gần tôi",
];

const FOLLOW_UP_CHIPS = [
    "Nói ngắn hơn",
    "Gợi ý tiếp đi",
    "Lên lịch ăn cho tôi",
];

const STYLE_CHIPS = [
    { label: "Ấm áp", prompt: "Từ bây giờ hãy trả lời ấm áp, gần gũi và ngắn gọn hơn." },
    { label: "Coach", prompt: "Từ bây giờ hãy trả lời như một coach rõ ràng, có các bước hành động." },
    { label: "Dễ hiểu", prompt: "Từ bây giờ hãy giải thích đơn giản, ít thuật ngữ và rất dễ hiểu." },
];

const APP_HELP_CHIPS = [
    "Cách dùng scan AI",
    "Cách xem báo cáo",
    "Cách tạo meal plan",
];

const THINKING_STEPS = ["Đang xem nhanh", "Đang chọn gợi ý", "Đang viết ngắn gọn"];

const PROFILE_FIELD_LABELS: Record<string, string> = {
    goal: "Mục tiêu sức khỏe",
    dietary_preference: "Chế độ ăn",
    allergies: "Dị ứng thực phẩm",
    activity_level: "Mức độ vận động",
    weight_kg: "Cân nặng",
    height_cm: "Chiều cao",
};

const formatVnd = (amount?: number) =>
    amount ? `${Math.round(amount).toLocaleString("vi-VN")}₫` : "Hỏi quán";

const normalizeExternalUrl = (url?: string) => {
    if (!url?.trim()) return "";
    const trimmed = url.trim();
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const getChatMascotMood = ({
    isLoading,
    hasError,
    hasConversation,
    lastAssistantMessage,
}: {
    isLoading: boolean;
    hasError: boolean;
    hasConversation: boolean;
    lastAssistantMessage?: string;
}): MascotFaceMood => {
    if (hasError) return "worried";
    if (isLoading) return "curious";
    if (!hasConversation) return "playful";

    const text = (lastAssistantMessage ?? "").toLowerCase();
    if (text.includes("tuyệt") || text.includes("ổn") || text.includes("tốt") || text.includes("yên tâm")) return "love";
    if (text.includes("chưa") || text.includes("không") || text.includes("lỗi")) return "worried";
    return "neutral";
};

const ProposalCard: React.FC<{
    proposal: MealScheduleProposal;
    onApprove: () => void;
    onDismiss: () => void;
}> = ({ proposal, onApprove, onDismiss }) => {
    const [saving, setSaving] = useState(false);

    const handleApprove = async () => {
        setSaving(true);
        try {
            await onApprove();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="my-2 rounded-3xl border border-primary/20 bg-primary/5 p-4 text-sm shadow-sm">
            <div className="mb-2 flex items-center gap-2 font-semibold text-primary">
                <Clock className="h-4 w-4" />
                Lịch ăn gợi ý
            </div>
            <div className="mb-3 space-y-1.5">
                {MEAL_ORDER.filter((k) => proposal.schedule[k]).map((key) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{MEAL_LABELS[key] ?? key}</span>
                        <span className="font-medium text-foreground">{proposal.schedule[key]}</span>
                    </div>
                ))}
            </div>
            {proposal.advice && <p className="mb-3 text-[11px] italic text-muted-foreground">{proposal.advice}</p>}
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={handleApprove}
                    disabled={saving}
                    className="flex flex-1 items-center justify-center gap-1 rounded-full bg-primary py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                >
                    <Check className="h-3 w-3" />
                    {saving ? "Đang lưu..." : "Áp dụng"}
                </button>
                <button
                    type="button"
                    onClick={onDismiss}
                    className="flex flex-1 items-center justify-center gap-1 rounded-full border border-border py-2 text-xs font-semibold text-muted-foreground"
                >
                    <Ban className="h-3 w-3" />
                    Bỏ qua
                </button>
            </div>
        </div>
    );
};

const ActionProposalCard: React.FC<{
    proposal: ProfileUpdateProposal;
    onApprove: () => void;
    onDismiss: () => void;
}> = ({ proposal, onApprove, onDismiss }) => {
    const [saving, setSaving] = useState(false);
    const fieldLabel = PROFILE_FIELD_LABELS[proposal.field] ?? proposal.field;
    const valueStr = Array.isArray(proposal.value)
        ? (proposal.value as string[]).join(", ")
        : String(proposal.value);

    const handleApprove = async () => {
        setSaving(true);
        try {
            await onApprove();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="my-2 rounded-3xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#b16b00]">
                <Settings className="h-3.5 w-3.5" />
                Cập nhật trước khi lưu
            </div>
            <div className="mb-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{fieldLabel}</span>
                    <span className="font-medium text-foreground">{valueStr}</span>
                </div>
                {proposal.reason && <p className="text-[11px] italic text-muted-foreground">{proposal.reason}</p>}
            </div>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={handleApprove}
                    disabled={saving}
                    className="flex flex-1 items-center justify-center gap-1 rounded-full bg-[#f1a325] py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                    <Check className="h-3 w-3" />
                    {saving ? "Đang lưu..." : "Áp dụng"}
                </button>
                <button
                    type="button"
                    onClick={onDismiss}
                    className="flex flex-1 items-center justify-center gap-1 rounded-full border border-border py-2 text-xs font-semibold text-muted-foreground"
                >
                    <Ban className="h-3 w-3" />
                    Bỏ qua
                </button>
            </div>
        </div>
    );
};

const DiaryProposalCard: React.FC<{
    proposal: DiaryProposal;
    onApprove: () => void;
    onDismiss: () => void;
}> = ({ proposal, onApprove, onDismiss }) => {
    const [saving, setSaving] = useState(false);
    const isEstimate = proposal.source_type === "ai_estimate";

    const handleApprove = async () => {
        setSaving(true);
        try {
            await onApprove();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="my-2 rounded-3xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <Utensils className="h-3.5 w-3.5" />
                Kiểm tra trước khi lưu
                {isEstimate && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        Ước tính
                    </span>
                )}
            </div>
            <div className="mb-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-foreground">{proposal.food_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                            {MEAL_LABELS[proposal.meal_type]} · {proposal.weight_grams}g
                        </p>
                    </div>
                    <span className="rounded-full bg-orange-500/12 px-2 py-1 text-xs font-bold text-orange-600">
                        {proposal.nutrition.calories} kcal
                    </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground">
                    <span className="rounded-full bg-card px-2 py-1 ring-1 ring-border/50">P {proposal.nutrition.protein}g</span>
                    <span className="rounded-full bg-card px-2 py-1 ring-1 ring-border/50">C {proposal.nutrition.carbs}g</span>
                    <span className="rounded-full bg-card px-2 py-1 ring-1 ring-border/50">F {proposal.nutrition.fat}g</span>
                </div>
                {proposal.reason && <p className="text-[11px] italic text-muted-foreground">{proposal.reason}</p>}
            </div>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={handleApprove}
                    disabled={saving}
                    className="flex flex-1 items-center justify-center gap-1 rounded-full bg-emerald-600 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                    <Check className="h-3 w-3" />
                    {saving ? "Đang lưu..." : "Lưu vào nhật ký"}
                </button>
                <button
                    type="button"
                    onClick={onDismiss}
                    className="flex flex-1 items-center justify-center gap-1 rounded-full border border-border py-2 text-xs font-semibold text-muted-foreground"
                >
                    <Ban className="h-3 w-3" />
                    Bỏ qua
                </button>
            </div>
        </div>
    );
};

const SearchResultsCard: React.FC<{
    results: ChatSearchResults;
    onDismiss: () => void;
}> = ({ results, onDismiss }) => (
    <div className="my-2 rounded-3xl border border-sky-400/25 bg-sky-500/10 p-4 text-sm shadow-sm">
        <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-700">
                <Search className="h-3.5 w-3.5" />
                {results.query}
            </div>
            <button type="button" onClick={onDismiss} className="text-xs font-medium text-sky-700">
                Ẩn
            </button>
        </div>
        {results.results.length === 0 ? (
            <p className="py-1 text-center text-xs text-muted-foreground">Chưa thấy kết quả phù hợp.</p>
        ) : (
            <div className="space-y-2">
                {results.results.slice(0, 4).map((item, index) => (
                    <div key={`${item.name}-${index}`} className="rounded-2xl border border-border/60 bg-card px-3 py-2">
                        <div className="flex items-start justify-between gap-2">
                            <span className="flex-1 text-xs font-medium text-foreground">{item.name}</span>
                            <span className="shrink-0 text-[11px] font-semibold text-orange-500">{item.energy_kcal} kcal</span>
                        </div>
                        <div className="mt-1 flex gap-2 text-[10px] text-muted-foreground">
                            <span>P: {item.protein}g</span>
                            <span>C: {item.carbs}g</span>
                            <span>F: {item.fat}g</span>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
);

const StoreRecommendationsCard: React.FC<{
    results: StoreRecommendationResults;
    onDismiss: () => void;
    onOpenStore: (storeId: string) => void;
}> = ({ results, onDismiss, onOpenStore }) => (
    <div className="my-2 rounded-3xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <MapPin className="h-3.5 w-3.5" />
                {results.has_location ? "Gợi ý gần bạn" : "Gợi ý hợp hôm nay"}
            </div>
            <button type="button" onClick={onDismiss} className="text-xs font-medium text-emerald-700">
                Ẩn
            </button>
        </div>

        {results.results.length === 0 ? (
            <p className="py-1 text-center text-xs text-muted-foreground">Mình chưa thấy quán phù hợp lúc này.</p>
        ) : (
            <div className="space-y-2.5">
                {results.results.slice(0, 4).map((store) => {
                    const orderUrl = normalizeExternalUrl(store.website);
                    return (
                        <div key={store.store_id} className="rounded-3xl border border-border/60 bg-card p-3">
                            <div className="flex gap-3">
                                {store.image_url ? (
                                    <img src={store.image_url} alt={store.name} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
                                ) : (
                                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary/10">
                                        <Utensils className="h-6 w-6 text-primary" />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="truncate text-sm font-bold text-foreground">{store.name}</p>
                                        {store.distance_km != null && (
                                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                                                {store.distance_km}km
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{store.address}</p>
                                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                                        <span className="inline-flex items-center gap-0.5">
                                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                            {store.average_rating > 0 ? store.average_rating.toFixed(1) : "Mới"}
                                        </span>
                                        <span>{store.rating_count || 0} đánh giá</span>
                                    </div>
                                </div>
                            </div>

                            <p className="mt-2 text-xs font-medium leading-5 text-foreground">{store.reason}</p>

                            {store.menu_items.length > 0 && (
                                <div className="mt-2 space-y-1.5">
                                    {store.menu_items.slice(0, 2).map((item) => (
                                        <div key={item.item_id} className="flex items-center justify-between gap-2 rounded-2xl bg-muted/60 px-3 py-2 text-xs">
                                            <div className="min-w-0">
                                                <p className="truncate font-semibold text-foreground">{item.name}</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {item.energy_kcal ? `${Math.round(item.energy_kcal)} kcal` : "Menu quán"}{item.protein ? ` · P ${item.protein}g` : ""}
                                                </p>
                                            </div>
                                            <span className="shrink-0 font-bold text-primary">{formatVnd(item.price)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => onOpenStore(store.store_id)}
                                    className="rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                                >
                                    Xem menu
                                </button>
                                {orderUrl ? (
                                    <button
                                        type="button"
                                        onClick={() => window.open(orderUrl, "_blank", "noopener,noreferrer")}
                                        className="inline-flex items-center justify-center gap-1 rounded-full border border-border px-3 py-2 text-xs font-semibold text-foreground"
                                    >
                                        <ShoppingBag className="h-3 w-3" />
                                        Đặt ngay
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => onOpenStore(store.store_id)}
                                        className="inline-flex items-center justify-center gap-1 rounded-full border border-border px-3 py-2 text-xs font-semibold text-foreground"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        Chi tiết
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
    </div>
);

const MessageBubble: React.FC<{
    role: "user" | "assistant";
    content: string;
    mascotMood: MascotFaceMood;
}> = ({ role, content, mascotMood }) => {
    const isUser = role === "user";

    return (
        <div className={`mb-3 flex ${isUser ? "justify-end" : "justify-start"}`}>
            {!isUser && (
                <CaloVieFaceMascot mood={mascotMood} className="-ml-1 mr-0.5 mt-0.5 h-[4.25rem] w-[4.25rem] shrink-0" motion="breathe" />
            )}
            <div
                className={`max-w-[84%] rounded-[1.35rem] px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap ${
                    isUser
                        ? "rounded-br-md bg-primary text-primary-foreground shadow-sm"
                        : "rounded-bl-md border border-border/70 bg-card text-foreground shadow-sm"
                }`}
            >
                {content}
            </div>
        </div>
    );
};

type LocationState = {
    prompt?: string;
};

const AIAssistant: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, profile } = useAuthContext();
    const { toast } = useToast();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [input, setInput] = useState("");
    const [introPromptSent, setIntroPromptSent] = useState(false);
    const {
        messages,
        sendMessage,
        isLoading,
        error,
        clearMessages,
        stop,
        proposal,
        approveProposal,
        dismissProposal,
        navigateTo,
        clearNavigate,
        actionProposal,
        approveActionProposal,
        dismissActionProposal,
        diaryProposal,
        approveDiaryProposal,
        dismissDiaryProposal,
        searchResults,
        dismissSearchResults,
        storeRecommendations,
        dismissStoreRecommendations,
    } = useSSEChat();

    const userName = useMemo(() => {
        const rawName = profile?.display_name?.trim() || user?.email?.split("@")[0] || "bạn";
        return rawName.split(" ")[0];
    }, [profile?.display_name, user?.email]);

    const lastAssistantMessage = useMemo(
        () => [...messages].reverse().find((message) => message.role === "assistant")?.content ?? "",
        [messages],
    );

    const mascotMood = getChatMascotMood({
        isLoading,
        hasError: Boolean(error),
        lastAssistantMessage,
        hasConversation: messages.length > 0,
    });
    const lastMessageIsAssistant = messages[messages.length - 1]?.role === "assistant";
    const showThinking = isLoading && !lastMessageIsAssistant;

    useEffect(() => {
        if (!navigateTo) return;
        navigate(navigateTo);
        clearNavigate();
    }, [clearNavigate, navigate, navigateTo]);

    useEffect(() => {
        if (!error) return;
        const isOffline = !navigator.onLine || error.toLowerCase().includes("fetch") || error.includes("hết thời gian");
        if (isOffline) {
            toast({
                title: "calovie đang gián đoạn",
                description: "Kiểm tra kết nối rồi thử lại nhé.",
                variant: "destructive",
            });
        }
    }, [error, toast]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, proposal, actionProposal, diaryProposal, searchResults, storeRecommendations, isLoading]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        const state = location.state as LocationState | null;
        if (!state?.prompt || introPromptSent) return;
        setIntroPromptSent(true);
        sendMessage(state.prompt);
        navigate(location.pathname, { replace: true, state: {} });
    }, [introPromptSent, location.pathname, location.state, navigate, sendMessage]);

    if (!user) return null;

    const handleSend = () => {
        const text = input.trim();
        if (!text || isLoading) return;
        setInput("");
        sendMessage(text);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="calovie-ios-surface min-h-screen pb-nav-safe text-foreground">
            <header className="sticky top-0 z-20 border-b border-border/50 bg-background/86 backdrop-blur-xl">
                <div className="flex items-center gap-3 px-3 pb-3 pt-[calc(0.8rem+env(safe-area-inset-top,0px))]">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="grid h-10 w-10 place-items-center rounded-full bg-card/90 text-foreground shadow-sm ring-1 ring-border/70"
                        title="Quay lại"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>

                    <div className="relative flex min-w-0 flex-1 flex-col items-center justify-center">
                        <CaloVieFaceMascot mood={mascotMood} className="-mb-5 h-[6.2rem] w-[6.2rem]" motion={isLoading ? "bob" : "breathe"} />
                        <img src="/logo.png" alt="CaloVie" className="h-11 w-auto object-contain" />
                    </div>

                    {messages.length > 0 ? (
                        <button
                            type="button"
                            onClick={clearMessages}
                            className="grid h-10 w-10 place-items-center rounded-full bg-card/90 text-foreground shadow-sm ring-1 ring-border/70"
                            title="Làm mới"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    ) : (
                        <div className="h-10 w-10" />
                    )}
                </div>
            </header>

            <main className="flex flex-col">
                <section className="flex min-h-[calc(100vh-9.5rem)] flex-col">
                    <div className="flex-1 overflow-y-auto pb-4 pt-5">
                        {messages.length === 0 ? (
                            <div className="flex min-h-[58vh] flex-col justify-between px-4">
                                <div>
                                    <div className="mb-5 flex items-center gap-2">
                                        <CaloVieFaceMascot mood={mascotMood} className="h-24 w-24 shrink-0" motion="breathe" />
                                        <div className="min-w-0">
                                            <p className="text-base font-bold text-foreground">Chào {userName}, hôm nay bạn cần mình giúp gì?</p>
                                            <p className="mt-1 text-sm leading-6 text-muted-foreground">Hỏi về bữa ăn, cách dùng app hoặc gợi ý gần bạn.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {STARTER_CHIPS.map((chip) => (
                                            <button
                                                key={chip}
                                                type="button"
                                                onClick={() => sendMessage(chip)}
                                                className="flex w-full items-center justify-between rounded-2xl border border-border bg-card/90 px-4 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-accent/30"
                                            >
                                                <span>{chip}</span>
                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-6 space-y-3">
                                    <div className="flex flex-wrap gap-2">
                                        {STYLE_CHIPS.map((chip) => (
                                            <button
                                                key={chip.label}
                                                type="button"
                                                onClick={() => sendMessage(chip.prompt)}
                                                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                                            >
                                                {chip.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="overflow-x-auto pb-1">
                                        <div className="flex w-max gap-2">
                                            {APP_HELP_CHIPS.map((chip) => (
                                                <button
                                                    key={chip}
                                                    type="button"
                                                    onClick={() => sendMessage(chip)}
                                                    className="rounded-full bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm ring-1 ring-border/60"
                                                >
                                                    {chip}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="px-3">
                                    {messages.map((message, index) => (
                                        <MessageBubble
                                            key={`${message.role}-${index}`}
                                            role={message.role}
                                            content={message.content}
                                            mascotMood={mascotMood}
                                        />
                                    ))}
                                </div>

                                {showThinking && (
                                    <div className="mb-3 flex items-start px-3">
                                        <CaloVieFaceMascot mood="curious" className="-ml-1 mr-0.5 mt-0.5 h-[4.25rem] w-[4.25rem] shrink-0" motion="bob" />
                                        <div className="w-full max-w-[84%] rounded-[1.35rem] rounded-bl-md border border-border/70 bg-card px-4 py-3 shadow-sm">
                                            <p className="text-sm font-semibold text-muted-foreground">Calovie đang nghĩ...</p>
                                            <div className="mt-2 space-y-1.5">
                                                {THINKING_STEPS.map((step) => (
                                                    <div key={step} className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                                        {step}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!isLoading && messages[messages.length - 1]?.role === "assistant" && (
                                    <div className="mb-3 flex gap-2 overflow-x-auto px-3 pb-1">
                                        {FOLLOW_UP_CHIPS.map((chip) => (
                                            <button
                                                key={chip}
                                                type="button"
                                                onClick={() => sendMessage(chip)}
                                                className="shrink-0 rounded-full border border-border bg-muted/60 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                                            >
                                                {chip}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="px-3">
                                    {proposal && (
                                        <ProposalCard
                                            proposal={proposal}
                                            onApprove={async () => {
                                                await approveProposal(proposal);
                                                toast({ title: "Đã lưu lịch ăn", description: "Lịch ăn mới đã được áp dụng." });
                                            }}
                                            onDismiss={dismissProposal}
                                        />
                                    )}
                                    {actionProposal && (
                                        <ActionProposalCard
                                            proposal={actionProposal}
                                            onApprove={async () => {
                                                await approveActionProposal(actionProposal);
                                                toast({ title: "Đã cập nhật hồ sơ", description: actionProposal.label });
                                            }}
                                            onDismiss={dismissActionProposal}
                                        />
                                    )}
                                    {diaryProposal && (
                                        <DiaryProposalCard
                                            proposal={diaryProposal}
                                            onApprove={async () => {
                                                await approveDiaryProposal(diaryProposal);
                                                toast({ title: "Đã lưu vào nhật ký", description: diaryProposal.label });
                                            }}
                                            onDismiss={dismissDiaryProposal}
                                        />
                                    )}
                                    {searchResults && <SearchResultsCard results={searchResults} onDismiss={dismissSearchResults} />}
                                    {storeRecommendations && (
                                        <StoreRecommendationsCard
                                            results={storeRecommendations}
                                            onDismiss={dismissStoreRecommendations}
                                            onOpenStore={(storeId) => navigate(`/nearby/${storeId}`)}
                                        />
                                    )}
                                </div>
                                {error && <p className="py-1 text-center text-xs text-destructive">{error}</p>}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>

                    <div className="sticky bottom-16 border-t border-border/70 bg-background/96 px-3 py-3 backdrop-blur-xl">
                        <div className="flex items-end gap-2">
                            <button
                                type="button"
                                onClick={() => sendMessage("Chỉ mình cách dùng app này với")}
                                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-card text-foreground ring-1 ring-border/70 transition-colors hover:bg-accent/30"
                                title="Gợi ý"
                            >
                                <Plus className="h-4 w-4" />
                            </button>

                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Hỏi calovie bất cứ điều gì"
                                rows={1}
                                disabled={isLoading}
                                className="max-h-[110px] flex-1 resize-none rounded-full border border-border bg-card px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-70"
                            />

                            {isLoading ? (
                                <Button size="icon" variant="ghost" onClick={stop} className="h-11 w-11 rounded-full text-destructive">
                                    <StopCircle className="h-5 w-5" />
                                </Button>
                            ) : (
                                <Button size="icon" onClick={handleSend} disabled={!input.trim()} className="h-11 w-11 rounded-full bg-primary text-primary-foreground">
                                    <Send className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </section>
            </main>

            <BottomNav />
        </div>
    );
};

export default AIAssistant;
