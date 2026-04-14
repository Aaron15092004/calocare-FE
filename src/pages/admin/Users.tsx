// src/pages/admin/Users.tsx
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Ban, Shield, ShieldCheck, MoreHorizontal } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Users = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/admin/users", { params: { limit: 200 } });
            setUsers(data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const updateRole = async (id: string, role: string) => {
        await api.put(`/admin/users/${id}`, { role });
        fetchUsers();
    };

    const toggleBan = async (id: string, currentBan: boolean) => {
        await api.put(`/admin/users/${id}`, { is_banned: !currentBan });
        fetchUsers();
    };

    const filtered = users.filter(
        (u) =>
            (u.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
            (u.email || "").toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Users</h1>
                    <p className="text-muted-foreground">Manage user accounts</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="pb-3 font-medium">User</th>
                                        <th className="pb-3 font-medium">Email</th>
                                        <th className="pb-3 font-medium">Role</th>
                                        <th className="pb-3 font-medium">Tier</th>
                                        <th className="pb-3 font-medium">Status</th>
                                        <th className="pb-3 font-medium">Joined</th>
                                        <th className="pb-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((u) => (
                                        <tr key={u._id} className="border-b last:border-0 hover:bg-muted/30">
                                            <td className="py-3 font-medium">{u.display_name || "—"}</td>
                                            <td className="py-3 text-muted-foreground">{u.email}</td>
                                            <td className="py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    u.role === "admin" ? "bg-red-100 text-red-700"
                                                    : u.role === "moderator" ? "bg-yellow-100 text-yellow-700"
                                                    : "bg-gray-100 text-gray-700"
                                                }`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    u.subscription_tier === "pro" ? "bg-purple-100 text-purple-700"
                                                    : u.subscription_tier === "premium" ? "bg-blue-100 text-blue-700"
                                                    : "bg-gray-100 text-gray-700"
                                                }`}>
                                                    {u.subscription_tier}
                                                </span>
                                            </td>
                                            <td className="py-3">
                                                {u.is_banned ? (
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Banned</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
                                                )}
                                            </td>
                                            <td className="py-3 text-muted-foreground">
                                                {new Date(u.created_at).toLocaleDateString("vi-VN")}
                                            </td>
                                            <td className="py-3">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => updateRole(u._id, "moderator")}>
                                                            <Shield className="w-4 h-4 mr-2" /> Make Moderator
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => updateRole(u._id, "user")}>
                                                            <ShieldCheck className="w-4 h-4 mr-2" /> Make User
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => toggleBan(u._id, u.is_banned)}
                                                            className="text-red-600"
                                                        >
                                                            <Ban className="w-4 h-4 mr-2" />
                                                            {u.is_banned ? "Unban" : "Ban"} User
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filtered.length === 0 && (
                                <p className="text-center text-muted-foreground py-8">No users found</p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default Users;