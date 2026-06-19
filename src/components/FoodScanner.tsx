import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Sparkles,
  Upload,
  X,
  Loader2,
  Check,
  Zap,
  Crown,
  ChevronRight,
  ChevronDown,
  Info,
  Pencil,
  CircleCheck,
  CircleX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFoodAnalysis, AnalysisResult, DishResult } from "@/hooks/useFoodAnalysis";
import { useFoodDiary } from "@/hooks/useFoodDiary";
import { useAuthContext } from "@/contexts/AuthContext";
import { uploadBase64 } from "@/utils/cloudinary";

interface FoodScannerProps {
  onScanComplete?: () => void;
  onSaved?: () => void;
}

interface ScanLimitInfo {
  tier?: string;
  used?: number;
  limit?: number;
}

const SCAN_TIPS = [
  { ok: true,  text: "Chụp từ trên xuống, góc 45–90° so với mặt bàn" },
  { ok: true,  text: "Ánh sáng tự nhiên hoặc đèn sáng, tránh tối" },
  { ok: true,  text: "Đặt đĩa/bát ở trung tâm, lấp đầy ~80% khung hình" },
  { ok: true,  text: "Chụp nguyên bữa ăn trong 1 ảnh để AI đếm đủ món" },
  { ok: false, text: "Không che khuất thực phẩm bằng tay hoặc dụng cụ" },
  { ok: false, text: "Tránh góc cạnh, ảnh mờ hoặc phần nền quá phức tạp" },
];

const SCAN_SOURCE_LABELS: Record<string, { label: string; className: string }> = {
  recipe: { label: "Công thức", className: "bg-emerald-500/10 text-emerald-700" },
  food: { label: "Dữ liệu món", className: "bg-blue-500/10 text-blue-700" },
  fatsecret: { label: "FatSecret", className: "bg-orange-500/10 text-orange-700" },
  usda: { label: "USDA", className: "bg-purple-500/10 text-purple-700" },
  ai_estimate: { label: "Ước tính", className: "bg-amber-500/10 text-amber-700" },
};

