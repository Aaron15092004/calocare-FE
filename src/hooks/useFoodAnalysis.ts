// src/hooks/useFoodAnalysis.ts
import { useState } from "react";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { AxiosError } from "axios";

export interface FoodItem {
    name: string;
    portion: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    source?: string;
    fs_food_id?: string;
}

export interface VitaminInfo {
    name: string;
    amount: number;
    unit: string;
    percent_dv: number;
}

export interface DishResult {
    dish_name: string;
    source: "recipe" | "food" | "ai_estimate" | "fatsecret" | "usda";
    matched_name: string | null;
    nutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
    };
    weight_grams?: number;
    servings?: number;
    category?: string;
    fs_food_id?: string;
    confidence?: number;
}

export interface AnalysisResult {
    dishes: DishResult[];
    totals: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
    };
    vitamins: VitaminInfo[];
    meal_type: string;
}

interface RagScanMatch {
    source_id: string;
    source_type: "food" | "recipe" | "usda";
    name: string;
    name_vi?: string;
    score: number;
    energy_kcal?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
}

interface RagScanResult {
    matched: boolean;
    match?: RagScanMatch;
    description?: string;
    confidence?: number;
    serving_grams?: number;
    ai_estimate?: {
        calories_per_100g: number;
        protein_per_100g: number;
        fat_per_100g: number;
        carbs_per_100g: number;
    };
    alternatives?: RagScanMatch[];
}

interface AnalyzeFoodOptions {
    signal?: AbortSignal;
}

// Compatibility type for addEntry
export interface NutritionAnalysis {
    foods: FoodItem[];
    totals: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
    };
    mealType: string;
    healthScore: number;
    vitamins: VitaminInfo[];
    healthTips: string[];
}

