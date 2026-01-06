export type ModeKey = "soft" | "normal" | "hard";

export type ModeConfig = {
  label: string;
  focusSec: number;
  shortBreakSec: number;
  longBreakSec: number;
  longBreakEvery: number;
};

export function getModes(): Record<ModeKey, ModeConfig> {
  return {
    soft: {
      label: "Soft",
      focusSec: 20 * 60,
      shortBreakSec: 5 * 60,
      longBreakSec: 10 * 60,
      longBreakEvery: 4,
    },

    normal: {
      label: "Normal",
      focusSec: 25 * 60,
      shortBreakSec: 5 * 60,
      longBreakSec: 15 * 60,
      longBreakEvery: 4,
    },

    hard: {
      label: "Hard",
      focusSec: 50 * 60,
      shortBreakSec: 10 * 60,
      longBreakSec: 15 * 60,
      longBreakEvery: 4,
    },
  };
}

export function isModeKey(x: unknown): x is ModeKey {
  return x === "soft" || x === "normal" || x === "hard";
}
