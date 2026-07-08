// src/hooks/useFoodAnalysis.ts
import { useState } from "react";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { AxiosError } from "axios";
import { compressImage } from "@/utils/imageCompression";

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
    ingredients?: { name: string; amount?: number; unit?: string }[];
    vitamins?: VitaminInfo[];
    source_note?: string;
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
    /** Medium-confidence lookalikes the user can swap in (single-item scans only). */
    alternatives?: RagScanMatch[];
}

export interface RagScanMatch {
    source_id: string;
    source_type: "food" | "recipe" | "usda" | "fatsecret" | "ai_estimate";
    name: string;
    name_vi?: string;
    score: number;
    energy_kcal?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    fiber_g?: number;
}

interface RagScanResult {
    dishes?: DishResult[];
    totals?: AnalysisResult["totals"];
    vitamins?: VitaminInfo[];
    meal_type?: string;
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

    const MAX_SCAN_IMAGE_DIMENSION = 1024;
    const SCAN_IMAGE_QUALITY = 0.7;
    const SKIP_CANVAS_TYPES = new Set(["image/gif", "image/heic", "image/heif"]);

    const throwIfAborted = (signal?: AbortSignal) => {
        if (signal?.aborted) {
            throw new DOMException("Scan cancelled", "AbortError");
        }
    };

    const imageDataUrlToFile = async (imageBase64: string, signal?: AbortSignal): Promise<File> => {
        throwIfAborted(signal);
        const response = await fetch(imageBase64, { signal });
        const blob = await response.blob();
        throwIfAborted(signal);

        const originalType = blob.type || "image/jpeg";
        const originalExtension = originalType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
        const originalFile = new File([blob], `calovie-scan.${originalExtension}`, { type: originalType });

        if (!originalType.startsWith("image/") || SKIP_CANVAS_TYPES.has(originalType)) {
            return originalFile;
        }

        try {
            const compressedBlob = await compressImage(originalFile, MAX_SCAN_IMAGE_DIMENSION, SCAN_IMAGE_QUALITY);
            throwIfAborted(signal);

            // Keep the original if re-encoding didn't actually help.
            if (compressedBlob.size >= blob.size) return originalFile;

            return new File([compressedBlob], "calovie-scan.jpg", { type: "image/jpeg" });
        } catch (error) {
            if ((error as DOMException).name === "AbortError") throw error;
            return originalFile;
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

    const FRIENDLY_SCAN_ERROR = "Có lỗi xảy ra, bạn thử lại sau nhé.";

    /** Server errors are now friendly Vietnamese; anything long/raw gets a generic fallback. */
    const friendlyError = (message?: string | null): string =>
        message && message.length <= 160 ? message : FRIENDLY_SCAN_ERROR;

    const mapRagScanToAnalysis = (data: RagScanResult): AnalysisResult | null => {
        if (Array.isArray(data.dishes) && data.dishes.length > 0 && data.totals) {
            return {
                dishes: data.dishes.map((dish) => ({
                    ...dish,
                    nutrition: {
                        calories: dish.nutrition?.calories ?? 0,
                        protein: dish.nutrition?.protein ?? 0,
                        carbs: dish.nutrition?.carbs ?? 0,
                        fat: dish.nutrition?.fat ?? 0,
                        fiber: dish.nutrition?.fiber ?? 0,
                    },
                    weight_grams: dish.weight_grams ?? 100,
                    confidence: dish.confidence ?? data.confidence,
                })),
                totals: {
                    calories: data.totals.calories ?? 0,
                    protein: data.totals.protein ?? 0,
                    carbs: data.totals.carbs ?? 0,
                    fat: data.totals.fat ?? 0,
                    fiber: data.totals.fiber ?? 0,
                },
                vitamins: data.vitamins ?? [],
                meal_type: data.meal_type ?? guessMealType(),
            };
        }

        const grams = Math.max(20, Math.min(1500, data.serving_grams ?? 100));
        const scale = grams / 100;
        const name = data.match?.name_vi || data.match?.name || data.description || "Món ăn";

        if (data.matched && data.match) {
            const nutrition = {
                calories: Math.round((data.match.energy_kcal ?? 0) * scale),
                protein: round1((data.match.protein_g ?? 0) * scale),
                carbs: round1((data.match.carbs_g ?? 0) * scale),
                fat: round1((data.match.fat_g ?? 0) * scale),
                fiber: round1((data.match.fiber_g ?? 0) * scale),
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
            if (mapped && mapped.dishes.length === 1 && (data.alternatives?.length ?? 0) > 0) {
                mapped.alternatives = data.alternatives;
            }
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
                title: "Không thể phân tích ảnh",
                description: friendlyError(error.response?.data?.message || error.response?.data?.error),
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

    /**
     * Swap the single scanned dish for one of the medium-confidence
     * alternatives before the user confirms logging. Nutrition is recomputed
     * from the alternative's per-100g values at the dish's reference weight.
     */
    const applyAlternative = (alt: RagScanMatch) => {
        setResult((prev) => {
            if (!prev || prev.dishes.length !== 1) return prev;
            const dish = prev.dishes[0];
            const grams = dish.weight_grams ?? 100;
            const scale = grams / 100;
            const nutrition = {
                calories: Math.round((alt.energy_kcal ?? 0) * scale),
                protein: round1((alt.protein_g ?? 0) * scale),
                carbs: round1((alt.carbs_g ?? 0) * scale),
                fat: round1((alt.fat_g ?? 0) * scale),
                fiber: round1((alt.fiber_g ?? 0) * scale),
            };
            return {
                ...prev,
                dishes: [{
                    ...dish,
                    source: alt.source_type,
                    matched_name: alt.name_vi || alt.name,
                    nutrition,
                    confidence: alt.score,
                    fs_food_id: alt.source_type === "fatsecret" ? alt.source_id : undefined,
                }],
                totals: nutrition,
            };
        });
    };

    return { analyzeFood, isAnalyzing, result, clearResult, toNutritionAnalysis, applyAlternative };
};
