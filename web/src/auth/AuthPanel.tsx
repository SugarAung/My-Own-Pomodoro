import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Session, User } from "@supabase/supabase-js";

type Props = {
  open: boolean;
  onClose: () => void;
  user: User | null;
  session: Session | null;
};

export default function AuthPanel({ open, onClose, user, session }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setStatus(null);
      setBusy(false);
    }
  }, [open]);

  async function sendMagicLink() {
    setStatus(null);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setStatus("Please enter a valid email.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      setStatus("✅ Magic link sent. Check your inbox (and spam).");
    } catch (e: any) {
      setStatus(e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setStatus(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setStatus("Signed out.");
    } catch (e: any) {
      setStatus(e?.message ?? "Failed to sign out.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="authOverlay" role="dialog" aria-modal="true" aria-label="Sync login">
      <div className="authModal">
        <div className="authHeader">
          <div>
            <div className="authTitle">Sync (optional)</div>
            <div className="authSubtitle">Sign in to sync your Custom mode across devices.</div>
          </div>
          <button className="authClose" type="button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {user ? (
          <div className="authBody">
            <div className="authInfo">
              <div className="authLabel">Signed in as</div>
              <div className="authValue">{user.email ?? user.id}</div>
              <div className="authHint">{session ? "Session active." : "No session."}</div>
            </div>

            <div className="authActions">
              <button className="btn" type="button" onClick={signOut} disabled={busy}>
                Sign out
              </button>
              <button className="btn primary" type="button" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="authBody">
            <p className="authText">
              Guest mode works fully. If you want to sync your settings, use an email magic link.
            </p>

            <label className="authField">
              <span>Email</span>
              <input
                className="authInput"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </label>

            <div className="authActions">
              <button className="btn" type="button" onClick={onClose}>
                Not now
              </button>
              <button className="btn primary" type="button" onClick={sendMagicLink} disabled={busy}>
                {busy ? "Sending..." : "Send magic link"}
              </button>
            </div>
          </div>
        )}

        {status && <div className="authStatus">{status}</div>}
      </div>
    </div>
  );
}
