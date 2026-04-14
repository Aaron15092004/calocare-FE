import React from 'react';
import { Clock, Flame, ChefHat, Sunrise, Sun, Moon, Apple } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface MealPlanCardProps {
  day: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  title: string;
  calories: number;
  time: string;
  image?: string;
  isToday?: boolean;
}

const mealTypeConfig = {
  breakfast: { label: 'Breakfast', Icon: Sunrise },
  lunch: { label: 'Lunch', Icon: Sun },
  dinner: { label: 'Dinner', Icon: Moon },
  snack: { label: 'Snack', Icon: Apple },
};

export const MealPlanCard: React.FC<MealPlanCardProps> = ({
  day,
  mealType,
  title,
  calories,
  time,
  image,
  isToday = false,
}) => {
  const config = mealTypeConfig[mealType];
  const { Icon } = config;

  return (
    <Card variant="meal" className={`${isToday ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Image or placeholder */}
          <div className="w-20 h-20 rounded-xl bg-accent flex items-center justify-center overflow-hidden flex-shrink-0">
            {image ? (
              <img src={image} alt={title} className="w-full h-full object-cover" />
            ) : (
              <ChefHat className="w-8 h-8 text-primary" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
              {isToday && (
                <span className="text-xs font-semibold text-primary bg-accent px-2 py-0.5 rounded-full">
                  Today
                </span>
              )}
            </div>
            <h4 className="font-semibold text-foreground truncate">{title}</h4>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Flame className="w-3.5 h-3.5 text-calories" />
                <span>{calories} kcal</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>{time}</span>
              </div>
            </div>
          </div>

          {/* Day badge */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-xs text-muted-foreground">Day</span>
            <span className="text-xl font-bold text-primary">{day}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
