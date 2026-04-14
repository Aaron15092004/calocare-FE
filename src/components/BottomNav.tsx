import React, { useState, useEffect } from "react";
import {
    Home, Calendar, BookOpen, User, Plus, X,
    Camera, ScanLine, PenLine, MapPin, Heart, UtensilsCrossed,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { FoodScanner } from "@/components/FoodScanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MAIN_TABS = [
    { icon: Home,     label: "Home",     path: "/" },
    { icon: Calendar, label: "Kế hoạch", path: "/meal-plan" },
    { icon: BookOpen, label: "Nhật ký",  path: "/diary" },
    { icon: User,     label: "Hồ sơ",   path: "/settings" },
];

const SECONDARY_ACTIONS = [
    { icon: Camera,          label: "Scan AI",   color: "bg-primary",     action: "scan_ai"   },
    { icon: ScanLine,        label: "Mã vạch",   color: "bg-blue-500",    action: "barcode"   },
    { icon: PenLine,         label: "Ghi tay",   color: "bg-orange-500",  action: "log"       },
    { icon: Heart,           label: "Yêu thích", color: "bg-red-500",     action: "favorites" },
    { icon: UtensilsCrossed, label: "Công thức", color: "bg-emerald-500", action: "recipes"   },
    { icon: MapPin,          label: "Quán ăn",   color: "bg-amber-500",   action: "nearby"    },
];

export const BottomNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [expanded, setExpanded] = useState(false);
    const [showBarcode, setShowBarcode] = useState(false);
    const [showAIScanner, setShowAIScanner] = useState(false);

    useEffect(() => { setExpanded(false); }, [location.pathname]);

    const handleAction = (action: string) => {
        setExpanded(false);
        switch (action) {
            case "scan_ai":   setShowAIScanner(true); break;
            case "barcode":   setShowBarcode(true); break;
            case "log":       navigate("/diary?action=log"); break;
            case "favorites": navigate("/favorites"); break;
            case "recipes":   navigate("/my-recipes"); break;
            case "nearby":    navigate("/nearby"); break;
        }
    };

    const isActive = (path: string) => location.pathname === path;

    return (
        <>
            <Dialog open={showAIScanner} onOpenChange={(open) => { if (!open) setShowAIScanner(false); }}>
                <DialogContent className="max-w-sm p-0 overflow-hidden">
                    <DialogHeader className="sr-only"><DialogTitle>AI Food Scanner</DialogTitle></DialogHeader>
                    <FoodScanner />
                </DialogContent>
            </Dialog>

            {showBarcode && <BarcodeScanner onClose={() => setShowBarcode(false)} />}

            {expanded && (
                <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setExpanded(false)} />
            )}

            {/* Popup grid */}
            {expanded && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-72">
                    <div className="bg-card rounded-2xl shadow-2xl border border-border/50 p-3">
                        <div className="grid grid-cols-3 gap-2">
                            {SECONDARY_ACTIONS.map((item) => (
                                <button
                                    key={item.action}
                                    type="button"
                                    onClick={() => handleAction(item.action)}
                                    className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted active:scale-95 transition-all duration-150"
                                >
                                    <div className={`w-11 h-11 rounded-xl ${item.color} flex items-center justify-center shadow-md`}>
                                        <item.icon className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-[11px] font-semibold text-foreground leading-tight text-center">
                                        {item.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-center mt-1">
                        <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-card" />
                    </div>
                </div>
            )}

            <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50 safe-area-bottom">
                <div className="flex items-center justify-around h-16 px-1">
                    {MAIN_TABS.slice(0, 2).map((tab) => (
                        <button key={tab.path} type="button" onClick={() => navigate(tab.path)}
                            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${isActive(tab.path) ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                            <tab.icon className="w-5 h-5" />
                            <span className="text-[10px] font-medium">{tab.label}</span>
                        </button>
                    ))}

                    {/* Center + */}
                    <div className="flex items-center justify-center w-20 -mt-5">
                        <button type="button" onClick={() => setExpanded(!expanded)}
                            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${expanded ? "bg-muted shadow-sm scale-90" : "gradient-primary shadow-primary/30 hover:scale-110 active:scale-95"}`}>
                            {expanded ? <X className="w-6 h-6 text-muted-foreground" /> : <Plus className="w-7 h-7 text-white" />}
                        </button>
                    </div>

                    {MAIN_TABS.slice(2).map((tab) => (
                        <button key={tab.path} type="button" onClick={() => navigate(tab.path)}
                            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${isActive(tab.path) ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                            <tab.icon className="w-5 h-5" />
                            <span className="text-[10px] font-medium">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </nav>
        </>
    );
};
