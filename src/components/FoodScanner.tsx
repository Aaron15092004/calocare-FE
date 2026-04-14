import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Sparkles, Upload, X, Loader2, Check, Zap, Crown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFoodAnalysis, AnalysisResult } from "@/hooks/useFoodAnalysis";
import { useFoodDiary } from "@/hooks/useFoodDiary";
import { useAuthContext } from "@/contexts/AuthContext";
import { uploadBase64 } from "@/utils/cloudinary";

export const FoodScanner: React.FC = () => {
    const navigate = useNavigate();
    const [isHovered, setIsHovered] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [scanLimitReached, setScanLimitReached] = useState(false);
    const [scanLimitInfo, setScanLimitInfo] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { analyzeFood, isAnalyzing, result, clearResult, toNutritionAnalysis } =
        useFoodAnalysis();
    const { user } = useAuthContext();
    const { addEntry } = useFoodDiary(user?.id);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64 = e.target?.result as string;
                setPreviewImage(base64);
                const response = await analyzeFood(base64);

                if (response?.error === "scan_limit_reached") {
                    setScanLimitReached(true);
                    setScanLimitInfo(response);
                    setPreviewImage(null);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCameraClick = () => {
        fileInputRef.current?.click();
    };

    const handleClear = () => {
        setPreviewImage(null);
        clearResult();
        setScanLimitReached(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleConfirm = async () => {
        if (!result) return;
        setSaving(true);

        let imageUrl: string | null = null;

        // Upload ảnh lên Cloudinary
        if (previewImage) {
            try {
                const uploaded = await uploadBase64(previewImage, "calocare/scans");
                imageUrl = uploaded.url;
            } catch (err) {
                console.error("Image upload failed:", err);
                // Vẫn save diary, không có ảnh
            }
        }

        const analysis = toNutritionAnalysis(result);
        await addEntry(analysis, imageUrl);

        setSaving(false);
        handleClear();
    };

    // Scan limit UI
    if (scanLimitReached) {
        const isFree = scanLimitInfo?.tier === "free";
        return (
            <Card variant="scanner" className="overflow-hidden">
                <CardContent className="p-6">
                    {/* Icon + title */}
                    <div className="text-center mb-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
                            <Camera className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">Đã hết lượt scan hôm nay</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Bạn đã dùng <span className="font-semibold text-primary">{scanLimitInfo?.used}/{scanLimitInfo?.limit}</span> lượt scan hôm nay
                            {isFree ? " (Gói Free)" : scanLimitInfo?.tier === "premium" ? " (Gói Premium)" : ""}
                        </p>
                    </div>

                    {/* Upgrade options */}
                    <div className="space-y-2 mb-4">
                        {isFree && (
                            <>
                                <button
                                    type="button"
                                    className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
                                    onClick={() => navigate("/subscription")}
                                >
                                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                        <Zap className="w-5 h-5 text-primary-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground">Nâng lên Premium</p>
                                        <p className="text-xs text-muted-foreground">10 lần/ngày · Cooldown 30 phút · 79.000₫/tháng</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />
                                </button>
                                <button
                                    type="button"
                                    className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-border bg-muted/40 hover:bg-muted/70 transition-colors text-left"
                                    onClick={() => navigate("/subscription")}
                                >
                                    <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                                        <Crown className="w-5 h-5 text-primary-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground">Nâng lên Pro</p>
                                        <p className="text-xs text-muted-foreground">20 lần/ngày · Cooldown 15 phút · 179.000₫/tháng</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                </button>
                            </>
                        )}
                        {!isFree && (
                            <button
                                type="button"
                                className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
                                onClick={() => navigate("/subscription")}
                            >
                                <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                                    <Crown className="w-5 h-5 text-primary-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground">Nâng lên Pro</p>
                                    <p className="text-xs text-muted-foreground">20 lần/ngày · Cooldown 15 phút · 179.000₫/tháng</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />
                            </button>
                        )}
                    </div>

                    <p className="text-xs text-center text-muted-foreground mb-3">
                        Lượt scan sẽ được reset lúc 00:00 (giờ Việt Nam)
                    </p>

                    <Button variant="outline" className="w-full" onClick={handleClear}>
                        Đóng
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // Result UI — hiện kết quả, user confirm để lưu diary
    if (result) {
        return (
            <Card variant="scanner" className="overflow-hidden">
                <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg">Scan Result</h3>
                        <Button variant="ghost" size="icon" onClick={handleClear}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Preview image */}
                    {previewImage && (
                        <div className="w-full aspect-video rounded-xl overflow-hidden bg-muted mb-4">
                            <img
                                src={previewImage}
                                alt="Food"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    {/* Dishes */}
                    <div className="space-y-2 mb-4">
                        {result.dishes.map((dish, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">
                                        {dish.matched_name || dish.dish_name}
                                    </p>
                                    {dish.source === "ai_estimate" && (
                                        <p className="text-[10px] text-yellow-600">AI estimate</p>
                                    )}
                                </div>
                                <span className="text-sm font-semibold text-primary ml-2">
                                    {dish.nutrition.calories} kcal
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Totals */}
                    <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                        <div className="bg-orange-50 rounded-lg p-2">
                            <p className="text-lg font-bold text-orange-600">
                                {result.totals.calories}
                            </p>
                            <p className="text-[10px] text-muted-foreground">kcal</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2">
                            <p className="text-lg font-bold text-blue-600">
                                {result.totals.protein}g
                            </p>
                            <p className="text-[10px] text-muted-foreground">Protein</p>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-2">
                            <p className="text-lg font-bold text-yellow-600">
                                {result.totals.carbs}g
                            </p>
                            <p className="text-[10px] text-muted-foreground">Carbs</p>
                        </div>
                        <div className="bg-pink-50 rounded-lg p-2">
                            <p className="text-lg font-bold text-pink-600">{result.totals.fat}g</p>
                            <p className="text-[10px] text-muted-foreground">Fat</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <Button className="flex-1" onClick={handleConfirm} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4 mr-2" /> Save to Diary
                                </>
                            )}
                        </Button>
                        <Button variant="outline" onClick={handleClear}>
                            Discard
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Default scanner UI
    return (
        <Card
            variant="scanner"
            className="overflow-hidden"
            data-scanner
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <CardContent className="p-6">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                />

                {previewImage && isAnalyzing ? (
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-muted">
                            <img
                                src={previewImage}
                                alt="Food preview"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-3">
                                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                <div className="text-center">
                                    <p className="font-semibold text-foreground">
                                        Analyzing your meal...
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        AI is identifying dishes
                                    </p>
                                </div>
                            </div>
                        </div>
                        <Button variant="ghost" onClick={handleClear}>
                            <X className="w-4 h-4 mr-2" /> Cancel
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                            <div
                                className={`absolute inset-0 rounded-full border-2 border-primary/30 transition-transform duration-500 ${isHovered ? "scale-110" : "scale-100"}`}
                            />
                            <div
                                className={`absolute inset-2 rounded-full border-2 border-primary/50 transition-transform duration-500 delay-75 ${isHovered ? "scale-110" : "scale-100"}`}
                            />
                            <div
                                className={`absolute inset-4 rounded-full border-2 border-primary/70 transition-transform duration-500 delay-150 ${isHovered ? "scale-110" : "scale-100"}`}
                            />
                            <div className="relative z-10 w-16 h-16 rounded-full gradient-primary flex items-center justify-center shadow-glow">
                                <Camera className="w-8 h-8 text-primary-foreground" />
                            </div>
                            <Sparkles
                                className={`absolute top-0 right-2 w-5 h-5 text-primary transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0"}`}
                            />
                            <Sparkles
                                className={`absolute bottom-2 left-0 w-4 h-4 text-primary/70 transition-opacity duration-300 delay-100 ${isHovered ? "opacity-100" : "opacity-0"}`}
                            />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-foreground">AI Food Scanner</h3>
                            <p className="text-sm text-muted-foreground">
                                Take a photo and let AI identify your meal
                            </p>
                        </div>
                        <div className="flex gap-3 w-full">
                            <Button
                                variant="scan"
                                size="lg"
                                className="flex-1"
                                onClick={handleCameraClick}
                            >
                                <Camera className="w-5 h-5" /> Scan Food
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                className="px-4"
                                onClick={handleCameraClick}
                            >
                                <Upload className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
