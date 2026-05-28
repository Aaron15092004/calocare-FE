import React, { useState } from "react";
import { Leaf, X, Plus, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

const DIETARY_OPTIONS = [
    { value: "omnivore",   label: "Đa dạng",       desc: "Cả thịt, hải sản và rau" },
    { value: "vegetarian", label: "Chay trứng/sữa", desc: "Không thịt, có trứng và sữa" },
    { value: "vegan",      label: "Thuần chay",     desc: "Hoàn toàn từ thực vật" },
];

const CUISINE_OPTIONS = [
    "Việt Nam", "Nhật Bản", "Hàn Quốc", "Trung Quốc", "Ý", "Thái Lan", "Ấn Độ",
];

const COMMON_ALLERGENS = [
    "Tôm", "Sữa", "Trứng", "Đậu phộng", "Gluten", "Hải sản", "Đậu nành",
];

interface Props {
    onSaved?: () => void;
}

export const DietaryPreferences: React.FC<Props> = ({ onSaved }) => {
    const { profile, refreshProfile } = useAuthContext();
    const { toast } = useToast();

    const prefs = (profile?.preferences ?? {}) as Record<string, unknown>;

    const [dietary,      setDietary]      = useState<string>((prefs.dietary_preference as string) ?? "omnivore");
    const [allergies,    setAllergies]    = useState<string[]>((prefs.allergies as string[]) ?? []);
    const [cuisines,     setCuisines]     = useState<string[]>((prefs.cuisine_preferences as string[]) ?? []);
    const [allergyInput, setAllergyInput] = useState("");
    const [saving,       setSaving]       = useState(false);

    const addAllergen = (val: string) => {
        const v = val.trim();
        if (v && !allergies.includes(v)) setAllergies((p) => [...p, v]);
        setAllergyInput("");
    };

    const toggleCuisine = (c: string) =>
        setCuisines((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.patch("/profile/preferences", {
                dietary_preference: dietary,
                allergies,
                cuisine_preferences: cuisines,
            });
            await refreshProfile();
            toast({ title: "Đã lưu tùy chọn ăn uống" });
            onSaved?.();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? "Lưu thất bại";
            toast({ title: msg, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-emerald-500" />
                    Tùy chọn ăn uống (AI)
                </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 space-y-4">
                {/* Dietary type */}
                <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Chế độ ăn</p>
                    <div className="flex flex-col gap-2">
                        {DIETARY_OPTIONS.map((d) => (
                            <button
                                key={d.value}
                                type="button"
                                onClick={() => setDietary(d.value)}
                                className={`flex items-center gap-3 p-2.5 rounded-xl border-2 text-left transition-all ${
                                    dietary === d.value
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:border-primary/30"
                                }`}
                            >
                                <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                                    dietary === d.value ? "border-primary bg-primary" : "border-muted-foreground"
                                }`}>
                                    {dietary === d.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <div>
                                    <p className={`text-sm font-medium ${
                                        dietary === d.value ? "text-primary" : "text-foreground"
                                    }`}>{d.label}</p>
                                    <p className="text-xs text-muted-foreground">{d.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Allergies */}
                <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Dị ứng / Tránh ăn</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {COMMON_ALLERGENS.map((a) => (
                            <button
                                key={a}
                                type="button"
                                onClick={() =>
                                    allergies.includes(a)
                                        ? setAllergies((p) => p.filter((x) => x !== a))
                                        : addAllergen(a)
                                }
                                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                                    allergies.includes(a)
                                        ? "border-destructive bg-destructive/10 text-destructive"
                                        : "border-border hover:border-destructive/30"
                                }`}
                            >
                                {allergies.includes(a) && <X className="w-2.5 h-2.5 inline mr-1" />}
                                {a}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Input
                            value={allergyInput}
                            onChange={(e) => setAllergyInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addAllergen(allergyInput)}
                            placeholder="Thêm dị ứng khác..."
                            className="text-sm h-8"
                        />
                        <Button
                            size="sm" variant="outline" className="h-8 px-2"
                            onClick={() => addAllergen(allergyInput)}
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                    {allergies.filter((a) => !COMMON_ALLERGENS.includes(a)).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {allergies
                                .filter((a) => !COMMON_ALLERGENS.includes(a))
                                .map((a) => (
                                    <span
                                        key={a}
                                        className="text-xs px-2.5 py-1 rounded-full border border-destructive/40 bg-destructive/10 text-destructive flex items-center gap-1"
                                    >
                                        {a}
                                        <button
                                            type="button"
                                            title={`Xoá ${a}`}
                                            onClick={() => setAllergies((p) => p.filter((x) => x !== a))}
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </span>
                                ))}
                        </div>
                    )}
                </div>

                {/* Cuisine preferences */}
                <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Phong cách ẩm thực yêu thích</p>
                    <div className="flex flex-wrap gap-1.5">
                        {CUISINE_OPTIONS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => toggleCuisine(c)}
                                className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all ${
                                    cuisines.includes(c)
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border hover:border-primary/30"
                                }`}
                            >
                                {cuisines.includes(c) && <Check className="w-2.5 h-2.5 inline mr-1" />}
                                {c}
                            </button>
                        ))}
                    </div>
                </div>

                <Button className="w-full" onClick={handleSave} disabled={saving}>
                    {saving
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang lưu...</>
                        : <><Check className="w-4 h-4 mr-2" />Lưu tùy chọn</>}
                </Button>
            </CardContent>
        </Card>
    );
};