export const useFoodAnalysis = () => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const { toast } = useToast();
    const { i18n } = useTranslation();

    const MAX_SCAN_IMAGE_DIMENSION = 1280;
    const SCAN_IMAGE_QUALITY = 0.82;
    const SKIP_CANVAS_TYPES = new Set(["image/gif", "image/heic", "image/heif"]);

    const throwIfAborted = (signal?: AbortSignal) => {
        if (signal?.aborted) {
            throw new DOMException("Scan cancelled", "AbortError");
        }
    };

    const loadImage = (src: string, signal?: AbortSignal): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const img = new Image();
            const cleanup = () => {
                img.onload = null;
                img.onerror = null;
                signal?.removeEventListener("abort", onAbort);
            };
            const onAbort = () => {
                cleanup();
                reject(new DOMException("Scan cancelled", "AbortError"));
            };
            img.onload = () => {
                cleanup();
                resolve(img);
            };
            img.onerror = () => {
                cleanup();
                reject(new Error("Could not read image"));
            };
            signal?.addEventListener("abort", onAbort, { once: true });
            img.src = src;
        });

    const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> =>
        new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) reject(new Error("Could not compress image"));
                else resolve(blob);
            }, type, quality);
        });

    const imageDataUrlToFile = async (imageBase64: string, signal?: AbortSignal): Promise<File> => {
        throwIfAborted(signal);
        const response = await fetch(imageBase64, { signal });
        const blob = await response.blob();
        throwIfAborted(signal);

        const originalType = blob.type || "image/jpeg";
        const originalExtension = originalType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";

        if (!originalType.startsWith("image/") || SKIP_CANVAS_TYPES.has(originalType)) {
            return new File([blob], `calovie-scan.${originalExtension}`, { type: originalType });
        }

        try {
            const img = await loadImage(imageBase64, signal);
            throwIfAborted(signal);

            const largestSide = Math.max(img.naturalWidth, img.naturalHeight);
            const scale = largestSide > MAX_SCAN_IMAGE_DIMENSION
                ? MAX_SCAN_IMAGE_DIMENSION / largestSide
                : 1;
            const width = Math.max(1, Math.round(img.naturalWidth * scale));
            const height = Math.max(1, Math.round(img.naturalHeight * scale));

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas not supported");
            ctx.drawImage(img, 0, 0, width, height);

            const compressedBlob = await canvasToBlob(canvas, "image/jpeg", SCAN_IMAGE_QUALITY);
            throwIfAborted(signal);

            if (compressedBlob.size >= blob.size && largestSide <= MAX_SCAN_IMAGE_DIMENSION) {
                return new File([blob], `calovie-scan.${originalExtension}`, { type: originalType });
            }

            return new File([compressedBlob], "calovie-scan.jpg", { type: "image/jpeg" });
        } catch (error) {
            if ((error as DOMException).name === "AbortError") throw error;
            return new File([blob], `calovie-scan.${originalExtension}`, { type: originalType });
        }
    };

    const guessMealType = (): string => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 10) return "breakfast";
        if (hour >= 10 && hour < 14) return "lunch";
        if (hour >= 14 && hour < 17) return "snack";
        return "dinner";
    };

    const round1 = (value: number) => Math.round(value * 10) / 10;

    const mapRagScanToAnalysis = (data: RagScanResult): AnalysisResult | null => {
        const grams = Math.max(20, Math.min(1500, data.serving_grams ?? 100));
        const scale = grams / 100;
        const name = data.match?.name_vi || data.match?.name || data.description || "Món ăn";

        if (data.matched && data.match) {
            const nutrition = {
                calories: Math.round((data.match.energy_kcal ?? 0) * scale),
                protein: round1((data.match.protein_g ?? 0) * scale),
                carbs: round1((data.match.carbs_g ?? 0) * scale),
                fat: round1((data.match.fat_g ?? 0) * scale),
                fiber: 0,
            };
            return {
                dishes: [{
                    dish_name: data.description || name,
                    source: data.match.source_type,
                    matched_name: name,
                    nutrition,
                    weight_grams: grams,
                    confidence: data.match.score ?? data.confidence,
                }],
                totals: nutrition,
                vitamins: [],
                meal_type: guessMealType(),
            };
        }

        if (data.ai_estimate) {
            const nutrition = {
                calories: Math.round((data.ai_estimate.calories_per_100g ?? 0) * scale),
                protein: round1((data.ai_estimate.protein_per_100g ?? 0) * scale),
                carbs: round1((data.ai_estimate.carbs_per_100g ?? 0) * scale),
                fat: round1((data.ai_estimate.fat_per_100g ?? 0) * scale),
                fiber: 0,
            };
            return {
                dishes: [{
                    dish_name: name,
                    source: "ai_estimate",
                    matched_name: name,
                    nutrition,
                    weight_grams: grams,
                    confidence: data.confidence,
                }],
                totals: nutrition,
                vitamins: [],
                meal_type: guessMealType(),
            };
        }

        return null;
    };

    const analyzeFood = async (imageBase64: string, options: AnalyzeFoodOptions = {}) => {
        setIsAnalyzing(true);
        setResult(null);

        try {
            const imageFile = await imageDataUrlToFile(imageBase64, options.signal);
            const formData = new FormData();
            formData.append("image", imageFile);

            const { data } = await api.post<RagScanResult & { error?: string; limit?: number; used?: number; tier?: string }>("/rag/scan-food", formData, {
                headers: { "Content-Type": "multipart/form-data", "Accept-Language": i18n.language },
                signal: options.signal,
                timeout: 90_000,
            });

            if (data?.error === "scan_limit_reached") {
                toast({
                    title: "Scan Limit Reached",
                    description: `You've used ${data.used}/${data.limit} scans today. Upgrade for more.`,
                    variant: "destructive",
                });
                return { error: "scan_limit_reached", ...data };
            }

            const mapped = mapRagScanToAnalysis(data);
            if (!mapped) {
                toast({
                    title: "Chưa có dữ liệu phù hợp",
                    description: "CaloVie đã nhận diện ảnh nhưng chưa tìm thấy món đủ tin cậy trong cơ sở dữ liệu.",
                    variant: "destructive",
                });
                return null;
            }

            setResult(mapped);
            const hasEstimate = mapped.dishes.some((dish) => dish.source === "ai_estimate");
            toast({
                title: "Phân tích hoàn tất",
                description: hasEstimate
                    ? "CaloVie đã tạo ước tính ban đầu. Bạn kiểm tra khẩu phần trước khi lưu nhé."
                    : `Tìm thấy ${mapped.dishes?.length || 0} món từ dữ liệu đã khớp`,
            });
            return mapped;
        } catch (err) {
            const error = err as AxiosError<{ error: string; message?: string; limit?: number; used?: number; tier?: string; can_watch_ad?: boolean }>;

            if (options.signal?.aborted || error.code === "ERR_CANCELED" || (err as DOMException).name === "AbortError") {
                return null;
            }

            if (error.response?.status === 429) {
                const data = error.response.data;
                if (data.error === "scan_limit_reached" || data.error === "rate_limit_exceeded") {
                    toast({
                        title: "Đã hết lượt scan hôm nay",
                        description: data.message || `Bạn đã dùng ${data.used}/${data.limit} lượt scan hôm nay.`,
                        variant: "destructive",
                    });
                    return { error: "scan_limit_reached", ...data };
                }
                toast({ title: "Too many requests", description: "Please try again later.", variant: "destructive" });
                return null;
            }

            if (error.response?.status === 503 || error.response?.status === 504) {
                toast({
                    title: error.response.status === 504 ? "Scan hơi lâu" : "AI đang bận",
                    description: error.response.data?.message || "Bạn thử lại sau vài giây nhé.",
                    variant: "destructive",
                });
                return null;
            }

            console.error("Food analysis error:", error);
            toast({
                title: "Analysis Failed",
                description: error.response?.data?.message || error.response?.data?.error || error.message || "Please try again",
                variant: "destructive",
            });
            return null;
        } finally {
            setIsAnalyzing(false);
        }
    };

    const toNutritionAnalysis = (data: AnalysisResult): NutritionAnalysis => ({
        foods: data.dishes.map((d) => ({
            name: d.matched_name || d.dish_name,
            portion: d.weight_grams ? `${d.weight_grams}g` : `${d.servings || 1} serving`,
            calories: d.nutrition.calories,
            protein: d.nutrition.protein,
            carbs: d.nutrition.carbs,
            fat: d.nutrition.fat,
            fiber: d.nutrition.fiber,
        })),
        totals: data.totals,
        mealType: data.meal_type,
        healthScore: 0,
        vitamins: data.vitamins || [],
        healthTips: [],
    });

    const clearResult = () => setResult(null);

    return { analyzeFood, isAnalyzing, result, clearResult, toNutritionAnalysis };
};
