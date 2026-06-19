// src/pages/client/Onboarding.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  calculateBMI,
  calculateIdealWeightRange,
  calculateNutritionGoals,
} from "@/utils/nutritionCalculator";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { CaloVieGuideMascot } from "@/components/brand/CaloVieMascot";
import {
  Activity,
  Apple,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Beef,
  BookOpenCheck,
  Brain,
  Calendar,
  Camera,
  Check,
  ChevronRight,
  CircleAlert,
  Dumbbell,
  Flame,
  HeartPulse,
  Loader2,
  Salad,
  Scale,
  Sparkles,
  Target,
  Trophy,
  Utensils,
  Zap,
} from "lucide-react";

type Gender = "male" | "female" | "other";
type Goal = "lose" | "maintain" | "gain";
type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

type FormData = {
  birthYear: number;
  gender: Gender | "";
  height_cm: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  goal: Goal;
  dietary_preference: string;
  motivation: string;
  obstacle: string;
  tracking_habit: string;
  nutrition_awareness: string;
};

type Choice = {
  value: string;
  title: string;
  desc?: string;
  icon: React.ElementType;
  tone?: string;
};

const CURRENT_YEAR = new Date().getFullYear();
const TOTAL_STEPS = 17;

const GOAL_CHOICES: Choice[] = [
  { value: "lose", title: "Giảm cân", desc: "Tạo thâm hụt calo vừa phải", icon: Scale },
  { value: "maintain", title: "Giữ cân", desc: "Ổn định năng lượng mỗi ngày", icon: Target },
  { value: "gain", title: "Tăng cơ", desc: "Ưu tiên protein và luyện tập", icon: Dumbbell },
];

const GENDER_CHOICES: Choice[] = [
  { value: "male", title: "Nam", icon: Activity },
  { value: "female", title: "Nữ", icon: HeartPulse },
  { value: "other", title: "Khác", icon: Sparkles },
];

const MOTIVATION_CHOICES: Choice[] = [
  { value: "look", title: "Tôi muốn tự tin hơn", icon: Sparkles },
  { value: "feel", title: "Tôi muốn thấy khỏe hơn", icon: HeartPulse },
  { value: "health", title: "Tôi muốn cải thiện sức khỏe", icon: BarChart3 },
];

const OBSTACLE_CHOICES: Choice[] = [
  { value: "habits", title: "Thói quen thất thường", icon: Calendar },
  { value: "stress", title: "Ăn theo cảm xúc", icon: Brain },
  { value: "support", title: "Thiếu người hỗ trợ", icon: HeartPulse },
  { value: "busy", title: "Lịch quá bận", icon: Zap },
  { value: "knowledge", title: "Thiếu kiến thức dinh dưỡng", icon: BookOpenCheck },
  { value: "other", title: "Khác", icon: CircleAlert },
];

const ACTIVITY_CHOICES: Choice[] = [
  { value: "sedentary", title: "Ít vận động", desc: "Phần lớn thời gian ngồi", icon: Activity },
  { value: "light", title: "Hoạt động nhẹ", desc: "Đi lại nhẹ trong ngày", icon: Activity },
  { value: "moderate", title: "Vận động vừa", desc: "Có tập luyện hoặc di chuyển đều", icon: Activity },
  { value: "active", title: "Năng động", desc: "Tập luyện nhiều ngày trong tuần", icon: Activity },
  { value: "very_active", title: "Rất năng động", desc: "Cường độ cao hoặc lao động nặng", icon: Activity },
];

const DIET_CHOICES: Choice[] = [
  { value: "omnivore", title: "Cân bằng", icon: Utensils },
  { value: "high_protein", title: "Giàu protein", icon: Beef },
  { value: "mediterranean", title: "Mediterranean", icon: Salad },
  { value: "high_fiber", title: "Nhiều chất xơ", icon: Apple },
  { value: "low_carb", title: "Ít carb", icon: Flame },
];

const TRACKING_CHOICES: Choice[] = [
  { value: "every_meal", title: "Tôi ghi lại mỗi bữa", icon: Utensils },
  { value: "sometimes", title: "Khi nào nhớ thì ghi", icon: Sparkles },
  { value: "rarely", title: "Gần như không ghi", icon: CircleAlert },
];

const NUTRITION_CHOICES: Choice[] = [
  { value: "know", title: "Tôi biết khá rõ", icon: BadgeCheck },
  { value: "check", title: "Tôi thỉnh thoảng xem nhãn", icon: BookOpenCheck },
  { value: "not_really", title: "Không rõ lắm", icon: CircleAlert },
];

