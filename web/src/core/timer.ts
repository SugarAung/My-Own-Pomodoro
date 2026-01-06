// src/core/timer.ts
import type { ModeConfig } from "./modes";

export type Phase = "focus" | "shortBreak" | "longBreak";

export function phaseLabel(phase: Phase): string {
  if (phase === "focus") return "Focus";
  if (phase === "shortBreak") return "Short break";
  return "Long break";
}

export function phaseDurationSec(phase: Phase, cfg: ModeConfig): number {
  if (phase === "focus") return cfg.focusSec;
  if (phase === "shortBreak") return cfg.shortBreakSec;
  return cfg.longBreakSec;
}

export function nextBreakTypeAfterFocus(focusCount: number, cfg: ModeConfig): Phase {
  return focusCount % cfg.longBreakEvery === 0 ? "longBreak" : "shortBreak";
}
