// src/core/sound.ts
import { useMemo, useRef } from "react";

export type SoundEvent = "start" | "focusComplete" | "breakComplete";
export type AmbienceType = "none" | "rain" | "night" | "white";
export type AmbiencePlayMode = "focus" | "always";

type AmbienceNodes = {
  gain: GainNode;
  stop: () => void;
};

let sharedAudioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedAudioCtx) sharedAudioCtx = new Ctx();
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export async function unlockAudio() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") await ctx.resume();
  } catch {}
}

function playPattern(
  pattern: Array<{ atMs: number; freq: number; ms: number; type?: OscillatorType; peak?: number }>
) {
  const ctx = getAudioCtx();
  if (!ctx) return;

  if (ctx.state === "suspended") ctx.resume?.();
  const base = ctx.currentTime;

  for (const step of pattern) {
    const startAt = base + step.atMs / 1000;

    const o = ctx.createOscillator();
    const g = ctx.createGain();

    o.type = step.type ?? "sine";
    o.frequency.value = step.freq;

    const peak = step.peak ?? 0.22;

    g.gain.setValueAtTime(0.0001, startAt);
    g.gain.exponentialRampToValueAtTime(peak, startAt + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, startAt + step.ms / 1000);

    o.connect(g);
    g.connect(ctx.destination);

    o.start(startAt);
    o.stop(startAt + step.ms / 1000 + 0.02);
  }
}

export function playSoundEvent(evt: SoundEvent) {
  if (evt === "start") {
    playPattern([
      { atMs: 0, freq: 180, ms: 28, type: "square", peak: 0.40 },
      { atMs: 30, freq: 240, ms: 30, type: "square", peak: 0.36 },
    ]);
    return;
  }

  if (evt === "focusComplete") {
    playPattern([
      { atMs: 0, freq: 523.25, ms: 190, type: "sine", peak: 0.48 },
      { atMs: 150, freq: 659.25, ms: 210, type: "sine", peak: 0.48 },
      { atMs: 330, freq: 783.99, ms: 240, type: "sine", peak: 0.48 },
    ]);
    return;
  }

  if (evt === "breakComplete") {
    playPattern([
      { atMs: 0, freq: 392.0, ms: 210, type: "sine", peak: 0.42 },
      { atMs: 190, freq: 440.0, ms: 200, type: "sine", peak: 0.36 },
    ]);
  }
}

/** ===== ambience generators ===== */
function createWhiteNoise(ctx: AudioContext): AudioBufferSourceNode {
  const duration = 2.0;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  return src;
}

function createRainNodes(ctx: AudioContext, outGain: GainNode): AmbienceNodes {
  const noise = createWhiteNoise(ctx);

  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1200;
  band.Q.value = 0.8;

  const low = ctx.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 4000;

  noise.connect(band);
  band.connect(low);
  low.connect(outGain);

  const dropletNoise = createWhiteNoise(ctx);
  const dropletFilter = ctx.createBiquadFilter();
  dropletFilter.type = "highpass";
  dropletFilter.frequency.value = 2500;

  const dropletGain = ctx.createGain();
  dropletGain.gain.value = 0.0;

  dropletNoise.connect(dropletFilter);
  dropletFilter.connect(dropletGain);
  dropletGain.connect(outGain);

  let alive = true;

  function scheduleDroplet() {
    if (!alive) return;
    const t = ctx.currentTime + Math.random() * 0.25;
    const peak = 0.12 + Math.random() * 0.18;
    const dur = 0.02 + Math.random() * 0.04;

    dropletGain.gain.cancelScheduledValues(t);
    dropletGain.gain.setValueAtTime(0.0001, t);
    dropletGain.gain.exponentialRampToValueAtTime(peak, t + 0.005);
    dropletGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    setTimeout(scheduleDroplet, 60 + Math.random() * 120);
  }

  noise.start();
  dropletNoise.start();
  scheduleDroplet();

  return {
    gain: outGain,
    stop: () => {
      alive = false;
      try {
        noise.stop();
        dropletNoise.stop();
      } catch {}
      noise.disconnect();
      dropletNoise.disconnect();
    },
  };
}

