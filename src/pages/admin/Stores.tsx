// src/pages/admin/Stores.tsx
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
    Search,
    Store,
    BadgeCheck,
    RefreshCw,
    Star,
    MapPin,
    ExternalLink,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
    restaurant: "Nhà hàng",
    cafe: "Cà phê",
    bakery: "Bakery",
    fastfood: "Đồ ăn nhanh",
    other: "Khác",
};

const AdminStores = () => {
    const { toast } = useToast();
    const [stores, setStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchStores();
    }, []);

    const fetchStores = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/stores", { params: { limit: 200 } });
            setStores(data.data || []);
        } catch (err) {
            console.error(err);
            toast({ title: "Lỗi tải dữ liệu", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const verifyStore = async (id: string) => {
        try {
            await api.post(`/stores/${id}/verify`);
            toast({ title: "Đã xác minh quán", description: "Quán đã được gắn huy hiệu xác minh." });
            fetchStores();
        } catch (err: any) {
            toast({
                title: "Lỗi",
                description: err?.response?.data?.error || "Vui lòng thử lại.",
                variant: "destructive",
            });
        }
    };

    const deactivateStore = async (id: string) => {
        try {
            await api.delete(`/stores/${id}`);
            toast({ title: "Đã tắt quán" });
            fetchStores();
        } catch (err: any) {
            toast({
                title: "Lỗi",
                description: err?.response?.data?.error || "Vui lòng thử lại.",
                variant: "destructive",
            });
        }
    };

    const filtered = stores.filter(
        (s) =>
            (s.name || "").toLowerCase().includes(search.toLowerCase()) ||
            (s.address || "").toLowerCase().includes(search.toLowerCase()) ||
            (s.city || "").toLowerCase().includes(search.toLowerCase()),
    );

    const verified = stores.filter((s) => s.is_verified).length;
    const proStores = stores.filter((s) => s.subscription_tier === "pro").length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Quán ăn</h1>
                    <p className="text-muted-foreground">Quản lý danh sách quán đã đăng ký</p>
                </div>
                <Button variant="outline" onClick={fetchStores} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Làm mới
                </Button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Store className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stores.length}</p>
                                <p className="text-sm text-muted-foreground">Tổng quán</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <BadgeCheck className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{verified}</p>
                                <p className="text-sm text-muted-foreground">Đã xác minh</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Star className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{proStores}</p>
                                <p className="text-sm text-muted-foreground">Store Pro</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm theo tên, địa chỉ, thành phố..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="pb-3 font-medium">Tên quán</th>
                                        <th className="pb-3 font-medium">Danh mục</th>
                                        <th className="pb-3 font-medium">Địa chỉ</th>
                                        <th className="pb-3 font-medium">Gói</th>
                                        <th className="pb-3 font-medium">Trạng thái</th>
                                        <th className="pb-3 font-medium">Lượt xem</th>
                                        <th className="pb-3 font-medium">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((store) => (
                                        <tr key={store._id} className="border-b last:border-0 hover:bg-muted/30">
                                            <td className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                                                        <Store className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{store.name}</p>
                                                        {store.phone && (
                                                            <p className="text-xs text-muted-foreground">{store.phone}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 text-muted-foreground">
                                                {CATEGORY_LABELS[store.category] || store.category || "—"}
                                            </td>
                                            <td className="py-3">
                                                <div className="flex items-start gap-1 max-w-[180px]">
                                                    <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                                        {store.address}{store.city ? `, ${store.city}` : ""}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    store.subscription_tier === "pro"
                                                        ? "bg-primary/10 text-primary"
                                                        : "bg-muted text-muted-foreground"
                                                }`}>
                                                    {store.subscription_tier === "pro" ? "Pro" : "Basic"}
                                                </span>
                                            </td>
                                            <td className="py-3">
                                                {store.is_verified ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                                        <BadgeCheck className="w-3 h-3" /> Xác minh
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                                        Chưa xác minh
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 text-muted-foreground">
                                                {(store.views_count || 0).toLocaleString("vi-VN")}
                                            </td>
                                            <td className="py-3">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {!store.is_verified && (
                                                            <DropdownMenuItem onClick={() => verifyStore(store._id)}>
                                                                <BadgeCheck className="w-4 h-4 mr-2" />
                                                                Xác minh quán
                                                            </DropdownMenuItem>
                                                        )}
                                                        {store.website && (
                                                            <DropdownMenuItem asChild>
                                                                <a
                                                                    href={store.website}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    <ExternalLink className="w-4 h-4 mr-2" />
                                                                    Xem website
                                                                </a>
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem
                                                            onClick={() => deactivateStore(store._id)}
                                                            className="text-destructive"
                                                        >
                                                            <Store className="w-4 h-4 mr-2" />
                                                            Tắt hoạt động
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filtered.length === 0 && (
                                <div className="text-center py-12">
                                    <Store className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                                    <p className="text-muted-foreground">Không tìm thấy quán nào</p>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminStores;
