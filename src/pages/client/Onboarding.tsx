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
  Leaf,
  Clock,
} from "lucide-react";

const DIET_TYPES = [
  { value: "omnivore",    label: "Ăn tạp", desc: "Ăn mọi thứ" },
  { value: "vegetarian",  label: "Ăn chay (có trứng/sữa)", desc: "Không thịt, có trứng & sữa" },
  { value: "vegan",       label: "Thuần chay", desc: "Không sản phẩm động vật" },
  { value: "pescatarian", label: "Pescatarian", desc: "Không thịt, ăn cá" },
  { value: "halal",       label: "Halal", desc: "Theo tiêu chuẩn Halal" },
];

const ALLERGY_OPTIONS = [
  "Sữa",
  "Gluten",
  "Trứng",
  "Hải sản",
  "Đậu phộng",
  "Đậu nành",
  "Hạt cây",
  "Mè",
];

function calcMealSchedule(wakeTime: string, sleepTime: string): Record<string, string> {
  const toMins = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const toStr = (mins: number) => {
    const h = Math.floor(((mins % 1440) + 1440) % 1440 / 60);
    const m = ((mins % 1440) + 1440) % 1440 % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };
  const wake  = toMins(wakeTime  || "06:30");
  const sleep = toMins(sleepTime || "23:00");
  return {
    breakfast: toStr(wake + 60),
    lunch:     toStr(Math.max(12 * 60, wake + 270)),
    snack:     toStr(Math.round((Math.max(12 * 60, wake + 270) + Math.max(17 * 60, sleep - 210)) / 2)),
    dinner:    toStr(Math.max(17 * 60, sleep - 210)),
  };
}

const MEAL_LABEL_VI: Record<string, string> = {
  breakfast: "Bữa sáng",
  lunch:     "Bữa trưa",
  snack:     "Bữa phụ",
  dinner:    "Bữa tối",
};

const MEAL_TIP: Record<string, string> = {
  breakfast: "60 phút sau khi thức dậy — khởi động trao đổi chất",
  lunch:     "Cách bữa sáng 4–5 tiếng — duy trì năng lượng",
  snack:     "Giữa trưa và tối — tránh ăn quá nhiều vào bữa tối",
  dinner:    "Trước khi ngủ ít nhất 3 tiếng — hỗ trợ tiêu hóa",
};

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
    dietary_preference: "omnivore",
    allergies: [] as string[],
    wake_time: "06:30",
    sleep_time: "23:00",
  });

  const totalSteps = 6;
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

      const goalMap: Record<string, string> = { lose: "weight_loss", gain: "muscle_gain", maintain: "maintenance" };
      const mealSchedule = calcMealSchedule(formData.wake_time, formData.sleep_time);
      await updateProfile({
        display_name: formData.display_name,
        preferences: {
          age: Number(formData.age),
          gender: formData.gender,
          height_cm: Number(formData.height_cm),
          weight_kg: Number(formData.weight_kg),
          activity_level: formData.activity_level,
          goal: goalMap[formData.goal] ?? "maintenance",
          dietary_preference: formData.dietary_preference,
          allergies: formData.allergies,
          meal_schedule: mealSchedule,
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
      case 0: return t("onboarding.language.description");
      case 1: return t("onboarding.basicInfo.description");
      case 2: return t("onboarding.physicalStats.description");
      case 3: return t("onboarding.goals.description");
      case 4: return "Cho chúng tôi biết chế độ ăn và dị ứng thực phẩm để cá nhân hóa gợi ý";
      case 5: return "Thiết lập giờ ăn khoa học dựa theo nhịp sinh học của bạn";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen gradient-fresh flex items-center justify-center px-5 py-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="page-title">
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

          {/* Step 4: Dietary Preferences */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-slide-up">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Leaf className="w-5 h-5" />
                <h3 className="font-semibold">Chế độ ăn & Dị ứng</h3>
              </div>

              <div className="space-y-2">
                <Label>Phong cách ăn uống</Label>
                <div className="grid grid-cols-1 gap-2">
                  {DIET_TYPES.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, dietary_preference: d.value })}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                        formData.dietary_preference === d.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                        formData.dietary_preference === d.value ? "border-primary bg-primary" : "border-muted-foreground"
                      }`} />
                      <div>
                        <p className="text-sm font-medium">{d.label}</p>
                        <p className="text-xs text-muted-foreground">{d.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dị ứng thực phẩm (chọn tất cả phù hợp)</Label>
                <div className="flex flex-wrap gap-2">
                  {ALLERGY_OPTIONS.map((a) => {
                    const active = formData.allergies.includes(a);
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          allergies: active
                            ? formData.allergies.filter((x) => x !== a)
                            : [...formData.allergies, a],
                        })}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          active
                            ? "border-destructive bg-destructive/10 text-destructive"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {active ? "✕ " : ""}{a}
                      </button>
                    );
                  })}
                </div>
                {formData.allergies.length === 0 && (
                  <p className="text-xs text-muted-foreground">Không có dị ứng — để trống</p>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Meal Timing (MP-05) */}
          {currentStep === 5 && (() => {
            const schedule = calcMealSchedule(formData.wake_time, formData.sleep_time);
            return (
              <div className="space-y-4 animate-slide-up">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <Clock className="w-5 h-5" />
                  <h3 className="font-semibold">Lịch ăn khoa học</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="wake_time">Giờ thức dậy</Label>
                    <input
                      id="wake_time"
                      type="time"
                      title="Giờ thức dậy"
                      value={formData.wake_time}
                      onChange={(e) => setFormData({ ...formData, wake_time: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sleep_time">Giờ đi ngủ</Label>
                    <input
                      id="sleep_time"
                      type="time"
                      title="Giờ đi ngủ"
                      value={formData.sleep_time}
                      onChange={(e) => setFormData({ ...formData, sleep_time: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lịch đề xuất</p>
                  {(["breakfast", "lunch", "snack", "dinner"] as const).map((k) => (
                    <div key={k} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50 border border-border">
                      <div>
                        <p className="text-sm font-medium">{MEAL_LABEL_VI[k]}</p>
                        <p className="text-[11px] text-muted-foreground">{MEAL_TIP[k]}</p>
                      </div>
                      <span className="text-base font-bold text-primary tabular-nums">{schedule[k]}</span>
                    </div>
                  ))}
                </div>

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        Lịch ăn được tính toán theo nhịp sinh học. Bạn có thể thay đổi sau trong Cài đặt.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

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
