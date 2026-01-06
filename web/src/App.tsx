// src/App.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

import { getModes, type ModeKey } from "./core/modes";
import { MESSAGES, pickMessage } from "./core/messages";
import { type Phase, phaseDurationSec, phaseLabel, nextBreakTypeAfterFocus } from "./core/timer";
import { loadSettings, saveSettings, type UiMode } from "./core/storage";
import { useSound, type AmbiencePlayMode, type AmbienceType } from "./core/sound";
import { useKeyboardShortcuts } from "./core/keyboard";

import { supabase } from "./lib/supabaseClient";
import AuthPanel from "./auth/AuthPanel";
import type { Session, User } from "@supabase/supabase-js";

import type { CustomModeRow } from "./types/db";
import { ensureProfile, getCustomMode, createCustomMode } from "./lib/supabaseData";

import Toast from "./components/Toast";
import LongBreakPrompt from "./components/LongBreakPrompt";
import { DEFAULT_LONG_BREAK_IDEAS, DEFAULT_SHORT_BREAK_TIPS, pickRandomAvoidRepeat } from "./data/reminders";

type AppMode = ModeKey | "custom";
type AccentKey = "tomato" | "warm" | "gym" | "night";

const ACCENTS: { key: AccentKey; label: string }[] = [
  { key: "tomato", label: "Tomato" },
  { key: "warm", label: "Warm" },
  { key: "gym", label: "Gym" },
  { key: "night", label: "Night" },
];

const CUSTOM_REMINDERS_KEY = "mop_custom_reminders_v1";

function formatMMSS(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function secsFromMinutes(mins: number) {
  return clampInt(mins, 1, 24 * 60) * 60;
}

function minutesFromSecs(sec: number) {
  return Math.max(1, Math.round(sec / 60));
}

function loadCustomReminders(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_REMINDERS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => String(x)).filter(Boolean).slice(0, 3);
  } catch {
    return [];
  }
}

function saveCustomReminders(list: string[]) {
  const clean = list.map((x) => x.trim()).filter(Boolean).slice(0, 3);
  localStorage.setItem(CUSTOM_REMINDERS_KEY, JSON.stringify(clean));
}

