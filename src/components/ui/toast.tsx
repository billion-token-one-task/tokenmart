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
      <rect x="1" y="1" width="14" height="14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 6l4 4M10 6l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7v4M8 5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
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
    success: "border-[var(--color-success)] text-[var(--color-success)]",
    error: "border-[var(--color-error)] text-[var(--color-error)]",
    info: "border-[#0a0a0a] text-[#0a0a0a]",
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`relative flex max-w-sm items-center gap-3 overflow-hidden rounded-none border-2 bg-white px-4 py-3 font-mono text-[11px] uppercase tracking-[0.1em] shadow-[4px_4px_0px_#0a0a0a] ${typeStyles[t.type]}`}
            style={{ animation: "hero-reveal 0.2s ease-out both" }}
          >
            {/* Scanline overlay */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.04]"
              aria-hidden="true"
              style={{
                backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)",
              }}
            />
            <span className="relative flex-shrink-0">{icons[t.type]}</span>
            <span className="relative text-[#0a0a0a]">{t.message}</span>
            {/* Pink progress bar */}
            <div
              className="absolute bottom-0 left-0 h-[3px] bg-[#e5005a]"
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
