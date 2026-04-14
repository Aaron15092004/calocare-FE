import React, { useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FoodDiaryEntry } from "@/hooks/useFoodDiary";

interface MonthlyCalorieCalendarProps {
  entries: FoodDiaryEntry[];
  calorieGoal: number;
  onDateSelect?: (date: Date) => void;
}

export const MonthlyCalorieCalendar: React.FC<MonthlyCalorieCalendarProps> = ({
  entries,
  calorieGoal,
  onDateSelect,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Calculate daily calorie totals for the current month view
  const dailyCalories = useMemo(() => {
    const map = new Map<string, number>();

    entries.forEach((entry) => {
      const dateKey = format(parseISO(entry.scanned_at), "yyyy-MM-dd");
      const current = map.get(dateKey) || 0;
      map.set(dateKey, current + (entry.totals.calories || 0));
    });

    return map;
  }, [entries]);

  // Get all days to display (including padding days from prev/next month)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const getCaloriesForDay = (date: Date): number | null => {
    const dateKey = format(date, "yyyy-MM-dd");
    const calories = dailyCalories.get(dateKey);
    return calories !== undefined ? calories : null;
  };

  const getCellColor = (date: Date, calories: number | null) => {
    if (!isSameMonth(date, currentMonth)) {
      return "bg-muted/30 text-muted-foreground/50";
    }

    if (calories === null || calories === 0) {
      return "bg-muted/50 text-muted-foreground";
    }

    const ratio = calories / calorieGoal;

    if (ratio <= 0.8) {
      // Under 80% - light primary
      return "bg-primary/20 text-foreground";
    } else if (ratio <= 1.0) {
      // 80-100% - on target
      return "bg-primary/40 text-foreground ring-2 ring-primary/30";
    } else if (ratio <= 1.15) {
      // 100-115% - slightly over
      return "bg-orange-500/30 text-foreground";
    } else {
      // Over 115% - significantly over
      return "bg-destructive/30 text-foreground";
    }
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-3">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="font-semibold text-foreground">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          disabled={isSameMonth(currentMonth, new Date())}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const calories = getCaloriesForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isTodayDate = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => isCurrentMonth && onDateSelect?.(day)}
              disabled={!isCurrentMonth}
              className={cn(
                "relative aspect-square rounded-lg p-1 flex flex-col items-center justify-center transition-all",
                getCellColor(day, calories),
                isCurrentMonth &&
                  "hover:ring-2 hover:ring-primary/50 cursor-pointer",
                isTodayDate && "ring-2 ring-primary",
              )}
            >
              <span
                className={cn(
                  "text-xs font-medium",
                  !isCurrentMonth && "opacity-40",
                )}
              >
                {format(day, "d")}
              </span>
              {calories !== null && calories > 0 && isCurrentMonth && (
                <span className="text-[9px] font-medium truncate w-full text-center">
                  {calories >= 1000
                    ? `${(calories / 1000).toFixed(1)}k`
                    : calories}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary/20" />
          <span className="text-muted-foreground">&lt;80%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary/40 ring-1 ring-primary/30" />
          <span className="text-muted-foreground">On goal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-orange-500/30" />
          <span className="text-muted-foreground">Slightly over</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-destructive/30" />
          <span className="text-muted-foreground">&gt;115%</span>
        </div>
      </div>
    </div>
  );
};
