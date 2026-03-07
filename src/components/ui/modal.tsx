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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,10,10,0.6)] p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      data-agent-role="modal"
      data-agent-state="open"
    >
      <div
        className={`relative w-full ${maxWidth} overflow-hidden rounded-none border-2 border-[#0a0a0a] bg-white shadow-[6px_6px_0px_#0a0a0a]`}
        style={{ animation: "hero-reveal 0.2s ease-out both" }}
      >
        {/* Pink top accent stripe */}
        <div className="h-[3px] w-full bg-[#e5005a]" />

        {/* Scanline overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          aria-hidden="true"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)",
          }}
        />

        {/* Viewfinder brackets */}
        <span className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-[#e5005a] pointer-events-none" aria-hidden="true" />
        <span className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-[#e5005a] pointer-events-none" aria-hidden="true" />
        <span className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-[#e5005a] pointer-events-none" aria-hidden="true" />
        <span className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-[#e5005a] pointer-events-none" aria-hidden="true" />

        {title && (
          <div className="relative flex items-center justify-between border-b-2 border-[#0a0a0a] px-4 py-3">
            <div className="flex items-center gap-3">
              {/* Barcode decoration */}
              <span className="inline-flex items-center gap-px opacity-30" aria-hidden="true">
                <span className="inline-block w-[1px] h-3 bg-[#0a0a0a]" />
                <span className="inline-block w-[2px] h-3 bg-[#0a0a0a]" />
                <span className="inline-block w-[1px] h-3 bg-[#0a0a0a]" />
                <span className="inline-block w-[2px] h-3 bg-[#0a0a0a]" />
              </span>
              <h2 className="font-display text-[1.1rem] font-black uppercase tracking-tight text-[#0a0a0a]">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-none border-2 border-[#0a0a0a] p-1 text-[#0a0a0a] transition-all duration-100 hover:bg-[#e5005a] hover:border-[#e5005a] hover:text-white"
              data-agent-action="close-modal"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
              </svg>
            </button>
          </div>
        )}
        <div className="relative px-4 py-4">{children}</div>
      </div>
    </div>
  );
}
