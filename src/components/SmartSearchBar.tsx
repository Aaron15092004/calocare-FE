import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, Loader2, Flame, Leaf } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";

interface SearchResult {
    source_id: string;
    name: string;
    name_vi?: string;
    energy_kcal?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    source_type: "food" | "recipe" | "usda";
    diet_tags?: string[];
}

interface SmartSearchBarProps {
    onSelect?: (item: SearchResult) => void;
    placeholder?: string;
    className?: string;
}

const SOURCE_LABELS: Record<string, string> = {
    food: "Thực phẩm",
    recipe: "Công thức",
    usda: "USDA",
};

const SOURCE_COLORS: Record<string, string> = {
    food: "bg-blue-100 text-blue-700",
    recipe: "bg-emerald-100 text-emerald-700",
    usda: "bg-amber-100 text-amber-700",
};

export const SmartSearchBar: React.FC<SmartSearchBarProps> = ({
    onSelect,
    placeholder = "Tìm Thực phẩm, Công thức...",
    className = "",
}) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const doSearch = useCallback(async (q: string) => {
        if (!q.trim()) {
            setResults([]);
            setIsOpen(false);
            return;
        }
        setIsLoading(true);
        try {
            const { data } = await api.post("/rag/search-food", {
                query: q,
                top_k: 8,
                include_sources: ["food", "recipe", "usda"],
            });
            setResults(data.results ?? data ?? []);
            setIsOpen(true);
        } catch {
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (query.length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }
        debounceRef.current = setTimeout(() => doSearch(query), 350);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query, doSearch]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleSelect = (item: SearchResult) => {
        onSelect?.(item);
        setQuery("");
        setResults([]);
        setIsOpen(false);
    };

    const handleClear = () => {
        setQuery("");
        setResults([]);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => results.length > 0 && setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl border border-input bg-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                {isLoading ? (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                ) : query ? (
                    <button type="button" onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2">
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                ) : null}
            </div>

            {isLoading && query.length >= 2 && results.length === 0 && (
                <div className="absolute top-full mt-1.5 w-full bg-background border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="divide-y divide-border/50">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/3" />
                                </div>
                                <Skeleton className="h-4 w-10 rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isOpen && results.length > 0 && (
                <div className="absolute top-full mt-1.5 w-full bg-background border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                    <ul className="max-h-72 overflow-y-auto divide-y divide-border/50">
                        {results.map((item) => (
                            <li key={`${item.source_type}-${item.source_id}`}>
                                <button
                                    type="button"
                                    onClick={() => handleSelect(item)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {item.name_vi || item.name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {item.energy_kcal != null && (
                                                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                                    <Flame className="w-3 h-3 text-orange-400" />
                                                    {Math.round(item.energy_kcal)} kcal/100g
                                                </span>
                                            )}
                                            {(item.diet_tags ?? []).includes("vegetarian") && (
                                                <span className="text-xs text-emerald-600 flex items-center gap-0.5">
                                                    <Leaf className="w-3 h-3" />Chay
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${SOURCE_COLORS[item.source_type] ?? "bg-muted text-muted-foreground"}`}>
                                        {SOURCE_LABELS[item.source_type] ?? item.source_type}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                    <div className="px-3 py-1.5 border-t border-border/50">
                        <p className="text-[10px] text-muted-foreground text-center">
                            {results.length} kết quả · CaloCare AI Search
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};


