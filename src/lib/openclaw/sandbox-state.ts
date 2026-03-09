import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  OpenClawSandboxArtifact,
  OpenClawSandboxRunRecord,
  OpenClawSandboxSnapshot,
  OpenClawSandboxStatus,
} from "./sandbox-types";

function normalizeJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function getOpenClawSandboxRoot() {
  return process.env.OPENCLAW_SANDBOX_ROOT?.trim() || path.join(process.cwd(), ".tmp", "openclaw-suite");
}

export function getOpenClawSandboxRunsRoot() {
  return process.env.OPENCLAW_SANDBOX_RUNS_ROOT?.trim() || path.join(getOpenClawSandboxRoot(), "runs");
}

export function getOpenClawSandboxRunPath(runId: string) {
  return path.join(getOpenClawSandboxRunsRoot(), `${runId}.json`);
}

export function getOpenClawSandboxRunLogPath(runId: string) {
  return path.join(getOpenClawSandboxRunsRoot(), `${runId}.log`);
}

export function getOpenClawSandboxCliCacheRoot() {
  return process.env.OPENCLAW_SANDBOX_CACHE_ROOT?.trim() || path.join(process.cwd(), ".cache", "openclaw-cli");
}

export async function ensureOpenClawSandboxRunsRoot() {
  await mkdir(getOpenClawSandboxRunsRoot(), { recursive: true });
}

export async function annotateArtifacts(
  artifacts: OpenClawSandboxArtifact[],
): Promise<OpenClawSandboxArtifact[]> {
  return Promise.all(
    artifacts.map(async (artifact) => {
      try {
        const artifactStat = await stat(artifact.path);
        return {
          ...artifact,
          exists: true,
          sizeBytes: artifactStat.size,
        };
      } catch {
        return {
          ...artifact,
          exists: false,
          sizeBytes: null,
        };
      }
    }),
  );
}

export async function readOpenClawSandboxRun(runId: string): Promise<OpenClawSandboxRunRecord | null> {
  try {
    const raw = await readFile(getOpenClawSandboxRunPath(runId), "utf8");
    const parsed = JSON.parse(raw) as OpenClawSandboxRunRecord;
    parsed.retainedArtifacts = await annotateArtifacts(parsed.retainedArtifacts ?? []);
    parsed.scenariosDetail = await Promise.all(
      (parsed.scenariosDetail ?? []).map(async (record) => ({
        ...record,
        artifacts: await annotateArtifacts(record.artifacts ?? []),
      })),
    );
    return parsed;
  } catch {
    return null;
  }
}

export async function writeOpenClawSandboxRun(record: OpenClawSandboxRunRecord) {
  await ensureOpenClawSandboxRunsRoot();
  const normalized = normalizeJson(record);
  await writeFile(
    getOpenClawSandboxRunPath(record.id),
    JSON.stringify(normalized, null, 2) + "\n",
    "utf8",
  );
  return normalized;
}

export async function listOpenClawSandboxRuns(limit = 12): Promise<OpenClawSandboxRunRecord[]> {
  await ensureOpenClawSandboxRunsRoot();
  const entries = await readdir(getOpenClawSandboxRunsRoot(), { withFileTypes: true });
  const runIds = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name.replace(/\.json$/, ""));

  const runs = (
    await Promise.all(runIds.map((runId) => readOpenClawSandboxRun(runId)))
  ).filter((run): run is OpenClawSandboxRunRecord => Boolean(run));

  return runs
    .sort((left, right) => {
      const leftTime = Date.parse(left.startedAt) || 0;
      const rightTime = Date.parse(right.startedAt) || 0;
      return rightTime - leftTime;
    })
    .slice(0, limit);
}

export async function collectRetainedArtifacts(runs: OpenClawSandboxRunRecord[], limit = 24) {
  const artifacts: OpenClawSandboxArtifact[] = [];
  const seen = new Set<string>();

  for (const run of runs) {
    for (const artifact of run.retainedArtifacts ?? []) {
      const key = `${artifact.kind}:${artifact.path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      artifacts.push(artifact);
      if (artifacts.length >= limit) {
        return artifacts;
      }
    }
  }

  return artifacts;
}

export function deriveSnapshotStatus(snapshot: Pick<OpenClawSandboxSnapshot, "latestRun">): OpenClawSandboxStatus {
  return snapshot.latestRun?.status ?? "idle";
}

export function sandboxLogExists(runId: string) {
  return existsSync(getOpenClawSandboxRunLogPath(runId));
}
