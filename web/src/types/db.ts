// src/types/db.ts

export type UiMode = "dashboard" | "minimal";
export type Tone = "gentle" | "balanced" | "motivator";

export type AmbienceType = "none" | "rain" | "night" | "white";
export type AmbiencePlayMode = "focus" | "always";

export type ProfileRow = {
  id: string;

  // preferences
  ui_mode: UiMode;
  tone: Tone;

  sound_enabled: boolean;
  ambience_enabled: boolean;
  ambience_type: AmbienceType;
  ambience_play_mode: AmbiencePlayMode;
  ambience_volume: number;

  updated_at: string;
};

export type CustomModeRow = {
  id: string;
  user_id: string;

  focus_sec: number;
  short_break_sec: number;
  long_break_sec: number;
  long_break_every: number;

  accent_color: string;

  created_at: string;
  updated_at: string;
};