function calcMealSchedule(): Record<string, string> {
  return {
    breakfast: "07:30",
    lunch: "12:00",
    snack: "15:30",
    dinner: "19:00",
  };
}

function goalToPreference(goal: Goal) {
  const map: Record<Goal, string> = {
    lose: "weight_loss",
    gain: "muscle_gain",
    maintain: "maintenance",
  };
  return map[goal];
}

function getBmiStatus(bmi: number) {
  if (bmi < 18.5) return { label: "Hơi gầy", className: "text-blue-500 bg-blue-50" };
  if (bmi < 25) return { label: "Cân đối", className: "text-emerald-600 bg-emerald-50" };
  if (bmi < 30) return { label: "Hơi cao", className: "text-amber-600 bg-amber-50" };
  return { label: "Cần chú ý", className: "text-rose-600 bg-rose-50" };
}

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { profile, updateProfile } = useAuthContext();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupProgress, setSetupProgress] = useState(18);

  const [formData, setFormData] = useState<FormData>({
    birthYear: 1998,
    gender: "",
    height_cm: 166,
    weight_kg: 68,
    activity_level: "moderate",
    goal: "maintain",
    dietary_preference: "omnivore",
    motivation: "",
    obstacle: "",
    tracking_habit: "",
    nutrition_awareness: "",
  });

  const age = Math.max(18, CURRENT_YEAR - formData.birthYear);
  const bmi = useMemo(
    () => calculateBMI(formData.weight_kg, formData.height_cm),
    [formData.height_cm, formData.weight_kg],
  );
  const bmiStatus = getBmiStatus(bmi);
  const idealWeight = useMemo(
    () => calculateIdealWeightRange(formData.height_cm),
    [formData.height_cm],
  );
  const goals = useMemo(
    () =>
      calculateNutritionGoals({
        age,
        gender: formData.gender || "other",
        weight_kg: formData.weight_kg,
        height_cm: formData.height_cm,
        activity_level: formData.activity_level,
        goal: formData.goal,
      }),
    [age, formData],
  );

  const targetWeight = useMemo(() => {
    if (formData.goal === "gain") return Math.max(formData.weight_kg + 4, idealWeight.minWeight);
    if (formData.goal === "maintain") return formData.weight_kg;
    return Math.min(formData.weight_kg - 5, idealWeight.maxWeight);
  }, [formData.goal, formData.weight_kg, idealWeight.maxWeight, idealWeight.minWeight]);

  const progress = Math.min(100, Math.round((step / TOTAL_STEPS) * 100));

  useEffect(() => {
    if (step !== 16) return;

    setSetupProgress(18);
    const values = [36, 58, 76, 91, 100];
    const timers = values.map((value, index) =>
      window.setTimeout(() => setSetupProgress(value), 420 * (index + 1)),
    );
    const doneTimer = window.setTimeout(() => setStep(17), 2450);

    return () => {
      timers.forEach(window.clearTimeout);
      window.clearTimeout(doneTimer);
    };
  }, [step]);

  const goNext = () => setStep((value) => Math.min(TOTAL_STEPS, value + 1));
  const goBack = () => setStep((value) => Math.max(0, value - 1));

  const selectAndNext = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((current) => ({ ...current, [key]: value }));
    window.setTimeout(() => {
      setStep((current) => Math.min(TOTAL_STEPS, current + 1));
    }, 180);
  };

  const handleComplete = async () => {
    if (!formData.gender) {
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile({
        display_name: profile?.display_name || profile?.email?.split("@")[0] || "CaloVie User",
        preferences: {
          age,
          gender: formData.gender,
          height_cm: formData.height_cm,
          weight_kg: formData.weight_kg,
          activity_level: formData.activity_level,
          goal: goalToPreference(formData.goal),
          dietary_preference: formData.dietary_preference,
          allergies: [],
          meal_schedule: calcMealSchedule(),
          onboarding_completed: true,
        },
        daily_nutrition_goals: goals,
      });

      toast({
        title: "Kế hoạch đã sẵn sàng",
        description: "CaloVie đã cá nhân hóa mục tiêu dinh dưỡng cho bạn.",
      });
      localStorage.setItem("calovie_tour_pending", String(Date.now()));
      navigate("/", { state: { startTour: true } });
    } catch {
      toast({
        title: "Không thể hoàn tất onboarding",
        description: "Vui lòng thử lại sau vài giây.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8f7] text-[#202621]">
      <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        {step > 0 && step < 17 && (
          <header className="flex h-14 shrink-0 items-center gap-4 px-5">
            <button
              type="button"
              onClick={goBack}
              className="grid h-9 w-9 place-items-center rounded-full text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
              aria-label="Quay lại"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Progress value={progress} className="h-1.5 flex-1 bg-slate-100" />
            <span className="w-9 text-right text-xs font-semibold text-slate-400">{progress}%</span>
          </header>
        )}

        <section className="flex flex-1 flex-col overflow-hidden">
          {step === 0 && <IntroScreen onNext={goNext} />}

          {step === 1 && (
            <QuestionScreen title="Mục tiêu chính của bạn là gì?" subtitle="CaloVie sẽ dùng mục tiêu này để tính calo và gợi ý thói quen phù hợp.">
              <ChoiceList
                choices={GOAL_CHOICES}
                selected={formData.goal}
                onSelect={(value) => selectAndNext("goal", value as Goal)}
              />
            </QuestionScreen>
          )}

          {step === 2 && (
            <QuestionScreen title="Bạn muốn CaloVie tính theo giới tính nào?" subtitle="Thông tin này giúp ước tính nhu cầu năng lượng chính xác hơn.">
              <ChoiceList
                choices={GENDER_CHOICES}
                selected={formData.gender}
                onSelect={(value) => selectAndNext("gender", value as Gender)}
              />
            </QuestionScreen>
          )}

          {step === 3 && (
            <BirthYearScreen
              value={formData.birthYear}
              onChange={(value) => setFormData({ ...formData, birthYear: value })}
              onNext={goNext}
            />
          )}

          {step === 4 && (
            <HeightScreen
              value={formData.height_cm}
              onChange={(value) => setFormData({ ...formData, height_cm: value })}
              onNext={goNext}
            />
          )}

          {step === 5 && (
            <WeightScreen
              value={formData.weight_kg}
              bmi={bmi}
              bmiStatus={bmiStatus}
              idealWeight={idealWeight}
              onChange={(value) => setFormData({ ...formData, weight_kg: value })}
              onNext={goNext}
            />
          )}

          {step === 6 && (
            <InsightScreen
              eyebrow="Đã có mục tiêu"
              title="CaloVie sẽ lo phần tính toán còn lại"
              body="Bạn chỉ cần chụp ảnh bữa ăn, theo dõi tiến độ và điều chỉnh nhẹ mỗi ngày."
              visual={<GoalGradientVisual />}
              onNext={goNext}
            />
          )}

          {step === 7 && (
            <QuestionScreen title="Điều gì tạo động lực cho bạn nhất?">
              <ChoiceList
                choices={MOTIVATION_CHOICES}
                selected={formData.motivation}
                onSelect={(value) => selectAndNext("motivation", value)}
              />
            </QuestionScreen>
          )}

          {step === 8 && (
            <QuestionScreen title="Rào cản lớn nhất của bạn là gì?">
              <ChoiceList
                choices={OBSTACLE_CHOICES}
                selected={formData.obstacle}
                onSelect={(value) => selectAndNext("obstacle", value)}
              />
            </QuestionScreen>
          )}

          {step === 9 && (
            <QuestionScreen title="Mức độ vận động của bạn?" subtitle="Chọn gần đúng là đủ, bạn có thể chỉnh lại sau.">
              <ChoiceList
                choices={ACTIVITY_CHOICES}
                selected={formData.activity_level}
                onSelect={(value) => selectAndNext("activity_level", value as ActivityLevel)}
              />
            </QuestionScreen>
          )}

          {step === 10 && (
            <QuestionScreen title="Kiểu ăn nào hợp với bạn nhất?">
              <ChoiceList
                choices={DIET_CHOICES}
                selected={formData.dietary_preference}
                onSelect={(value) => setFormData({ ...formData, dietary_preference: value })}
              />
              <BottomAction label="Tiếp tục" onClick={goNext} />
            </QuestionScreen>
          )}

          {step === 11 && (
            <MacroPreview goals={goals} title="Kế hoạch dinh dưỡng sơ bộ đã sẵn sàng" onNext={goNext} />
          )}

          {step === 12 && (
            <QuestionScreen title="Bạn thường ghi lại những gì mình ăn chứ?">
              <ChoiceList
                choices={TRACKING_CHOICES}
                selected={formData.tracking_habit}
                onSelect={(value) => selectAndNext("tracking_habit", value)}
              />
            </QuestionScreen>
          )}

          {step === 13 && (
            <InsightScreen
              eyebrow="Theo dõi nhẹ hơn"
              title="Một tấm ảnh là đủ để bắt đầu"
              body="AI scan của CaloVie giúp nhận diện món ăn, ước tính calo và macro để bạn không phải nhập thủ công từng nguyên liệu."
              visual={<FoodPhotoScanVisual />}
              onNext={goNext}
            />
          )}

          {step === 14 && (
            <QuestionScreen title="Bạn có thường biết mình đã nạp chất gì không?">
              <ChoiceList
                choices={NUTRITION_CHOICES}
                selected={formData.nutrition_awareness}
                onSelect={(value) => selectAndNext("nutrition_awareness", value)}
              />
            </QuestionScreen>
          )}

          {step === 15 && (
            <InsightScreen
              eyebrow="Phù hợp với người bận rộn"
              title="CaloVie giữ trải nghiệm gọn, nhưng dữ liệu vẫn đủ sâu"
              body="Bạn có nhật ký ăn uống, kế hoạch bữa ăn, báo cáo macro và gợi ý AI trong cùng một nơi."
              visual={<SocialProofVisual />}
              onNext={goNext}
            />
          )}

          {step === 16 && <LoadingScreen progress={setupProgress} />}

          {step === 17 && (
            <FinalScreen
              formData={formData}
              goals={goals}
              bmi={bmi}
              targetWeight={targetWeight}
              isSubmitting={isSubmitting}
              onComplete={handleComplete}
            />
          )}
        </section>
      </main>
    </div>
  );
};

function IntroScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="relative h-[48vh] min-h-[330px] overflow-hidden">
        <img src="/welcome-bg-2.png" alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/10 to-white" />
        <div className="absolute left-5 top-12 flex items-center">
          <img src="/logo.png" alt="CaloVie" className="h-20 w-auto max-w-[230px] object-contain drop-shadow-lg" />
        </div>
        <div className="absolute bottom-6 left-1/2 grid h-20 w-20 -translate-x-1/2 place-items-center rounded-full bg-white/80 shadow-2xl backdrop-blur">
          <Camera className="h-9 w-9 text-primary" />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-7 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-6 text-center">
        <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.22em] text-primary">AI calorie tracker</p>
        <h1 className="text-[2rem] font-extrabold leading-tight tracking-normal text-[#202733]">
          Theo dõi calo dễ hơn, ăn uống thông minh hơn
        </h1>
        <p className="mx-auto mt-4 max-w-xs text-sm font-medium leading-6 text-slate-500">
          Cá nhân hóa mục tiêu, scan món ăn và theo dõi tiến độ chỉ trong vài bước chọn nhanh.
        </p>
        <div className="mt-auto pt-8">
          <Button onClick={onNext} className="h-14 w-full rounded-full bg-[#1b6f84] text-base font-bold shadow-[0_14px_28px_rgba(27,111,132,0.24)] hover:bg-[#155869]">
            Bắt đầu
          </Button>
          <button type="button" className="mt-4 text-xs font-semibold text-slate-400" onClick={() => window.location.assign("/auth")}>
            Đã có tài khoản? <span className="text-primary">Đăng nhập</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="pt-7 text-center">
        <h1 className="mx-auto max-w-sm text-[1.72rem] font-extrabold leading-tight tracking-normal text-[#242833]">{title}</h1>
        {subtitle && <p className="mx-auto mt-3 max-w-xs text-sm font-semibold leading-6 text-slate-400">{subtitle}</p>}
      </div>
      <div className="mt-auto pb-6 pt-8">{children}</div>
    </div>
  );
}

