import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

interface PendingFood {
    _id: string;
    name_vi?: string;
    name_en?: string;
    energy_kcal?: number;
    protein?: number;
    lipid?: number;
    glucid?: number;
    source_reference?: string;
    notes?: string;
    created_at: string;
}

const PAGE_SIZE = 20;

export default function RagFoods() {
    const [page, setPage] = useState(1);
    const [source, setSource] = useState<"all" | "usda">("all");
    const { toast } = useToast();
    const qc = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ["admin", "rag", "foods", "pending", page, source],
        queryFn: async () => {
            const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
            if (source === "usda") params.set("source", "usda");
            const { data } = await api.get(`/admin/rag/foods/pending?${params}`);
            return data as { foods: PendingFood[]; total: number; page: number; limit: number };
        },
    });

    const approve = useMutation({
        mutationFn: (id: string) => api.put(`/admin/rag/foods/${id}/approve`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin", "rag", "foods"] });
            qc.invalidateQueries({ queryKey: ["admin", "rag", "pending-counts"] });
            toast({ title: "Đã duyệt" });
        },
    });

    const reject = useMutation({
        mutationFn: (id: string) => api.delete(`/admin/rag/foods/${id}/reject`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin", "rag", "foods"] });
            qc.invalidateQueries({ queryKey: ["admin", "rag", "pending-counts"] });
            toast({ title: "Đã xóa" });
        },
    });

    const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Thực phẩm chờ duyệt</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {data?.total ?? 0} mục · Chưa được duyệt
                    </p>
                </div>
                <div className="flex gap-2">
                    {(["all", "usda"] as const).map((s) => (
                        <Button
                            key={s}
                            size="sm"
                            variant={source === s ? "default" : "outline"}
                            onClick={() => { setSource(s); setPage(1); }}
                        >
                            {s === "all" ? "Tất cả" : "USDA"}
                        </Button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium">Tên</th>
                                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Ngồn</th>
                                <th className="text-right px-4 py-3 font-medium">Calo</th>
                                <th className="text-right px-4 py-3 font-medium">P/C/F</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {(data?.foods ?? []).map((food) => (
                                <tr key={food._id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="font-medium">{food.name_vi || food.name_en || "—"}</p>
                                        {food.name_en && food.name_vi && (
                                            <p className="text-xs text-muted-foreground">{food.name_en}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 hidden md:table-cell">
                                        <Badge variant="outline" className="text-xs">
                                            {food.source_reference?.startsWith("USDA-") ? "USDA" : "Manual"}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {food.energy_kcal != null ? Math.round(food.energy_kcal) : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                                        {food.protein != null ? `${food.protein.toFixed(1)}` : "—"} /
                                        {food.glucid != null ? ` ${food.glucid.toFixed(1)}` : " —"} /
                                        {food.lipid != null ? ` ${food.lipid.toFixed(1)}` : " —"}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 justify-end">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="w-8 h-8 text-emerald-600 hover:bg-emerald-50"
                                                onClick={() => approve.mutate(food._id)}
                                                disabled={approve.isPending}
                                            >
                                                <Check className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="w-8 h-8 text-destructive hover:bg-destructive/10"
                                                onClick={() => reject.mutate(food._id)}
                                                disabled={reject.isPending}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {data?.foods.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                        <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                        Không có thực phẩm chờ duyệt
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm">Trang {page}/{totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
