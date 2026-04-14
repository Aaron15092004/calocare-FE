// src/components/admin/AdminLayout.tsx
import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import {
    LayoutDashboard,
    Users,
    UtensilsCrossed,
    Apple,
    Calendar,
    UserCircle,
    LogOut,
    Menu,
    X,
    ChevronLeft,
    Layers,
    CreditCard,
    Store,
    Tag,
    BookMarked,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
    { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/admin/users", icon: Users, label: "Users" },
    { to: "/admin/payments", icon: CreditCard, label: "Payments" },
    { to: "/admin/stores", icon: Store, label: "Stores" },
    { to: "/admin/discount-codes", icon: Tag, label: "Discount Codes" },
    { to: "/admin/recipes", icon: UtensilsCrossed, label: "Recipes" },
    { to: "/admin/recipe-categories", icon: BookMarked, label: "Recipe Categories" },
    { to: "/admin/foods", icon: Apple, label: "Foods" },
    { to: "/admin/food-groups", icon: Layers, label: "Food Groups" },
    { to: "/admin/meal-plans", icon: Calendar, label: "Meal Plans" },
    { to: "/admin/profile", icon: UserCircle, label: "Profile" },
];

const AdminLayout = () => {
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
                <span className="font-bold text-lg">CaloCare Admin</span>
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
                        <img src="/logo.svg" className="w-8 h-8 rounded-lg" alt="Logo" />
                        <span className="font-bold">CaloCare</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Scrollable nav */}
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

                {/* Footer — always visible */}
                <div className="flex-shrink-0 p-3 border-t">
                    <div className="flex items-center gap-3 px-3 py-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-primary">
                                {profile?.display_name?.[0]?.toUpperCase() || "A"}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                                {profile?.display_name || "Admin"}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{profile?.role}</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={handleSignOut}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-gray-500"
                        onClick={() => navigate("/")}
                    >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Back to App
                    </Button>
                </div>
            </aside>

            {/* Main content */}
            <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
                <div className="p-4 lg:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
