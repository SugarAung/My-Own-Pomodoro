// src/data/reminders.ts
export const DEFAULT_SHORT_BREAK_TIPS: string[] = [
  "Sip some water.",
  "Relax your jaw.",
  "Drop your shoulders.",
  "Look far away for 10 seconds.",
  "Blink slowly a few times.",
  "Unclench your hands.",
  "Do a small stretch.",
  "Take one deep breath.",
  "Sit back for a moment.",
  "You’re doing okay. Keep it gentle.",
  "Tiny rest counts.",
  "No pressure. Just a pause.",
  "Check your posture (softly).",
  "Give your eyes a short break.",
  "Roll your neck gently (if comfy).",
  "Stand up for a few seconds.",
];

// Long break ideas (use these ONLY if user has 0 custom reminders)
// Add more anytime — this is your “100 list” starter.
export const DEFAULT_LONG_BREAK_IDEAS: string[] = [
  "Get water and take a few slow sips.",
  "Stand up and stretch your back for 2 minutes.",
  "Look out a window for a moment.",
  "Walk around your room for 1 minute.",
  "Wash your face (quick reset).",
  "Snack break (something simple).",
  "Do nothing for 60 seconds. Just breathe.",
  "Stretch your shoulders and neck gently.",
  "Make your bed / tidy one small thing.",
  "Reply to 1 message only (then stop).",
  "Listen to one calm song.",
  "Refill your bottle and come back.",
  "Step away from the screen for 2 minutes.",
  "Light stretching: wrists + fingers.",
  "Short breathing: in 4, out 6.",
  "Quick posture reset: sit tall, then relax.",
  "Look at something green / outside if possible.",
  "Put your phone face down for this break.",
  "Tea/coffee sip break (no rush).",
  "A short snack — and stop there.",
  "Do 10 slow shoulder rolls.",
  "Close your eyes for 15 seconds.",
  "Open your window for fresh air (if you can).",
  "Write 1 sentence: what you’re doing next.",
  "Small gratitude: one thing you’re okay with today.",
  "Stretch your legs for 1 minute.",
  "Walk to the toilet and back.",
  "Tidy your desk just a little.",
  "Put on a chill track and breathe.",
  "Move your body gently (no workout).",
];

// Utility: pick random item, avoid repeating last one if possible
export function pickRandomAvoidRepeat(list: string[], last?: string | null) {
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];

  let candidate = list[Math.floor(Math.random() * list.length)];
  if (last && candidate === last) {
    // try a few times to avoid repeat
    for (let i = 0; i < 5; i++) {
      const next = list[Math.floor(Math.random() * list.length)];
      if (next !== last) {
        candidate = next;
        break;
      }
    }
  }
  return candidate;
}
