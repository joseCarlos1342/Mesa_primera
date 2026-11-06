"use client";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useEffect } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

const LOOK: Record<ToastType, { icon: typeof Info; iconClass: string; border: string }> = {
  success: { icon: CheckCircle2, iconClass: "text-[#5fd38d]", border: "border-[#2ecc71]/50" },
  error: { icon: XCircle, iconClass: "text-[#f08a7e]", border: "border-[#e74c3c]/60" },
  info: { icon: Info, iconClass: "text-brand-gold-light", border: "border-[#8b6b2e]/80" },
};

/** Aviso breve sobre la barra inferior. Se anuncia con `role="status"` (o `alert` si es error). */
export function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const { icon: Icon, iconClass, border } = LOOK[type];

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[250] mx-auto flex max-w-md items-center gap-3 rounded-lg border bg-[#120806] px-4 py-3.5 shadow-[0_16px_36px_-12px_rgba(0,0,0,0.85)] motion-safe:animate-[toast-in_220ms_cubic-bezier(0.16,1,0.3,1)] lg:bottom-8 ${border}`}
    >
      <Icon className={`h-6 w-6 shrink-0 ${iconClass}`} aria-hidden="true" />
      <p className="text-lg leading-snug text-text-premium">{message}</p>
    </div>
  );
}
