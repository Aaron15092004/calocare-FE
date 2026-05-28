import React, { useState, useRef } from "react";
import {
    Camera, Upload, X, Loader2, Check, Flame, Leaf,
    AlertCircle, Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFoodDiary } from "@/hooks/useFoodDiary";
import { useAuthContext } from "@/contexts/AuthContext";
import type { NutritionAnalysis } from "@/hooks/useFoodAnalysis";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:1509";

interface ScanMatch {
    source_id: string;
    source_type: "food" | "recipe" | "usda";
    name: string;
    name_vi?: string;
    score: number;
    energy_kcal?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    diet_tags?: string[];
}

interface ScanResult {
    matched: boolean;
    match?: ScanMatch;
    description?: string;
    ai_estimate?: {
        calories_per_100g: number;
        protein_per_100g: number;
        fat_per_100g: number;
        carbs_per_100g: number;
    };
    serving_grams?: number;
}

interface RagScannerModalProps {
    open: boolean;
    onClose: () => void;
}

const SOURCE_LABEL: Record<string, string> = {
    food: "Thực phẩm",
    recipe: "Công thức",
    usda: "USDA",
};

export const RagScannerModal: React.FC<RagScannerModalProps> = ({ open, onClose }) => {
    const [preview, setPreview] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [saving, setSaving] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const { user } = useAuthContext();
    const { addEntry } = useFoodDiary(user?.id);
    const { toast } = useToast();

    if (!open) return null;

    const handleFile = async (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const dataUrl = e.target?.result as string;
            setPreview(dataUrl);
            setResult(null);
            setScanning(true);

            try {
                const token = localStorage.getItem("access_token");
                const formData = new FormData();
                formData.append("image", file);

                const res = await fetch(`${API_URL}/api/rag/scan-food`, {
                    method: "POST",
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    body: formData,
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error((err as { error?: string }).error || "Quét thất bại");
                }

                const data = await res.json() as ScanResult;
                setResult(data);
            } catch (err) {
                toast({
                    title: "Không thể quét ảnh",
                    description: err instanceof Error ? err.message : "Lỗi không xác định",
                    variant: "destructive",
                });
                setPreview(null);
            } finally {
                setScanning(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!result) return;
        setSaving(true);
        try {
            const grams = result.serving_grams ?? 100;
            const scale = grams / 100;
            const name = result.match?.name_vi || result.match?.name || result.description || "Món ăn quét";

            const kcal   = result.matched && result.match?.energy_kcal ? Math.round(result.match.energy_kcal * scale) : Math.round((result.ai_estimate?.calories_per_100g ?? 0) * scale);
            const prot   = parseFloat(((result.matched ? result.match?.protein_g : result.ai_estimate?.protein_per_100g) ?? 0) * scale + "").valueOf();
            const carb   = parseFloat(((result.matched ? result.match?.carbs_g   : result.ai_estimate?.carbs_per_100g)   ?? 0) * scale + "").valueOf();
            const fat    = parseFloat(((result.matched ? result.match?.fat_g     : result.ai_estimate?.fat_per_100g)     ?? 0) * scale + "").valueOf();

            const analysis: NutritionAnalysis = {
                foods: [{ name, portion: `${grams}g`, calories: kcal, protein: prot, carbs: carb, fat, fiber: 0 }],
                totals: { calories: kcal, protein: prot, carbs: carb, fat, fiber: 0 },
                mealType: "snack",
                healthScore: result.matched ? 80 : 60,
                vitamins: [],
                healthTips: [],
            };

            await addEntry(analysis);
            toast({ title: "Đã thêm vào nhật ký" });
            handleClose();
        } catch {
            toast({ title: "Không thể lưu", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        setPreview(null);
        setResult(null);
        setScanning(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full sm:max-w-sm bg-background rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="gradient-primary px-5 pt-5 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Camera className="w-5 h-5 text-white" />
                        <p className="text-sm font-bold text-white">RAG Food Scanner</p>
                    </div>
                    <button type="button" title="Đóng" onClick={handleClose} className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        aria-label="Chọn ảnh món ăn"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                    />

                    {/* Preview / upload zone */}
                    {!preview ? (
                        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center space-y-3">
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center">
                                <Camera className="w-7 h-7 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">Chụp ảnh món ăn</p>
                                <p className="text-xs text-muted-foreground mt-0.5">AI sẽ nhận diện và tìm kiếm trong cơ sở dữ liệu</p>
                            </div>
                            <div className="flex gap-2 justify-center">
                                <Button size="sm" onClick={() => fileRef.current?.click()}>
                                    <Camera className="w-3.5 h-3.5 mr-1.5" />Chụp ảnh
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                                    <Upload className="w-3.5 h-3.5 mr-1.5" />Thư viện
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="relative">
                            <img src={preview} alt="Food preview" className="w-full aspect-video object-cover rounded-xl" />
                            {scanning && (
                                <div className="absolute inset-0 bg-background/70 rounded-xl flex flex-col items-center justify-center gap-2">
                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                    <p className="text-xs font-medium">Đang phân tích...</p>
                                </div>
                            )}
                            {!scanning && (
                                <button
                                    type="button"
                                    title="Xoá ảnh"
                                    onClick={() => { setPreview(null); setResult(null); }}
                                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center"
                                >
                                    <X className="w-3.5 h-3.5 text-white" />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Result */}
                    {result && !scanning && (
                        <div className="space-y-3">
                            {result.matched && result.match ? (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                <span className="text-[10px] font-semibold text-emerald-600 uppercase">{SOURCE_LABEL[result.match.source_type]}</span>
                                                <span className="text-[10px] text-emerald-500">{Math.round(result.match.score * 100)}% khớp</span>
                                            </div>
                                            <p className="text-sm font-bold text-emerald-900">
                                                {result.match.name_vi || result.match.name}
                                            </p>
                                            {(result.match.diet_tags ?? []).includes("vegetarian") && (
                                                <span className="text-[10px] text-emerald-600 flex items-center gap-0.5 mt-0.5">
                                                    <Leaf className="w-3 h-3" />Chay
                                                </span>
                                            )}
                                        </div>
                                        {result.match.energy_kcal && (
                                            <div className="text-right shrink-0">
                                                <div className="flex items-center gap-0.5 justify-end">
                                                    <Flame className="w-3 h-3 text-orange-400" />
                                                    <span className="text-sm font-bold text-orange-500">{Math.round(result.match.energy_kcal)}</span>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground">kcal/100g</p>
                                            </div>
                                        )}
                                    </div>
                                    {(result.match.protein_g || result.match.carbs_g || result.match.fat_g) && (
                                        <div className="flex gap-3 text-xs text-emerald-700">
                                            {result.match.protein_g && <span>P: {result.match.protein_g.toFixed(1)}g</span>}
                                            {result.match.carbs_g && <span>C: {result.match.carbs_g.toFixed(1)}g</span>}
                                            {result.match.fat_g && <span>F: {result.match.fat_g.toFixed(1)}g</span>}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <AlertCircle className="w-4 h-4 text-amber-500" />
                                        <p className="text-sm font-semibold text-amber-800">
                                            {result.ai_estimate ? "AI Estimate" : "Không tìm thấy dữ liệu"}
                                        </p>
                                    </div>
                                    <p className="text-xs text-amber-700 mb-2">{result.description}</p>
                                    {result.ai_estimate ? (
                                        <div className="flex gap-3 text-xs text-amber-700">
                                            <span className="flex items-center gap-0.5"><Flame className="w-3 h-3 text-orange-400" />{result.ai_estimate.calories_per_100g} kcal</span>
                                            <span>P: {result.ai_estimate.protein_per_100g}g</span>
                                            <span>C: {result.ai_estimate.carbs_per_100g}g</span>
                                            <span>F: {result.ai_estimate.fat_per_100g}g</span>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-amber-600">Món ăn chưa có trong cơ sở dữ liệu dinh dưỡng.</p>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    className="flex-1"
                                    onClick={handleSave}
                                    disabled={saving || (!result.matched && !result.ai_estimate)}
                                    title={!result.matched && !result.ai_estimate ? "Không có dữ liệu dinh dưỡng để lưu" : undefined}
                                >
                                    {saving
                                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang lưu...</>
                                        : <><Check className="w-4 h-4 mr-2" />Thêm vào nhật ký</>}
                                </Button>
                                <Button variant="outline" onClick={() => { setPreview(null); setResult(null); }}>
                                    Quét lại
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
