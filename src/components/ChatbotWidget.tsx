import React, { useState, useRef, useEffect } from "react";
import {
    MessageCircle, X, Send, Sparkles, StopCircle, Trash2, Check, Ban, Clock,
    Settings, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useSSEChat, type MealScheduleProposal, type ProfileUpdateProposal, type ChatSearchResults } from "@/hooks/useSSEChat";
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
    "Hôm nay tôi ăn bao nhiêu calo?",
    "Gợi ý bữa trưa lành mạnh",
    "Thiết lập lịch ăn cho tôi",
    "Thực phẩm giàu protein",
    "Calo của cơm trắng",
    "Tôi nên ăn gì để giảm cân?",
];

const ProposalCard: React.FC<{
    proposal: MealScheduleProposal;
    onApprove: () => void;
    onDismiss: () => void;
}> = ({ proposal, onApprove, onDismiss }) => {
    const [saving, setSaving] = useState(false);
    const handleApprove = async () => {
        setSaving(true);
        try { await onApprove(); } finally { setSaving(false); }
    };

    return (
        <div className="mx-1 my-2 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-sm">
            <div className="flex items-center gap-1.5 mb-2 font-semibold text-primary">
                <Clock className="w-4 h-4" />
                Đề xuất lịch ăn
            </div>
            <div className="space-y-1 mb-2">
                {MEAL_ORDER.filter((k) => proposal.schedule[k]).map((key) => (
                    <div key={key} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{MEAL_LABELS[key] ?? key}</span>
                        <span className="font-medium text-foreground">{proposal.schedule[key]}</span>
                    </div>
                ))}
            </div>
            {proposal.advice && (
                <p className="text-[11px] text-muted-foreground mb-2 italic">{proposal.advice}</p>
            )}
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={handleApprove}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold rounded-xl py-1.5 bg-primary text-primary-foreground disabled:opacity-60"
                >
                    <Check className="w-3 h-3" />
                    {saving ? "Đang lưu..." : "Áp dụng"}
                </button>
                <button
                    type="button"
                    onClick={onDismiss}
                    className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold rounded-xl py-1.5 border border-border text-muted-foreground"
                >
                    <Ban className="w-3 h-3" />
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
    weight_kg: "Cân nặng (kg)",
    height_cm: "Chiều cao (cm)",
};

const ActionProposalCard: React.FC<{
    proposal: ProfileUpdateProposal;
    onApprove: () => void;
    onDismiss: () => void;
}> = ({ proposal, onApprove, onDismiss }) => {
    const [saving, setSaving] = useState(false);
    const handleApprove = async () => {
        setSaving(true);
        try { await onApprove(); } finally { setSaving(false); }
    };
    const fieldLabel = PROFILE_FIELD_LABELS[proposal.field] ?? proposal.field;
    const valueStr = Array.isArray(proposal.value)
        ? (proposal.value as string[]).join(", ")
        : String(proposal.value);
    return (
        <div className="mx-1 my-2 rounded-2xl border border-orange-500/30 bg-orange-500/5 p-3 text-sm">
            <div className="flex items-center gap-1.5 mb-2 font-semibold text-orange-600 dark:text-orange-400 text-xs">
                <Settings className="w-3.5 h-3.5" />
                Đề xuất thay đổi hồ sơ
            </div>
            <div className="mb-2 space-y-1">
                <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{fieldLabel}</span>
                    <span className="font-medium text-foreground">{valueStr}</span>
                </div>
                {proposal.reason && (
                    <p className="text-[11px] text-muted-foreground italic">{proposal.reason}</p>
                )}
            </div>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={handleApprove}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold rounded-xl py-1.5 bg-orange-500 text-white disabled:opacity-60"
                >
                    <Check className="w-3 h-3" />
                    {saving ? "Đang lưu..." : "Áp dụng"}
                </button>
                <button
                    type="button"
                    onClick={onDismiss}
                    className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold rounded-xl py-1.5 border border-border text-muted-foreground"
                >
                    <Ban className="w-3 h-3" />
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
    <div className="mx-1 my-2 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-3 text-sm">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400 text-xs">
                <Search className="w-3.5 h-3.5" />
                Kết quả: "{results.query}"
            </div>
            <button type="button" onClick={onDismiss} title="Đóng" className="text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
            </button>
        </div>
        {results.results.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-1">Không tìm thấy kết quả</p>
        ) : (
            <div className="space-y-1.5">
                {results.results.slice(0, 4).map((r, i) => (
                    <div key={i} className="rounded-xl bg-background/80 border border-border/60 px-2.5 py-2">
                        <div className="flex justify-between items-start gap-1">
                            <span className="text-xs font-medium text-foreground flex-1">{r.name}</span>
                            <span className="text-[11px] font-semibold text-orange-500 shrink-0">{r.energy_kcal} kcal</span>
                        </div>
                        <div className="flex gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">P: {r.protein}g</span>
                            <span className="text-[10px] text-muted-foreground">C: {r.carbs}g</span>
                            <span className="text-[10px] text-muted-foreground">F: {r.fat}g</span>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
);

const QUICK_PROMPTS = [
    "Hôm nay tôi ăn bao nhiêu calo?",
    "Gợi ý bữa sáng lành mạnh",
    "Món ăn giàu protein là gì?",
    "Thực đơn giảm cân hiệu quả",
];

const MessageBubble: React.FC<{ role: "user" | "assistant"; content: string }> = ({ role, content }) => {
    const isUser = role === "user";
    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2`}>
            {!isUser && (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-1 shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
            )}
            <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                }`}
            >
                {content || <span className="animate-pulse">...</span>}
            </div>
        </div>
    );
};

export const ChatbotWidget: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const { user } = useAuthContext();
    const { toast } = useToast();
    const navigate = useNavigate();
    const {
        messages, sendMessage, isLoading, error, clearMessages, stop,
        proposal, approveProposal, dismissProposal,
        navigateTo, clearNavigate,
        actionProposal, approveActionProposal, dismissActionProposal,
        searchResults, dismissSearchResults,
    } = useSSEChat();

    // Open chat and pre-fill prompt from other parts of the app
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<{ prompt?: string }>).detail;
            setOpen(true);
            if (detail?.prompt) {
                setInput(detail.prompt);
                setTimeout(() => inputRef.current?.focus(), 150);
            }
        };
        window.addEventListener("calocare:open-chat", handler);
        return () => window.removeEventListener("calocare:open-chat", handler);
    }, []);

    // Navigate when chatbot emits a navigate event
    useEffect(() => {
        if (!navigateTo) return;
        navigate(navigateTo);
        clearNavigate();
    }, [navigateTo, navigate, clearNavigate]);

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    useEffect(() => {
        if (!error) return;
        const isOffline = !navigator.onLine || error.toLowerCase().includes("fetch") || error.includes("hết thời gian");
        if (isOffline) {
            toast({
                title: "CaloCare AI không phản hồi",
                description: "Kiểm tra kết nối mạng và thử lại.",
                variant: "destructive",
            });
        }
    }, [error, toast]);

    useEffect(() => {
        if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, open]);

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
        <>
            {/* Floating button */}
            {!open && (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full gradient-primary shadow-lg shadow-primary/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                >
                    <MessageCircle className="w-6 h-6 text-primary-foreground" />
                    {/* Pulse ring */}
                    <span className="absolute inset-0 rounded-full animate-ping bg-primary/30" />
                </button>
            )}

            {/* Chat panel */}
            {open && (
                <div className="fixed bottom-20 right-4 z-50 w-[340px] max-w-[calc(100vw-2rem)] bg-background rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden h-[480px]">
                    {/* Header */}
                    <div className="gradient-primary px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white">CaloCare AI</p>
                            <p className="text-[10px] text-white/70">Trợ lý dinh dưỡng</p>
                        </div>
                        <div className="flex items-center gap-1">
                            {messages.length > 0 && (
                                <button
                                    type="button"
                                    onClick={clearMessages}
                                    className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                                    title="Xóa cuộc trò chuyện"
                                >
                                    <Trash2 className="w-3.5 h-3.5 text-white" />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                title="Đóng"
                                className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                            >
                                <X className="w-3.5 h-3.5 text-white" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center gap-4 px-2">
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <Sparkles className="w-7 h-7 text-primary" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-semibold text-foreground mb-1">Xin chào! Tôi là CaloCare AI</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Tôi có thể giúp bạn tư vấn dinh dưỡng, theo dõi calo và gợi ý thực đơn.
                                    </p>
                                </div>
                                <div className="w-full space-y-1.5">
                                    {QUICK_PROMPTS.map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => sendMessage(p)}
                                            className="w-full text-left text-xs px-3 py-2 rounded-xl border border-border hover:bg-muted/60 transition-colors"
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <>
                                {messages.map((msg, i) => (
                                    <MessageBubble key={i} role={msg.role} content={msg.content} />
                                ))}
                                {/* Quick-reply chips after last assistant message, only when idle */}
                                {!isLoading && messages.length > 0 && messages[messages.length - 1].role === "assistant" && (
                                    <div className="flex flex-wrap gap-1.5 px-1 mt-1">
                                        {FOLLOW_UP_CHIPS.slice(0, 3).map((chip) => (
                                            <button
                                                key={chip}
                                                type="button"
                                                onClick={() => sendMessage(chip)}
                                                className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
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
                                {searchResults && (
                                    <SearchResultsCard
                                        results={searchResults}
                                        onDismiss={dismissSearchResults}
                                    />
                                )}
                                {error && (
                                    <p className="text-xs text-destructive text-center py-1">{error}</p>
                                )}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>

                    {/* Input */}
                    <div className="px-3 py-2 border-t border-border bg-background">
                        <div className="flex items-end gap-2">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Nhập câu hỏi..."
                                rows={1}
                                disabled={isLoading}
                                className="flex-1 resize-none text-sm rounded-xl border border-input bg-background px-3 py-2 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 max-h-[80px]"
                            />
                            {isLoading ? (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={stop}
                                    className="shrink-0 h-9 w-9 rounded-xl text-destructive"
                                >
                                    <StopCircle className="w-4 h-4" />
                                </Button>
                            ) : (
                                <Button
                                    size="icon"
                                    onClick={handleSend}
                                    disabled={!input.trim()}
                                    className="shrink-0 h-9 w-9 rounded-xl gradient-primary"
                                >
                                    <Send className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center mt-1">Enter để gửi · Shift+Enter xuống dòng</p>
                    </div>
                </div>
            )}
        </>
    );
};
