import React, { useState } from "react";
import {
  Home,
  BookOpen,
  Calendar,
  User,
  Plus,
  ScanLine,
  QrCode,
  PenLine,
  BarChart2,
  MapPin,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const TABS_LEFT = [
  { icon: Home, labelKey: "bottomNav.home", path: "/" },
  { icon: Calendar, labelKey: "bottomNav.mealPlan", path: "/meal-plan" },
];

const TABS_RIGHT = [
  { icon: BookOpen, labelKey: "bottomNav.diary", path: "/diary" },
  { icon: User, labelKey: "bottomNav.profile", path: "/settings" },
];

// 5 buttons, uniform 35° steps centred on 90°: 160→125→90→55→20
// At R=108, chord between adjacent centres = 2×108×sin(17.5°) ≈ 65px > w-14 (56px) → ~9px gap
const FAB_ACTIONS = [
  {
    icon: ScanLine,
    label: "AI Scan",
    target: "/diary",
    angle: 160,
    iconCls: "text-primary",
  },
  {
    icon: QrCode,
    label: "Mã vạch",
    target: "barcode",
    angle: 125,
    iconCls: "text-protein",
  },
  {
    icon: PenLine,
    label: "Ghi tay",
    target: "/diary",
    angle: 90,
    iconCls: "text-calories",
  },
  {
    icon: BarChart2,
    label: "Báo cáo",
    target: "/reports",
    angle: 55,
    iconCls: "text-vitamins",
  },
  {
    icon: MapPin,
    label: "Gần đây",
    target: "/nearby",
    angle: 20,
    iconCls: "text-fat",
  },
];

const FAB_R = 108;

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const closeFan = () => setIsOpen(false);

  const handleTabClick = (path: string) => {
    closeFan();
    navigate(path);
  };

  const handleFabAction = (target: string) => {
    closeFan();
    if (target === "barcode") {
      navigate("/", { state: { openBarcode: true } });
    } else {
      navigate(target);
    }
  };

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 transition-all duration-300",
          isOpen
            ? "backdrop-blur-sm bg-black/25 pointer-events-auto"
            : "pointer-events-none opacity-0",
        )}
        onClick={closeFan}
      />

      <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-2xl saturate-[180%] bg-white/80 border-t border-[rgb(60_60_67/0.15)]">
        <div className="flex items-center h-16 px-1">
          {/* Left tabs */}
          {TABS_LEFT.map((tab) => (
            <button
              key={tab.path}
              type="button"
              onClick={() => handleTabClick(tab.path)}
              className={cn(
                "flex-1 h-full flex flex-col items-center justify-center transition-colors",
                isActive(tab.path)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <div
                className={cn(
                  "flex flex-col items-center gap-0.5",
                  isActive(tab.path) && "bg-primary/10 rounded-xl px-4 py-2",
                )}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">
                  {t(tab.labelKey)}
                </span>
              </div>
            </button>
          ))}

          {/* Center FAB */}
          <div className="flex-1 flex items-center justify-center">
            <div className="relative -mt-7 w-16 h-16">
              {/* Fan action buttons */}
              {FAB_ACTIONS.map((action, i) => {
                const rad = (action.angle * Math.PI) / 180;
                const x = FAB_R * Math.cos(rad);
                const yUp = FAB_R * Math.sin(rad);
                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => handleFabAction(action.target)}
                    className={cn(
                      "absolute flex flex-col items-center justify-center w-14 h-14 rounded-full bg-white shadow-ios",
                      isOpen
                        ? "opacity-100 scale-100"
                        : "opacity-0 scale-0 pointer-events-none",
                    )}
                    style={{
                      left: "50%",
                      top: "50%",
                      transform: isOpen
                        ? `translate(calc(-50% + ${x}px), calc(-50% - ${yUp}px))`
                        : "translate(-50%, -50%) scale(0)",
                      transition: `opacity 250ms ease-out, transform 250ms ease-out`,
                      transitionDelay: isOpen ? `${i * 40}ms` : "0ms",
                      zIndex: 51,
                    }}
                  >
                    <action.icon className={cn("w-6 h-6", action.iconCls)} />
                    <span className="text-[10px] font-medium text-foreground leading-tight mt-1">
                      {action.label}
                    </span>
                  </button>
                );
              })}

              {/* FAB button */}
              <button
                type="button"
                title={isOpen ? "Đóng" : "Thêm"}
                onClick={() => setIsOpen((prev) => !prev)}
                className="absolute inset-0 w-16 h-16 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform duration-150"
                style={{ zIndex: 52 }}
              >
                <Plus
                  className={cn(
                    "w-7 h-7 text-primary-foreground transition-transform duration-300",
                    isOpen && "rotate-45",
                  )}
                />
              </button>
            </div>
          </div>

          {/* Right tabs */}
          {TABS_RIGHT.map((tab) => (
            <button
              key={tab.path}
              type="button"
              onClick={() => handleTabClick(tab.path)}
              className={cn(
                "flex-1 h-full flex flex-col items-center justify-center transition-colors",
                isActive(tab.path)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <div
                className={cn(
                  "flex flex-col items-center gap-0.5",
                  isActive(tab.path) && "bg-primary/10 rounded-xl px-4 py-2",
                )}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">
                  {t(tab.labelKey)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
};
