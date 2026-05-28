import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface AdminBadgeCounts {
    pending_foods: number;
    pending_enrichment: number;
    total: number;
}

export function useAdminBadges() {
    return useQuery<AdminBadgeCounts>({
        queryKey: ["admin", "rag", "pending-counts"],
        queryFn: async () => {
            const { data } = await api.get("/admin/rag/notifications/pending-counts");
            return data as AdminBadgeCounts;
        },
        refetchInterval: 30_000,
        staleTime: 20_000,
        retry: false,
    });
}
