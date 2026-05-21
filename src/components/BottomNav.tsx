import React from "react";
import { Home, BookOpen, Calendar, BarChart2, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const MAIN_TABS = [
    { icon: Home,      key: "bottomNav.home",     path: "/" },
    { icon: BookOpen,  key: "bottomNav.diary",    path: "/diary" },
    { icon: Calendar,  key: "bottomNav.mealPlan", path: "/meal-plan" },
    { icon: BarChart2, key: "bottomNav.reports",  path: "/reports" },
    { icon: User,      key: "bottomNav.profile",  path: "/settings" },
];

export const BottomNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-2xl saturate-[180%] bg-white/80 border-t border-[rgb(60_60_67/0.15)]">
            <div className="flex items-center h-16 px-1">
                {MAIN_TABS.map((tab) => (
                    <button
                        key={tab.path}
                        type="button"
                        onClick={() => navigate(tab.path)}
                        className={cn(
                            "flex-1 h-full flex flex-col items-center justify-center transition-colors",
                            isActive(tab.path) ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <div className={cn(
                            "flex flex-col items-center gap-0.5",
                            isActive(tab.path) && "bg-primary/10 rounded-xl px-4 py-2"
                        )}>
                            <tab.icon className="w-5 h-5" />
                            <span className="text-[10px] font-medium">{t(tab.key)}</span>
                        </div>
                    </button>
                ))}
            </div>
        </nav>
    );
};
