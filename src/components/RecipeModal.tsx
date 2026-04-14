import React from "react";
import { Flame, Users, Sunrise, Sun, Moon, Apple, Utensils } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MealPlanItemAPI, getItemDisplayName, getItemCalories } from "@/types/mealPlan";

interface RecipeModalProps {
    item: MealPlanItemAPI | null;
    isOpen: boolean;
    onClose: () => void;
}

const mealTypeIcon: Record<string, React.ReactNode> = {
    breakfast: <Sunrise className="w-5 h-5 text-primary" />,
    lunch:     <Sun className="w-5 h-5 text-primary" />,
    dinner:    <Moon className="w-5 h-5 text-primary" />,
    snack:     <Apple className="w-5 h-5 text-primary" />,
};

export const RecipeModal: React.FC<RecipeModalProps> = ({ item, isOpen, onClose }) => {
    if (!item) return null;

    const name = getItemDisplayName(item);
    const calories = getItemCalories(item);
    const imageUrl = item.recipe_id?.image_url;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
                <ScrollArea className="max-h-[90vh]">
                    <div className="p-6">
                        <DialogHeader className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                {mealTypeIcon[item.meal_type] ?? <Utensils className="w-5 h-5 text-primary" />}
                                <Badge variant="secondary" className="capitalize">
                                    {item.meal_type}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                    Day {item.day_number}
                                </Badge>
                            </div>
                            <DialogTitle className="text-2xl font-bold text-foreground">
                                {name}
                            </DialogTitle>
                        </DialogHeader>

                        {imageUrl && (
                            <img
                                src={imageUrl}
                                alt={name}
                                className="w-full h-40 object-cover rounded-xl mb-4"
                            />
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col items-center p-4 bg-calories/10 rounded-xl">
                                <Flame className="w-6 h-6 text-calories mb-1" />
                                <span className="text-xs text-muted-foreground">Calories</span>
                                <span className="text-xl font-bold text-calories">{calories}</span>
                            </div>
                            {item.serving_size != null && (
                                <div className="flex flex-col items-center p-4 bg-accent rounded-xl">
                                    <Users className="w-6 h-6 text-primary mb-1" />
                                    <span className="text-xs text-muted-foreground">Serving</span>
                                    <span className="text-xl font-bold text-foreground">
                                        {item.serving_size}
                                    </span>
                                </div>
                            )}
                        </div>

                        {item.recipe_id && (
                            <p className="mt-4 text-sm text-muted-foreground">
                                {item.recipe_id.name_en && item.recipe_id.name_en !== item.recipe_id.name_vi
                                    ? `Also known as: ${item.recipe_id.name_en}`
                                    : null}
                            </p>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};
