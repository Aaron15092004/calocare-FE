import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import {
    LayoutDashboard, Store, UtensilsCrossed, Star, BarChart2,
    Zap, LogOut, Menu, X, ChevronLeft, UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
    { to: "/owner",           icon: LayoutDashboard, label: "Dashboard",     end: true },
    { to: "/owner/store",     icon: Store,            label: "Thông tin quán" },
    { to: "/owner/menu",      icon: UtensilsCrossed,  label: "Thực đơn" },
    { to: "/owner/reviews",   icon: Star,             label: "Đánh giá" },
    { to: "/owner/analytics", icon: BarChart2,        label: "Thống kê chi tiết" },
    { to: "/owner/upgrade",   icon: Zap,              label: "Nâng cấp Pro" },
    { to: "/owner/profile",   icon: UserCircle,       label: "Tài khoản" },
];

const StoreOwnerLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { profile, signOut } = useAuthContext();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate("/auth");
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b px-4 h-14 flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                    <Menu className="w-5 h-5" />
                </Button>
                <span className="font-bold text-lg text-primary">Quản lý quán</span>
                <div className="w-10" />
            </header>

            {/* Overlay */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/50"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed top-0 left-0 z-50 h-full w-64 bg-white border-r transition-transform duration-300
                    flex flex-col lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
                `}
            >
                {/* Logo */}
                <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" className="w-8 h-8 rounded-lg" alt="Logo" />
                        <div>
                            <span className="font-bold text-sm block">CaloVie</span>
                            <span className="text-xs text-muted-foreground">Quản lý quán</span>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                                ${isActive ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-gray-100"}`
                            }
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer */}
                <div className="flex-shrink-0 p-3 border-t">
                    <div className="flex items-center gap-3 px-3 py-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-primary">
                                {profile?.display_name?.[0]?.toUpperCase() || "S"}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{profile?.display_name || "Chủ quán"}</p>
                            <p className="text-xs text-muted-foreground">Store Owner</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={handleSignOut}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Đăng xuất
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-gray-500" onClick={() => navigate("/nearby")}>
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Xem app
                    </Button>
                </div>
            </aside>

            {/* Main */}
            <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
                <div className="p-4 lg:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default StoreOwnerLayout;
