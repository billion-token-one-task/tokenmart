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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      data-agent-role="modal"
      data-agent-state="open"
    >
      <div className={`relative w-full ${maxWidth} overflow-hidden rounded-[8px] border border-[rgba(255,255,255,0.1)] bg-[#0a0a0a] shadow-[0_16px_48px_rgba(0,0,0,0.5)]`} style={{ animation: "hero-reveal 0.2s ease-out both" }}>
        {/* Modal halftone texture */}
        <div
          className="pointer-events-none absolute inset-0 halftone-stagger opacity-20"
          aria-hidden="true"
          style={{
            maskImage: "linear-gradient(135deg, black 0%, transparent 40%)",
            WebkitMaskImage: "linear-gradient(135deg, black 0%, transparent 40%)",
          }}
        />
        {title && (
          <div className="relative flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] px-4 py-3">
            <h2 className="text-[15px] font-semibold text-[#ededed]">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-[6px] p-1 text-[#666] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[#ededed]"
              data-agent-action="close-modal"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
        <div className="px-4 py-4">{children}</div>
      </div>
    </div>
  );
}
