"use client";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useEffect } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
    error: <XCircle className="w-5 h-5 text-red-400" />,
    info: <AlertCircle className="w-5 h-5 text-brand-gold" />,
  };

  const bgColors = {
    success: "bg-emerald-950/90 border-emerald-500/30",
    error: "bg-red-950/90 border-red-500/30",
    info: "bg-slate-900/90 border-brand-gold/30",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9, x: "-50%" }}
      animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
      exit={{ opacity: 0, y: 20, scale: 0.9, x: "-50%" }}
      className={`fixed bottom-24 left-1/2 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl border backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-w-[300px] ${bgColors[type]}`}
    >
      <div className="shrink-0">{icons[type]}</div>
      <p className="text-[11px] font-black uppercase tracking-widest text-white leading-tight">
        {message}
      </p>
    </motion.div>
  );
}
