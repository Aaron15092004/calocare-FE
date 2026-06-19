import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    Save, Plus, Clock, CheckCircle2, XCircle, AlertCircle, MapPin, Phone, Globe, Map,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { GooglePlacesInput, PlaceResult } from "@/components/GooglePlacesInput";
import { MapLocationPicker, PickedLocation } from "@/components/MapLocationPicker";
import { MultiImageUpload } from "@/components/MultiImageUpload";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";

interface StoreForm {
    name: string;
    description: string;
    address: string;
    city: string;
    phone: string;
    website: string;
    category: string;
    images: string[];
    location?: { lat: number; lng: number };
    google_maps_url?: string;
}

interface StoreRecord extends StoreForm {
    _id: string;
    is_active?: boolean;
    reject_reason?: string;
}

interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
    };
}

const CATEGORIES = [
    { value: "restaurant", label: "Nhà hàng" },
    { value: "cafe",       label: "Cà phê" },
    { value: "bakery",     label: "Bánh" },
    { value: "fastfood",   label: "Fast food" },
    { value: "other",      label: "Khác" },
];

const StoreDetails = () => {
    const [searchParams] = useSearchParams();
    const navigate       = useNavigate();
    const { toast }      = useToast();
    const { t }          = useTranslation();

    const [stores, setStores]     = useState<StoreRecord[]>([]);
    const [storeId, setStoreId]   = useState<string | null>(null);
    const [form, setForm]         = useState<StoreForm>({
        name: "", description: "", address: "", city: "", phone: "",
        website: "", category: "restaurant", images: [],
    });
    const [imageInput, setImageInput] = useState("");
    const [loading, setLoading]   = useState(true);
    const [saving, setSaving]     = useState(false);
    const [storeData, setStoreData] = useState<StoreRecord | null>(null);
    const [isNew, setIsNew]       = useState(false);
    const [showMapPicker, setShowMapPicker] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await api.get<{ data: StoreRecord[] }>("/stores/mine");
                const list = data.data || [];
                setStores(list);

                const idFromQuery = searchParams.get("id");
                const targetId    = idFromQuery || (list[0]?._id ?? null);
                setStoreId(targetId);

                if (targetId && list.length > 0) {
                    const s = list.find((x) => x._id === targetId) || list[0];
                    setStoreData(s);
                    setForm({
                        name:        s.name || "",
                        description: s.description || "",
                        address:     s.address || "",
                        city:        s.city || "",
                        phone:       s.phone || "",
                        website:     s.website || "",
                        category:    s.category || "restaurant",
                        images:      s.images || [],
                        location:    s.location,
                        google_maps_url: s.google_maps_url,
                    });
                } else {
                    setIsNew(true);
                }
            } catch { /* ignore */ }
            finally { setLoading(false); }
        };
        load();
    }, [searchParams]);

    const handleAddressSelect = (place: PlaceResult) => {
        setForm((f) => ({
            ...f,
            address:        place.address,
            city:           place.city,
            location:       { lat: place.lat, lng: place.lng },
            google_maps_url: place.maps_url,
        }));
    };

    const handleMapPick = (loc: PickedLocation) => {
        setForm((f) => ({
            ...f,
            address:  loc.address,
            city:     loc.city || f.city,
            location: { lat: loc.lat, lng: loc.lng },
            google_maps_url: `https://www.google.com/maps?q=${loc.lat},${loc.lng}`,
        }));
    };

    const handleSave = async () => {
        if (!form.name || !form.address) {
            toast({ title: "Thiếu thông tin", description: "Tên và địa chỉ là bắt buộc.", variant: "destructive" });
            return;
        }
        setSaving(true);
        try {
            if (isNew) {
                await api.post("/stores", form);
                toast({ title: "Đã tạo quán", description: "Quán đang chờ admin duyệt." });
                navigate("/owner");
            } else {
                await api.put(`/stores/${storeId}`, form);
                toast({ title: "Đã lưu", description: "Thông tin quán đang chờ admin duyệt lại." });
                navigate("/owner");
            }
        } catch (err: unknown) {
            const apiError = err as ApiError;
            toast({ title: "Lỗi", description: apiError.response?.data?.message || "Không thể lưu.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const addImage = () => {
        if (imageInput.trim()) {
            setForm((f) => ({ ...f, images: [...f.images, imageInput.trim()] }));
            setImageInput("");
        }
    };

    if (loading) {
        return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
    }

    const statusLabel = () => {
        if (!storeData) return null;
        if (storeData.reject_reason) return (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-medium text-red-700">Bị từ chối</p>
                    <p className="text-red-600">{storeData.reject_reason}</p>
                </div>
            </div>
        );
        if (!storeData.is_active) return (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Clock className="w-4 h-4 text-amber-500" />
                <p className="text-sm text-amber-700 font-medium">{t("owner.storeDetails.pendingNotice")}</p>
            </div>
        );
        return (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <p className="text-sm text-green-700 font-medium">{t("owner.storeDetails.activeNotice")}</p>
            </div>
        );
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{isNew ? t("owner.storeDetails.newStore") : t("owner.storeDetails.title")}</h1>
                {stores.length > 1 && (
                    <Select value={storeId || ""} onValueChange={(v) => navigate(`/owner/store?id=${v}`)}>
                        <SelectTrigger className="w-44"><SelectValue placeholder="Chọn quán" /></SelectTrigger>
                        <SelectContent>
                            {stores.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {statusLabel()}

            {!isNew && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {t("owner.storeDetails.reapprovalNotice")}
                </div>
            )}

            <Card>
                <CardHeader><CardTitle className="text-base">{t("owner.storeDetails.basicInfo")}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>{t("owner.storeDetails.storeName")}</Label>
                        <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder={t("owner.storeDetails.storeNamePlaceholder")} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>{t("owner.storeDetails.category")}</Label>
                        <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>{t("owner.storeDetails.description")}</Label>
                        <Textarea value={form.description} rows={3}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            placeholder={t("owner.storeDetails.descriptionPlaceholder")} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-base">{t("owner.storeDetails.addressContact")}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label><MapPin className="inline w-3.5 h-3.5 mr-1" />{t("owner.storeDetails.address")}</Label>
                        <GooglePlacesInput
                            value={form.address}
                            onChange={(v) => setForm((f) => ({ ...f, address: v }))}
                            onPlaceSelect={handleAddressSelect}
                            placeholder={t("owner.storeDetails.addressPlaceholder")}
                        />
                        <div className="flex items-center gap-3">
                            {form.location ? (
                                <p className="text-xs text-muted-foreground flex-1">
                                    <MapPin className="inline w-3 h-3 mr-0.5 text-primary" />
                                    {form.location.lat.toFixed(5)}, {form.location.lng.toFixed(5)}
                                </p>
                            ) : (
                                <p className="text-xs text-muted-foreground flex-1">{t("owner.storeDetails.noCoordinates")}</p>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 px-2.5 gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                                onClick={() => setShowMapPicker(true)}
                            >
                                <Map className="w-3.5 h-3.5" />
                                {t("owner.storeDetails.pickOnMap")}
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label><Phone className="inline w-3.5 h-3.5 mr-1" />{t("owner.storeDetails.phone")}</Label>
                        <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                            placeholder={t("owner.storeDetails.phonePlaceholder")} />
                    </div>
                    <div className="space-y-1.5">
                        <Label><Globe className="inline w-3.5 h-3.5 mr-1" />{t("owner.storeDetails.website")}</Label>
                        <Input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                            placeholder="https://example.com" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-base">{t("owner.storeDetails.images")}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <MultiImageUpload
                        value={form.images}
                        onChange={(urls) => setForm((f) => ({ ...f, images: urls }))}
                        folder="calovie/stores"
                        maxImages={6}
                    />

                    <div className="space-y-2 rounded-xl border border-dashed bg-muted/30 p-3">
                        <p className="text-xs font-medium text-muted-foreground">
                            Hoặc thêm ảnh bằng URL
                        </p>
                        <div className="flex gap-2">
                            <Input value={imageInput} onChange={(e) => setImageInput(e.target.value)}
                                placeholder={t("owner.storeDetails.imageUrlPlaceholder")}
                                onKeyDown={(e) => e.key === "Enter" && addImage()} />
                            <Button type="button" variant="outline" onClick={addImage}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex gap-3 pb-6">
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? t("owner.storeDetails.saving") : isNew ? t("owner.storeDetails.createStore") : t("owner.storeDetails.saveAndSubmit")}
                </Button>
                <Button variant="outline" onClick={() => navigate("/owner")}>{t("common.cancel")}</Button>
            </div>

            <MapLocationPicker
                open={showMapPicker}
                onClose={() => setShowMapPicker(false)}
                onConfirm={handleMapPick}
                initialLat={form.location?.lat}
                initialLng={form.location?.lng}
            />
        </div>
    );
};

export default StoreDetails;
