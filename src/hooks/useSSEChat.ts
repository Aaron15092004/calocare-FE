import { useState, useCallback, useRef, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:1509";

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

export interface MealScheduleProposal {
    schedule: Record<string, string>;
    advice: string;
    goal_type: string;
}

export interface ProfileUpdateProposal {
    field: string;
    value: unknown;
    label: string;
    reason?: string;
}

export interface FoodSearchResult {
    name: string;
    energy_kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    source_type?: string;
}

export interface ChatSearchResults {
    query: string;
    type: string;
    results: FoodSearchResult[];
}

export function useSSEChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [proposal, setProposal] = useState<MealScheduleProposal | null>(null);
    const [navigateTo, setNavigateTo] = useState<string | null>(null);
    const [actionProposal, setActionProposal] = useState<ProfileUpdateProposal | null>(null);
    const [searchResults, setSearchResults] = useState<ChatSearchResults | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    // Load persisted history from the active session on mount
    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) return;
        fetch(`${API_URL}/api/rag/chat/history`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.ok ? r.json() : null)
            .then((data: { messages?: ChatMessage[] } | null) => {
                if (data?.messages?.length) {
                    setMessages(data.messages);
                }
            })
            .catch(() => {});
    }, []);

    const sendMessage = useCallback(async (content: string) => {
        const token = localStorage.getItem("access_token");
        if (!token) return;

        const userMsg: ChatMessage = { role: "user", content };
        setMessages((prev) => [...prev, userMsg]);
        setIsLoading(true);
        setError(null);
        setProposal(null);
        setNavigateTo(null);
        setActionProposal(null);
        setSearchResults(null);

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        let timedOut = false;

        const timeoutId = setTimeout(() => { timedOut = true; controller.abort(); }, 30_000);

        let assistantContent = "";
        let assistantStarted = false;

        try {
            const res = await fetch(`${API_URL}/api/rag/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ message: content }),
                signal: controller.signal,
            });

            if (!res.ok || !res.body) {
                throw new Error("Chat request failed");
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let lastEvent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    if (line.startsWith("event: ")) {
                        lastEvent = line.slice(7).trim();
                        continue;
                    }
                    if (!line.startsWith("data: ")) continue;
                    const data = line.slice(6);
                    if (!data.trim()) continue;

                    let parsed: unknown;
                    try {
                        parsed = JSON.parse(data);
                    } catch {
                        continue;
                    }

                    if (lastEvent === "chunk") {
                        const chunk = (parsed as { text?: string }).text ?? "";
                        assistantContent += chunk;
                        setMessages((prev) => {
                            const copy = [...prev];
                            const last = copy[copy.length - 1];
                            if (!assistantStarted || last?.role !== "assistant") {
                                copy.push({ role: "assistant", content: assistantContent });
                                assistantStarted = true;
                            } else {
                                copy[copy.length - 1] = { role: "assistant", content: assistantContent };
                            }
                            return copy;
                        });
                    } else if (lastEvent === "proposal") {
                        setProposal(parsed as MealScheduleProposal);
                    } else if (lastEvent === "navigate") {
                        const nav = parsed as { path?: string };
                        if (nav.path) setNavigateTo(nav.path);
                    } else if (lastEvent === "action_proposal") {
                        setActionProposal(parsed as ProfileUpdateProposal);
                    } else if (lastEvent === "search_results") {
                        setSearchResults(parsed as ChatSearchResults);
                    } else if (lastEvent === "done") {
                        break;
                    } else if (lastEvent === "error") {
                        throw new Error((parsed as { message?: string }).message || "Unknown error");
                    }
                }
            }
        } catch (err) {
            const isAbort = (err as Error).name === "AbortError";
            if (isAbort && !timedOut) return; // user-initiated stop, no error shown
            const msg = isAbort
                ? "Yêu cầu hết thời gian chờ. Vui lòng thử lại."
                : err instanceof Error ? err.message : "Chat failed";
            setError(msg);
        } finally {
            clearTimeout(timeoutId);
            setIsLoading(false);
        }
    }, []);

    const clearMessages = useCallback(() => {
        abortRef.current?.abort();
        setMessages([]);
        setError(null);
        setProposal(null);
        setNavigateTo(null);
        setActionProposal(null);
        setSearchResults(null);
    }, []);

    const stop = useCallback(() => {
        abortRef.current?.abort();
        setIsLoading(false);
    }, []);

    const approveProposal = useCallback(async (p: MealScheduleProposal): Promise<void> => {
        const token = localStorage.getItem("access_token");
        if (!token) return;
        const res = await fetch(`${API_URL}/api/profile`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                preferences: { meal_schedule: p.schedule },
            }),
        });
        if (!res.ok) throw new Error("Không thể lưu lịch ăn");
        setProposal(null);
    }, []);

    const dismissProposal = useCallback(() => setProposal(null), []);

    const clearNavigate = useCallback(() => setNavigateTo(null), []);

    const approveActionProposal = useCallback(async (p: ProfileUpdateProposal): Promise<void> => {
        const token = localStorage.getItem("access_token");
        if (!token) return;
        const res = await fetch(`${API_URL}/api/profile`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ preferences: { [p.field]: p.value } }),
        });
        if (!res.ok) throw new Error("Không thể cập nhật hồ sơ");
        setActionProposal(null);
    }, []);

    const dismissActionProposal = useCallback(() => setActionProposal(null), []);
    const dismissSearchResults = useCallback(() => setSearchResults(null), []);

    return {
        messages, sendMessage, isLoading, error, clearMessages, stop,
        proposal, approveProposal, dismissProposal,
        navigateTo, clearNavigate,
        actionProposal, approveActionProposal, dismissActionProposal,
        searchResults, dismissSearchResults,
    };
}
