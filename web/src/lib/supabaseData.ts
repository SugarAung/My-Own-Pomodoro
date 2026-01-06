// src/lib/supabaseData.ts
import { supabase } from "./supabaseClient";
import type { CustomModeRow, ProfileRow } from "../types/db";

function requireSupabase() {
  if (!supabase) {
    throw new Error("Sync is not configured (missing Supabase env vars).");
  }
  return supabase;
}

export async function ensureProfile(userId: string) {
  const sb = requireSupabase();

  const { data: existing, error: readErr } = await sb
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (readErr) throw readErr;
  if (existing) return existing;

  const { data: inserted, error: insErr } = await sb
    .from("profiles")
    .insert({ id: userId })
    .select("*")
    .single<ProfileRow>();

  if (insErr) throw insErr;
  return inserted;
}

export async function getCustomMode(userId: string) {
  const sb = requireSupabase();

  const { data, error } = await sb
    .from("custom_mode")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<CustomModeRow>();

  if (error) throw error;
  return data; // CustomModeRow | null
}

export async function createCustomMode(userId: string, preset?: Partial<CustomModeRow>) {
  const sb = requireSupabase();

  const payload = {
    user_id: userId,
    focus_sec: preset?.focus_sec ?? 25 * 60,
    short_break_sec: preset?.short_break_sec ?? 5 * 60,
    long_break_sec: preset?.long_break_sec ?? 15 * 60,
    long_break_every: preset?.long_break_every ?? 4,
    accent_color: preset?.accent_color ?? "tomato",
  };

  const { data, error } = await sb
    .from("custom_mode")
    .insert(payload)
    .select("*")
    .single<CustomModeRow>();

  if (error) throw error;
  return data;
}