function createNightCricketsNodes(ctx: AudioContext, outGain: GainNode): AmbienceNodes {
  const bed = createWhiteNoise(ctx);

  const bedLP = ctx.createBiquadFilter();
  bedLP.type = "lowpass";
  bedLP.frequency.value = 900;

  bed.connect(bedLP);
  bedLP.connect(outGain);

  const chirpOsc = ctx.createOscillator();
  chirpOsc.type = "sine";
  chirpOsc.frequency.value = 3200;

  const chirpGain = ctx.createGain();
  chirpGain.gain.value = 0.0001;

  chirpOsc.connect(chirpGain);
  chirpGain.connect(outGain);

  let alive = true;

  function chirpOnce() {
    if (!alive) return;
    const start = ctx.currentTime + 0.03;
    const peak = 0.06 + Math.random() * 0.09;
    const dur = 0.03 + Math.random() * 0.06;

    chirpGain.gain.cancelScheduledValues(start);
    chirpGain.gain.setValueAtTime(0.0001, start);
    chirpGain.gain.exponentialRampToValueAtTime(peak, start + 0.006);
    chirpGain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    setTimeout(chirpOnce, 240 + Math.random() * 560);
  }

  bed.start();
  chirpOsc.start();
  chirpOnce();

  return {
    gain: outGain,
    stop: () => {
      alive = false;
      try {
        bed.stop();
        chirpOsc.stop();
      } catch {}
      bed.disconnect();
      chirpOsc.disconnect();
    },
  };
}

function createAmbience(type: AmbienceType, ctx: AudioContext): AmbienceNodes | null {
  if (type === "none") return null;

  const outGain = ctx.createGain();
  outGain.gain.value = 0.25;
  outGain.connect(ctx.destination);

  if (type === "white") {
    const noise = createWhiteNoise(ctx);

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 3200;

    noise.connect(lp);
    lp.connect(outGain);
    noise.start();

    return {
      gain: outGain,
      stop: () => {
        try {
          noise.stop();
        } catch {}
        noise.disconnect();
      },
    };
  }

  if (type === "rain") return createRainNodes(ctx, outGain);
  if (type === "night") return createNightCricketsNodes(ctx, outGain);

  return null;
}

/** ===== hook ===== */
export function useSound() {
  const ambienceRef = useRef<AmbienceNodes | null>(null);

  function stopAmbience() {
    if (ambienceRef.current) {
      try {
        ambienceRef.current.stop();
        ambienceRef.current.gain.disconnect();
      } catch {}
      ambienceRef.current = null;
    }
  }

  function shouldPlayAmbience(opts: {
    enabled: boolean;
    type: AmbienceType;
    playMode: AmbiencePlayMode;
    phase: "focus" | "shortBreak" | "longBreak";
    isRunning: boolean;
  }) {
    return (
      opts.isRunning &&
      opts.enabled &&
      opts.type !== "none" &&
      (opts.playMode === "always" || opts.phase === "focus")
    );
  }

  function ensureAmbience(opts: {
    enabled: boolean;
    type: AmbienceType;
    playMode: AmbiencePlayMode;
    volume: number;
    phase: "focus" | "shortBreak" | "longBreak";
    isRunning: boolean;
  }) {
    const ctx = getAudioCtx();
    if (!ctx) return;

    const shouldPlay = shouldPlayAmbience(opts);

    if (!shouldPlay) {
      stopAmbience();
      return;
    }

    if (ambienceRef.current) {
      ambienceRef.current.gain.gain.value = opts.volume;
      return;
    }

    const nodes = createAmbience(opts.type, ctx);
    if (!nodes) return;

    nodes.gain.gain.value = opts.volume;
    ambienceRef.current = nodes;
  }

  return useMemo(
    () => ({
      unlockAudio,
      playSoundEvent,
      ensureAmbience,
      stopAmbience,
    }),
    []
  );
}
