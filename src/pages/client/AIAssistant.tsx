import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Ban,
    Check,
    ChevronRight,
    Clock,
    Plus,
    Search,
    Send,
    Settings,
    StopCircle,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { useSSEChat, type ChatSearchResults, type MealScheduleProposal, type ProfileUpdateProposal } from "@/hooks/useSSEChat";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MEAL_ORDER } from "@/types/mealPlan";

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

const THINKING_STEPS = [
    "Đang xem dữ liệu gần đây",
    "Đang ghép với mục tiêu của bạn",
    "Đang chọn gợi ý dễ áp dụng",
];

const PROFILE_FIELD_LABELS: Record<string, string> = {
    goal: "Mục tiêu sức khỏe",
    dietary_preference: "Chế độ ăn",
    allergies: "Dị ứng thực phẩm",
    activity_level: "Mức độ vận động",
    weight_kg: "Cân nặng",
    height_cm: "Chiều cao",
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
        <div className="mx-1 my-2 rounded-[1.6rem] border border-primary/20 bg-[#eef9f4] p-4 text-sm shadow-sm">
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
                    className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-primary py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                >
                    <Check className="h-3 w-3" />
                    {saving ? "Đang lưu..." : "Áp dụng"}
                </button>
                <button
                    type="button"
                    onClick={onDismiss}
                    className="flex flex-1 items-center justify-center gap-1 rounded-2xl border border-border py-2 text-xs font-semibold text-muted-foreground"
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
        <div className="mx-1 my-2 rounded-[1.6rem] border border-[#f4d7aa] bg-[#fff7ea] p-4 text-sm shadow-sm">
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
                    className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-[#f1a325] py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                    <Check className="h-3 w-3" />
                    {saving ? "Đang lưu..." : "Áp dụng"}
                </button>
                <button
                    type="button"
                    onClick={onDismiss}
                    className="flex flex-1 items-center justify-center gap-1 rounded-2xl border border-border py-2 text-xs font-semibold text-muted-foreground"
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
    <div className="mx-1 my-2 rounded-[1.6rem] border border-sky-200 bg-sky-50 p-4 text-sm shadow-sm">
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
                    <div key={`${item.name}-${index}`} className="rounded-2xl border border-white bg-white/90 px-3 py-2">
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

const getMascotByState = ({
    isLoading,
    error,
    lastAssistantMessage,
    hasConversation,
}: {
    isLoading: boolean;
    error: string | null;
    lastAssistantMessage: string;
    hasConversation: boolean;
}) => {
    const text = lastAssistantMessage.toLowerCase();

    if (error) return "/mascot-worried.png";
    if (isLoading) return "/mascot-curious.png";
    if (!hasConversation) return "/mascot-playful.png";
    if (text.includes("tuyệt") || text.includes("ổn") || text.includes("tốt") || text.includes("yên tâm")) return "/mascot-love.png";
    if (text.includes("chưa") || text.includes("không")) return "/mascot-worried.png";
    return "/mascot-neutral.png";
};

const MessageBubble: React.FC<{
    role: "user" | "assistant";
    content: string;
    mascotSrc: string;
}> = ({ role, content, mascotSrc }) => {
    const isUser = role === "user";

    return (
        <div className={`mb-3 flex ${isUser ? "justify-end" : "justify-start"}`}>
            {!isUser && (
                <div className="mr-3 mt-1 h-20 w-20 shrink-0 overflow-hidden">
                    <img src={mascotSrc} alt="" className="h-full w-full object-cover object-top" />
                </div>
            )}
            <div
                className={`max-w-[84%] rounded-[1.6rem] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser
                        ? "rounded-br-md bg-[#163f4b] text-white shadow-sm"
                        : "rounded-bl-md border border-[#e6ecea] bg-white text-foreground shadow-sm"
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
        searchResults,
        dismissSearchResults,
    } = useSSEChat();

    const userName = useMemo(() => {
        const rawName = profile?.display_name?.trim() || user?.email?.split("@")[0] || "bạn";
        return rawName.split(" ")[0];
    }, [profile?.display_name, user?.email]);

    const lastAssistantMessage = useMemo(
        () => [...messages].reverse().find((message) => message.role === "assistant")?.content ?? "",
        [messages],
    );

    const mascotSrc = getMascotByState({
        isLoading,
        error,
        lastAssistantMessage,
        hasConversation: messages.length > 0,
    });

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
    }, [messages, proposal, actionProposal, searchResults, isLoading]);

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
        <div className="min-h-screen bg-[linear-gradient(180deg,#f4f6f4_0%,#fbfbfb_100%)] pb-nav-safe">
            <header className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl">
                <div className="mx-auto flex max-w-5xl items-center gap-3 px-2 py-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="grid h-10 w-10 place-items-center rounded-2xl bg-white/90 text-foreground shadow-sm ring-1 ring-black/5"
                        title="Quay lại"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>

                    <div className="relative flex min-w-0 flex-1 items-center justify-center">
                        <div className="absolute top-[-18px] h-28 w-28 overflow-hidden">
                            <img src={mascotSrc} alt="CaloVie mascot" className="h-full w-full object-cover object-top" />
                        </div>
                        <img src="/logo.png" alt="CaloVie" className="h-9 w-auto object-contain pt-12" />
                    </div>

                    {messages.length > 0 ? (
                        <button
                            type="button"
                            onClick={clearMessages}
                            className="grid h-10 w-10 place-items-center rounded-2xl bg-white/90 text-foreground shadow-sm ring-1 ring-black/5"
                            title="Làm mới"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    ) : (
                        <div className="h-10 w-10" />
                    )}
                </div>
            </header>

            <main className="mx-auto flex max-w-5xl flex-col pb-6 pt-2">
                <section className="overflow-hidden">
                    <div className="min-h-[72vh] overflow-y-auto px-0 pb-4 pt-5">
                        {messages.length === 0 ? (
                            <div className="flex min-h-[62vh] flex-col justify-between px-2">
                                <div>
                                    <div className="mb-5 flex items-center gap-3">
                                        <div className="h-24 w-24 overflow-hidden">
                                            <img src={mascotSrc} alt="CaloVie mascot" className="h-full w-full object-cover object-top" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-base font-semibold text-foreground">Chào {userName}, hôm nay bạn thấy sao rồi?</p>
                                            <p className="text-sm text-muted-foreground">Mình có thể gợi ý bữa ăn, chỉ cách dùng app, hoặc tìm quán gần bạn.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2.5">
                                        {STARTER_CHIPS.map((chip) => (
                                            <button
                                                key={chip}
                                                type="button"
                                                onClick={() => sendMessage(chip)}
                                                className="flex w-full items-center justify-between rounded-[1.35rem] border border-[#ecefed] bg-[#fafafa] px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-white"
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
                                                className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                                            >
                                                {chip.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="rounded-[1.5rem] bg-[#f7f8f7] p-3">
                                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                            Cần hướng dẫn dùng app?
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {APP_HELP_CHIPS.map((chip) => (
                                                <button
                                                    key={chip}
                                                    type="button"
                                                    onClick={() => sendMessage(chip)}
                                                    className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-foreground shadow-sm ring-1 ring-black/5"
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
                                <div className="px-2">
                                    {messages.map((message, index) => (
                                        <MessageBubble
                                            key={`${message.role}-${index}`}
                                            role={message.role}
                                            content={message.content}
                                            mascotSrc={mascotSrc}
                                        />
                                    ))}
                                </div>

                                {isLoading && (
                                    <div className="mb-3 flex items-start gap-3 px-2">
                                        <div className="h-20 w-20 shrink-0 overflow-hidden">
                                            <img src="/mascot-curious.png" alt="" className="h-full w-full object-cover object-top" />
                                        </div>
                                        <div className="w-full max-w-[84%] rounded-[1.6rem] rounded-bl-md border border-[#e6ecea] bg-white px-4 py-3 shadow-sm">
                                            <p className="text-sm text-muted-foreground">Thinking...</p>
                                            <div className="mt-2 space-y-1.5">
                                                {THINKING_STEPS.map((step) => (
                                                    <div key={step} className="flex items-center gap-2 text-sm text-slate-600">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                                        {step}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!isLoading && messages[messages.length - 1]?.role === "assistant" && (
                                    <div className="mb-3 flex flex-wrap gap-2 px-2">
                                        {FOLLOW_UP_CHIPS.map((chip) => (
                                            <button
                                                key={chip}
                                                type="button"
                                                onClick={() => sendMessage(chip)}
                                                className="rounded-full border border-border bg-[#f5f6f5] px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white hover:text-foreground"
                                            >
                                                {chip}
                                            </button>
                                        ))}
                                    </div>
                                )}

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
                                {searchResults && <SearchResultsCard results={searchResults} onDismiss={dismissSearchResults} />}
                                {error && <p className="py-1 text-center text-xs text-destructive">{error}</p>}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>

                    <div className="border-t border-[#eef0ee] bg-white/95 px-2 py-3">
                        <div className="flex items-end gap-2">
                            <button
                                type="button"
                                onClick={() => sendMessage("Chỉ mình cách dùng app này với")}
                                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f4f5f4] text-foreground ring-1 ring-black/5 transition-colors hover:bg-white"
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
                                className="max-h-[110px] flex-1 resize-none rounded-full border border-[#ecefed] bg-[#f8f8f8] px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-70"
                            />

                            {isLoading ? (
                                <Button size="icon" variant="ghost" onClick={stop} className="h-11 w-11 rounded-full text-destructive">
                                    <StopCircle className="h-5 w-5" />
                                </Button>
                            ) : (
                                <Button size="icon" onClick={handleSend} disabled={!input.trim()} className="h-11 w-11 rounded-full bg-[#1f2e2e]">
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