export default function App() {
  const sound = useSound();

  /** ===== Auth ===== */
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  /** ===== Cloud / Custom mode ===== */
  const [customMode, setCustomMode] = useState<CustomModeRow | null>(null);
  const [cloudStatus, setCloudStatus] = useState<string | null>(null);
  const [cloudBusy, setCloudBusy] = useState(false);

  /** ===== Local settings ===== */
  const persisted = useMemo(() => loadSettings(), []);
  const MODES = useMemo(() => getModes(), []);

  const [mode, setMode] = useState<AppMode>(persisted?.mode ?? "normal");
  const [uiMode, setUiMode] = useState<UiMode>(persisted?.uiMode ?? "dashboard");
  const showDashboard = uiMode === "dashboard";

  const [soundEnabled, setSoundEnabled] = useState<boolean>(persisted?.soundEnabled ?? true);

  const [ambienceEnabled, setAmbienceEnabled] = useState<boolean>(persisted?.ambienceEnabled ?? false);
  const [ambienceType, setAmbienceType] = useState<AmbienceType>(persisted?.ambienceType ?? "rain");
  const [ambiencePlayMode, setAmbiencePlayMode] = useState<AmbiencePlayMode>(
    persisted?.ambiencePlayMode ?? "focus"
  );
  const [ambienceVolume, setAmbienceVolume] = useState<number>(persisted?.ambienceVolume ?? 0.35);

  const [focusSessionsCompleted, setFocusSessionsCompleted] = useState<number>(
    persisted?.focusSessionsCompleted ?? 0
  );

  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  function clearFeedback() {
    setSessionMessage(null);
  }

  /** ===== Planned break reminders (no points) ===== */
  const [customReminders, setCustomReminders] = useState<string[]>(() => loadCustomReminders());
  const [newReminder, setNewReminder] = useState("");

  const [toastOpen, setToastOpen] = useState(false);
  const [toastText, setToastText] = useState("");

  const [lbOpen, setLbOpen] = useState(false);
  const [lbText, setLbText] = useState("");

  const lastShortTipRef = useRef<string | null>(null);
  const lastLongIdeaRef = useRef<string | null>(null);
  const prevPhaseRef = useRef<Phase | null>(null);

  function pickShortTip() {
    const tip = pickRandomAvoidRepeat(DEFAULT_SHORT_BREAK_TIPS, lastShortTipRef.current);
    lastShortTipRef.current = tip;
    return tip;
  }

  function pickLongIdea() {
    // ✅ custom reminders only affect long breaks when mode === "custom"
    const useCustom = mode === "custom" && customReminders.length > 0;
    const source = useCustom ? customReminders : DEFAULT_LONG_BREAK_IDEAS;

    const idea = pickRandomAvoidRepeat(source, lastLongIdeaRef.current);
    lastLongIdeaRef.current = idea;
    return idea;
  }

  function showShortToast() {
    setToastText(pickShortTip());
    setToastOpen(true);
  }

  function showLongPrompt() {
    setLbText(pickLongIdea());
    setLbOpen(true);
  }

  useEffect(() => {
    saveCustomReminders(customReminders);
  }, [customReminders]);

  /** ===== Persist local ===== */
  useEffect(() => {
    saveSettings({
      mode,
      uiMode,
      soundEnabled,
      ambienceEnabled,
      ambienceType,
      ambiencePlayMode,
      ambienceVolume,
      focusSessionsCompleted,
    });
  }, [
    mode,
    uiMode,
    soundEnabled,
    ambienceEnabled,
    ambienceType,
    ambiencePlayMode,
    ambienceVolume,
    focusSessionsCompleted,
  ]);

  /** ===== Auth init ===== */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
      setUser(newSession?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  /** ===== Cloud load ===== */
  useEffect(() => {
    async function loadCloud() {
      if (!user) {
        setCustomMode(null);
        setCloudStatus(null);

        // If logged out while in custom mode, safely return to normal.
        setMode((m) => (m === "custom" ? "normal" : m));
        return;
      }

      setCloudBusy(true);
      setCloudStatus(null);

      try {
        await ensureProfile(user.id);
        const cm = await getCustomMode(user.id);
        setCustomMode(cm);
        setCloudStatus(cm ? "Custom mode loaded." : "No custom mode yet.");
      } catch (e: any) {
        setCloudStatus(e?.message ?? "Failed to load cloud data.");
      } finally {
        setCloudBusy(false);
      }
    }

    loadCloud();
  }, [user]);

  /** ===== Mode config (supports custom) ===== */
  const effectiveModeKey: ModeKey = mode === "custom" ? "normal" : (mode as ModeKey);

  const modeConfig = useMemo(() => {
    if (mode === "custom" && customMode) {
      return {
        label: "Custom",
        focusSec: customMode.focus_sec,
        shortBreakSec: customMode.short_break_sec,
        longBreakSec: customMode.long_break_sec,
        longBreakEvery: customMode.long_break_every,
      };
    }
    return MODES[effectiveModeKey];
  }, [mode, customMode, MODES, effectiveModeKey]);

  /** ===== Timer ===== */
  const [phase, setPhase] = useState<Phase>("focus");
  const [remainingSec, setRemainingSec] = useState<number>(modeConfig.focusSec);
  const [isRunning, setIsRunning] = useState(false);

  /** ===== Tick engine ===== */
  const intervalRef = useRef<number | null>(null);

  function clearIntervalSafe() {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function startInterval() {
    clearIntervalSafe();
    intervalRef.current = window.setInterval(() => {
      setRemainingSec((prev) => Math.max(prev - 1, 0));
    }, 1000);
  }

  useEffect(() => {
    if (isRunning) startInterval();
    else clearIntervalSafe();
    return () => clearIntervalSafe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  /** ===== Keyboard shortcuts (Space/R/S/M) ===== */
  useKeyboardShortcuts(
    {
      onSpace: () => {
        sound.unlockAudio();
        if (isRunning) pause();
        else start();
      },
      onReset: reset,
      onSkip: skip,
      onToggleMinimal: () => setUiMode((u) => (u === "dashboard" ? "minimal" : "dashboard")),
    },
    [isRunning, phase, remainingSec, mode, soundEnabled]
  );

  /** ===== Ambience behavior ===== */
  useEffect(() => {
    sound.ensureAmbience({
      enabled: ambienceEnabled,
      type: ambienceEnabled ? ambienceType : "none",
      playMode: ambiencePlayMode,
      volume: ambienceVolume,
      phase,
      isRunning,
    });

    return () => {
      sound.stopAmbience?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambienceEnabled, ambienceType, ambiencePlayMode, ambienceVolume, phase, isRunning]);

  /** ===== Show reminders on phase transitions ===== */
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (!prev) return;

    if (phase === "shortBreak" && prev !== "shortBreak") {
      showShortToast();
      setLbOpen(false);
    }

    if (phase === "longBreak" && prev !== "longBreak") {
      showLongPrompt();
      setToastOpen(false);
    }

    if (phase === "focus" && prev !== "focus") {
      setToastOpen(false);
      setLbOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /** ===== Completion behavior ===== */
  useEffect(() => {
    if (remainingSec > 0) return;

    setIsRunning(false);
    clearIntervalSafe();

    if (phase === "focus") {
      setSessionMessage(pickMessage(MESSAGES[effectiveModeKey].focusComplete));

      setFocusSessionsCompleted((prev) => {
        const newCount = prev + 1;
        const nextPhase = nextBreakTypeAfterFocus(newCount, modeConfig);
        setPhase(nextPhase);
        setRemainingSec(phaseDurationSec(nextPhase, modeConfig));
        return newCount;
      });

      if (soundEnabled) sound.playSoundEvent("focusComplete");
    } else {
      setPhase("focus");
      setRemainingSec(phaseDurationSec("focus", modeConfig));
      setSessionMessage(pickMessage(MESSAGES[effectiveModeKey].breakComplete));
      if (soundEnabled) sound.playSoundEvent("breakComplete");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSec, phase]);

  /** ===== Mode change => safe reset ===== */
  useEffect(() => {
    setIsRunning(false);
    clearIntervalSafe();
    clearFeedback();
    setPhase("focus");
    setRemainingSec(modeConfig.focusSec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, customMode?.id]);

  /** ===== Actions ===== */
  function start() {
    sound.unlockAudio();
    if (soundEnabled) sound.playSoundEvent("start");

    if (remainingSec === 0) setRemainingSec(phaseDurationSec(phase, modeConfig));
    clearFeedback();
    setIsRunning(true);
  }

  function pause() {
    setIsRunning(false);
  }

  // ✅ Reset should NOT count
  function reset() {
    setIsRunning(false);
    clearIntervalSafe();
    clearFeedback();
    setPhase("focus");
    setRemainingSec(phaseDurationSec("focus", modeConfig));
  }

  // ✅ Skip during focus DOES count
  function skip() {
    setIsRunning(false);
    clearIntervalSafe();
    clearFeedback();

    if (phase === "focus") {
      setFocusSessionsCompleted((prev) => {
        const newCount = prev + 1;
        const nextPhase = nextBreakTypeAfterFocus(newCount, modeConfig);
        setPhase(nextPhase);
        setRemainingSec(phaseDurationSec(nextPhase, modeConfig));
        return newCount;
      });

      setSessionMessage("Skipped (counted). Take a break if you want.");
      return;
    }

    // skipping a break => back to focus
    setPhase("focus");
    setRemainingSec(phaseDurationSec("focus", modeConfig));
    setSessionMessage("Skipped break. Back to focus when you’re ready.");
  }

  const hint = isRunning ? "You’re doing well. Keep going gently." : "When you’re ready, press Start.";

  /** ===== Custom mode draft (preview before save) ===== */
  const [cmDraftFocusMin, setCmDraftFocusMin] = useState(25);
  const [cmDraftShortMin, setCmDraftShortMin] = useState(5);
  const [cmDraftLongMin, setCmDraftLongMin] = useState(15);
  const [cmDraftEvery, setCmDraftEvery] = useState(4);
  const [cmDraftAccent, setCmDraftAccent] = useState<AccentKey>("tomato");
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target as HTMLElement | null)?.isContentEditable) return;

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShowShortcuts(true);
      }
      if (e.key === "Escape") {
        setShowShortcuts(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!customMode) return;
    setCmDraftFocusMin(minutesFromSecs(customMode.focus_sec));
    setCmDraftShortMin(minutesFromSecs(customMode.short_break_sec));
    setCmDraftLongMin(minutesFromSecs(customMode.long_break_sec));
    setCmDraftEvery(clampInt(customMode.long_break_every, 1, 10));
    setCmDraftAccent(((customMode.accent_color as AccentKey) || "tomato") as AccentKey);
  }, [customMode?.id]);

  function cancelCustomEdits() {
    if (!customMode) return;
    setCmDraftFocusMin(minutesFromSecs(customMode.focus_sec));
    setCmDraftShortMin(minutesFromSecs(customMode.short_break_sec));
    setCmDraftLongMin(minutesFromSecs(customMode.long_break_sec));
    setCmDraftEvery(clampInt(customMode.long_break_every, 1, 10));
    setCmDraftAccent(((customMode.accent_color as AccentKey) || "tomato") as AccentKey);
    setCloudStatus("Reverted changes.");
  }

  async function saveCustomEdits() {
    if (!user || !customMode) return;

    if (isRunning) {
      setCloudStatus("Pause the timer before saving your custom settings.");
      return;
    }

    setCloudBusy(true);
    setCloudStatus(null);

    try {
      const payload = {
        focus_sec: secsFromMinutes(cmDraftFocusMin),
        short_break_sec: secsFromMinutes(cmDraftShortMin),
        long_break_sec: secsFromMinutes(cmDraftLongMin),
        long_break_every: clampInt(cmDraftEvery, 1, 10),
        accent_color: cmDraftAccent,
      };

      const { data, error } = await supabase
        .from("custom_mode")
        .update(payload)
        .eq("user_id", user.id)
        .select("*")
        .single<CustomModeRow>();

      if (error) throw error;

      setCustomMode(data);
      setCloudStatus("Saved ✅");

      if (mode === "custom") {
        clearFeedback();
        setPhase("focus");
        setRemainingSec(data.focus_sec);
      }
    } catch (e: any) {
      setCloudStatus(e?.message ?? "Could not save custom mode.");
    } finally {
      setCloudBusy(false);
    }
  }

  /** ===== Theme classes ===== */
  const themeClass = `theme-${effectiveModeKey}`;

  // Use DRAFT accent while in custom mode so user sees instant preview
  const liveAccent: AccentKey =
    mode === "custom" ? cmDraftAccent : ((customMode?.accent_color as AccentKey) || "tomato");

  const accentClass = mode === "custom" ? `accent-${liveAccent}` : "";

  return (
    <div className={`app ${themeClass} ${accentClass}`}>
      <header className="header">
        <h1 className="title">My Own Pomodoro</h1>
        <p className="subtitle">Your focus matters. Small wins count.</p>
      </header>

      <main className="main">
        <section className="card">
          <div className="topBar">
            <div className="modeGroup" aria-label="Mode selection">
              {(["soft", "normal", "hard"] as ModeKey[]).map((m) => (
                <button key={m} className={`modeBtn ${mode === m ? "active" : ""}`} type="button" onClick={() => setMode(m)}>
                  {MODES[m].label}
                </button>
              ))}

              {user && (
                <button
                  className={`modeBtn ${mode === "custom" ? "active" : ""}`}
                  type="button"
                  onClick={() => setMode("custom")}
                  title={!customMode ? "Open Custom to create it" : "Use your custom mode"}
                >
                  Custom
                </button>
              )}
            </div>

            <div className="rightBar">
              <button className="pillBtn" type="button" onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts (?)">
                SHORTCUTS <span className="kbdHint">?</span>
              </button>

              <button className="pillBtn" type="button" onClick={() => setAuthOpen(true)}>
                {user ? "Synced" : "Sync"}
              </button>

              {showDashboard && (
                <button
                  className="pillBtn"
                  type="button"
                  onClick={() => {
                    sound.unlockAudio();
                    setSoundEnabled((s) => !s);
                  }}
                >
                  Sounds: {soundEnabled ? "On" : "Off"}
                </button>
              )}

              <button className="pillBtn" type="button" onClick={() => setUiMode((u) => (u === "dashboard" ? "minimal" : "dashboard"))}>
                {showDashboard ? "Minimal" : "Dashboard"}
              </button>
            </div>
          </div>

          <div className="contentGrid">
            <div className="leftPane">
              <p className="phase">{phaseLabel(phase)}</p>
              <h2 className="time">{formatMMSS(remainingSec)}</h2>

              {sessionMessage && <div className="messageBar">{sessionMessage}</div>}

              <div className="controls">
                <button className="btn primary" onClick={start} disabled={isRunning}>
                  Start
                </button>
                <button className="btn" onClick={pause} disabled={!isRunning}>
                  Pause
                </button>
                <button className="btn" onClick={reset}>
                  Reset
                </button>
                <button className="btn ghost" onClick={skip}>
                  Skip
                </button>
              </div>

              <p className="hint">{hint}</p>

              {showDashboard && (
                <>
                  <p className="hint meta">
                    Mode: <b>{modeConfig.label ?? mode}</b> • Long break every <b>{modeConfig.longBreakEvery}</b> focus sessions
                  </p>
                  <p className="hint meta">
                    Focus completed: <b>{focusSessionsCompleted}</b>
                  </p>
                </>
              )}
            </div>

            {showDashboard && (
              <div className="rightPane">
                {/* Ambience panel */}
                <div className="panel">
                  <div className="panelTop">
                    <div className="panelTitle">Ambience</div>
                    <button className={`miniPill ${ambienceEnabled ? "on" : ""}`} type="button" onClick={() => setAmbienceEnabled((v) => !v)}>
                      {ambienceEnabled ? "On" : "Off"}
                    </button>
                  </div>

                  <div className="panelRow">
                    <button className={`chip ${ambienceType === "rain" ? "active" : ""}`} onClick={() => setAmbienceType("rain")} type="button">
                      Rain
                    </button>
                    <button className={`chip ${ambienceType === "night" ? "active" : ""}`} onClick={() => setAmbienceType("night")} type="button">
                      Night
                    </button>
                    <button className={`chip ${ambienceType === "white" ? "active" : ""}`} onClick={() => setAmbienceType("white")} type="button">
                      White
                    </button>
                  </div>

                  <div className="panelRow">
                    <button className={`chip ${ambiencePlayMode === "focus" ? "active" : ""}`} onClick={() => setAmbiencePlayMode("focus")} type="button">
                      Focus only
                    </button>
                    <button className={`chip ${ambiencePlayMode === "always" ? "active" : ""}`} onClick={() => setAmbiencePlayMode("always")} type="button">
                      Always
                    </button>
                  </div>

                  <div className="panelRow">
                    <div className="volLabel">Volume</div>
                    <input
                      className="slider"
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={ambienceVolume}
                      onChange={(e) => setAmbienceVolume(Number(e.target.value))}
                    />
                  </div>

                  <div className="panelHint">Tip: turn it on, then press Start once — ambience will follow your focus.</div>
                </div>

                {/* Custom Mode panel shows ONLY when Custom is selected */}
                {user && mode === "custom" && (
                  <div className="panel" style={{ marginTop: 14 }}>
                    <div className="panelTitle">Custom mode</div>

                    {!customMode ? (
                      <>
                        <div className="panelHint" style={{ marginTop: 8 }}>
                          Create your custom mode to save your own timer + accent across devices.
                        </div>

                        <button
                          className="btn primary"
                          type="button"
                          onClick={async () => {
                            if (!user) return;
                            setCloudBusy(true);
                            setCloudStatus(null);
                            try {
                              const created = await createCustomMode(user.id);
                              setCustomMode(created);
                              setCloudStatus("Custom mode created ✅");
                            } catch (e: any) {
                              setCloudStatus(e?.message ?? "Could not create custom mode.");
                            } finally {
                              setCloudBusy(false);
                            }
                          }}
                          disabled={cloudBusy}
                          style={{ marginTop: 10 }}
                        >
                          {cloudBusy ? "Creating..." : "Create custom mode"}
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="panelHint" style={{ marginTop: 8 }}>
                          Edit your custom timer + accent. Save it to sync across devices.
                        </div>

                        <div className="cmGrid" style={{ marginTop: 12 }}>
                          <label className="cmField">
                            <span>Focus (min)</span>
                            <input
                              type="number"
                              min={1}
                              max={180}
                              value={cmDraftFocusMin}
                              disabled={cloudBusy || isRunning}
                              onChange={(e) => setCmDraftFocusMin(clampInt(Number(e.target.value), 1, 180))}
                            />
                          </label>

                          <label className="cmField">
                            <span>Short break (min)</span>
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={cmDraftShortMin}
                              disabled={cloudBusy || isRunning}
                              onChange={(e) => setCmDraftShortMin(clampInt(Number(e.target.value), 1, 60))}
                            />
                          </label>

                          <label className="cmField">
                            <span>Long break (min)</span>
                            <input
                              type="number"
                              min={1}
                              max={90}
                              value={cmDraftLongMin}
                              disabled={cloudBusy || isRunning}
                              onChange={(e) => setCmDraftLongMin(clampInt(Number(e.target.value), 1, 90))}
                            />
                          </label>

                          <label className="cmField">
                            <span>Long break every</span>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={cmDraftEvery}
                              disabled={cloudBusy || isRunning}
                              onChange={(e) => setCmDraftEvery(clampInt(Number(e.target.value), 1, 10))}
                            />
                          </label>
                        </div>

                        <div className="cmAccentRow" style={{ marginTop: 14 }}>
                          <div className="cmAccentTitle">Accent</div>
                          <div className="cmAccentBtns">
                            {ACCENTS.map((a) => (
                              <button
                                key={a.key}
                                type="button"
                                className={`cmAccentBtn accent-${a.key} ${cmDraftAccent === a.key ? "active" : ""}`}
                                onClick={() => setCmDraftAccent(a.key)}
                                disabled={cloudBusy || isRunning}
                              >
                                {a.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="cmActions" style={{ marginTop: 14 }}>
                          <button className="btn" type="button" onClick={cancelCustomEdits} disabled={cloudBusy}>
                            Cancel
                          </button>
                          <button className="btn primary" type="button" onClick={saveCustomEdits} disabled={cloudBusy}>
                            {cloudBusy ? "Saving..." : "Save"}
                          </button>
                        </div>

                        {/* Planned break reminders (max 3) */}
                        <div className="panel" style={{ marginTop: 14 }}>
                          <div className="panelTitle">Planned break reminders</div>
                          <div className="panelHint" style={{ marginTop: 8 }}>
                            Add up to 3 personal reminders. If you leave this empty, we’ll use built-in ideas.
                            (Shown only during long breaks.)
                          </div>

                          <div className="panelRow" style={{ marginTop: 10 }}>
                            <input
                              className="authInput"
                              placeholder="e.g. Stretch / Get water / 5 minutes TikTok"
                              value={newReminder}
                              onChange={(e) => setNewReminder(e.target.value)}
                              disabled={customReminders.length >= 3}
                            />
                            <button
                              className="btn"
                              type="button"
                              disabled={customReminders.length >= 3 || !newReminder.trim()}
                              onClick={() => {
                                const v = newReminder.trim();
                                if (!v) return;
                                setCustomReminders((prev) => [...prev, v].slice(0, 3));
                                setNewReminder("");
                              }}
                            >
                              Add
                            </button>
                          </div>

                          <div className="panelRow" style={{ marginTop: 10 }}>
                            {customReminders.length === 0 ? (
                              <div className="panelHint">No custom reminders yet — we’ll use built-in ideas.</div>
                            ) : (
                              customReminders.map((r, idx) => (
                                <button
                                  key={`${r}-${idx}`}
                                  className="chip active"
                                  type="button"
                                  title="Click to remove"
                                  onClick={() => setCustomReminders((prev) => prev.filter((_, i) => i !== idx))}
                                >
                                  {r} ✕
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {cloudStatus && (
                      <div className="panelHint" style={{ marginTop: 10 }}>
                        {cloudStatus}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {showShortcuts && (
          <div className="authOverlay" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
            <div className="authModal">
              <div className="authHeader">
                <div>
                  <div className="authTitle">Keyboard shortcuts</div>
                  <div className="authSubtitle">A few quick keys to keep you in flow.</div>
                </div>
                <button className="authClose" type="button" onClick={() => setShowShortcuts(false)} aria-label="Close">
                  ✕
                </button>
              </div>

              <div className="authBody">
                <div className="shortcutList">
                  <div className="shortcutRow">
                    <span classNamespan className="kbd">Space</span>
                    <span>Start / Pause</span>
                  </div>
                  <div className="shortcutRow">
                    <span className="kbd">R</span>
                    <span>Reset</span>
                  </div>
                  <div className="shortcutRow">
                    <span className="kbd">S</span>
                    <span>Skip</span>
                  </div>
                  <div className="shortcutRow">
                    <span className="kbd">M</span>
                    <span>Minimal / Dashboard</span>
                  </div>
                  <div className="shortcutRow">
                    <span className="kbd">?</span>
                    <span>Show shortcuts</span>
                  </div>
                  <div className="shortcutRow">
                    <span className="kbd">Esc</span>
                    <span>Close</span>
                  </div>
                </div>

                <div className="authActions" style={{ marginTop: 14 }}>
                  <button className="btn primary" type="button" onClick={() => setShowShortcuts(false)}>
                    Got it
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <span className="footerText">{user ? "Synced • Saved to cloud" : "Guest mode • Saved locally"}</span>
      </footer>

      <AuthPanel open={authOpen} onClose={() => setAuthOpen(false)} user={user} session={session} />

      <LongBreakPrompt
        open={lbOpen && phase === "longBreak"}
        text={lbText}
        onOk={() => setLbOpen(false)}
        onAnother={() => setLbText(pickLongIdea())}
      />

      <Toast open={toastOpen} text={toastText} durationSec={3} onClose={() => setToastOpen(false)} />
    </div>
  );
}
