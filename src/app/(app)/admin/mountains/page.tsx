"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  MountainCard,
  RuntimeHero,
  RuntimeSection,
} from "@/components/mission-runtime";
import {
  Badge,
  Button,
  Input,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from "@/components/ui";
import { authHeaders, useAuthState } from "@/lib/hooks/use-auth";
import { fetchJsonResult } from "@/lib/http/client-json";
import type { MountainSummary } from "@/lib/v2/types";

const visibilityOptions = [
  { value: "public", label: "Public" },
  { value: "scoped", label: "Scoped" },
  { value: "private", label: "Private" },
];

export default function MountainsPage() {
  const { token, ready: authReady } = useAuthState();
  const { toast } = useToast();
  const [mountains, setMountains] = useState<MountainSummary[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [title, setTitle] = useState("");
  const [thesis, setThesis] = useState("");
  const [targetProblem, setTargetProblem] = useState("");
  const [successCriteria, setSuccessCriteria] = useState("");
  const [domain, setDomain] = useState("");
  const [horizon, setHorizon] = useState("12 months");
  const [visibility, setVisibility] = useState("scoped");
  const [budget, setBudget] = useState("100000");
  const isLoading = !authReady || (Boolean(token) && (!hasLoaded || loading));

  useEffect(() => {
    if (!authReady || !token) return;

    let cancelled = false;

    async function loadMountains() {
      const result = await fetchJsonResult<{ mountains?: MountainSummary[] }>("/api/v2/mountains", {
        headers: authHeaders(token),
      });

      if (cancelled) return;

      if (!result.ok) {
        setError(result.errorMessage ?? "Failed to load mountains");
        setHasLoaded(true);
        setLoading(false);
        return;
      }

      setError(null);
      setMountains(result.data?.mountains ?? []);
      setHasLoaded(true);
      setLoading(false);
    }

    void loadMountains();

    return () => {
      cancelled = true;
    };
  }, [authReady, refreshKey, token]);

  const handleRefresh = useCallback(() => {
    if (!token) return;

    setLoading(true);
    setError(null);
    setRefreshKey((value) => value + 1);
  }, [token]);

  const activeCount = useMemo(
    () => mountains.filter((mountain) => mountain.status === "active").length,
    [mountains]
  );

  const handleCreate = async () => {
    if (!token) return;
    setCreating(true);
    const result = await fetchJsonResult<{ mountain?: MountainSummary }>("/api/v2/mountains", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(token),
      },
      body: JSON.stringify({
        title,
        thesis,
        target_problem: targetProblem,
        success_criteria: successCriteria,
        domain,
        horizon,
        visibility,
        total_budget_credits: Number(budget),
        budget_envelopes: {
          decomposition: Number(budget) * 0.1,
          execution: Number(budget) * 0.58,
          replication: Number(budget) * 0.16,
          synthesis: Number(budget) * 0.1,
          emergency: Number(budget) * 0.06,
        },
      }),
    });
    setCreating(false);

    if (!result.ok) {
      toast(result.errorMessage ?? "Failed to create mountain", "error");
      return;
    }

    toast("Mountain created and staged for operator launch", "success");
    setTitle("");
    setThesis("");
    setTargetProblem("");
    setSuccessCriteria("");
    setDomain("");
    setHorizon("12 months");
    setVisibility("scoped");
    setBudget("100000");
    void handleRefresh();
  };

  return (
    <div className="max-w-7xl space-y-8">
      <PageHeader
        title="Mountain Builder"
        description="Create the canonical mission umbrellas that the supervisor decomposes into campaigns, work specs, and reward flows."
        section="admin"
        actions={
          <Button variant="secondary" onClick={() => void handleRefresh()} disabled={isLoading}>
            Refresh mountains
          </Button>
        }
      />

      {error ? (
        <div className="border-2 border-[rgba(213,61,90,0.4)] bg-[rgba(213,61,90,0.08)] px-4 py-3 font-mono text-[12px] uppercase tracking-[0.08em] text-[var(--color-error)]">
          {error}
        </div>
      ) : null}

      <RuntimeHero
        eyebrow="Operator Builder"
        title="Fund an impossible problem deliberately."
        description="Admin decides the mountain, the budget, and the acceptance logic. The rest of the stack should then decompose, lease, verify, and narrate that mission without losing control."
        badges={[
          `${mountains.length} mountains`,
          `${activeCount} active`,
          "Budget envelopes baked in",
          "Supervisor-first orchestration",
        ]}
      />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <RuntimeSection
          eyebrow="Create"
          title="New mountain"
          detail="This form keeps the operator inputs plain English while still producing a machine-usable mission contract."
        >
          <div className="space-y-4 border-2 border-[#0a0a0a] bg-white px-4 py-4">
            <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <Textarea
              label="Core thesis"
              value={thesis}
              onChange={(event) => setThesis(event.target.value)}
              placeholder="Why tokens plus supervisor-guided cooperation should move this frontier."
            />
            <Textarea
              label="Target problem"
              value={targetProblem}
              onChange={(event) => setTargetProblem(event.target.value)}
              placeholder="The hard science, math, or academic problem this mountain exists to attack."
            />
            <Textarea
              label="Success criteria"
              value={successCriteria}
              onChange={(event) => setSuccessCriteria(event.target.value)}
              placeholder="How the supervisor should decide this mission has genuinely advanced."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Domain" value={domain} onChange={(event) => setDomain(event.target.value)} />
              <Input label="Horizon" value={horizon} onChange={(event) => setHorizon(event.target.value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Visibility"
                options={visibilityOptions}
                value={visibility}
                onChange={(event) => setVisibility(event.target.value)}
              />
              <Input
                label="Budget credits"
                type="number"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => void handleCreate()} loading={creating} disabled={!title || !thesis || !targetProblem || !successCriteria || !domain}>
                Create mountain
              </Button>
            </div>
          </div>
        </RuntimeSection>

        <RuntimeSection
          eyebrow="Portfolio"
          title="Current mountains"
          detail="Each mountain should read clearly as a mission contract, not just a task bucket."
        >
          {isLoading ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <Skeleton className="h-72 rounded-none" />
              <Skeleton className="h-72 rounded-none" />
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {mountains.map((mountain) => (
                <MountainCard
                  key={mountain.id}
                  href={`/admin/mountains/${mountain.id}`}
                  name={mountain.title}
                  status={<Badge variant={mountain.status === "active" ? "success" : "outline"}>{mountain.status}</Badge>}
                  ridge={`${mountain.domain} / ${mountain.horizon}`}
                  contract={mountain.thesis}
                  lease={`${mountain.active_lease_count} active`}
                  deliverables={`${mountain.verified_deliverable_count} verified`}
                  note={`${mountain.progress_percent}% progress · ${mountain.campaign_count} campaigns`}
                  updatedAt={mountain.updated_at}
                />
              ))}
            </div>
          )}
        </RuntimeSection>
      </div>
    </div>
  );
}
