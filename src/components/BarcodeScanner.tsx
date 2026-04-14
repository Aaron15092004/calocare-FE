import React, { useCallback, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
    X,
    Loader2,
    ScanLine,
    AlertCircle,
    Check,
    Heart,
    Minus,
    Plus as PlusIcon,
    Keyboard,
    Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useFoodDiary } from "@/hooks/useFoodDiary";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

interface BarcodeScannerProps {
    onClose: () => void;
}

interface ProductInfo {
    barcode: string;
    name: string;
    brand?: string;
    image_url?: string;
    per100g: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
    dbFoodId?: string;
}

// All 17 formats supported by html5-qrcode
const ALL_FORMATS = [
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
    Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_93,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.CODABAR,
    Html5QrcodeSupportedFormats.ITF,
    Html5QrcodeSupportedFormats.RSS_14,
    Html5QrcodeSupportedFormats.RSS_EXPANDED,
    Html5QrcodeSupportedFormats.PDF_417,
    Html5QrcodeSupportedFormats.DATA_MATRIX,
    Html5QrcodeSupportedFormats.QR_CODE,
    Html5QrcodeSupportedFormats.AZTEC,
    Html5QrcodeSupportedFormats.MAXICODE,
];

const SCANNER_DIV_ID = "barcode-scanner-viewport";

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onClose }) => {
    const { user } = useAuthContext();
    const { addEntry } = useFoodDiary(user?.id);
    const { addFavorite } = useFavorites();
    const { toast } = useToast();

    const scannerRef = useRef<Html5Qrcode | null>(null);
    const isScanningRef = useRef(false);

    const [cameraError, setCameraError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [product, setProduct] = useState<ProductInfo | null>(null);
    const [saving, setSaving] = useState(false);
    const [servingSize, setServingSize] = useState(100);
    const [manualMode, setManualMode] = useState(false);
    const [manualCode, setManualCode] = useState("");

    // Callback ref — fires only when div is actually in the DOM
    const viewportRef = useCallback((node: HTMLDivElement | null) => {
        if (node) initScanner();
    }, []);

    const initScanner = async () => {
        if (isScanningRef.current) return;
        const element = document.getElementById(SCANNER_DIV_ID);
        if (!element) return;

        try {
            const scanner = new Html5Qrcode(SCANNER_DIV_ID, {
                formatsToSupport: ALL_FORMATS,
                verbose: false,
                // Use native BarcodeDetector API when available (Chrome/Android) — much faster
                experimentalFeatures: { useBarCodeDetectorIfSupported: true },
            });
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: "environment" },
                {
                    fps: 25,
                    // Wide landscape box for 1D barcodes
                    qrbox: (w, h) => ({
                        width: Math.min(Math.round(w * 0.9), 400),
                        height: Math.min(Math.round(h * 0.3), 120),
                    }),
                    aspectRatio: 1.5,
                    disableFlip: false,
                },
                handleScanSuccess,
                () => {}, // suppress per-frame "no barcode" errors
            );
            isScanningRef.current = true;
        } catch (err: any) {
            const msg: string = err?.message ?? "";
            if (msg.includes("ermission") || msg.includes("ermitted")) {
                setCameraError("Cần cấp quyền camera. Nhấn vào ô địa chỉ trình duyệt → cho phép camera.");
            } else if (msg.includes("ndefined") || msg.includes("element")) {
                setCameraError("Trình duyệt không hỗ trợ. Hãy dùng Chrome hoặc Safari.");
            } else {
                setCameraError("Không khởi động được camera.");
            }
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current && isScanningRef.current) {
            try { await scannerRef.current.stop(); } catch (_) {}
            isScanningRef.current = false;
        }
    };

    const handleScanSuccess = async (barcode: string) => {
        if (!isScanningRef.current) return;
        await stopScanner();
        await lookupBarcode(barcode);
    };

    const lookupBarcode = async (barcode: string) => {
        if (!barcode.trim()) return;
        setLoading(true);
        setCameraError(null);

        try {
            // 1. Our own DB
            let dbFood: any = null;
            try {
                const { data } = await api.get("/foods", { params: { q: barcode.trim(), limit: 1 } });
                if (data?.data?.length > 0) dbFood = data.data[0];
            } catch (_) {}

            if (dbFood) {
                setProduct({
                    barcode,
                    name: dbFood.name_vi || dbFood.name_en || "Sản phẩm",
                    per100g: {
                        calories: dbFood.energy_kcal || 0,
                        protein: dbFood.protein_g || 0,
                        carbs: dbFood.carbohydrate_g || 0,
                        fat: dbFood.total_fat_g || 0,
                        fiber: dbFood.dietary_fiber_g || 0,
                    },
                    dbFoodId: String(dbFood._id),
                });
                return;
            }

            // 2. Open Food Facts
            const resp = await fetch(
                `https://world.openfoodfacts.org/api/v0/product/${barcode.trim()}.json`,
            );
            const json = await resp.json();

            if (json.status !== 1 || !json.product) {
                setCameraError(`Không tìm thấy sản phẩm cho mã: ${barcode}`);
                return;
            }

            const p = json.product;
            const n = p.nutriments || {};
            const kcal =
                n["energy-kcal_100g"] ??
                (n["energy_100g"] ? Math.round(n["energy_100g"] / 4.184) : 0);

            setProduct({
                barcode,
                name: p.product_name_vi || p.product_name_en || p.product_name || "Sản phẩm",
                brand: p.brands,
                image_url: p.image_front_url || p.image_url,
                per100g: {
                    calories: Math.round(kcal),
                    protein: Math.round((n.proteins_100g || 0) * 10) / 10,
                    carbs: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
                    fat: Math.round((n.fat_100g || 0) * 10) / 10,
                    fiber: Math.round((n.fiber_100g || 0) * 10) / 10,
                },
            });
        } catch {
            setCameraError("Lỗi kết nối. Kiểm tra internet và thử lại.");
        } finally {
            setLoading(false);
        }
    };

    const getScaled = () => {
        if (!product) return null;
        const r = servingSize / 100;
        return {
            calories: Math.round(product.per100g.calories * r),
            protein: Math.round(product.per100g.protein * r * 10) / 10,
            carbs: Math.round(product.per100g.carbs * r * 10) / 10,
            fat: Math.round(product.per100g.fat * r * 10) / 10,
            fiber: Math.round(product.per100g.fiber * r * 10) / 10,
        };
    };

    const handleSaveToDiary = async () => {
        if (!product) return;
        const n = getScaled()!;
        setSaving(true);
        try {
            await addEntry(
                {
                    foods: [{
                        name: product.name,
                        portion: `${servingSize}g`,
                        calories: n.calories,
                        protein: n.protein,
                        carbs: n.carbs,
                        fat: n.fat,
                        fiber: n.fiber,
                    }],
                    totals: n,
                    mealType: "snack",
                    healthScore: 7,
                    vitamins: [],
                    healthTips: [],
                },
                product.image_url || null,
            );
            toast({ title: "Đã lưu vào nhật ký!" });
            onClose();
        } catch {
            toast({ title: "Lỗi lưu nhật ký", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleScanAgain = () => {
        setProduct(null);
        setCameraError(null);
        setManualMode(false);
        setManualCode("");
    };

    const handleClose = async () => {
        await stopScanner();
        onClose();
    };

    const scaled = getScaled();

    // ── Manual input mode ──────────────────────────────────────────────────────
    if (manualMode && !product && !loading) {
        return (
            <div className="fixed inset-0 z-50 bg-black flex flex-col">
                <div className="flex items-center justify-between p-4 shrink-0">
                    <button
                        type="button"
                        onClick={() => { setManualMode(false); setCameraError(null); }}
                        className="flex items-center gap-2 text-white/80 hover:text-white"
                    >
                        <Camera className="w-4 h-4" />
                        <span className="text-sm">Quay lại camera</span>
                    </button>
                    <button type="button" aria-label="Đóng" onClick={handleClose} className="p-1 text-white/80 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                        <Keyboard className="w-8 h-8 text-primary" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-white font-semibold text-lg mb-1">Nhập mã vạch</h3>
                        <p className="text-white/50 text-sm">Nhìn số dưới mã vạch trên bao bì</p>
                    </div>
                    <div className="w-full max-w-xs space-y-3">
                        <Input
                            type="number"
                            inputMode="numeric"
                            placeholder="VD: 8934822200016"
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            className="text-center text-lg tracking-widest h-12 bg-white/10 border-white/20 text-white placeholder:text-white/30"
                            autoFocus
                        />
                        <Button
                            className="w-full"
                            disabled={manualCode.length < 6}
                            onClick={() => lookupBarcode(manualCode)}
                        >
                            <ScanLine className="w-4 h-4 mr-2" />
                            Tra cứu
                        </Button>
                    </div>
                    {cameraError && (
                        <p className="text-red-400 text-sm text-center">{cameraError}</p>
                    )}
                </div>
            </div>
        );
    }

    // ── Loading ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-white/70 text-sm">Đang tra cứu sản phẩm...</p>
            </div>
        );
    }

    // ── Product result ─────────────────────────────────────────────────────────
    if (product) {
        return (
            <div className="fixed inset-0 z-50 bg-black flex flex-col">
                <div className="flex items-center justify-between p-4 shrink-0">
                    <div className="flex items-center gap-2">
                        <ScanLine className="w-5 h-5 text-primary" />
                        <span className="font-semibold text-white">Kết quả</span>
                    </div>
                    <button type="button" aria-label="Đóng" onClick={handleClose} className="p-1 text-white/80 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <Card className="overflow-hidden">
                        <CardContent className="p-0">
                            {product.image_url && (
                                <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="w-full h-36 object-contain bg-white p-2"
                                />
                            )}
                            <div className="p-4">
                                <h3 className="font-bold text-base leading-tight">{product.name}</h3>
                                {product.brand && <p className="text-sm text-muted-foreground mt-0.5">{product.brand}</p>}
                                <p className="text-xs text-muted-foreground/50 mt-1">{product.barcode}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Khẩu phần</span>
                                <div className="flex items-center gap-3">
                                    <button type="button" aria-label="Giảm" className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted" onClick={() => setServingSize((s) => Math.max(10, s - 10))}>
                                        <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="w-16 text-center font-semibold text-sm">{servingSize} g</span>
                                    <button type="button" aria-label="Tăng" className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted" onClick={() => setServingSize((s) => s + 10)}>
                                        <PlusIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            {scaled && (
                                <div className="grid grid-cols-4 gap-2 text-center">
                                    {[
                                        { v: scaled.calories, u: "kcal", cls: "bg-orange-50 text-orange-600" },
                                        { v: `${scaled.protein}g`, u: "Protein", cls: "bg-blue-50 text-blue-600" },
                                        { v: `${scaled.carbs}g`, u: "Carbs", cls: "bg-yellow-50 text-yellow-600" },
                                        { v: `${scaled.fat}g`, u: "Fat", cls: "bg-pink-50 text-pink-600" },
                                    ].map(({ v, u, cls }) => (
                                        <div key={u} className={`rounded-xl p-2 ${cls}`}>
                                            <p className="text-base font-bold">{v}</p>
                                            <p className="text-[10px] text-muted-foreground">{u}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="space-y-2 pb-8">
                        <Button className="w-full" onClick={handleSaveToDiary} disabled={saving}>
                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                            Lưu vào nhật ký
                        </Button>
                        {product.dbFoodId && (
                            <Button variant="outline" className="w-full" onClick={async () => { await addFavorite("food", product.dbFoodId!); toast({ title: "Đã thêm vào yêu thích!" }); }}>
                                <Heart className="w-4 h-4 mr-2" />
                                Thêm vào yêu thích
                            </Button>
                        )}
                        <Button variant="ghost" className="w-full text-white/70" onClick={handleScanAgain}>
                            <ScanLine className="w-4 h-4 mr-2" />
                            Quét mã khác
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Camera scanner ─────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <div className="flex items-center justify-between p-4 shrink-0">
                <div className="flex items-center gap-2">
                    <ScanLine className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-white">Quét mã vạch</span>
                </div>
                <button type="button" aria-label="Đóng" onClick={handleClose} className="p-1 text-white/80 hover:text-white">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-4 gap-5">
                {cameraError ? (
                    <div className="flex flex-col items-center gap-4 px-4 text-center">
                        <AlertCircle className="w-12 h-12 text-red-400" />
                        <p className="text-white/80 text-sm leading-relaxed">{cameraError}</p>
                        <div className="flex gap-2">
                            <Button variant="outline" className="text-white border-white/30 bg-white/10" onClick={handleScanAgain}>
                                Thử lại
                            </Button>
                            <Button onClick={() => setManualMode(true)}>
                                <Keyboard className="w-4 h-4 mr-2" />
                                Nhập tay
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* html5-qrcode injects video + overlay into this div */}
                        <div
                            id={SCANNER_DIV_ID}
                            ref={viewportRef}
                            className="w-full max-w-sm rounded-2xl overflow-hidden"
                        />
                        <div className="text-center space-y-1 px-4">
                            <p className="text-white/70 text-sm">
                                Đặt mã vạch thẳng vào <span className="text-primary font-medium">khung ngang</span>, cách camera 10–20cm
                            </p>
                            <p className="text-white/35 text-xs">
                                EAN-13 · EAN-8 · UPC-A/E · Code128 · QR · PDF417...
                            </p>
                        </div>

                        {/* Manual fallback — always visible */}
                        <button
                            type="button"
                            onClick={() => { stopScanner(); setManualMode(true); }}
                            className="flex items-center gap-1.5 text-white/50 hover:text-white/80 text-sm transition-colors"
                        >
                            <Keyboard className="w-4 h-4" />
                            Quét không được? Nhập số mã vạch
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
