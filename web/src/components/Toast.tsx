// src/components/Toast.tsx
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  text: string;
  durationSec?: number; // default 3
  onClose: () => void;
};

export default function Toast({ open, text, durationSec = 3, onClose }: Props) {
  const [left, setLeft] = useState(durationSec);

  useEffect(() => {
    if (!open) return;
    setLeft(durationSec);

    const t = window.setInterval(() => {
      setLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(t);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(t);
  }, [open, durationSec, onClose]);

  if (!open) return null;

  return (
    <div className="toast" role="status" aria-live="polite">
      <div className="toastText">{text}</div>
      <button className="toastBtn" type="button" onClick={onClose}>
        OK ({left})
      </button>
    </div>
  );
}
