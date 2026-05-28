import React from 'react';
import { Clock, Flame, ChefHat, Sunrise, Sun, Moon, Apple, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface MealPlanCardProps {
  day: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  title: string;
  calories: number;
  time: string;
  image?: string;
  isToday?: boolean;
  onClick?: () => void;
}

const mealTypeConfig = {
  breakfast: { label: 'Sáng', Icon: Sunrise },
  lunch:     { label: 'Trưa', Icon: Sun },
  dinner:    { label: 'Tối',  Icon: Moon },
  snack:     { label: 'Phụ', Icon: Apple },
};

export const MealPlanCard: React.FC<MealPlanCardProps> = ({
  day,
  mealType,
  title,
  calories,
  time,
  image,
  isToday = false,
  onClick,
}) => {
  const config = mealTypeConfig[mealType] ?? mealTypeConfig.snack;
  const { Icon } = config;

  return (
    <Card
      variant="meal"
      className={`${isToday ? 'ring-2 ring-primary ring-offset-2' : ''} ${onClick ? 'cursor-pointer hover:shadow-md active:scale-[0.99] transition-all duration-150' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Image or placeholder */}
          <div className="w-16 h-16 rounded-xl bg-accent flex items-center justify-center overflow-hidden flex-shrink-0">
            {image ? (
              <img src={image} alt={title} className="w-full h-full object-cover" />
            ) : (
              <ChefHat className="w-7 h-7 text-primary" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
              {isToday && (
                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                  Hôm nay
                </span>
              )}
            </div>
            <h4 className="font-semibold text-foreground text-sm truncate">{title}</h4>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span className="font-medium text-foreground">{calories}</span>
                <span>kcal</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>{time}</span>
              </div>
            </div>
          </div>

          {/* Day badge + arrow */}
          <div className="flex flex-col items-center justify-center gap-1">
            <span className="text-[10px] text-muted-foreground">Ngày</span>
            <span className="text-xl font-bold text-primary leading-none">{day}</span>
            {onClick && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