export const FoodScanner: React.FC<FoodScannerProps> = ({ onScanComplete, onSaved }) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [scanLimitReached, setScanLimitReached] = useState(false);
  const [scanLimitInfo, setScanLimitInfo] = useState<ScanLimitInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [dishGrams, setDishGrams] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { analyzeFood, isAnalyzing, result, clearResult, toNutritionAnalysis } = useFoodAnalysis();
  const { user, profile } = useAuthContext();
  const { addEntry } = useFoodDiary(user?.id);

  // Initialise per-dish gram values whenever a new result arrives
  useEffect(() => {
    if (result) {
      setDishGrams(result.dishes.map((d) => d.weight_grams ?? 100));
      // Dev: open DevTools Console to see source breakdown
      console.log("[FoodScanner] scan sources:");
      console.table(
        result.dishes.map((d) => ({
          dish: d.dish_name,
          source: d.source,
          matched: d.matched_name ?? "—",
          grams: d.weight_grams ?? "?",
          kcal: d.nutrition?.calories ?? "?",
        })),
      );
    }
  }, [result]);

  // ── gram-adjustment helpers ──────────────────────────────────────────────

  const getAdjustedNutrition = (dish: DishResult, grams: number) => {
    const base = dish.nutrition;
    const refGrams = dish.weight_grams ?? 100;
    const factor = refGrams > 0 ? grams / refGrams : 1;
    return {
      calories: Math.round(base.calories * factor),
      protein:  Math.round(base.protein  * factor * 10) / 10,
      carbs:    Math.round(base.carbs    * factor * 10) / 10,
      fat:      Math.round(base.fat      * factor * 10) / 10,
      fiber:    Math.round(base.fiber    * factor * 10) / 10,
    };
  };

  const getAdjustedTotals = (dishes: DishResult[], grams: number[]) =>
    dishes.reduce(
      (sum, dish, i) => {
        const n = getAdjustedNutrition(dish, grams[i] ?? (dish.weight_grams ?? 100));
        return {
          calories: sum.calories + n.calories,
          protein:  Math.round((sum.protein  + n.protein)  * 10) / 10,
          carbs:    Math.round((sum.carbs    + n.carbs)    * 10) / 10,
          fat:      Math.round((sum.fat      + n.fat)      * 10) / 10,
          fiber:    Math.round((sum.fiber    + n.fiber)    * 10) / 10,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    );

  // ── event handlers ───────────────────────────────────────────────────────

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isAnalyzing) return;
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setPreviewImage(base64);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const response = await analyzeFood(base64, { signal: controller.signal });
      if (abortRef.current === controller) abortRef.current = null;
      if (controller.signal.aborted) return;
      if (response?.error === "scan_limit_reached") {
        setScanLimitReached(true);
        setScanLimitInfo(response);
        setPreviewImage(null);
      } else if (response && profile?.subscription_tier === "free") {
        onScanComplete?.();
      } else if (!response) {
        setPreviewImage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCameraClick = () => {
    if (isAnalyzing || saving) return;
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPreviewImage(null);
    clearResult();
    setDishGrams([]);
    setScanLimitReached(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirm = async () => {
    if (!result) return;
    setSaving(true);

    let imageUrl: string | null = null;
    if (previewImage) {
      try {
        const uploaded = await uploadBase64(previewImage, "calocare/scans");
        imageUrl = uploaded.url;
      } catch {
        // save diary even without image
      }
    }

    // Build analysis with user-adjusted gram values
    const adjustedTotals = getAdjustedTotals(result.dishes, dishGrams);
    const adjustedFoods = result.dishes.map((d, i) => {
      const grams = dishGrams[i] ?? (d.weight_grams ?? 100);
      const n = getAdjustedNutrition(d, grams);
      return {
        name:        d.matched_name || d.dish_name,
        portion:     `${grams}g`,
        calories:    n.calories,
        protein:     n.protein,
        carbs:       n.carbs,
        fat:         n.fat,
        fiber:       n.fiber,
        source:      d.source,
        fs_food_id:  d.fs_food_id,
      };
    });

    await addEntry(
      {
        foods:       adjustedFoods,
        totals:      adjustedTotals,
        mealType:    result.meal_type,
        healthScore: 0,
        vitamins:    result.vitamins || [],
        healthTips:  [],
      },
      imageUrl,
    );

    setSaving(false);
    handleClear();
    onSaved?.();
  };

  const updateGram = (index: number, value: number) =>
    setDishGrams((prev) => {
      const next = [...prev];
      next[index] = Math.max(10, Math.min(2000, value));
      return next;
    });

  // ── scan-limit UI ────────────────────────────────────────────────────────
  if (scanLimitReached) {
    const isFree = scanLimitInfo?.tier === "free";
    return (
      <Card variant="scanner" className="overflow-hidden">
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Camera className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Đã hết lượt scan hôm nay</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Bạn đã dùng{" "}
              <span className="font-semibold text-primary">
                {scanLimitInfo?.used}/{scanLimitInfo?.limit}
              </span>{" "}
              lượt scan hôm nay
              {isFree ? " (Gói Free)" : scanLimitInfo?.tier === "premium" ? " (Gói Premium)" : ""}
            </p>
          </div>

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
                    <p className="text-xs text-muted-foreground">5 lần/ngày · Meal plan AI · 59.000₫/tháng</p>
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
                    <p className="text-sm font-semibold text-foreground">Nâng lên Family</p>
                    <p className="text-xs text-muted-foreground">Scan không giới hạn · 5 thành viên · 199.000₫/tháng</p>
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
                  <p className="text-sm font-semibold text-foreground">Nâng lên Family</p>
                  <p className="text-xs text-muted-foreground">Scan không giới hạn · 5 thành viên · 199.000₫/tháng</p>
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

  // ── result UI ────────────────────────────────────────────────────────────
  if (result) {
    const adjustedTotals = getAdjustedTotals(result.dishes, dishGrams);

    return (
      <Card variant="scanner" className="overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Kết quả scan</h3>
            <Button variant="ghost" size="icon" onClick={handleClear}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {previewImage && (
            <div className="w-full aspect-video rounded-xl overflow-hidden bg-muted mb-4">
              <img src={previewImage} alt="Food" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Dish list with gram editing */}
          <div className="space-y-2 mb-4">
            {result.dishes.map((dish, i) => {
              const grams = dishGrams[i] ?? (dish.weight_grams ?? 100);
              const adj = getAdjustedNutrition(dish, grams);
              // Recipes (weight_grams = null) aren't adjustable by gram
              const canAdjust = dish.weight_grams !== null && dish.weight_grams !== undefined;

              return (
                <div key={i} className="p-3 bg-gray-50 dark:bg-muted/40 rounded-xl">
                  {/* Dish name row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug">
                        {dish.matched_name || dish.dish_name}
                      </p>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${SCAN_SOURCE_LABELS[dish.source]?.className ?? "bg-muted text-muted-foreground"}`}>
                        {SCAN_SOURCE_LABELS[dish.source]?.label ?? dish.source}
                      </span>
                      {dish.ingredients && dish.ingredients.length > 0 && (
                        <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                          Nguyên liệu: {dish.ingredients.slice(0, 5).map((ing) => ing.name).join(", ")}
                        </p>
                      )}
                      {dish.source_note && (
                        <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                          {dish.source_note}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-primary whitespace-nowrap">
                      {adj.calories} kcal
                    </span>
                  </div>

                  {/* Gram input row */}
                  {canAdjust && (
                    <div className="flex items-center gap-2">
                      <Pencil className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-[11px] text-muted-foreground">Khối lượng:</span>
                      <input
                        type="number"
                        min={10}
                        max={2000}
                        step={10}
                        value={grams}
                        aria-label={`Khối lượng ${dish.matched_name || dish.dish_name}`}
                        onChange={(e) => updateGram(i, parseInt(e.target.value) || 10)}
                        className="w-20 text-xs border border-border rounded-lg px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                      />
                      <span className="text-[11px] text-muted-foreground">gam</span>
                    </div>
                  )}
                  {!canAdjust && (
                    <p className="text-[11px] text-muted-foreground">
                      1 phần ăn ({dish.servings || 1} serving)
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Adjusted totals */}
          <div className="grid grid-cols-4 gap-2 mb-4 text-center">
            <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-2">
              <p className="text-lg font-bold text-orange-600">{adjustedTotals.calories}</p>
              <p className="text-[10px] text-muted-foreground">kcal</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2">
              <p className="text-lg font-bold text-blue-600">{adjustedTotals.protein}g</p>
              <p className="text-[10px] text-muted-foreground">Protein</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-2">
              <p className="text-lg font-bold text-yellow-600">{adjustedTotals.carbs}g</p>
              <p className="text-[10px] text-muted-foreground">Carbs</p>
            </div>
            <div className="bg-pink-50 dark:bg-pink-950/30 rounded-lg p-2">
              <p className="text-lg font-bold text-pink-600">{adjustedTotals.fat}g</p>
              <p className="text-[10px] text-muted-foreground">Fat</p>
            </div>
          </div>
          {adjustedTotals.fiber > 0 && (
            <div className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
              Chất xơ ước tính: <span className="font-semibold">{adjustedTotals.fiber}g</span>
            </div>
          )}

          {result.vitamins.length > 0 && (
            <div className="mb-4 rounded-xl border border-border bg-background/70 p-3">
              <p className="mb-2 text-xs font-semibold text-foreground">Vitamin & khoáng chất từ dữ liệu món</p>
              <div className="flex flex-wrap gap-1.5">
                {result.vitamins.slice(0, 8).map((vitamin) => (
                  <span
                    key={`${vitamin.name}-${vitamin.unit}`}
                    className="rounded-full bg-vitamins/10 px-2 py-1 text-[11px] font-medium text-vitamins"
                  >
                    {vitamin.name}: {vitamin.amount}{vitamin.unit}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleConfirm} disabled={saving}>
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang lưu...</>
              ) : (
                <><Check className="w-4 h-4 mr-2" /> Lưu vào nhật ký</>
              )}
            </Button>
            <Button variant="outline" onClick={handleClear}>
              Bỏ qua
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── default scanner UI ───────────────────────────────────────────────────
  return (
    <Card
      variant="scanner"
      className="overflow-hidden gradient-fresh"
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
          aria-label="Chon anh thuc an"
          disabled={isAnalyzing || saving}
          onChange={handleFileSelect}
          className="hidden"
        />

        {previewImage && isAnalyzing ? (
          <div className="flex flex-col items-center text-center gap-4">
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-muted">
              <img src={previewImage} alt="Food preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <div className="text-center">
                  <p className="font-semibold text-foreground">Đang phân tích ảnh...</p>
                  <p className="text-sm text-muted-foreground">AI đang nhận diện món ăn</p>
                </div>
              </div>
            </div>
            <Button variant="ghost" onClick={handleClear}>
              <X className="w-4 h-4 mr-2" /> Hủy
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-4">
            {/* Camera icon with rings */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <div className={`absolute inset-0 rounded-full border-2 border-primary/30 transition-transform duration-500 ${isHovered ? "scale-110" : "scale-100"}`} />
              <div className={`absolute inset-2 rounded-full border-2 border-primary/50 transition-transform duration-500 delay-75 ${isHovered ? "scale-110" : "scale-100"}`} />
              <div className={`absolute inset-4 rounded-full border-2 border-primary/70 transition-transform duration-500 delay-150 ${isHovered ? "scale-110" : "scale-100"}`} />
              <div className="relative z-10 w-16 h-16 rounded-full gradient-primary flex items-center justify-center shadow-glow">
                <Camera className="w-8 h-8 text-primary-foreground" />
              </div>
              <Sparkles className={`absolute top-0 right-2 w-5 h-5 text-primary transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0"}`} />
              <Sparkles className={`absolute bottom-2 left-0 w-4 h-4 text-primary/70 transition-opacity duration-300 delay-100 ${isHovered ? "opacity-100" : "opacity-0"}`} />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">AI Food Scanner</h3>
              <p className="text-sm text-muted-foreground">
                Chụp ảnh để AI nhận diện món ăn &amp; tính dinh dưỡng
              </p>
            </div>

            <div className="flex gap-3 w-full">
              <Button variant="scan" size="lg" className="flex-1" onClick={handleCameraClick} disabled={isAnalyzing || saving}>
                {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                {isAnalyzing ? "Đang scan..." : "Scan món ăn"}
              </Button>
              <Button variant="outline" size="lg" className="px-4" onClick={handleCameraClick} disabled={isAnalyzing || saving}>
                <Upload className="w-5 h-5" />
              </Button>
            </div>

            {/* Camera tips toggle */}
            <div className="w-full">
              <button
                type="button"
                onClick={() => setShowTips((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mx-auto transition-colors py-1"
              >
                <Info className="w-3.5 h-3.5" />
                <span>Hướng dẫn chụp ảnh chuẩn</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showTips ? "rotate-180" : ""}`} />
              </button>

              {showTips && (
                <div className="mt-2 rounded-xl border border-border bg-muted/50 overflow-hidden text-left">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/80">
                    <Camera className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-foreground">
                      Để AI nhận diện chính xác nhất
                    </span>
                  </div>
                  <ul className="px-3 py-2 space-y-2">
                    {SCAN_TIPS.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        {tip.ok
                          ? <CircleCheck className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-px" />
                          : <CircleX    className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-px" />
                        }
                        <span>{tip.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
