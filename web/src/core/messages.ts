import type { ModeKey } from "./modes";

export type MessageSet = {
  focusComplete: string[];
  breakComplete: string[];
};

export const MESSAGES: Record<ModeKey, MessageSet> = {
  soft: {
    focusComplete: [
      "You showed up. That’s enough for now.",
      "Nice work. Even small focus counts.",
      "You did what you could. That matters.",
    ],
    breakComplete: [
      "Take your time. Start again when ready.",
      "No rush. Continue when it feels right.",
    ],
  },
  normal: {
    focusComplete: [
      "You focused for a while. That counts.",
      "Good work. Let’s keep a steady pace.",
      "Nice session. Ready for a short break.",
    ],
    breakComplete: [
      "Break finished. Continue when you’re ready.",
      "Whenever you’re ready, let’s continue.",
    ],
  },
  hard: {
    focusComplete: [
      "Solid focus. Keep the momentum.",
      "Good. Stay sharp.",
      "Session done. Let’s move.",
    ],
    breakComplete: [
      "Break over. Back to work when ready.",
      "Reset and refocus.",
    ],
  },
};

export function pickMessage(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}
