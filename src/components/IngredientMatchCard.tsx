import { useState } from "react";
import { ChevronDown, AlertCircle } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { IngredientAnalysis } from "@/hooks/useFoodAnalysis";

const NutrientBadge: React.FC<{
  label: string;
  value: number;
  unit?: string;
}> = ({ label, value, unit = "mg" }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-xs">
    <span className="font-medium">{label}:</span>
    <span className="text-muted-foreground">
      {value}
      {unit}
    </span>
  </span>
);

interface IngredientMatchCardProps {
  ingredient: IngredientAnalysis;
  onSelect: (selectedMatchId: string | null) => void;
}

const IngredientMatchCard: React.FC<IngredientMatchCardProps> = ({
  ingredient,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasMatches = ingredient.db_matches && ingredient.db_matches.length > 0;

  return (
    <div className="border border-border rounded-xl p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1">
          <p className="font-medium text-foreground">{ingredient.name_vi}</p>
          <p className="text-xs text-muted-foreground">
            {ingredient.weight_grams}g
          </p>
        </div>
        <Badge variant={ingredient.confidence >= 80 ? "default" : "secondary"}>
          {ingredient.confidence}% confident
        </Badge>
      </div>

      {hasMatches ? (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between"
            >
              <span className="text-xs">
                {ingredient.selected_match
                  ? "Match selected"
                  : `${ingredient.db_matches.length} matches found`}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            <RadioGroup
              value={ingredient.selected_match || "ai_estimate"}
              onValueChange={(value) =>
                onSelect(value === "ai_estimate" ? null : value)
              }
            >
              {ingredient.db_matches.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-accent/50"
                >
                  <RadioGroupItem value={match.id} id={`match-${match.id}`} />
                  <Label
                    htmlFor={`match-${match.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{match.name_vi}</p>
                          <p className="text-xs text-muted-foreground">
                            {Math.round(
                              (match.energy_kcal * ingredient.weight_grams) /
                                100,
                            )}{" "}
                            kcal
                            {" • "}
                            P:{" "}
                            {Math.round(
                              (match.protein * ingredient.weight_grams) / 100,
                            )}
                            g{" • "}
                            C:{" "}
                            {Math.round(
                              (match.glucid * ingredient.weight_grams) / 100,
                            )}
                            g{" • "}
                            F:{" "}
                            {Math.round(
                              (match.lipid * ingredient.weight_grams) / 100,
                            )}
                            g
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {match.confidence}
                        </Badge>
                      </div>

                      {/* ← Hiển thị vitamins/minerals nếu có */}
                      {(Object.keys(match.vitamins || {}).length > 0 ||
                        Object.keys(match.minerals || {}).length > 0) && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {/* Vitamins */}
                          {match.vitamins?.c && (
                            <NutrientBadge
                              label="Vit C"
                              value={match.vitamins.c}
                            />
                          )}
                          {match.vitamins?.b1 && (
                            <NutrientBadge
                              label="B1"
                              value={match.vitamins.b1}
                            />
                          )}
                          {match.vitamins?.a && (
                            <NutrientBadge
                              label="Vit A"
                              value={match.vitamins.a}
                              unit="μg"
                            />
                          )}

                          {/* Minerals */}
                          {match.minerals?.calcium && (
                            <NutrientBadge
                              label="Ca"
                              value={match.minerals.calcium}
                            />
                          )}
                          {match.minerals?.iron && (
                            <NutrientBadge
                              label="Fe"
                              value={match.minerals.iron}
                            />
                          )}
                          {match.minerals?.zinc && (
                            <NutrientBadge
                              label="Zn"
                              value={match.minerals.zinc}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </Label>
                </div>
              ))}

              {/* AI Estimate option */}
              <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-accent/50 border-t border-border/50 mt-2 pt-2">
                <RadioGroupItem
                  value="ai_estimate"
                  id={`ai-estimate-${ingredient.name_vi}`}
                />
                <Label
                  htmlFor={`ai-estimate-${ingredient.name_vi}`}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Use AI Estimate</p>
                      <p className="text-xs text-muted-foreground">
                        {ingredient.nutrition_estimate.calories} kcal
                        (estimated)
                      </p>
                    </div>
                    <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
          <AlertCircle className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            No DB match - using AI estimate (
            {ingredient.nutrition_estimate.calories} kcal)
          </p>
        </div>
      )}
    </div>
  );
};

export default IngredientMatchCard;
