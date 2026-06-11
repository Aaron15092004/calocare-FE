import React from "react";
import {
  Flame, Leaf, Activity, Target, Scale, Heart,
  Dumbbell, Droplets, Utensils, Zap, TrendingUp, Salad,
} from "lucide-react";

type IconType = React.ElementType;

interface BgItem {
  Icon:  IconType;
  x:     number; // vw %
  y:     number; // vh %
  size:  number; // px
  dur:   number; // seconds
  delay: number; // seconds
  dx:    number; // px – diagonal drift X
  dy:    number; // px – diagonal drift Y
  op:    number; // opacity 0–1
}

const ITEMS: BgItem[] = [
  // ─── top row ───────────────────────────────────────────────────
  { Icon: Flame,      x:  6,  y:  5, size: 64, dur: 44, delay:  0, dx:  55, dy:  48, op: 0.16 },
  { Icon: Leaf,       x: 42,  y:  3, size: 48, dur: 51, delay:  9, dx: -42, dy:  62, op: 0.14 },
  { Icon: Activity,   x: 80,  y:  6, size: 56, dur: 38, delay:  4, dx:  48, dy:  56, op: 0.16 },
  // ─── upper-mid ─────────────────────────────────────────────────
  { Icon: Target,     x: 18,  y: 22, size: 44, dur: 46, delay: 13, dx:  62, dy: -38, op: 0.14 },
  { Icon: Zap,        x: 68,  y: 17, size: 52, dur: 56, delay:  6, dx: -55, dy:  50, op: 0.16 },
  { Icon: Heart,      x: 92,  y: 30, size: 40, dur: 41, delay: 17, dx: -50, dy:  44, op: 0.14 },
  // ─── mid ───────────────────────────────────────────────────────
  { Icon: Dumbbell,   x:  4,  y: 47, size: 56, dur: 49, delay:  2, dx:  52, dy: -52, op: 0.16 },
  { Icon: Droplets,   x: 54,  y: 44, size: 44, dur: 36, delay: 20, dx: -44, dy: -56, op: 0.14 },
  { Icon: Salad,      x: 34,  y: 60, size: 50, dur: 53, delay:  8, dx:  48, dy:  38, op: 0.16 },
  // ─── lower-mid ─────────────────────────────────────────────────
  { Icon: Utensils,   x: 76,  y: 63, size: 56, dur: 43, delay: 11, dx: -60, dy:  42, op: 0.14 },
  { Icon: Scale,      x: 14,  y: 74, size: 44, dur: 47, delay: 22, dx:  54, dy: -46, op: 0.16 },
  { Icon: TrendingUp, x: 60,  y: 78, size: 50, dur: 40, delay:  7, dx: -48, dy: -52, op: 0.14 },
  // ─── bottom row ────────────────────────────────────────────────
  { Icon: Flame,      x: 32,  y: 88, size: 38, dur: 54, delay: 15, dx:  60, dy: -54, op: 0.14 },
  { Icon: Leaf,       x: 88,  y: 84, size: 52, dur: 42, delay: 10, dx: -56, dy: -44, op: 0.16 },
  { Icon: Target,     x:  4,  y: 93, size: 36, dur: 48, delay: 18, dx:  50, dy: -48, op: 0.14 },
];

const AnimatedBackground: React.FC = () => (
  <div
    className="fixed inset-0 pointer-events-none overflow-hidden"
    style={{ zIndex: 0 }}
    aria-hidden="true"
  >
    {ITEMS.map((item, i) => {
      const { Icon, x, y, size, dur, delay, dx, dy, op } = item;
      return (
        <div
          key={i}
          className="absolute calovie-bg-icon text-primary"
          style={
            {
              left:            `${x}%`,
              top:             `${y}%`,
              opacity:         op,
              "--dur":         `${dur}s`,
              "--dx":          `${dx}px`,
              "--dy":          `${dy}px`,
              animationDelay:  `${delay}s`,
            } as React.CSSProperties
          }
        >
          <Icon style={{ width: size, height: size }} />
        </div>
      );
    })}
  </div>
);

export default AnimatedBackground;
