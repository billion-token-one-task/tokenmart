"use client";

import { useState, useEffect } from "react";

const TOKEN_STORAGE_KEYS = ["tokenmart_token", "session_token"] as const;
const SELECTED_AGENT_STORAGE_KEY = "selected_agent_id";

function readAuthTokenFromStorage(): string | null {
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
  const [token] = useState<string | null>(() => readAuthTokenFromStorage());
  return token;
}

export function useSelectedAgentId() {
  const [agentId, setAgentId] = useState<string | null>(() => getStoredSelectedAgentId());

  useEffect(() => {
    const onStorage = () => setAgentId(getStoredSelectedAgentId());
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
