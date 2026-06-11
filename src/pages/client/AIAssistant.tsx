import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Check,
    Compass,
    MessageCircleHeart,
    Search,
    Send,
    Sparkles,
    StopCircle,
    Trash2,
    Ban,
    Clock,
    Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

const FOLLOW_UP_CHIPS = [
    "Tóm tắt hôm nay của tôi",
    "Gợi ý bữa ăn theo mục tiêu hiện tại",
    "Lên lịch ăn cho tôi",
    "Phân tích món tôi vừa ăn",
    "Gợi ý quán healthy gần tôi",
    "Nhắc tôi ưu tiên protein hôm nay",
];

const STYLE_CHIPS = [
    { label: "Ấm áp", prompt: "Từ bây giờ hãy trả lời với giọng điệu ấm áp, động viên và ngắn gọn hơn." },
    { label: "Coach", prompt: "Từ bây giờ hãy trả lời như một health coach rõ ràng, dứt khoát và có checklist hành động." },
    { label: "Chuyên gia", prompt: "Từ bây giờ hãy trả lời như một chuyên gia dinh dưỡng: cụ thể, logic và ưu tiên độ chính xác." },
];

const QUICK_PROMPTS = [
    "Cho tôi bản tóm tắt sức khỏe hôm nay dựa trên dữ liệu hiện có",
    "Gợi ý thực đơn hôm nay theo mục tiêu của tôi",
    "Tôi nên ăn gì trước khi tập?",
    "Gợi ý 3 quán healthy phù hợp với hồ sơ của tôi",
];

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
        <div className="mx-1 my-2 rounded-3xl border border-primary/20 bg-primary/5 p-4 text-sm shadow-sm">
            <div className="mb-2 flex items-center gap-2 font-semibold text-primary">
                <Clock className="h-4 w-4" />
                Đề xuất lịch ăn mới
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
                    Từ chối
                </button>
            </div>
        </div>
    );
};

const PROFILE_FIELD_LABELS: Record<string, string> = {
    goal: "Mục tiêu sức khỏe",
    dietary_preference: "Chế độ ăn",
    allergies: "Dị ứng thực phẩm",
    activity_level: "Mức độ vận động",
    weight_kg: "Cân nặng",
    height_cm: "Chiều cao",
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
        <div className="mx-1 my-2 rounded-3xl border border-[#f0d8af] bg-[#fff8ec] p-4 text-sm shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#b16b00]">
                <Settings className="h-3.5 w-3.5" />
                Đề xuất cập nhật hồ sơ
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
                    Từ chối
                </button>
            </div>
        </div>
    );
};

