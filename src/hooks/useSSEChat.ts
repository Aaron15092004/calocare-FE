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

export interface DiaryProposal {
    type: "add_food_to_diary";
    food_name: string;
    meal_type: "breakfast" | "lunch" | "dinner" | "snack";
    weight_grams: number;
    source_type: "food" | "usda" | "ai_estimate";
    source_id?: string;
    usda_fdc_id?: number;
    nutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
    };
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

export interface StoreRecommendation {
    store_id: string;
    name: string;
    address: string;
    website?: string;
    google_maps_url?: string;
    image_url?: string;
    average_rating: number;
    rating_count: number;
    distance_km?: number;
    reason: string;
    menu_items: Array<{
        item_id: string;
        name: string;
        price?: number;
        energy_kcal?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
        image_url?: string;
    }>;
}

export interface StoreRecommendationResults {
    query: string;
    meal_type: "breakfast" | "lunch" | "dinner" | "snack";
    has_location: boolean;
    results: StoreRecommendation[];
}

const isRestaurantIntent = (message: string) =>
    /(quán|nhà hàng|restaurant|nearby|gần tôi|gần đây|đặt món|order|healthy shop|eat clean)/i.test(message);

async function getLocationForRestaurantIntent(message: string): Promise<{ lat: number; lng: number } | undefined> {
    if (!isRestaurantIntent(message) || !navigator.geolocation) return undefined;

    return new Promise((resolve) => {
        let settled = false;
        const finish = (location?: { lat: number; lng: number }) => {
            if (settled) return;
            settled = true;
            resolve(location);
        };

        const timer = window.setTimeout(() => finish(), 1200);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                window.clearTimeout(timer);
                finish({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
            },
            () => {
                window.clearTimeout(timer);
                finish();
            },
            { enableHighAccuracy: false, maximumAge: 5 * 60 * 1000, timeout: 1000 },
        );
    });
}

export function useSSEChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [proposal, setProposal] = useState<MealScheduleProposal | null>(null);
    const [navigateTo, setNavigateTo] = useState<string | null>(null);
    const [actionProposal, setActionProposal] = useState<ProfileUpdateProposal | null>(null);
    const [diaryProposal, setDiaryProposal] = useState<DiaryProposal | null>(null);
    const [searchResults, setSearchResults] = useState<ChatSearchResults | null>(null);
    const [storeRecommendations, setStoreRecommendations] = useState<StoreRecommendationResults | null>(null);
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
        setDiaryProposal(null);
        setSearchResults(null);
        setStoreRecommendations(null);

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        let timedOut = false;

        const timeoutId = setTimeout(() => { timedOut = true; controller.abort(); }, 30_000);

        let assistantContent = "";
        let assistantStarted = false;

        try {
            const location = await getLocationForRestaurantIntent(content);
            const res = await fetch(`${API_URL}/api/rag/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ message: content, ...(location ? { location } : {}) }),
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
                    } else if (lastEvent === "diary_proposal") {
                        setDiaryProposal(parsed as DiaryProposal);
                    } else if (lastEvent === "search_results") {
                        setSearchResults(parsed as ChatSearchResults);
                    } else if (lastEvent === "store_recommendations") {
                        setStoreRecommendations(parsed as StoreRecommendationResults);
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
            // Server SSE `error` events now carry friendly Vietnamese messages —
            // show them as-is, but guard against raw/technical text leaking through.
            const raw = err instanceof Error ? err.message : "";
            const msg = isAbort
                ? "Yêu cầu hết thời gian chờ. Vui lòng thử lại."
                : raw && raw.length <= 160 ? raw : "Có lỗi xảy ra, bạn thử lại sau nhé.";
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
        setDiaryProposal(null);
        setSearchResults(null);
        setStoreRecommendations(null);
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
        const allowedFields = new Set(["goal", "dietary_preference", "allergies", "activity_level", "weight_kg", "height_cm"]);
        if (!allowedFields.has(p.field)) throw new Error("Trường cập nhật không hợp lệ");
        const res = await fetch(`${API_URL}/api/profile`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ preferences: { [p.field]: p.value } }),
        });
        if (!res.ok) throw new Error("Không thể cập nhật hồ sơ");
        setActionProposal(null);
    }, []);

    const dismissActionProposal = useCallback(() => setActionProposal(null), []);
    const approveDiaryProposal = useCallback(async (p: DiaryProposal): Promise<void> => {
        const token = localStorage.getItem("access_token");
        if (!token) return;
        const res = await fetch(`${API_URL}/api/food-diary`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                foods: [{
                    dish_name: p.food_name,
                    matched_name: p.food_name,
                    source: p.source_type,
                    food_id: p.source_type === "food" ? p.source_id : undefined,
                    usda_fdc_id: p.source_type === "usda" ? p.usda_fdc_id : undefined,
                    nutrition: p.nutrition,
                    weight_grams: p.weight_grams,
                }],
                totals: p.nutrition,
                meal_type: p.meal_type,
                health_score: 0,
                vitamins: [],
                health_tips: [],
            }),
        });
        if (!res.ok) throw new Error("Không thể lưu món vào nhật ký");
        setDiaryProposal(null);
    }, []);
    const dismissDiaryProposal = useCallback(() => setDiaryProposal(null), []);
    const dismissSearchResults = useCallback(() => setSearchResults(null), []);
    const dismissStoreRecommendations = useCallback(() => setStoreRecommendations(null), []);

    return {
        messages, sendMessage, isLoading, error, clearMessages, stop,
        proposal, approveProposal, dismissProposal,
        navigateTo, clearNavigate,
        actionProposal, approveActionProposal, dismissActionProposal,
        diaryProposal, approveDiaryProposal, dismissDiaryProposal,
        searchResults, dismissSearchResults,
        storeRecommendations, dismissStoreRecommendations,
    };
}
