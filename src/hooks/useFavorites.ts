import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

export interface FavoriteItem {
    _id: string;
    item_type: "food" | "recipe";
    item_id: string;
    created_at: string;
    item: {
        _id: string;
        name_vi: string;
        name_en?: string;
        // food fields
        energy_kcal?: number;
        protein_g?: number;
        total_fat_g?: number;
        carbohydrate_g?: number;
        dietary_fiber_g?: number;
        // recipe fields
        calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
        image_url?: string;
    } | null;
}

export function useFavorites(type?: "food" | "recipe") {
    const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

    const fetchFavorites = useCallback(async () => {
        setLoading(true);
        try {
            const params = type ? { type } : {};
            const { data } = await api.get("/favorites", { params });
            setFavorites(data);
            setFavoriteIds(new Set(data.map((f: FavoriteItem) => String(f.item_id))));
        } catch (err) {
            console.error("fetchFavorites error:", err);
        } finally {
            setLoading(false);
        }
    }, [type]);

    useEffect(() => {
        fetchFavorites();
    }, [fetchFavorites]);

    const addFavorite = useCallback(
        async (item_type: "food" | "recipe", item_id: string) => {
            try {
                await api.post("/favorites", { item_type, item_id });
                setFavoriteIds((prev) => new Set([...prev, item_id]));
                fetchFavorites();
            } catch (err) {
                console.error("addFavorite error:", err);
            }
        },
        [fetchFavorites],
    );

    const removeFavorite = useCallback(
        async (item_type: "food" | "recipe", item_id: string) => {
            try {
                await api.delete(`/favorites/${item_type}/${item_id}`);
                setFavoriteIds((prev) => {
                    const next = new Set(prev);
                    next.delete(item_id);
                    return next;
                });
                setFavorites((prev) => prev.filter((f) => String(f.item_id) !== item_id));
            } catch (err) {
                console.error("removeFavorite error:", err);
            }
        },
        [],
    );

    const toggleFavorite = useCallback(
        async (item_type: "food" | "recipe", item_id: string) => {
            if (favoriteIds.has(item_id)) {
                await removeFavorite(item_type, item_id);
            } else {
                await addFavorite(item_type, item_id);
            }
        },
        [favoriteIds, addFavorite, removeFavorite],
    );

    const isFavorite = useCallback(
        (item_id: string) => favoriteIds.has(item_id),
        [favoriteIds],
    );

    return { favorites, loading, isFavorite, addFavorite, removeFavorite, toggleFavorite, refetch: fetchFavorites };
}
