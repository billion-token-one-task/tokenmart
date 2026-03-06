"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const icons: Record<ToastType, ReactNode> = {
  success: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="#50e3c2" strokeWidth="1.5" />
      <path d="M5 8l2 2 4-4" stroke="#50e3c2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="#ee0000" strokeWidth="1.5" />
      <path d="M6 6l4 4M10 6l-4 4" stroke="#ee0000" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="#a1a1a1" strokeWidth="1.5" />
      <path d="M8 7v4M8 5v.5" stroke="#a1a1a1" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const typeStyles: Record<ToastType, string> = {
    success: "border-[rgba(80,227,194,0.3)] bg-[#0a0a0a]",
    error: "border-[rgba(238,0,0,0.3)] bg-[#0a0a0a]",
    info: "border-[rgba(255,255,255,0.1)] bg-[#0a0a0a]",
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-in relative flex max-w-sm items-center gap-3 overflow-hidden rounded-[6px] border px-4 py-3 text-[13px] text-[#ededed] shadow-[0_8px_30px_rgba(0,0,0,0.3)] ${typeStyles[t.type]}`}
          >
            <span className="flex-shrink-0">{icons[t.type]}</span>
            <span>{t.message}</span>
            <div
              className="absolute bottom-0 left-0 h-[2px] bg-[rgba(255,255,255,0.12)]"
              style={{ animation: "shrink-bar 4s linear forwards" }}
            />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes shrink-bar {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
