import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CaloVieFaceMascot, type MascotFaceMood } from "@/components/brand/CaloVieMascot";
import { useAuthContext } from "@/contexts/AuthContext";

const HIDDEN_PATH_PREFIXES = ["/auth", "/onboarding", "/assistant", "/admin", "/owner"];
const POSITION_KEY = "calovie_floating_assistant_position";
const NUDGE_KEY = "calovie_assistant_nudge";
const BUTTON_SIZE = 76;
const EDGE_MARGIN = 8;
const TOP_SAFE = 80;
const BOTTOM_SAFE = 92;

const MOODS: MascotFaceMood[] = ["neutral", "curious", "playful", "love", "curious"];

const PHRASES = [
  "Cần mình gợi ý bữa tiếp theo không?",
  "Bạn cứ chạm mình khi muốn hỏi nhanh nhé.",
  "Hôm nay mình đi cùng bạn nè.",
  "Muốn xem lại cách dùng app thì hỏi mình.",
];

const clampViewportPosition = (x: number, y: number) => {
  if (typeof window === "undefined") return { x, y };
  return {
    x: Math.max(EDGE_MARGIN, Math.min(window.innerWidth - BUTTON_SIZE - EDGE_MARGIN, x)),
    y: Math.max(TOP_SAFE, Math.min(window.innerHeight - BUTTON_SIZE - BOTTOM_SAFE, y)),
  };
};

export const CaloVieFloatingAssistant: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuthContext();
  const [tick, setTick] = useState(0);
  const [showBubble, setShowBubble] = useState(false);
  const [customPhrase, setCustomPhrase] = useState("");
  const [viewportWidth, setViewportWidth] = useState(() => (
    typeof window === "undefined" ? 390 : window.innerWidth
  ));
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    try {
      const raw = localStorage.getItem(POSITION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { x?: number; y?: number };
      if (typeof parsed.x !== "number" || typeof parsed.y !== "number") return null;
      return clampViewportPosition(parsed.x, parsed.y);
    } catch {
      return null;
    }
  });
  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const latestPositionRef = useRef(position);
  const suppressClickRef = useRef(false);

  const hidden =
    loading ||
    !user ||
    HIDDEN_PATH_PREFIXES.some((prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`));

  useEffect(() => {
    latestPositionRef.current = position;
  }, [position]);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
      setPosition((current) => {
        if (!current) return current;
        const next = clampViewportPosition(current.x, current.y);
        localStorage.setItem(POSITION_KEY, JSON.stringify(next));
        return next;
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
  }, [showBubble, tick, customPhrase]);

  useEffect(() => {
    const showNudge = () => {
      const nudge = localStorage.getItem(NUDGE_KEY);
      if (!nudge) return;
      localStorage.removeItem(NUDGE_KEY);
      setCustomPhrase(nudge);
      setShowBubble(true);
      window.setTimeout(() => setCustomPhrase(""), 5600);
    };

    showNudge();
    window.addEventListener("calovie-assistant-nudge", showNudge);
    return () => window.removeEventListener("calovie-assistant-nudge", showNudge);
  }, []);

  if (hidden) return null;

  const mood = MOODS[tick % MOODS.length];
  const phrase = customPhrase || PHRASES[tick % PHRASES.length];
  const bubbleOnRight = position ? position.x < viewportWidth / 2 : false;

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    setShowBubble(false);

    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      originX: position?.x ?? rect.left,
      originY: position?.y ?? rect.top,
    };

    const handleMove = (moveEvent: PointerEvent) => {
      const state = dragRef.current;
      if (!state.active) return;
      const dx = moveEvent.clientX - state.startX;
      const dy = moveEvent.clientY - state.startY;
      if (Math.abs(dx) + Math.abs(dy) > 6) state.moved = true;
      const next = clampViewportPosition(state.originX + dx, state.originY + dy);
      latestPositionRef.current = next;
      setPosition(next);
    };

    const finishDrag = () => {
      const state = dragRef.current;
      dragRef.current.active = false;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
      if (state.moved) {
        const next = latestPositionRef.current ?? clampViewportPosition(state.originX, state.originY);
        localStorage.setItem(POSITION_KEY, JSON.stringify(next));
        suppressClickRef.current = true;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 350);
      }
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (dragRef.current.moved || suppressClickRef.current) {
      event.preventDefault();
      dragRef.current.moved = false;
      suppressClickRef.current = false;
      return;
    }
    navigate("/assistant");
  };

  return (
    <div
      className={`fixed z-40 h-[4.4rem] w-[4.4rem] touch-none select-none ${position ? "" : "bottom-[calc(5.15rem+env(safe-area-inset-bottom))] right-3"}`}
      style={position ? { left: position.x, top: position.y } : undefined}
    >
      {showBubble && (
        <div
          className={`pointer-events-none absolute bottom-1 w-[12.5rem] max-w-[calc(100vw-6.5rem)] rounded-3xl bg-card/95 px-4 py-3 text-xs font-bold leading-5 text-foreground shadow-ios-lg ring-1 ring-border/70 backdrop-blur animate-slide-up ${
            bubbleOnRight
              ? "left-[calc(100%+0.45rem)] rounded-bl-md"
              : "right-[calc(100%+0.45rem)] rounded-br-md"
          }`}
        >
          {phrase}
        </div>
      )}
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onClick={handleClick}
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
