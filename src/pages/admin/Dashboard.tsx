// src/pages/admin/Dashboard.tsx
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Users,
    UtensilsCrossed,
    Apple,
    CreditCard,
    TrendingUp,
    Calendar,
    Activity,
    ClipboardList,
} from "lucide-react";
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

interface Stats {
    total_users: number;
    total_recipes: number;
    total_foods: number;
    total_meal_plans: number;
    total_revenue: number;
    new_users_this_month: number;
    diary_entries_last_7days: number;
    pending_recipes: number;
}

interface Charts {
    user_growth: { name: string; users: number }[];
    revenue: { name: string; revenue: number; transactions: number }[];
    diary_activity: { name: string; entries: number }[];
    food_group_distribution: { name: string; value: number }[];
}

const StatCard = ({ icon: Icon, label, value, trend, color }: any) => (
    <Card>
        <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                    {trend && (
                        <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                            <TrendingUp className="w-3 h-3" /> {trend}
                        </p>
                    )}
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </CardContent>
    </Card>
);

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

const Dashboard = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [charts, setCharts] = useState<Charts>({
        user_growth: [],
        revenue: [],
        diary_activity: [],
        food_group_distribution: [],
    });
    const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const { data } = await api.get("/admin/dashboard");
            setStats(data.stats);
            setCharts(data.charts || { user_growth: [], revenue: [], diary_activity: [], food_group_distribution: [] });
            setRecentTransactions(data.recent_transactions || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">Overview of CaloCare system</p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                <StatCard icon={Users} label="Total Users" value={stats?.total_users ?? 0} color="bg-blue-100 text-blue-600" />
                <StatCard
                    icon={Users}
                    label="New This Month"
                    value={stats?.new_users_this_month ?? 0}
                    color="bg-purple-100 text-purple-600"
                />
                <StatCard
                    icon={CreditCard}
                    label="Total Revenue"
                    value={`${(stats?.total_revenue ?? 0).toLocaleString("vi-VN")}₫`}
                    color="bg-green-100 text-green-600"
                />
                <StatCard
                    icon={Activity}
                    label="Diary (7 days)"
                    value={stats?.diary_entries_last_7days ?? 0}
                    color="bg-pink-100 text-pink-600"
                />
                <StatCard icon={UtensilsCrossed} label="Recipes" value={stats?.total_recipes ?? 0} color="bg-orange-100 text-orange-600" />
                <StatCard icon={Apple} label="Foods" value={stats?.total_foods ?? 0} color="bg-red-100 text-red-600" />
                <StatCard icon={Calendar} label="Meal Plans" value={stats?.total_meal_plans ?? 0} color="bg-cyan-100 text-cyan-600" />
                <StatCard
                    icon={ClipboardList}
                    label="Pending Recipes"
                    value={stats?.pending_recipes ?? 0}
                    color="bg-yellow-100 text-yellow-600"
                />
            </div>

            {/* Charts row 1: User growth + Revenue */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">User Growth (12 months)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={charts.user_growth} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip />
                                <Area
                                    type="monotone"
                                    dataKey="users"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fill="url(#colorUsers)"
                                    name="Users"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Revenue (12 months)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={charts.revenue} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis
                                    tick={{ fontSize: 11 }}
                                    tickFormatter={(v) =>
                                        v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : v
                                    }
                                />
                                <Tooltip
                                    formatter={(value: number, name: string) =>
                                        name === "revenue"
                                            ? [`${value.toLocaleString("vi-VN")}₫`, "Revenue"]
                                            : [value, "Transactions"]
                                    }
                                />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="revenue" fill="#10b981" radius={[3, 3, 0, 0]} name="Revenue" />
                                <Bar dataKey="transactions" fill="#8b5cf6" radius={[3, 3, 0, 0]} name="Transactions" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Charts row 2: Diary activity + Food groups */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Diary Activity (last 7 days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={charts.diary_activity} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorDiary" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip />
                                <Area
                                    type="monotone"
                                    dataKey="entries"
                                    stroke="#ec4899"
                                    strokeWidth={2}
                                    fill="url(#colorDiary)"
                                    name="Entries"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Food Group Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {charts.food_group_distribution.length === 0 ? (
                            <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                                No data
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={charts.food_group_distribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={85}
                                        paddingAngle={3}
                                        dataKey="value"
                                        nameKey="name"
                                        label={({ name, percent }) =>
                                            percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""
                                        }
                                        labelLine={false}
                                    >
                                        {charts.food_group_distribution.map((_, index) => (
                                            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value, name) => [value, name]} />
                                    <Legend
                                        layout="vertical"
                                        align="right"
                                        verticalAlign="middle"
                                        wrapperStyle={{ fontSize: 11, maxWidth: 120 }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent transactions */}
            {recentTransactions.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="pb-2 font-medium">User</th>
                                        <th className="pb-2 font-medium">Amount</th>
                                        <th className="pb-2 font-medium">Status</th>
                                        <th className="pb-2 font-medium">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentTransactions.map((t: any) => (
                                        <tr key={t._id} className="border-b last:border-0">
                                            <td className="py-2.5">{t.user_id?.display_name || t.user_id?.email || "—"}</td>
                                            <td className="py-2.5">{t.final_amount?.toLocaleString("vi-VN")}₫</td>
                                            <td className="py-2.5">
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        t.status === "completed"
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-gray-100 text-gray-700"
                                                    }`}
                                                >
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td className="py-2.5 text-muted-foreground">
                                                {new Date(t.created_at).toLocaleDateString("vi-VN")}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default Dashboard;
