// src/utils/greetings.ts
import {
  Moon,
  Sunrise,
  Sun,
  Sunset,
  CloudMoon,
  type LucideIcon,
} from "lucide-react";
import i18n from "@/i18n/config";

export interface Greeting {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconColor: string;
}

const getRandomIndex = (max: number) => Math.floor(Math.random() * max);

export const getGreeting = (name?: string | null): Greeting => {
  const hour = new Date().getHours();
  const displayName = name || (i18n.language === "vi" ? "bạn" : "you");
  const t = i18n.t.bind(i18n);

  // 0-5: Khuya
  if (hour >= 0 && hour < 6) {
    const idx = getRandomIndex(3);
    return {
      title: t(`greeting.lateNight.${idx}`, { name: displayName }),
      subtitle: t(`greeting.subtitle.lateNight.${idx}`),
      icon: idx === 1 ? CloudMoon : Moon,
      iconColor:
        idx === 0
          ? "text-blue-400"
          : idx === 1
            ? "text-indigo-400"
            : "text-purple-400",
    };
  }

  // 6-10: Sáng
  if (hour >= 6 && hour < 10) {
    const idx = getRandomIndex(3);
    return {
      title: t(`greeting.morning.${idx}`, { name: displayName }),
      subtitle: t(`greeting.subtitle.morning.${idx}`),
      icon: idx === 2 ? Sun : Sunrise,
      iconColor:
        idx === 0
          ? "text-orange-500"
          : idx === 1
            ? "text-amber-500"
            : "text-yellow-500",
    };
  }

  // 10-13: Trưa
  if (hour >= 10 && hour < 13) {
    const idx = getRandomIndex(3);
    return {
      title: t(`greeting.noon.${idx}`, { name: displayName }),
      subtitle: t(`greeting.subtitle.noon.${idx}`),
      icon: Sun,
      iconColor:
        idx === 0
          ? "text-yellow-500"
          : idx === 1
            ? "text-orange-400"
            : "text-amber-500",
    };
  }

  // 13-17: Chiều
  if (hour >= 13 && hour < 17) {
    const idx = getRandomIndex(3);
    return {
      title: t(`greeting.afternoon.${idx}`, { name: displayName }),
      subtitle: t(`greeting.subtitle.afternoon.${idx}`),
      icon: Sun,
      iconColor:
        idx === 0
          ? "text-orange-500"
          : idx === 1
            ? "text-yellow-600"
            : "text-amber-600",
    };
  }

  // 17-21: Tối
  if (hour >= 17 && hour < 21) {
    const idx = getRandomIndex(3);
    return {
      title: t(`greeting.evening.${idx}`, { name: displayName }),
      subtitle: t(`greeting.subtitle.evening.${idx}`),
      icon: idx === 2 ? Moon : Sunset,
      iconColor:
        idx === 0
          ? "text-orange-600"
          : idx === 1
            ? "text-rose-500"
            : "text-indigo-500",
    };
  }

  // 21-24: Đêm
  const idx = getRandomIndex(3);
  return {
    title: t(`greeting.night.${idx}`, { name: displayName }),
    subtitle: t(`greeting.subtitle.night.${idx}`),
    icon: idx === 1 ? CloudMoon : Moon,
    iconColor:
      idx === 0
        ? "text-blue-500"
        : idx === 1
          ? "text-purple-500"
          : "text-indigo-500",
  };
};
