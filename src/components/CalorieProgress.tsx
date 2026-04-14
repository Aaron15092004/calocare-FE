import React from "react";

interface CalorieProgressProps {
  consumed: number;
  goal: number;
  burned: number;
}

export const CalorieProgress: React.FC<CalorieProgressProps> = ({
  consumed,
  goal,
  burned,
}) => {
  const net = consumed - burned;
  const isOver = net > goal;
  const diff = Math.abs(goal - net);
  const percentage = Math.min((net / goal) * 100, 100);
  const circumference = 2 * Math.PI * 85;

  return (
    <div className="relative flex flex-col items-center">
      {/* Main circular progress */}
      <div className="relative w-48 h-48">
        <svg
          className="w-full h-full transform -rotate-90"
          viewBox="0 0 200 200"
        >
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r="85"
            fill="none"
            stroke="currentColor"
            strokeWidth="16"
            className="text-accent"
          />
          {/* Progress circle */}
          <circle
            cx="100"
            cy="100"
            r="85"
            fill="none"
            stroke={
              isOver ? "url(#calorieGradientRed)" : "url(#calorieGradientGreen)"
            }
            strokeWidth="16"
            strokeDasharray={circumference}
            strokeDashoffset={
              circumference - (percentage / 100) * circumference
            }
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
          {/* Gradient definition */}
          <defs>
            <linearGradient
              id="calorieGradientGreen"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="hsl(145, 65%, 42%)" />
              <stop offset="100%" stopColor="hsl(160, 60%, 45%)" />
            </linearGradient>

            <linearGradient
              id="calorieGradientRed"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="hsl(0, 75%, 55%)" />
              <stop offset="100%" stopColor="hsl(0, 65%, 45%)" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-4xl font-bold ${
              isOver ? "text-destructive" : "text-foreground"
            }`}
          >
            {diff}
          </span>
          <span className="text-sm text-muted-foreground font-medium">
            {isOver ? "kcal over" : "kcal left"}
          </span>
        </div>
      </div>

      {/* Stats below */}
      <div className="flex justify-center gap-8 mt-6">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-lg font-semibold text-foreground">
              {consumed}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">Eaten</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-calories" />
            <span className="text-lg font-semibold text-foreground">
              {burned}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">Burned</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-muted-foreground" />
            <span className="text-lg font-semibold text-foreground">
              {goal}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">Goal</span>
        </div>
      </div>
    </div>
  );
};
