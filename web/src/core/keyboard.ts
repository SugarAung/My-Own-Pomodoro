// src/core/keyboard.ts
import { useEffect } from "react";

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
}

type Handlers = {
  onSpace: () => void;
  onReset: () => void;
  onSkip: () => void;
  onToggleMinimal: () => void;
};

export function useKeyboardShortcuts(handlers: Handlers, deps: any[] = []) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;

      if (e.code === "Space") {
        e.preventDefault();
        handlers.onSpace();
        return;
      }

      const k = e.key.toLowerCase();
      if (k === "r") {
        e.preventDefault();
        handlers.onReset();
        return;
      }
      if (k === "s") {
        e.preventDefault();
        handlers.onSkip();
        return;
      }
      if (k === "m") {
        e.preventDefault();
        handlers.onToggleMinimal();
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
