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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      data-agent-role="modal"
      data-agent-state="open"
    >
      <div className={`w-full ${maxWidth} grid-card rounded-lg shadow-2xl animate-in border-grid-orange/20`}>
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-grid-orange/8">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-grid-orange transition-colors p-1 rounded hover:bg-grid-orange/5"
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