const SearchResultsCard: React.FC<{
    results: ChatSearchResults;
    onDismiss: () => void;
}> = ({ results, onDismiss }) => (
    <div className="mx-1 my-2 rounded-3xl border border-sky-200 bg-sky-50 p-4 text-sm shadow-sm">
        <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-700">
                <Search className="h-3.5 w-3.5" />
                Kết quả cho "{results.query}"
            </div>
            <button type="button" onClick={onDismiss} className="text-xs font-medium text-sky-700">
                Ẩn
            </button>
        </div>
        {results.results.length === 0 ? (
            <p className="py-1 text-center text-xs text-muted-foreground">Không tìm thấy kết quả phù hợp.</p>
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

const MessageBubble: React.FC<{ role: "user" | "assistant"; content: string }> = ({ role, content }) => {
    const isUser = role === "user";

    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
            {!isUser && (
                <div className="mr-3 mt-1 h-10 w-10 shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-primary/10">
                    <img src="/calovie-mascot.png" alt="" className="h-full w-full object-cover object-top" />
                </div>
            )}
            <div
                className={`max-w-[82%] rounded-[1.5rem] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser
                        ? "rounded-br-md bg-[#1b6f84] text-white"
                        : "rounded-bl-md border border-[#e8f3ef] bg-white text-foreground shadow-sm"
                }`}
            >
                {content || <span className="animate-pulse text-muted-foreground">Mascot đang suy nghĩ...</span>}
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

    const onboardingSummary = useMemo(() => {
        const prefs = (profile?.preferences as Record<string, unknown>) ?? {};
        const chips: string[] = [];

        if (prefs.goal) chips.push(`Mục tiêu: ${String(prefs.goal)}`);
        if (prefs.dietary_preference) chips.push(`Kiểu ăn: ${String(prefs.dietary_preference)}`);
        if (prefs.activity_level) chips.push(`Vận động: ${String(prefs.activity_level)}`);
        if (profile?.daily_nutrition_goals?.calories) {
            chips.push(`Mốc calo: ${profile.daily_nutrition_goals.calories} kcal`);
        }

        return chips;
    }, [profile]);

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
                title: "CaloVie AI đang gián đoạn",
                description: "Kiểm tra kết nối mạng rồi thử lại giúp mình.",
                variant: "destructive",
            });
        }
    }, [error, toast]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, proposal, actionProposal, searchResults]);

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
        <div className="min-h-screen bg-[#f4f8f5] pb-nav-safe">
            <header className="sticky top-0 z-20 border-b border-[#dceae2] bg-white/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-white text-foreground transition-colors hover:bg-muted"
                        title="Quay lại"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="h-12 w-12 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-primary/10">
                        <img src="/calovie-mascot.png" alt="CaloVie mascot" className="h-full w-full object-cover object-top" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold text-[#1b6f84]">CaloVie Assistant</p>
                        <p className="text-xs text-muted-foreground">Trợ lý sức khỏe cá nhân hóa từ hồ sơ onboarding của bạn</p>
                    </div>
                    {messages.length > 0 && (
                        <Button variant="outline" size="sm" className="gap-2 rounded-2xl" onClick={clearMessages}>
                            <Trash2 className="h-4 w-4" />
                            Làm mới
                        </Button>
                    )}
                </div>
            </header>

            <main className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-5 lg:grid lg:grid-cols-[320px_minmax(0,1fr)]">
                <aside className="space-y-4">
                    <Card className="overflow-hidden border-0 bg-[linear-gradient(155deg,#ddf5ea_0%,#ffffff_55%,#eef8ff_100%)] shadow-md">
                        <CardContent className="p-5">
                            <div className="mb-4 flex items-start gap-3">
                                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[1.5rem] bg-white shadow-sm">
                                    <img src="/calovie-mascot.png" alt="Mascot" className="h-full w-full object-cover object-top" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#1b6f84]">Mascot mode</p>
                                    <h1 className="mt-1 text-lg font-extrabold leading-tight text-[#203029]">
                                        Một trợ lý sức khỏe nói chuyện như đang đồng hành cùng bạn
                                    </h1>
                                </div>
                            </div>
                            <p className="text-sm leading-6 text-slate-600">
                                Assistant sẽ dùng mục tiêu, kiểu ăn, vận động và calo mục tiêu từ onboarding để trả lời sát hơn, thay vì chỉ chat chung chung.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-[#dceae2] bg-white/90 shadow-sm">
                        <CardContent className="p-4">
                            <div className="mb-3 flex items-center gap-2">
                                <Compass className="h-4 w-4 text-primary" />
                                <p className="text-sm font-semibold">Dữ liệu assistant đang dùng</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {onboardingSummary.length > 0 ? onboardingSummary.map((item) => (
                                    <span key={item} className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                                        {item}
                                    </span>
                                )) : (
                                    <p className="text-xs text-muted-foreground">
                                        Hồ sơ chưa đủ sâu, assistant vẫn trả lời nhưng mức cá nhân hóa sẽ thấp hơn.
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-[#dceae2] bg-white/90 shadow-sm">
                        <CardContent className="p-4">
                            <div className="mb-3 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                <p className="text-sm font-semibold">Phong cách trả lời</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {STYLE_CHIPS.map((chip) => (
                                    <button
                                        key={chip.label}
                                        type="button"
                                        onClick={() => sendMessage(chip.prompt)}
                                        className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                                    >
                                        {chip.label}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </aside>

                <section className="flex min-h-[70vh] flex-col overflow-hidden rounded-[2rem] border border-[#dceae2] bg-white shadow-lg">
                    <div className="border-b border-[#edf4f0] bg-[linear-gradient(135deg,#f8fffb_0%,#edf8f3_45%,#fff6ea_100%)] px-5 py-4">
                        <div className="mb-3 flex items-center gap-3">
                            <div className="h-11 w-11 overflow-hidden rounded-2xl bg-white shadow-sm">
                                <img src="/calovie-mascot.png" alt="CaloVie mascot" className="h-full w-full object-cover object-top" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-[#203029]">Xin chào, mình là mascot của CaloVie</p>
                                <p className="text-xs text-slate-500">Mình sẽ trả lời theo dữ liệu của bạn, ưu tiên hành động dễ làm ngay hôm nay.</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {QUICK_PROMPTS.map((prompt) => (
                                <button
                                    key={prompt}
                                    type="button"
                                    onClick={() => sendMessage(prompt)}
                                    className="rounded-full border border-white bg-white/80 px-3 py-1.5 text-xs font-medium text-[#203029] shadow-sm transition-colors hover:border-primary/20 hover:text-primary"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,#f6fcf8_0%,#ffffff_28%)] px-4 py-4">
                        {messages.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
                                <div className="h-28 w-28 overflow-hidden rounded-[2rem] bg-white p-2 shadow-lg ring-1 ring-primary/10">
                                    <img src="/calovie-mascot.png" alt="CaloVie mascot" className="h-full w-full object-cover object-top" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-[#203029]">Bắt đầu một cuộc trò chuyện có ngữ cảnh</p>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        Hỏi về bữa ăn, lịch ăn, quán healthy gần bạn hoặc nhờ assistant giải thích dữ liệu dinh dưỡng theo đúng hồ sơ hiện tại.
                                    </p>
                                </div>
                                <div className="w-full max-w-lg space-y-2">
                                    {FOLLOW_UP_CHIPS.slice(0, 4).map((chip) => (
                                        <button
                                            key={chip}
                                            type="button"
                                            onClick={() => sendMessage(chip)}
                                            className="w-full rounded-2xl border border-[#dceae2] bg-white px-4 py-3 text-left text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary hover:text-primary"
                                        >
                                            {chip}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <>
                                {messages.map((message, index) => (
                                    <MessageBubble key={`${message.role}-${index}`} role={message.role} content={message.content} />
                                ))}
                                {!isLoading && messages[messages.length - 1]?.role === "assistant" && (
                                    <div className="mb-3 flex flex-wrap gap-2 px-1">
                                        {FOLLOW_UP_CHIPS.slice(0, 3).map((chip) => (
                                            <button
                                                key={chip}
                                                type="button"
                                                onClick={() => sendMessage(chip)}
                                                className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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

                    <div className="border-t border-[#edf4f0] bg-white px-4 py-3">
                        <div className="flex items-end gap-2">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ví dụ: hôm nay tôi nên ăn gì để đúng mục tiêu?"
                                rows={1}
                                disabled={isLoading}
                                className="max-h-[96px] flex-1 resize-none rounded-[1.4rem] border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                            />
                            {isLoading ? (
                                <Button size="icon" variant="ghost" onClick={stop} className="h-11 w-11 rounded-2xl text-destructive">
                                    <StopCircle className="h-5 w-5" />
                                </Button>
                            ) : (
                                <Button size="icon" onClick={handleSend} disabled={!input.trim()} className="h-11 w-11 rounded-2xl bg-[#1b6f84]">
                                    <Send className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Enter để gửi · Shift+Enter xuống dòng</span>
                            <span className="inline-flex items-center gap-1">
                                <MessageCircleHeart className="h-3.5 w-3.5" />
                                Trả lời theo hồ sơ onboarding
                            </span>
                        </div>
                    </div>
                </section>
            </main>

            <BottomNav />
        </div>
    );
};

export default AIAssistant;
