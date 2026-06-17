import React from "react";
import { cn } from "@/lib/utils";

export type MascotGuideMood = "hello" | "coach" | "confirm" | "celebrate";
export type MascotFaceMood = "neutral" | "curious" | "playful" | "worried" | "love";

const GUIDE_MASCOTS: Record<MascotGuideMood, string> = {
  hello: "/calovie-mascot-hello.png",
  coach: "/calovie-mascot-coach.png",
  confirm: "/calovie-mascot.png",
  celebrate: "/calovie-mascot-celebrate.png",
};

const FACE_MASCOTS: Record<MascotFaceMood, string> = {
  neutral: "/mascot-neutral.png",
  curious: "/mascot-curious.png",
  playful: "/mascot-playful.png",
  worried: "/mascot-worried.png",
  love: "/mascot-love.png",
};

type MascotProps = {
  className?: string;
  imageClassName?: string;
  alt?: string;
  motion?: "breathe" | "bob" | "none";
};

export const CaloVieGuideMascot: React.FC<MascotProps & { mood?: MascotGuideMood }> = ({
  mood = "hello",
  className,
  imageClassName,
  alt = "CaloVie mascot",
  motion = "breathe",
}) => (
  <div className={cn("calovie-mascot-wrap", motion !== "none" && `calovie-mascot-${motion}`, className)}>
    <img
      src={GUIDE_MASCOTS[mood]}
      alt={alt}
      className={cn("h-full w-full object-contain", imageClassName)}
      draggable={false}
    />
  </div>
);

export const CaloVieFaceMascot: React.FC<MascotProps & { mood?: MascotFaceMood }> = ({
  mood = "neutral",
  className,
  imageClassName,
  alt = "Calovie",
  motion = "breathe",
}) => (
  <div className={cn("calovie-mascot-wrap", motion !== "none" && `calovie-mascot-${motion}`, className)}>
    <img
      src={FACE_MASCOTS[mood]}
      alt={alt}
      className={cn("h-full w-full object-contain", imageClassName)}
      draggable={false}
    />
  </div>
);
