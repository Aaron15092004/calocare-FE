// src/pages/client/Onboarding.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/contexts/AuthContext";
import { calculateNutritionGoals } from "@/utils/nutritionCalculator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Scale,
  Target,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Languages,
} from "lucide-react";

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { updateProfile } = useAuthContext();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0); // ← Bắt đầu từ 0
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    display_name: "",
    age: "",
    gender: "",
    height_cm: "",
    weight_kg: "",
    activity_level: "moderate",
    goal: "maintain",
  });

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    // Step 0: Language - no validation needed
    if (currentStep === 0) {
      setCurrentStep(1);
      return;
    }

    // Step 1: Basic Info
    if (currentStep === 1) {
      if (!formData.display_name || !formData.age || !formData.gender) {
        toast({
          title: t("onboarding.validation.missingInfo"),
          description: t("onboarding.validation.fillAllFields"),
          variant: "destructive",
        });
        return;
      }
      if (Number(formData.age) < 18 || Number(formData.age) > 100) {
        toast({
          title: t("onboarding.validation.invalidAge"),
          description: t("onboarding.validation.ageBetween"),
          variant: "destructive",
        });
        return;
      }
    }

    // Step 2: Physical Stats
    if (currentStep === 2) {
      if (!formData.height_cm || !formData.weight_kg) {
        toast({
          title: t("onboarding.validation.missingInfo"),
          description: t("onboarding.validation.fillAllFields"),
          variant: "destructive",
        });
        return;
      }
      if (
        Number(formData.height_cm) < 100 ||
        Number(formData.height_cm) > 250
      ) {
        toast({
          title: t("onboarding.validation.invalidHeight"),
          description: t("onboarding.validation.heightBetween"),
          variant: "destructive",
        });
        return;
      }
      if (Number(formData.weight_kg) < 30 || Number(formData.weight_kg) > 300) {
        toast({
          title: t("onboarding.validation.invalidWeight"),
          description: t("onboarding.validation.weightBetween"),
          variant: "destructive",
        });
        return;
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);

    try {
      const goals = calculateNutritionGoals({
        age: Number(formData.age),
        gender: formData.gender as "male" | "female" | "other",
        weight_kg: Number(formData.weight_kg),
        height_cm: Number(formData.height_cm),
        activity_level: formData.activity_level as any,
        goal: formData.goal as "lose" | "maintain" | "gain",
      });

      await updateProfile({
        display_name: formData.display_name,
        preferences: {
          age: Number(formData.age),
          gender: formData.gender,
          height_cm: Number(formData.height_cm),
          weight_kg: Number(formData.weight_kg),
          activity_level: formData.activity_level,
        },
        daily_nutrition_goals: goals,
      });

      toast({
        title: t("onboarding.success.title"),
        description: t("onboarding.success.description"),
      });

      navigate("/");
    } catch (error) {
      toast({
        title: t("onboarding.error.title"),
        description: t("onboarding.error.description"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 0:
        return t("onboarding.language.description");
      case 1:
        return t("onboarding.basicInfo.description");
      case 2:
        return t("onboarding.physicalStats.description");
      case 3:
        return t("onboarding.goals.description");
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen gradient-fresh flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-2xl">
              {t("onboarding.welcome")}
            </CardTitle>
            {currentStep > 0 && (
              <span className="text-sm text-muted-foreground">
                {t("onboarding.step")} {currentStep}/{totalSteps}
              </span>
            )}
          </div>
          <Progress value={progress} className="mb-2" />
          <CardDescription>{getStepDescription()}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 0: Language Selection */}
          {currentStep === 0 && (
            <div className="space-y-4 animate-slide-up">
              <div className="flex items-center gap-2 text-primary mb-4">
                <Languages className="w-5 h-5" />
                <h3 className="font-semibold">
                  {t("onboarding.language.title")}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={i18n.language === "vi" ? "default" : "outline"}
                  size="lg"
                  className="h-24 flex-col gap-2"
                  onClick={() => i18n.changeLanguage("vi")}
                >
                  <span className="text-2xl font-bold">VN</span>
                  <span className="text-sm font-medium">
                    {t("onboarding.language.vietnamese")}
                  </span>
                </Button>
                <Button
                  variant={i18n.language === "en" ? "default" : "outline"}
                  size="lg"
                  className="h-24 flex-col gap-2"
                  onClick={() => i18n.changeLanguage("en")}
                >
                  <span className="text-2xl font-bold">EN</span>
                  <span className="text-sm font-medium">
                    {t("onboarding.language.english")}
                  </span>
                </Button>
              </div>
            </div>
          )}

          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-slide-up">
              <div className="flex items-center gap-2 text-primary mb-4">
                <User className="w-5 h-5" />
                <h3 className="font-semibold">
                  {t("onboarding.basicInfo.title")}
                </h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="display_name">
                  {t("onboarding.basicInfo.name")}
                </Label>
                <Input
                  id="display_name"
                  placeholder={t("onboarding.basicInfo.namePlaceholder")}
                  value={formData.display_name}
                  onChange={(e) =>
                    setFormData({ ...formData, display_name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">{t("onboarding.basicInfo.age")}</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder={t("onboarding.basicInfo.agePlaceholder")}
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({ ...formData, age: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>{t("onboarding.basicInfo.gender")}</Label>
                <RadioGroup
                  value={formData.gender}
                  onValueChange={(value) =>
                    setFormData({ ...formData, gender: value })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male" className="cursor-pointer">
                      {t("onboarding.basicInfo.male")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female" className="cursor-pointer">
                      {t("onboarding.basicInfo.female")}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Step 2: Physical Stats */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-slide-up">
              <div className="flex items-center gap-2 text-primary mb-4">
                <Scale className="w-5 h-5" />
                <h3 className="font-semibold">
                  {t("onboarding.physicalStats.title")}
                </h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="height">
                  {t("onboarding.physicalStats.height")}
                </Label>
                <Input
                  id="height"
                  type="number"
                  placeholder={t("onboarding.physicalStats.heightPlaceholder")}
                  value={formData.height_cm}
                  onChange={(e) =>
                    setFormData({ ...formData, height_cm: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">
                  {t("onboarding.physicalStats.weight")}
                </Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder={t("onboarding.physicalStats.weightPlaceholder")}
                  value={formData.weight_kg}
                  onChange={(e) =>
                    setFormData({ ...formData, weight_kg: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="activity">
                  {t("onboarding.physicalStats.activity")}
                </Label>
                <Select
                  value={formData.activity_level}
                  onValueChange={(value) =>
                    setFormData({ ...formData, activity_level: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">
                      {t("onboarding.physicalStats.sedentary")}
                    </SelectItem>
                    <SelectItem value="light">
                      {t("onboarding.physicalStats.light")}
                    </SelectItem>
                    <SelectItem value="moderate">
                      {t("onboarding.physicalStats.moderate")}
                    </SelectItem>
                    <SelectItem value="active">
                      {t("onboarding.physicalStats.active")}
                    </SelectItem>
                    <SelectItem value="very_active">
                      {t("onboarding.physicalStats.veryActive")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3: Goals */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-slide-up">
              <div className="flex items-center gap-2 text-primary mb-4">
                <Target className="w-5 h-5" />
                <h3 className="font-semibold">{t("onboarding.goals.title")}</h3>
              </div>

              <div className="space-y-2">
                <RadioGroup
                  value={formData.goal}
                  onValueChange={(value) =>
                    setFormData({ ...formData, goal: value })
                  }
                >
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="lose" id="lose" />
                    <Label htmlFor="lose" className="cursor-pointer flex-1">
                      <div>
                        <p className="font-medium">
                          {t("onboarding.goals.lose")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("onboarding.goals.loseDesc")}
                        </p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="maintain" id="maintain" />
                    <Label htmlFor="maintain" className="cursor-pointer flex-1">
                      <div>
                        <p className="font-medium">
                          {t("onboarding.goals.maintain")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("onboarding.goals.maintainDesc")}
                        </p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="gain" id="gain" />
                    <Label htmlFor="gain" className="cursor-pointer flex-1">
                      <div>
                        <p className="font-medium">
                          {t("onboarding.goals.gain")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("onboarding.goals.gainDesc")}
                        </p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-foreground mb-1">
                        {t("onboarding.goals.calculateInfo")}
                      </p>
                      <p className="text-muted-foreground">
                        {t("onboarding.goals.calculateDesc")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-4">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("onboarding.buttons.back")}
              </Button>
            )}

            {currentStep < totalSteps ? (
              <Button onClick={handleNext} className="flex-1">
                {t("onboarding.buttons.next")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("onboarding.buttons.completing")}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {t("onboarding.buttons.complete")}
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
