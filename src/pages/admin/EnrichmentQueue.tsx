import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";

interface EnrichmentJob {
    _id: string;
    target_type: "food" | "recipe";
    fdc_id?: number;
    recipe_id?: string;
    usda_food_id?: string;
    status: "pending" | "processing" | "imported" | "failed" | "skipped";
    error_message?: string;
    created_at: string;
    updated_at?: string;
}

const PAGE_SIZE = 20;

const STATUS_MAP: Record<string, { label: string; icon: React.FC<{ className?: string }>; className: string }> = {
    pending:    { label: "Chờ",       icon: Clock,          className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    processing: { label: "Đang xử lý", icon: Loader2,        className: "bg-blue-100 text-blue-700 border-blue-200" },
    imported:   { label: "Đã nhập",     icon: CheckCircle,    className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    failed:     { label: "Lỗi",         icon: XCircle,        className: "bg-red-100 text-red-700 border-red-200" },
    skipped:    { label: "Bỏ qua",      icon: AlertCircle,    className: "bg-gray-100 text-gray-600 border-gray-200" },
};

export default function EnrichmentQueue() {
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState<string>("all");

    const { data, isLoading } = useQuery({
        queryKey: ["admin", "rag", "enrichment", page, status],
        queryFn: async () => {
            const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
            if (status !== "all") params.set("status", status);
            const { data } = await api.get(`/admin/rag/enrichment-queue?${params}`);
            return data as { jobs: EnrichmentJob[]; total: number; page: number; limit: number };
        },
    });

    const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
    const statuses = ["all", "pending", "processing", "imported", "failed", "skipped"];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Enrichment Queue</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    {data?.total ?? 0} công việc · USDA → Thực phẩm
                </p>
            </div>

            <div className="flex gap-2 flex-wrap">
                {statuses.map((s) => (
                    <Button
                        key={s}
                        size="sm"
                        variant={status === s ? "default" : "outline"}
                        onClick={() => { setStatus(s); setPage(1); }}
                        className="capitalize"
                    >
                        {s === "all" ? "Tất cả" : STATUS_MAP[s]?.label ?? s}
                    </Button>
                ))}
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
                                <th className="text-left px-4 py-3 font-medium">Loại / ID</th>
                                <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
                                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Lỗi</th>
                                <th className="text-right px-4 py-3 font-medium">Thời gian</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {(data?.jobs ?? []).map((job) => {
                                const s = STATUS_MAP[job.status];
                                const Icon = s?.icon;
                                return (
                                    <tr key={job._id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mr-2 ${
                                                job.target_type === "recipe"
                                                    ? "bg-purple-100 text-purple-700"
                                                    : "bg-blue-100 text-blue-700"
                                            }`}>
                                                {job.target_type === "recipe" ? "Recipe" : "USDA"}
                                            </span>
                                            <span className="font-mono text-xs text-muted-foreground">
                                                {job.target_type === "recipe"
                                                    ? (job.recipe_id?.slice(-8) ?? "—")
                                                    : (job.fdc_id ?? "—")}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant="outline" className={`text-xs gap-1 ${s?.className ?? ""}` }>
                                                {Icon && <Icon className={`w-3 h-3 ${job.status === "processing" ? "animate-spin" : ""}`} />}
                                                {s?.label ?? job.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            {job.error_message ? (
                                                <span className="text-xs text-destructive truncate max-w-[200px] block">
                                                    {job.error_message}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                                            {new Date(job.created_at).toLocaleDateString("vi-VN")}
                                        </td>
                                    </tr>
                                );
                            })}
                            {data?.jobs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                        Không có công việc nào
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
