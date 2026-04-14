// src/pages/admin/FoodGroups.tsx
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

interface FoodGroup {
    _id: string;
    code?: number;
    name_vi: string;
    name_en?: string;
    description?: string;
    icon_url?: string;
    sort_order?: number;
}

const empty = (): Partial<FoodGroup> => ({
    name_vi: "",
    name_en: "",
    description: "",
    icon_url: "",
    sort_order: 0,
});

const FoodGroups = () => {
    const [groups, setGroups] = useState<FoodGroup[]>([]);
    const [filtered, setFiltered] = useState<FoodGroup[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [editTarget, setEditTarget] = useState<FoodGroup | null>(null);
    const [form, setForm] = useState<Partial<FoodGroup>>(empty());
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchGroups();
    }, []);

    useEffect(() => {
        const q = search.toLowerCase();
        setFiltered(
            q
                ? groups.filter(
                      (g) =>
                          g.name_vi.toLowerCase().includes(q) ||
                          g.name_en?.toLowerCase().includes(q) ||
                          String(g.code ?? "").includes(q),
                  )
                : groups,
        );
    }, [search, groups]);

    const fetchGroups = async () => {
        try {
            const { data } = await api.get("/food-groups");
            const list = Array.isArray(data) ? data : data.data ?? [];
            setGroups(list);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openAdd = () => {
        setEditTarget(null);
        setForm(empty());
        setDialogOpen(true);
    };

    const openEdit = (g: FoodGroup) => {
        setEditTarget(g);
        setForm({
            name_vi: g.name_vi,
            name_en: g.name_en ?? "",
            description: g.description ?? "",
            icon_url: g.icon_url ?? "",
            sort_order: g.sort_order ?? 0,
            code: g.code,
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.name_vi?.trim()) return;
        setSaving(true);
        try {
            const payload = {
                name_vi: form.name_vi.trim(),
                name_en: form.name_en?.trim() || undefined,
                description: form.description?.trim() || undefined,
                icon_url: form.icon_url?.trim() || undefined,
                sort_order: form.sort_order ?? 0,
                code: form.code !== undefined && form.code !== null ? Number(form.code) : undefined,
            };
            if (editTarget) {
                const { data } = await api.put(`/food-groups/${editTarget._id}`, payload);
                setGroups((prev) => prev.map((g) => (g._id === editTarget._id ? data : g)));
            } else {
                const { data } = await api.post("/food-groups", payload);
                setGroups((prev) => [...prev, data]);
            }
            setDialogOpen(false);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/food-groups/${deleteId}`);
            setGroups((prev) => prev.filter((g) => g._id !== deleteId));
        } catch (err) {
            console.error(err);
        } finally {
            setDeleteId(null);
        }
    };

    const set = (field: keyof FoodGroup, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Food Groups</h1>
                    <p className="text-muted-foreground text-sm">{groups.length} groups total</p>
                </div>
                <Button onClick={openAdd}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Group
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search name or code..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                />
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="text-center text-muted-foreground py-16">No food groups found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr className="text-left">
                                        <th className="px-4 py-3 font-medium">Code</th>
                                        <th className="px-4 py-3 font-medium">Name (VI)</th>
                                        <th className="px-4 py-3 font-medium hidden md:table-cell">Name (EN)</th>
                                        <th className="px-4 py-3 font-medium hidden lg:table-cell">Description</th>
                                        <th className="px-4 py-3 font-medium text-center hidden sm:table-cell">Order</th>
                                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((g) => (
                                        <tr key={g._id} className="border-t hover:bg-muted/30">
                                            <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                                                {g.code ?? "—"}
                                            </td>
                                            <td className="px-4 py-3 font-medium">
                                                <div className="flex items-center gap-2">
                                                    {g.icon_url && (
                                                        <img
                                                            src={g.icon_url}
                                                            alt=""
                                                            className="w-6 h-6 object-cover rounded"
                                                        />
                                                    )}
                                                    {g.name_vi}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                                                {g.name_en || "—"}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell max-w-xs truncate">
                                                {g.description || "—"}
                                            </td>
                                            <td className="px-4 py-3 text-center hidden sm:table-cell text-muted-foreground">
                                                {g.sort_order ?? 0}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8"
                                                        onClick={() => openEdit(g)}
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                        onClick={() => setDeleteId(g._id)}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add / Edit dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editTarget ? "Edit Food Group" : "Add Food Group"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Name (VI) *</Label>
                                <Input
                                    value={form.name_vi ?? ""}
                                    onChange={(e) => set("name_vi", e.target.value)}
                                    placeholder="Thịt và sản phẩm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Name (EN)</Label>
                                <Input
                                    value={form.name_en ?? ""}
                                    onChange={(e) => set("name_en", e.target.value)}
                                    placeholder="Meat & Products"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Code (integer)</Label>
                                <Input
                                    type="number"
                                    value={form.code ?? ""}
                                    onChange={(e) =>
                                        set("code", e.target.value === "" ? undefined : Number(e.target.value))
                                    }
                                    placeholder="e.g. 7"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Sort Order</Label>
                                <Input
                                    type="number"
                                    value={form.sort_order ?? 0}
                                    onChange={(e) => set("sort_order", Number(e.target.value))}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Description</Label>
                            <Input
                                value={form.description ?? ""}
                                onChange={(e) => set("description", e.target.value)}
                                placeholder="Optional description"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Icon URL</Label>
                            <Input
                                value={form.icon_url ?? ""}
                                onChange={(e) => set("icon_url", e.target.value)}
                                placeholder="https://..."
                            />
                            {form.icon_url && (
                                <img
                                    src={form.icon_url}
                                    alt="icon preview"
                                    className="mt-1 w-10 h-10 object-cover rounded border"
                                />
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving || !form.name_vi?.trim()}>
                            {saving ? "Saving…" : editTarget ? "Save Changes" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirm dialog */}
            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Food Group?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        This action cannot be undone. Foods assigned to this group will lose their group reference.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default FoodGroups;