function ChoiceList({
  choices,
  selected,
  onSelect,
}: {
  choices: Choice[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      {choices.map((choice) => {
        const active = selected === choice.value;
        const Icon = choice.icon;
        return (
          <button
            key={choice.value}
            type="button"
            onClick={() => onSelect(choice.value)}
            className={`flex min-h-[4.5rem] w-full items-center gap-4 rounded-2xl border px-4 text-left transition-all ${
              active
                ? "border-primary bg-primary/10 shadow-[0_10px_24px_rgba(34,197,94,0.12)]"
                : "border-slate-100 bg-[#fbfafb] hover:border-primary/40"
            }`}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center text-primary">
              <Icon className="h-5 w-5 stroke-[2.2]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-[#3a3d45]">{choice.title}</span>
              {choice.desc && <span className="mt-1 block text-xs font-semibold leading-4 text-slate-400">{choice.desc}</span>}
            </span>
            {active ? (
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-white">
                <Check className="h-4 w-4" />
              </span>
            ) : (
              <ChevronRight className="h-5 w-5 text-slate-200" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function BirthYearScreen({
  value,
  onChange,
  onNext,
}: {
  value: number;
  onChange: (value: number) => void;
  onNext: () => void;
}) {
  const itemHeight = 64;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const years = useMemo(
    () => Array.from({ length: CURRENT_YEAR - 18 - 1945 + 1 }, (_, index) => CURRENT_YEAR - 18 - index),
    [],
  );
  const age = CURRENT_YEAR - value;

  useEffect(() => {
    const index = years.indexOf(value);
    if (index >= 0 && scrollRef.current) {
      scrollRef.current.scrollTop = index * itemHeight;
    }
  }, []);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const index = Math.min(
      years.length - 1,
      Math.max(0, Math.round(event.currentTarget.scrollTop / itemHeight)),
    );
    const nextYear = years[index];
    if (nextYear !== value) onChange(nextYear);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="pt-9 text-center">
        <h1 className="text-[1.75rem] font-extrabold leading-tight text-[#242833]">Năm sinh của bạn?</h1>
        <p className="mx-auto mt-3 max-w-xs text-sm font-semibold leading-6 text-slate-400">
          Chúng tôi chỉ dùng để tính nhu cầu dinh dưỡng theo độ tuổi.
        </p>
      </div>
      <div className="my-auto flex flex-col items-center">
        <div className="relative h-[328px] w-72 overflow-hidden rounded-[2rem] bg-[#f7f9f7] shadow-inner">
          <div className="pointer-events-none absolute left-5 right-5 top-1/2 z-0 h-16 -translate-y-1/2 rounded-3xl bg-primary/[0.14] shadow-[inset_0_0_0_1px_rgba(34,197,94,0.2)]" />
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="hide-scrollbar relative z-10 h-full snap-y snap-mandatory overflow-y-auto px-5"
          >
            <div className="py-[132px]">
            {years.map((year) => {
              const active = year === value;
              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => onChange(year)}
                  className={`flex h-16 w-full snap-center items-center justify-center rounded-3xl text-center text-2xl font-extrabold transition-all ${
                    active ? "text-[#243027] scale-[1.04]" : "text-slate-300"
                  }`}
                >
                  {year}
                </button>
              );
            })}
            </div>
          </div>
        </div>
        <p className="mt-5 rounded-full bg-primary/10 px-4 py-2 text-sm font-extrabold text-primary">{age} tuổi</p>
      </div>
      <BottomAction label="Tiếp tục" onClick={onNext} />
    </div>
  );
}

function HeightScreen({ value, onChange, onNext }: { value: number; onChange: (value: number) => void; onNext: () => void }) {
  const itemHeight = 12;
  const viewportHeight = 420;
  const centerPadding = (viewportHeight - itemHeight) / 2;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const marks = Array.from({ length: 81 }, (_, index) => 130 + index);
  const reversedMarks = [...marks].reverse();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = (210 - value) * itemHeight;
    }
  }, [itemHeight, value]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const next = 210 - Math.round(event.currentTarget.scrollTop / itemHeight);
    const clamped = Math.min(210, Math.max(130, next));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="pt-8 text-center">
        <h1 className="text-[1.75rem] font-extrabold leading-tight text-[#242833]">Chiều cao của bạn?</h1>
      </div>
      <div className="my-auto">
        <div className="relative mx-auto flex h-[520px] max-w-xs items-center justify-center overflow-hidden">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="hide-scrollbar absolute left-0 top-1/2 h-[420px] w-36 -translate-y-1/2 overflow-y-auto"
          >
            <div style={{ paddingTop: `${centerPadding}px`, paddingBottom: `${centerPadding}px` }}>
              {reversedMarks.map((mark) => {
                const isMeter = mark % 10 === 0;
                const isFive = mark % 5 === 0;
                const active = mark === value;
                return (
                  <div key={mark} className="flex items-center justify-end gap-2" style={{ height: `${itemHeight}px` }}>
                    {isMeter && (
                      <span className={`w-11 text-right text-xs font-extrabold ${active ? "text-primary" : "text-slate-500"}`}>
                        {(mark / 100).toFixed(1)}m
                      </span>
                    )}
                    <span
                      className={`block ${active ? "bg-primary" : isMeter ? "bg-slate-500" : isFive ? "bg-slate-400" : "bg-slate-300"}`}
                      style={{ width: active ? "72px" : isMeter ? "64px" : isFive ? "48px" : "32px", height: active ? "2px" : "1px" }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-primary" />
          <div className="pointer-events-none relative ml-24 w-40 text-center">
            <div className="mb-1">
              <span className="text-6xl font-extrabold leading-none text-[#242833]">{value}</span>
              <span className="ml-1 text-sm font-extrabold text-slate-500">CM</span>
            </div>
            <HumanSilhouette />
          </div>
        </div>
      </div>
      <BottomAction label="Tiếp tục" onClick={onNext} />
    </div>
  );
}

function WeightScreen({
  value,
  bmi,
  bmiStatus,
  idealWeight,
  onChange,
  onNext,
}: {
  value: number;
  bmi: number;
  bmiStatus: { label: string; className: string };
  idealWeight: { minWeight: number; maxWeight: number };
  onChange: (value: number) => void;
  onNext: () => void;
}) {
  const itemWidth = 8;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const marks = Array.from({ length: 116 }, (_, index) => 35 + index);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = (value - 35) * itemWidth;
    }
  }, []);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const next = 35 + Math.round(event.currentTarget.scrollLeft / itemWidth);
    const clamped = Math.min(150, Math.max(35, next));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="pt-8 text-center">
        <h1 className="text-[1.75rem] font-extrabold leading-tight text-[#242833]">Cân nặng hiện tại?</h1>
      </div>
      <div className="my-auto space-y-8">
        <div className="mx-auto w-fit rounded-full border border-primary/40 bg-primary/[0.08] px-7 py-2 text-sm font-extrabold text-primary">KG</div>
        <div className="text-center">
          <span className="text-6xl font-extrabold tracking-tight text-[#242833]">{value}</span>
          <span className="ml-2 text-lg font-extrabold text-slate-400">KG</span>
        </div>
        <div className="relative h-28 overflow-hidden rounded-3xl bg-[#fafafa]">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="hide-scrollbar h-full overflow-x-auto"
          >
            <div className="flex h-full items-end px-[50%] pb-8" style={{ width: `${marks.length * itemWidth + 320}px` }}>
              {marks.map((mark) => {
                const isTen = mark % 10 === 0;
                const isFive = mark % 5 === 0;
                return (
                  <div key={mark} className="relative flex shrink-0 justify-center" style={{ width: itemWidth }}>
                    {isTen && <span className="absolute -top-14 text-xs font-extrabold text-slate-500">{mark}</span>}
                    <span className={`${isTen ? "h-11 bg-slate-500" : isFive ? "h-8 bg-slate-400" : "h-5 bg-slate-300"} w-px`} />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="absolute bottom-4 left-1/2 h-20 w-0.5 -translate-x-1/2 bg-primary shadow-[0_0_0_4px_rgba(34,197,94,0.12)]" />
        </div>
        <div className="rounded-3xl bg-[#f8f6f8] p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-extrabold">
            <span>BMI của bạn: {bmi}</span>
            <span className={`rounded-full px-2 py-1 text-xs ${bmiStatus.className}`}>{bmiStatus.label}</span>
          </div>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
            Khoảng cân nặng khỏe mạnh ước tính: {idealWeight.minWeight}-{idealWeight.maxWeight} kg. CaloVie sẽ dùng chỉ số này để cá nhân hóa kế hoạch.
          </p>
        </div>
      </div>
      <BottomAction label="Tiếp tục" onClick={onNext} />
    </div>
  );
}

function HumanSilhouette() {
  return (
    <div className="relative mx-auto h-60 w-28">
      <img
        src="/height-body.svg"
        alt=""
        className="h-full w-full object-contain opacity-14"
        aria-hidden="true"
      />
    </div>
  );
}

function MacroPreview({ goals, title, onNext }: { goals: ReturnType<typeof calculateNutritionGoals>; title: string; onNext: () => void }) {
  const items = [
    { label: "Calorie", value: goals.calories, unit: "cal", icon: Flame, color: "text-orange-500" },
    { label: "Carbs", value: goals.carbs, unit: "g", icon: Apple, color: "text-yellow-500" },
    { label: "Protein", value: goals.protein, unit: "g", icon: Beef, color: "text-blue-500" },
    { label: "Fat", value: goals.fat, unit: "g", icon: Zap, color: "text-rose-500" },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="pt-9 text-center">
        <h1 className="mx-auto max-w-xs text-[1.65rem] font-extrabold leading-tight text-[#242833]">{title}</h1>
      </div>
      <div className="my-auto rounded-3xl bg-[#f3f1f7] p-4">
        <p className="mb-4 text-sm font-extrabold text-slate-600">Gợi ý mỗi ngày</p>
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="mb-6 flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${item.color}`} />
                  <span className="text-xs font-extrabold text-slate-500">{item.label}</span>
                </div>
                <span className="text-2xl font-extrabold text-[#242833]">{item.value}</span>
                <span className="ml-1 text-xs font-extrabold text-slate-400">{item.unit}</span>
              </div>
            );
          })}
        </div>
      </div>
      <BottomAction label="Tiếp tục" onClick={onNext} />
    </div>
  );
}

function InsightScreen({
  eyebrow,
  title,
  body,
  visual,
  onNext,
}: {
  eyebrow: string;
  title: string;
  body: string;
  visual: React.ReactNode;
  onNext: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="pt-8 text-center">
        <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        <h1 className="mx-auto max-w-sm text-[1.65rem] font-extrabold leading-tight text-[#242833]">{title}</h1>
        <p className="mx-auto mt-3 max-w-xs text-sm font-semibold leading-6 text-slate-400">{body}</p>
      </div>
      <div className="my-auto">{visual}</div>
      <BottomAction label="Tiếp tục" onClick={onNext} />
    </div>
  );
}

function LoadingScreen({ progress }: { progress: number }) {
  return (
    <div className="flex min-h-screen flex-col px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-24 text-center">
      <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[2rem] bg-primary/10 text-primary shadow-[0_18px_50px_rgba(27,111,132,0.12)]">
        <Sparkles className="h-9 w-9" />
      </div>
      <span className="text-6xl font-extrabold text-[#242833]">{progress}%</span>
      <h1 className="mx-auto mt-6 max-w-xs text-[1.65rem] font-extrabold leading-tight text-[#242833]">Đang thiết lập mọi thứ cho bạn</h1>
      <Progress value={progress} className="mt-10 h-2 bg-slate-100" />
      <p className="mt-4 text-sm font-bold text-slate-400">
        {progress < 45 ? "Đang ước tính nhu cầu năng lượng" : progress < 80 ? "Đang cá nhân hóa macro" : "Đang chuẩn bị kế hoạch"}
      </p>
      <div className="relative mt-auto h-56 overflow-hidden">
        {[
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop",
          "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop",
          "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=120&h=120&fit=crop",
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop",
          "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop",
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop",
        ].map((src, index) => (
          <img
            key={src}
            src={src}
            alt=""
            className="absolute h-16 w-16 rounded-full object-cover shadow-lg"
            style={{
              left: `${(index * 57) % 320}px`,
              top: `${index % 2 === 0 ? 30 : 118}px`,
            }}
          />
        ))}
        <div className="absolute left-1/2 top-16 -translate-x-1/2 rounded-full bg-primary/10 px-4 py-2 text-sm font-extrabold text-primary">
          1,000,000+ người dùng
        </div>
      </div>
    </div>
  );
}

function FinalScreen({
  formData,
  goals,
  bmi,
  targetWeight,
  isSubmitting,
  onComplete,
}: {
  formData: FormData;
  goals: ReturnType<typeof calculateNutritionGoals>;
  bmi: number;
  targetWeight: number;
  isSubmitting: boolean;
  onComplete: () => void;
}) {
  const goalLabel = formData.goal === "lose" ? "giảm cân" : formData.goal === "gain" ? "tăng cơ" : "giữ cân";

  return (
    <div className="flex min-h-screen flex-col px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-16 text-center">
      <div className="mx-auto flex items-end justify-center gap-3">
        <div className="mb-8 max-w-[11rem] rounded-3xl bg-primary/10 px-4 py-3 text-left text-xs font-extrabold leading-5 text-primary shadow-sm">
          Xong rồi. Mình dẫn bạn tham quan CaloVie một vòng nhé.
        </div>
        <CaloVieGuideMascot mood="celebrate" className="h-36 w-32 drop-shadow-xl" motion="bob" />
      </div>
      <h1 className="mx-auto mt-4 max-w-xs text-[1.75rem] font-extrabold leading-tight text-[#242833]">Kế hoạch {goalLabel} của bạn đã sẵn sàng</h1>
      <p className="mt-3 text-sm font-bold text-slate-400">
        Mục tiêu tham khảo: <span className="text-primary">{targetWeight.toFixed(1)} kg</span>
      </p>

      <div className="my-auto space-y-4">
        <div className="rounded-[2rem] bg-gradient-to-br from-primary/10 to-emerald-50 p-5 text-left">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Tổng quan</p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Metric label="BMI" value={bmi.toString()} />
            <Metric label="Calo" value={goals.calories.toString()} />
            <Metric label="Protein" value={`${goals.protein}g`} />
          </div>
        </div>

        <div className="rounded-[2rem] bg-[#f8f6f8] p-5 text-left">
          <div className="mb-3 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Trophy className="h-5 w-5" />
            </div>
            <p className="text-sm font-extrabold text-[#242833]">CaloVie sẽ bắt đầu với</p>
          </div>
          <ul className="mt-4 space-y-3 text-sm font-semibold text-slate-500">
            <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Mục tiêu calo và macro cá nhân hóa</li>
            <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> AI scan món ăn để giảm nhập liệu thủ công</li>
            <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Nhật ký và báo cáo để theo dõi tiến độ</li>
          </ul>
        </div>
      </div>

      <BottomAction label={isSubmitting ? "Đang lưu..." : "Vào CaloVie"} onClick={onComplete} disabled={isSubmitting} icon={isSubmitting ? Loader2 : BadgeCheck} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
      <p className="text-[11px] font-extrabold text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-[#242833]">{value}</p>
    </div>
  );
}

function BottomAction({
  label,
  onClick,
  disabled,
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: React.ElementType;
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="h-14 w-full rounded-full bg-[#182232] text-base font-extrabold shadow-[0_14px_28px_rgba(24,34,50,0.2)] hover:bg-[#111827]"
    >
      {Icon && <Icon className={`mr-2 h-5 w-5 ${disabled ? "animate-spin" : ""}`} />}
      {label}
    </Button>
  );
}

function GoalGradientVisual() {
  return (
    <div className="relative mx-auto h-80 max-w-xs">
      <div className="absolute inset-x-4 top-10 h-56 rounded-[3rem] bg-gradient-to-br from-primary/95 via-primary to-emerald-300 shadow-[0_24px_60px_rgba(34,197,94,0.25)]" />
      <div className="absolute inset-x-10 top-16 rounded-[2rem] bg-white/[0.18] p-5 text-white backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.18]">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/70">Goal set</p>
            <p className="text-lg font-extrabold">CaloVie Plan</p>
          </div>
        </div>
        <div className="mt-8 space-y-3">
          {["Tính mục tiêu calo", "Cân bằng macro", "Theo dõi tiến độ"].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/[0.14] px-4 py-3 text-sm font-extrabold">
              <Check className="h-4 w-4" />
              {item}
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-6 left-1/2 h-3 w-44 -translate-x-1/2 rounded-full bg-primary/15 blur-sm" />
    </div>
  );
}

function FoodPhotoScanVisual() {
  return (
    <div className="relative mx-auto flex h-[370px] max-w-xs items-center justify-center">
      <img
        src="/onboarding-scan.jpg"
        alt="CaloVie AI scan món ăn"
        className="h-full w-auto rounded-[2.2rem] object-contain shadow-[0_24px_70px_rgba(15,23,42,0.24)]"
      />
    </div>
  );
}

function ScanChip({ label, className }: { label: string; className: string }) {
  return (
    <div className={`absolute rounded-2xl bg-white px-4 py-2 text-xs font-extrabold text-[#242833] shadow-lg ${className}`}>
      {label}
    </div>
  );
}

function SocialProofVisual() {
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <div className="flex items-center justify-center -space-x-3">
        {[
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop",
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop",
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop",
        ].map((src) => (
          <img key={src} src={src} alt="" className="h-12 w-12 rounded-full border-4 border-white object-cover shadow" />
        ))}
      </div>
      <p className="text-center text-sm font-extrabold text-slate-500">Cộng đồng CaloVie đang xây dựng thói quen tốt hơn mỗi ngày</p>
      {[
        "Scan món ăn rất nhanh, tôi không còn bỏ cuộc vì phải nhập quá nhiều.",
        "Gợi ý calo và macro rõ ràng hơn các app tôi từng dùng.",
      ].map((quote, index) => (
        <div key={quote} className="rounded-3xl bg-white p-4 text-left shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
          <div className="mb-2 text-sm text-amber-400">★★★★★</div>
          <p className="text-xs font-semibold leading-5 text-slate-500">{quote}</p>
          <p className="mt-3 text-xs font-extrabold text-[#242833]">{index === 0 ? "Ava S." : "Roger C."}</p>
        </div>
      ))}
    </div>
  );
}

export default Onboarding;
