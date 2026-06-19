import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CaloVieFaceMascot, type MascotFaceMood } from "@/components/brand/CaloVieMascot";
import { useAuthContext } from "@/contexts/AuthContext";

const HIDDEN_PATH_PREFIXES = ["/auth", "/onboarding", "/assistant", "/admin", "/owner"];

const MOODS: MascotFaceMood[] = ["neutral", "curious", "playful", "love", "curious"];

const PHRASES = [
  "Cần mình gợi ý bữa tiếp theo không?",
  "Bạn cứ chạm mình khi muốn hỏi nhanh nhé.",
  "Hôm nay mình đi cùng bạn nè.",
  "Muốn xem lại cách dùng app thì hỏi mình.",
];

export const CaloVieFloatingAssistant: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuthContext();
  const [tick, setTick] = useState(0);
  const [showBubble, setShowBubble] = useState(false);

  const hidden =
    loading ||
    !user ||
    HIDDEN_PATH_PREFIXES.some((prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`));

  useEffect(() => {
    if (hidden) return;

    const introTimer = window.setTimeout(() => setShowBubble(true), 2800);
    const interval = window.setInterval(() => {
      setTick((value) => value + 1);
      setShowBubble(true);
    }, 18000);

    return () => {
      window.clearTimeout(introTimer);
      window.clearInterval(interval);
    };
  }, [hidden]);

  useEffect(() => {
    if (!showBubble) return;

    const timer = window.setTimeout(() => setShowBubble(false), 5200);
    return () => window.clearTimeout(timer);
  }, [showBubble, tick]);

  if (hidden) return null;

  const mood = MOODS[tick % MOODS.length];
  const phrase = PHRASES[tick % PHRASES.length];

  return (
    <div className="fixed bottom-[calc(5.15rem+env(safe-area-inset-bottom))] right-3 z-40 flex items-end gap-2">
      {showBubble && (
        <div className="max-w-[12.5rem] rounded-3xl rounded-br-md bg-card/95 px-4 py-3 text-xs font-bold leading-5 text-foreground shadow-ios-lg ring-1 ring-border/70 backdrop-blur animate-slide-up">
          {phrase}
        </div>
      )}
      <button
        type="button"
        onClick={() => navigate("/assistant")}
        className="group grid h-[4.4rem] w-[4.4rem] place-items-center rounded-full outline-none transition-transform active:scale-95"
        aria-label="Mở trợ lý Calovie"
      >
        <CaloVieFaceMascot
          mood={mood}
          className="h-[4.25rem] w-[4.25rem] drop-shadow-[0_12px_24px_rgba(15,23,42,0.22)] transition-transform group-hover:scale-105"
          motion="breathe"
        />
      </button>
    </div>
  );
};
