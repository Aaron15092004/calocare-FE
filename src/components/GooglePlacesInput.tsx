import React, { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface PlaceResult {
    address: string;
    city: string;
    lat: number;
    lng: number;
    place_id: string;
    maps_url: string;
}

interface MapboxFeature {
    id: string;
    place_name: string;
    center: [number, number]; // [lng, lat]
    context?: Array<{ id: string; text: string }>;
}

interface GooglePlacesInputProps {
    value: string;
    onChange: (value: string) => void;
    onPlaceSelect: (place: PlaceResult) => void;
    placeholder?: string;
    className?: string;
}

export const GooglePlacesInput: React.FC<GooglePlacesInputProps> = ({
    value, onChange, onPlaceSelect, placeholder = "Nhập địa chỉ...", className,
}) => {
    const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const search = useCallback(async (query: string) => {
        const token = import.meta.env.VITE_MAPBOX_TOKEN;
        if (!token || query.trim().length < 3) {
            setSuggestions([]);
            setShowDropdown(false);
            return;
        }
        setLoading(true);
        try {
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=vn&language=vi&limit=5&access_token=${token}`;
            const res = await fetch(url);
            const data = await res.json();
            const features: MapboxFeature[] = data.features ?? [];
            setSuggestions(features);
            setShowDropdown(features.length > 0);
        } catch {
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        onChange(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(val), 350);
    };

    const handleSelect = (feature: MapboxFeature) => {
        const [lng, lat] = feature.center;

        // Extract city from context (prefer "place" level, fallback to "region")
        const cityContext = feature.context?.find(
            (c) => c.id.startsWith("place") || c.id.startsWith("region"),
        );
        const city = cityContext?.text ?? "";

        const result: PlaceResult = {
            address: feature.place_name,
            city,
            lat,
            lng,
            place_id: feature.id,
            maps_url: `https://www.google.com/maps?q=${lat},${lng}`,
        };

        onChange(feature.place_name);
        onPlaceSelect(result);
        setSuggestions([]);
        setShowDropdown(false);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <MapPin className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
            <Input
                value={value}
                onChange={handleInputChange}
                onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                placeholder={placeholder}
                className={`pl-8 ${className ?? ""}`}
            />
            {loading && (
                <Loader2 className="absolute right-2.5 top-2.5 w-4 h-4 animate-spin text-muted-foreground" />
            )}
            {showDropdown && suggestions.length > 0 && (
                <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
                    {suggestions.map((feature) => (
                        <li
                            key={feature.id}
                            className="flex items-start gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted text-sm"
                            onMouseDown={(e) => { e.preventDefault(); handleSelect(feature); }}
                        >
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <span className="leading-tight">{feature.place_name}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
