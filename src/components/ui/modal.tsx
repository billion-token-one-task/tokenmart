"use client";

import { useEffect, useRef, ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, maxWidth = "max-w-lg" }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      data-agent-role="modal"
      data-agent-state="open"
    >
      <div className={`w-full ${maxWidth} glass-panel border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.4),0_0_40px_oklch(0.4_0.08_230/0.06)] grain-overlay`} style={{ animation: "hero-reveal 0.5s cubic-bezier(0.22,1,0.36,1) both" }}>
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
            <h2 className="text-[15px] font-semibold text-[#ededed]">{title}</h2>
            <button
              onClick={onClose}
              className="text-[#666] hover:text-[#ededed] transition-colors p-1 rounded-lg hover:bg-[rgba(255,255,255,0.04)]"
              data-agent-action="close-modal"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
