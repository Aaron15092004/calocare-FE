import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, Check } from "lucide-react";

export interface PickedLocation {
    lat: number;
    lng: number;
    address: string;
    city: string;
}

interface MapLocationPickerProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (loc: PickedLocation) => void;
    initialLat?: number;
    initialLng?: number;
}

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;
const DEFAULT_CENTER: [number, number] = [105.8412, 21.0245]; // Hà Nội

async function reverseGeocode(lng: number, lat: number): Promise<{ address: string; city: string }> {
    try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?language=vi&access_token=${TOKEN}`;
        const res = await fetch(url);
        const data = await res.json();
        const feature = data.features?.[0];
        if (!feature) return { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, city: "" };

        const cityCtx = feature.context?.find(
            (c: any) => c.id.startsWith("place") || c.id.startsWith("region"),
        );
        return {
            address: feature.place_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            city: cityCtx?.text ?? "",
        };
    } catch {
        return { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, city: "" };
    }
}

export const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
    open,
    onClose,
    onConfirm,
    initialLat,
    initialLng,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markerRef = useRef<mapboxgl.Marker | null>(null);

    const [picked, setPicked] = useState<PickedLocation | null>(null);
    const [geocoding, setGeocoding] = useState(false);

    /* ── Init map once dialog is open & container is mounted ─────────── */
    useEffect(() => {
        if (!open) return;

        // Delay init so Radix Dialog finishes its animation and the
        // container has non-zero dimensions before Mapbox measures it.
        const timer = setTimeout(() => {
            if (!containerRef.current || mapRef.current) return;

            mapboxgl.accessToken = TOKEN;

            const center: [number, number] =
                initialLng !== undefined && initialLat !== undefined
                    ? [initialLng, initialLat]
                    : DEFAULT_CENTER;

            const map = new mapboxgl.Map({
                container: containerRef.current,
                style: "mapbox://styles/mapbox/streets-v12",
                center,
                zoom: 14,
            });
            mapRef.current = map;

            // Ensure map fills container after dialog CSS transition finishes
            map.once("load", () => map.resize());

            map.addControl(new mapboxgl.NavigationControl(), "top-right");
            map.addControl(
                new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }),
                "top-right",
            );

            // Place initial marker if we have coordinates
            if (initialLng !== undefined && initialLat !== undefined) {
                const marker = new mapboxgl.Marker({ color: "#16a34a", draggable: true })
                    .setLngLat([initialLng, initialLat])
                    .addTo(map);
                markerRef.current = marker;

                marker.on("dragend", async () => {
                    const { lng, lat } = marker.getLngLat();
                    await doGeocode(lng, lat);
                });
            }

            // Click anywhere on map to set / move marker
            map.on("click", async (e) => {
                const { lng, lat } = e.lngLat;

                if (!markerRef.current) {
                    const marker = new mapboxgl.Marker({ color: "#16a34a", draggable: true })
                        .setLngLat([lng, lat])
                        .addTo(map);
                    markerRef.current = marker;
                    marker.on("dragend", async () => {
                        const pos = marker.getLngLat();
                        await doGeocode(pos.lng, pos.lat);
                    });
                } else {
                    markerRef.current.setLngLat([lng, lat]);
                }

                await doGeocode(lng, lat);
            });
        }, 150);

        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    /* ── Destroy map when dialog closes ─────────────────────────────── */
    useEffect(() => {
        if (!open) {
            mapRef.current?.remove();
            mapRef.current = null;
            markerRef.current = null;
            setPicked(null);
        }
    }, [open]);

    const doGeocode = async (lng: number, lat: number) => {
        setGeocoding(true);
        const result = await reverseGeocode(lng, lat);
        setPicked({ lng, lat, ...result });
        setGeocoding(false);
    };

    const handleConfirm = () => {
        if (picked) {
            onConfirm(picked);
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-2xl p-0 gap-0 rounded-2xl" style={{ maxHeight: "90vh", overflow: "hidden" }}>
                <DialogHeader className="px-4 pt-4 pb-3 border-b">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <MapPin className="w-4 h-4 text-primary" />
                        Chọn vị trí trên bản đồ
                    </DialogTitle>
                </DialogHeader>

                {/* Instruction */}
                <p className="text-xs text-muted-foreground px-4 py-2 bg-muted/40 border-b">
                    Nhấn vào bản đồ hoặc kéo ghim để chọn vị trí chính xác của quán.
                </p>

                {/* Map container */}
                <div ref={containerRef} style={{ height: "400px", width: "100%" }} />

                {/* Footer */}
                <div className="px-4 py-3 border-t bg-background">
                    {geocoding ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Đang xác định địa chỉ...
                        </div>
                    ) : picked ? (
                        <div className="mb-3">
                            <p className="text-xs text-muted-foreground mb-0.5">Địa chỉ được chọn:</p>
                            <p className="text-sm font-medium leading-snug">{picked.address}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground mb-3">
                            Nhấn vào bản đồ để ghim vị trí quán.
                        </p>
                    )}

                    <div className="flex gap-2">
                        <Button
                            className="flex-1"
                            disabled={!picked || geocoding}
                            onClick={handleConfirm}
                        >
                            <Check className="w-4 h-4 mr-1.5" />
                            Xác nhận vị trí
                        </Button>
                        <Button variant="outline" onClick={onClose}>
                            Huỷ
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
