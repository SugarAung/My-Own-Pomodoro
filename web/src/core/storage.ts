// src/core/storage.ts

export type UiMode = "dashboard" | "minimal";
export type StoredMode = "soft" | "normal" | "hard" | "custom";

export type StoredSettings = {
  mode: StoredMode;
  uiMode: UiMode;

  // sound + ambience prefs
  soundEnabled: boolean;
  ambienceEnabled: boolean;
  ambienceType: "none" | "rain" | "night" | "white";
  ambiencePlayMode: "focus" | "always";
  ambienceVolume: number; // 0..1

  // progress (no points)
  focusSessionsCompleted: number;
};

// bump to v2 so old v1 saved data won't break anything
const KEY = "my-own-pomodoro:v2";

export function loadSettings(): StoredSettings | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredSettings>;

    return {
      mode: isStoredMode(parsed.mode) ? parsed.mode : "normal",
      uiMode: parsed.uiMode === "minimal" ? "minimal" : "dashboard",

      soundEnabled: typeof parsed.soundEnabled === "boolean" ? parsed.soundEnabled : true,
      ambienceEnabled: typeof parsed.ambienceEnabled === "boolean" ? parsed.ambienceEnabled : false,

      ambienceType: isAmbienceType(parsed.ambienceType) ? parsed.ambienceType : "none",
      ambiencePlayMode: parsed.ambiencePlayMode === "always" ? "always" : "focus",

      ambienceVolume:
        typeof parsed.ambienceVolume === "number"
          ? clamp(parsed.ambienceVolume, 0, 1)
          : 0.35,

      focusSessionsCompleted:
        typeof parsed.focusSessionsCompleted === "number" ? parsed.focusSessionsCompleted : 0,
    };
  } catch {
    return null;
  }
}

export function saveSettings(next: StoredSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore: localStorage may be blocked
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isStoredMode(x: unknown): x is StoredMode {
  return x === "soft" || x === "normal" || x === "hard" || x === "custom";
}

function isAmbienceType(x: unknown): x is StoredSettings["ambienceType"] {
  return x === "none" || x === "rain" || x === "night" || x === "white";
}
