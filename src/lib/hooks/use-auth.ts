"use client";

import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { createBrowserClient } from "@/lib/supabase/client";

const TOKEN_STORAGE_KEYS = ["tokenmart_token", "session_token"] as const;
const SELECTED_AGENT_STORAGE_KEY = "selected_agent_id";

function readLegacyAuthTokenFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  for (const key of TOKEN_STORAGE_KEYS) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }
  return null;
}

export function getStoredSelectedAgentId(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SELECTED_AGENT_STORAGE_KEY);
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

export function setStoredSelectedAgentId(agentId: string | null) {
  if (typeof window === "undefined") return;
  const trimmed = agentId?.trim();
  if (!trimmed) {
    localStorage.removeItem(SELECTED_AGENT_STORAGE_KEY);
    return;
  }
  localStorage.setItem(SELECTED_AGENT_STORAGE_KEY, trimmed);
}

export function clearStoredSelectedAgentId() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SELECTED_AGENT_STORAGE_KEY);
}

export function useAuthToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();

    const syncToken = async (session?: Session | null) => {
      if (session?.access_token) {
        setToken(session.access_token);
        return;
      }
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setToken(currentSession?.access_token ?? readLegacyAuthTokenFromStorage());
    };

    void syncToken();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncToken(session);
    });
    const onStorage = () => void syncToken();
    window.addEventListener("storage", onStorage);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return token;
}

export function useAuthState() {
  const [state, setState] = useState<{ token: string | null; ready: boolean }>({
    token: null,
    ready: false,
  });

  useEffect(() => {
    const supabase = createBrowserClient();

    const syncState = async (session?: Session | null) => {
      if (session?.access_token) {
        setState({ token: session.access_token, ready: true });
        return;
      }
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setState({
        token: currentSession?.access_token ?? readLegacyAuthTokenFromStorage(),
        ready: true,
      });
    };

    void syncState();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncState(session);
    });
    const onStorage = () => void syncState();
    window.addEventListener("storage", onStorage);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return state;
}

export function useSelectedAgentId() {
  const [agentId, setAgentId] = useState<string | null>(null);

  useEffect(() => {
    const onStorage = () => setAgentId(getStoredSelectedAgentId());

    onStorage();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const updateAgentId = (nextAgentId: string | null) => {
    setStoredSelectedAgentId(nextAgentId);
    setAgentId(getStoredSelectedAgentId());
  };

  return { selectedAgentId: agentId, setSelectedAgentId: updateAgentId };
}

export function authHeaders(
  token: string | null,
  options?: { agentId?: string | null; includeSelectedAgent?: boolean }
): Record<string, string> {
  if (!token) return {};

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const includeSelectedAgent = options?.includeSelectedAgent ?? true;
  const selectedAgent =
    options?.agentId !== undefined
      ? options.agentId?.trim() || null
      : includeSelectedAgent
        ? getStoredSelectedAgentId()
        : null;

  if (selectedAgent) {
    headers["X-Agent-Id"] = selectedAgent;
  }

  return headers;
}
