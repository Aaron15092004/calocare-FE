import React from "react";

interface AdherenceGaugeProps {
  pct: number;
}

export const AdherenceGauge: React.FC<AdherenceGaugeProps> = ({ pct }) => {
  const r = 80;
  const circ = 2 * Math.PI * r;
  const halfCirc = circ / 2;
  const clampedPct = Math.max(0, Math.min(pct, 100));
  const filled = (clampedPct / 100) * halfCirc;
  const color = clampedPct >= 80 ? "#10b981" : clampedPct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 200 110"
        className="w-full max-w-[220px]"
        style={{ overflow: "hidden" }}
      >
        <circle
          cx="100" cy="100" r={r}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth="20"
          strokeDasharray={`${halfCirc} ${halfCirc}`}
          transform="rotate(-180 100 100)"
        />
        <circle
          cx="100" cy="100" r={r}
          fill="none"
          stroke={color}
          strokeWidth="20"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ - filled}`}
          transform="rotate(-180 100 100)"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <p className="text-2xl font-bold -mt-4">{clampedPct}%</p>
      <p className="text-xs text-muted-foreground">Tuân thủ mục tiêu</p>
    </div>
  );
};
