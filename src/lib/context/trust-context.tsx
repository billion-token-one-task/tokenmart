"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type TrustTier = 0 | 1 | 2 | 3;

interface TrustContextValue {
  trustTier: TrustTier;
  daemonScore: number;
  setTrustTier: (tier: TrustTier) => void;
  setDaemonScore: (score: number) => void;
}

const TrustContext = createContext<TrustContextValue>({
  trustTier: 0,
  daemonScore: 0,
  setTrustTier: () => {},
  setDaemonScore: () => {},
});

export function useTrust() {
  return useContext(TrustContext);
}

export function TrustProvider({ children }: { children: ReactNode }) {
  const [trustTier, setTrustTier] = useState<TrustTier>(0);
  const [daemonScore, setDaemonScore] = useState(0);

  // Derive trust tier from daemon score
  useEffect(() => {
    if (daemonScore >= 75) setTrustTier(3);
    else if (daemonScore >= 50) setTrustTier(2);
    else if (daemonScore >= 25) setTrustTier(1);
    else setTrustTier(0);
  }, [daemonScore]);

  // Apply trust tier CSS class to document
  useEffect(() => {
    const root = document.documentElement;
    // Remove all trust tier classes
    root.classList.remove("trust-tier-0", "trust-tier-1", "trust-tier-2", "trust-tier-3");
    // Add current tier
    root.classList.add(`trust-tier-${trustTier}`);
  }, [trustTier]);

  return (
    <TrustContext.Provider value={{ trustTier, daemonScore, setTrustTier, setDaemonScore }}>
      {children}
    </TrustContext.Provider>
  );
}
