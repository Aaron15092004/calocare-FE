import React from "react";

interface MacroData {
  consumed: number;
  goal: number;
}

interface MacroRingsProps {
  protein: MacroData;
  carbs: MacroData;
  fat: MacroData;
}

const R = { protein: 80, carbs: 60, fat: 40 } as const;
const COLORS = {
  protein: "hsl(200,80%,50%)",
  carbs:   "hsl(45,95%,55%)",
  fat:     "hsl(340,75%,55%)",
} as const;
const SW = 14;
const CX = 100;
const CY = 100;

export const MacroRings: React.FC<MacroRingsProps> = ({ protein, carbs, fat }) => {
  const rings = [
    { key: "protein" as const, data: protein },
    { key: "carbs"   as const, data: carbs   },
    { key: "fat"     as const, data: fat      },
  ];
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
      {rings.map(({ key, data }) => {
        const r    = R[key];
        const circ = 2 * Math.PI * r;
        const pct  = Math.min(data.consumed / Math.max(data.goal, 1), 1);
        const offset = circ - pct * circ;
        return (
          <React.Fragment key={key}>
            <circle
              cx={CX} cy={CY} r={r}
              fill="none"
              stroke={COLORS[key]}
              strokeWidth={SW}
              opacity={0.15}
            />
            <circle
              cx={CX} cy={CY} r={r}
              fill="none"
              stroke={COLORS[key]}
              strokeWidth={SW}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              className="transition-all duration-700 ease-out"
            />
          </React.Fragment>
        );
      })}
    </svg>
  );
};
