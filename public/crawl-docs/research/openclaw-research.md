# OpenClaw Research: Complete Architecture & Systems Deep Dive

**Research Date:** 2026-03-09
**Latest Version:** v2026.3.7 (released 2026-03-08)
**GitHub Stars:** 250,000+ | Forks: 48,800+ | Commits: 17,657 | Contributors: 600+
**License:** MIT
**Creator:** Peter Steinberger (Austrian developer, formerly PSPDFKit founder; joined OpenAI in 2026)
**History:** Clawdbot (Nov 2025) -> Moltbot -> OpenClaw (naming disputes with Anthropic)

---

## Table of Contents

1. [Complete Architecture](#1-complete-architecture)
2. [SKILL.md File Format Specification](#2-skillmd-file-format-specification)
3. [HEARTBEAT.md System](#3-heartbeatmd-system)
4. [Cron System](#4-cron-system)
5. [Skill Precedence Rules](#5-skill-precedence-rules)
6. [Skill Discovery & Loading](#6-skill-discovery--loading)
7. [2025-2026 Updates & Releases](#7-2025-2026-updates--releases)
8. [MoltBook Skill Structure](#8-moltbook-skill-structure)
9. [Sources](#9-sources)

---

## 1. Complete Architecture

### What OpenClaw Is

OpenClaw is a **local-first, self-hosted AI agent runtime** (not a library like LangChain/CrewAI). You install it, configure it, and it runs continuously on your hardware. It connects to LLMs (Anthropic Claude, OpenAI GPT, Google Gemini, local models) and messaging platforms (WhatsApp, Telegram, Discord, Slack, Signal, iMessage, LINE, Feishu, Mattermost, Synology Chat).

It is NOT another LLM -- it is an **orchestration layer** that gives existing models eyes, ears, and hands.

### High-Level Architecture

```
Messaging Surfaces ──> Gateway Daemon ──> Agent Runtime ──> LLM Providers
(WhatsApp/Telegram/    (Channel Bridges,   (Prompt Assembly,   (Anthropic/OpenAI/
Discord/Slack/Signal)   Sessions, Queues,   Tool Execution,     Google/Local)
                        Plugins, Auth)      Memory Search)
```

### The Gateway (Central Hub)

The Gateway is a **single long-lived Node.js daemon** that acts as the control plane:

- Owns all messaging surfaces (channels)
- Exposes a WebSocket API
- Emits system events (cron, heartbeat)
- Routes messages through access control
- Resolves session targets
- Coordinates system state (sessions, presence, health, cron)
- Enforces security (token/password auth for non-loopback)
- Manages a pairing system for DMs

### Agent Loop (6-Stage Execution Pipeline)

1. **Channel normalization** -- Platform event becomes internal envelope
2. **Session resolution** -- Routes to session key based on `dmScope` rules
3. **Command queue serialization** -- Prevents concurrent run collisions (single-writer pattern)
4. **Prompt assembly** -- Constructs dynamic system prompt from workspace files, skills, memory
5. **Model inference** -- Streams assistant deltas as events
6. **Tool execution** -- Agentic loop between inference rounds
7. **Memory persistence** -- Saves transcript and session state

### System Prompt Assembly

The system prompt is dynamically constructed per-run:

```
System Prompt =
  Tooling (available tools + descriptions)
+ Safety (guardrails)
+ Skills (available skill list with file paths)
+ Self-Update instructions
+ Workspace info
+ Documentation pointers
+ Current Date & Time (timezone-aware)
+ Reply Tags
+ Heartbeat contract
+ Runtime metadata (host/OS/model/thinking level)
+ ── Project Context ──
+ AGENTS.md (operating instructions)
+ SOUL.md (persona/tone)
+ TOOLS.md (local tool notes)
+ IDENTITY.md (agent name/vibe)
+ USER.md (user profile)
+ HEARTBEAT.md (periodic task checklist)
+ MEMORY.md (long-term curated insights)
```

**Bootstrap file truncation:**
- Per-file max: `agents.defaults.bootstrapMaxChars` (default: 20,000 chars)
- Total cap: `agents.defaults.bootstrapTotalMaxChars` (default: 150,000 chars)
- Sub-agent sessions only get `AGENTS.md` + `TOOLS.md`

### Memory Architecture (4-Layer System)

| Layer | Storage | Scope | Behavior |
|-------|---------|-------|----------|
| Session Context | Context window (JSONL transcript) | Current conversation | Auto-compacted when approaching limits |
| Daily Logs | `memory/YYYY-MM-DD.md` | Per-day notes | Append-only, loaded on demand |
| Long-term Memory | `MEMORY.md` | Curated insights | Only in private sessions |
| Semantic Vector Search | SQLite + embeddings | Cross-session recall | 70% semantic + 30% BM25 hybrid scoring |

**Vector search specs:**
- Chunking: ~400 tokens with 80-token overlap
- Embedding providers: local GGUF -> OpenAI -> Google (with fallback)
- Auto-reindex when providers/parameters change

**Pre-compaction flush:** When approaching context limits, a silent agentic turn (`NO_REPLY` token) reminds the model to write durable notes before summarization.

### Session Management

**Session key patterns:**
- Direct messages: `agent:<agentId>:<mainKey>` (dmScope: "main")
- Per-peer: `agent:<agentId>:dm:<peerId>`
- Group chats: `agent:<agentId>:<channel>:group:<id>`
- Sub-agents: `agent:<agentId>:subagent:<uuid>`
- Cron: `cron:<jobId>`

**Session lifecycle:**
- Daily reset (default 4:00 AM local time)
- Idle reset (optional sliding window)
- Manual reset via `/new` or `/reset`
- Persistence: JSONL at `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

### Queue System

- **Global lane:** max 4 concurrent (configurable)
- **Session lane:** concurrency 1 (strict serial)
- **Sub-agent lane:** concurrency 8
- **Cron lane:** parallel with main

**Queue modes** (how inbound messages interact with active runs):
- `collect` -- coalesce queued messages into single followup
- `steer` -- inject into current run, cancel pending tool calls
- `followup` -- wait for run completion, then start new turn
- `steer-backlog` -- steer now AND preserve for later

### Tool Ecosystem

**Core tools always available:**
- File: `read`, `write`, `edit`
- Shell: `exec`, `process`
- Browser: CDP-based automation
- Web: `web_search`, `web_fetch`
- Messaging: `message` (cross-channel)
- Scheduling: `cron` management
- Memory: `memory_search`, `memory_get`
- Sub-agents: `sessions_spawn`, `sessions_send`, `sessions_history`
- Nodes: device control (camera, screen, location)
- Self-management: `gateway` restart/config/update

**Tool policy (layered):**
Global deny -> Per-agent deny -> Global allow -> Per-agent allow -> Default

### Multi-Agent (Sub-Agents)

- Spawn via `sessions_spawn("task")` -- returns immediately
- Isolated session: `agent:<agentId>:subagent:<uuid>`
- Own context window and tool execution
- Restricted tools (no spawning, listing, or session management)
- Results announced back with status and metrics
- No nesting (prevents fan-out)
- Auto-archived after configurable timeout (default 60 min)
- Dedicated concurrency lane (default max 8)

### Hook Points & Extensibility

**Internal hooks:**
- `agent:bootstrap` -- before system prompt finalized
- `/new`, `/reset`, `/stop` commands

**Plugin lifecycle hooks:**
- `before_model_resolve`, `before_prompt_build`, `before_agent_start`
- `agent_end`, `before_compaction`, `after_compaction`
- `before_tool_call`, `after_tool_call`, `tool_result_persist`
- `message_received`, `message_sending`, `message_sent`
- `session_start`, `session_end`
- `gateway_start`, `gateway_stop`
- `session:compact:before`, `session:compact:after` (v2026.3.7)

**Plugin capabilities:**
- Gateway RPC methods and HTTP handlers
- Agent tools
- CLI commands
- Background services
- Skills via manifest
- Auto-reply commands
- ContextEngine plugin slot (v2026.3.7: `bootstrap`, `ingest`, `assemble`, `compact`, `afterTurn`, `prepareSubagentSpawn`, `onSubagentEnded`)

---

## 2. SKILL.md File Format Specification

### Directory Structure

```
skill-name/
├── SKILL.md          # REQUIRED: instructions + metadata
├── scripts/          # Optional: executable code (Python/Bash/JS/etc.)
├── references/       # Optional: documentation loaded into context on demand
└── assets/           # Optional: templates, images, fonts (NOT loaded into context)
```

### SKILL.md File Format

Every SKILL.md has two parts: **YAML frontmatter** and a **Markdown body**.

#### Frontmatter (Required Fields)

```yaml
---
name: my-skill
description: What this skill does and when to use it. Be comprehensive -- this is the primary trigger mechanism.
---
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | string | **YES** | Max 64 chars, lowercase letters/numbers/hyphens only, must match directory name. No spaces, no leading/trailing/consecutive hyphens. |
| `description` | string | **YES** | Max 1024 chars. No angle brackets (`<` or `>`). This is the ONLY thing the agent sees at session start. Include "when to use" guidance here. |

**CRITICAL:** These are the ONLY two fields the agent reads at session start to decide relevance. The description serves as the primary trigger mechanism.

#### Frontmatter (Optional Fields)

| Field | Type | Description |
|-------|------|-------------|
| `license` | string | License name or reference (e.g., "MIT", "Apache-2.0") |
| `compatibility` | string | Max 500 chars, environment requirements (e.g., "Requires git, docker") |
| `metadata` | JSON object | Single-line JSON only. Contains `openclaw` gating config. Flat key-value pairs (string keys to string values). |
| `allowed-tools` | string | Space-delimited list of pre-approved tools (experimental). E.g., `Read Write Bash(git:)` |
| `homepage` | string | Website URL for Skills UI |
| `user-invocable` | boolean | Default: true. Expose as slash command. |
| `disable-model-invocation` | boolean | Default: false. Exclude from model prompt. |
| `command-dispatch` | string | Set to `tool` to bypass model and dispatch directly to tool |
| `command-tool` | string | Tool name for dispatch |
| `command-arg-mode` | string | Set to `raw` to pass unprocessed args string to tool |
| `argument-hint` | string | Document expected arguments for autocomplete |

**DO NOT include:** `version`, `author`, `homepage`, `category` -- the validator auto-strips these if present, or flattens nested objects in metadata.

#### metadata.openclaw Object (Gating Configuration)

Must be **single-line JSON** in the frontmatter:

```yaml
metadata: {"openclaw":{"emoji":"🔧","os":["darwin","linux"],"always":false,"primaryEnv":"MY_API_KEY","requires":{"bins":["python3","pip"],"anyBins":["ffmpeg","avconv"],"env":["API_KEY"],"config":["channels.slack"]}}}
```

| Gate | Type | Purpose |
|------|------|---------|
| `emoji` | string | Visual icon for macOS Skills UI |
| `homepage` | string | Documentation URL in Skills UI |
| `os` | string[] | Restrict to platforms: `"darwin"`, `"linux"`, `"win32"` |
| `always` | boolean | Force skill to always load, skip all eligibility filters |
| `primaryEnv` | string | Associates env var with `skills.entries.<name>.apiKey` |
| `skillKey` | string | Override default skill identifier |
| `requires.bins` | string[] | ALL listed binaries must exist on PATH |
| `requires.anyBins` | string[] | At least ONE binary must exist on PATH |
| `requires.env` | string[] | Environment variable must exist or be provided in config |
| `requires.config` | string[] | Configuration paths must be truthy (e.g., `channels.slack`) |

**If no `metadata.openclaw` exists, the skill is always eligible** unless explicitly disabled via config.

#### Install Specifications

```yaml
metadata: {"openclaw":{"install":[{"id":"brew","kind":"brew","formula":"gemini-cli","bins":["gemini"],"label":"Install Gemini CLI (brew)","os":["darwin"]}]}}
```

Supported installer kinds:
- `brew` -- Homebrew formula
- `node` -- npm package (configurable via `skills.install.nodeManager`: npm/pnpm/yarn/bun)
- `go` -- Go packages (auto-installs Go via Homebrew if missing)
- `download` -- Direct file download
  - Fields: `url` (required), `archive` (tar.gz/tar.bz2/zip), `extract` (auto-detected), `stripComponents`, `targetDir` (default: `~/.openclaw/tools/<skillKey>`)

#### Markdown Body (Instructions)

The body is loaded **only after** the skill triggers (progressive disclosure). Guidelines:

- Keep under **500 lines** -- move extensive content into `references/`
- Structure with clear headings: Purpose, When to use, How it works, Boundaries
- Use `{baseDir}` token to reference the skill folder path
- Include examples with few-shot patterns
- Define guardrails (what the skill does NOT do)
- Make instructions specific and directive (these are instructions FOR the agent)

**Recommended body structure:**

```markdown
# SKILL.md -- [Name]

## Purpose
One sentence: what does this skill enable?

## When to use
Clear triggers and scenarios.

## How it works
Specific step-by-step instructions.

## Boundaries
What this skill does NOT do.

## Tool access
Which tools this skill uses and how.

## Examples
Concrete input/output examples.
```

#### Dynamic Arguments (for slash commands)

```yaml
---
description: Fix issue by number
argument-hint: [issue-number]
---

Fix issue #$ARGUMENTS following our coding standards.
```

Positional: `$1`, `$2`, `$3`. File references: `@$1` includes file contents.

#### Bundled Resources

**scripts/** -- Executable code for deterministic reliability. Executed directly without reading into context (token-efficient). Use JSON output for structured data.

**references/** -- Documentation loaded as needed. Keeps SKILL.md lean while making detailed info discoverable. Keep one level deep.

**assets/** -- Files used in output (templates, images, fonts). NOT loaded into context.

---

## 3. HEARTBEAT.md System

### What It Is

The heartbeat is a **built-in periodic check-in loop**. Every N minutes (default: 30m), OpenClaw fires a full agent turn in the main session. The agent reads HEARTBEAT.md (if it exists) as a checklist and surfaces anything important.

### How It Works

```
┌──────────┐   ┌──────────┐   ┌──────────────────┐
│ Timer    │──>│ Agent    │──>│ HEARTBEAT_OK      │──> Suppressed
│ (30m)    │   │ Turn     │   │ (nothing urgent)  │
└──────────┘   └────┬─────┘   └──────────────────┘
                     │
                     ├──────────> Alert text ──> Delivered to chat
                     │
                     └──────────> Background work (memory maintenance,
                                 file organization, etc.)
```

Each heartbeat tick is a **full agent turn** -- the AI uses its entire reasoning, all tools, all memory, just like a direct command. It runs in the **main session context** (shares the user's "desk" -- recent chats, files, tasks in progress).

### HEARTBEAT.md File

A simple markdown checklist that the agent reads every heartbeat:

```markdown
# Heartbeat checklist
- Check email for urgent messages
- Review calendar for events in next 2 hours
- If a background task finished, summarize results
- If idle for 8+ hours, send a brief check-in
```

**Key properties:**
- Optional (without it, agent uses general awareness)
- Lives in workspace root
- Agent reads it strictly each heartbeat
- Can be modified by the agent via chat requests
- Don't store secrets (becomes prompt context)
- OpenClaw skips runs if file contains only blank lines and headers (saves API calls)

### Default Heartbeat Prompt

```
Read HEARTBEAT.md if it exists (workspace context). Follow it strictly.
Do not infer or repeat old tasks from prior chats.
If nothing needs attention, reply HEARTBEAT_OK.
```

### Response Contract (HEARTBEAT_OK)

| Behavior | Rule |
|----------|------|
| Start/end of reply | Recognized as acknowledgment |
| Stripping | Token removed; message dropped if remaining content <= `ackMaxChars` (default: 300) |
| Alert | Omit HEARTBEAT_OK entirely; return only alert text |
| Mid-message | No special treatment |

### Configuration

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",                    // interval (duration string; "0m" disables)
        model: "anthropic/claude-opus-4-6",  // optional model override
        target: "none",                  // none | last | <channel id>
        to: "+15551234567",             // optional channel-specific recipient
        accountId: "ops-bot",           // optional multi-account channel id
        prompt: "Read HEARTBEAT.md...", // custom prompt override
        ackMaxChars: 300,               // max chars after HEARTBEAT_OK
        lightContext: false,            // true = only HEARTBEAT.md from bootstrap
        includeReasoning: false,        // deliver separate Reasoning: message
        suppressToolErrorWarnings: false,
        directPolicy: "allow",          // DM delivery: "allow" | "block"
        session: "main",                // session override key
      }
    }
  }
}
```

### Active Hours

```json5
activeHours: {
  start: "08:00",    // inclusive (HH:MM)
  end: "22:00",      // exclusive (HH:MM, "24:00" allowed)
  timezone: "America/Los_Angeles"  // IANA identifier or "user"/"local"
}
```

Outside the window, heartbeats skip until the next scheduled tick inside.

### Scope & Precedence (Bottom Overrides Top)

1. `agents.defaults.heartbeat`
2. `agents.list[].heartbeat` (per-agent, merges on defaults)
3. `channels.defaults.heartbeat`
4. `channels.<channel>.heartbeat`
5. `channels.<channel>.accounts.<id>.heartbeat` (multi-account)

**Per-agent rule:** If any agent in `agents.list[]` includes a `heartbeat` block, only those agents run heartbeats.

### Visibility Controls (Per-Channel)

| Control | Default | Purpose |
|---------|---------|---------|
| `showOk` | false | Send HEARTBEAT_OK acknowledgments |
| `showAlerts` | true | Send alert content |
| `useIndicator` | true | Emit indicator events for UI |

If all three are false, the heartbeat run is skipped entirely.

### Operational Notes

- Heartbeat replies do NOT extend session idle expiry (`updatedAt` restored)
- If main queue is busy, heartbeat is skipped and retried
- Manual trigger: `openclaw system event --text "message" --mode now`
- Defer to next tick: `--mode next-heartbeat`
- Full model tokens consumed each heartbeat -- keep HEARTBEAT.md brief

---

## 4. Cron System

### Overview

Cron is the Gateway's built-in scheduler. It persists jobs, wakes the agent at the right time, and optionally delivers output to chat. Jobs stored at `~/.openclaw/cron/jobs.json`.

### Schedule Types

| Type | CLI Flag | Description |
|------|----------|-------------|
| **At (one-shot)** | `--at "2026-02-01T16:00:00Z"` or `--at "20m"` | ISO 8601 timestamp or relative duration. Auto-deletes after success by default. |
| **Every (interval)** | `--every` | Millisecond-based recurring execution via `everyMs` |
| **Cron (expression)** | `--cron "0 7 * * *"` | 5 or 6-field cron expression. Uses `croner` library. |

### Session Targets

| Target | Flag | Payload Kind | Behavior |
|--------|------|-------------|----------|
| **Main** | `--session main` | `systemEvent` | Injects event into main conversation. Has full tool access. Can interrupt busy conversations. |
| **Isolated** | `--session isolated` | `agentTurn` | Fresh session per run (`cron:<jobId>`). No conversation carryover. Prompt prefixed with `[cron:<jobId> <job name>]`. |

**Critical choice:** Sub-agents (isolated) often have restricted tool policies and cannot call `gateway` or delete other `cron` jobs. For system maintenance, always target `main` session via `systemEvent`.

### Delivery Modes

| Mode | Behavior |
|------|----------|
| `announce` | Deliver summary to target channel + brief summary to main session |
| `webhook` | POST to HTTP(S) endpoint (with optional `Authorization: Bearer <cron.webhookToken>`) |
| `none` | No delivery or summary |

### CLI Commands

**Create jobs:**

```bash
# One-shot reminder (auto-delete)
openclaw cron add \
  --name "Send reminder" \
  --at "2026-01-12T18:00:00Z" \
  --session main \
  --system-event "Reminder: submit expense report." \
  --wake now \
  --delete-after-run

# Recurring isolated with announce
openclaw cron add \
  --name "Morning status" \
  --cron "0 7 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize inbox + calendar for today." \
  --announce \
  --channel whatsapp \
  --to "+15551234567"

# With model/thinking override
openclaw cron add \
  --name "Deep analysis" \
  --cron "0 6 * * 1" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Weekly deep analysis." \
  --model "opus" \
  --thinking high \
  --announce \
  --channel whatsapp \
  --to "+15551234567"

# Agent pinning (multi-agent)
openclaw cron add \
  --name "Ops sweep" \
  --cron "0 6 * * *" \
  --session isolated \
  --message "Check ops queue" \
  --agent ops

# With stagger control
openclaw cron add \
  --name "Minute watcher" \
  --cron "0 * * * * *" \
  --tz "UTC" \
  --stagger 30s \
  --session isolated \
  --message "Run minute watcher checks." \
  --announce
```

**Manage jobs:**

```bash
openclaw cron list                    # List all jobs
openclaw cron status <jobId>          # Check job status
openclaw cron run <jobId>             # Force run
openclaw cron run <jobId> --due       # Run if due
openclaw cron edit <jobId> --message "Updated prompt" --model "opus"
openclaw cron edit <jobId> --exact    # Remove stagger
openclaw cron edit <jobId> --agent ops          # Assign agent
openclaw cron edit <jobId> --clear-agent        # Remove agent
openclaw cron remove <jobId>          # Delete job
openclaw cron runs --id <jobId> --limit 50      # Run history
```

**Immediate system event (no job storage):**

```bash
openclaw system event --mode now --text "Next heartbeat: check battery."
```

### JSON Schema (Tool Calls)

```json
{
  "name": "Morning brief",
  "schedule": { "kind": "cron", "expr": "0 7 * * *", "tz": "America/Los_Angeles" },
  "sessionTarget": "isolated",
  "wakeMode": "next-heartbeat",
  "payload": {
    "kind": "agentTurn",
    "message": "Summarize overnight updates.",
    "model": "anthropic/claude-sonnet-4-20250514",
    "thinking": "low",
    "lightContext": true,
    "timeoutSeconds": 120
  },
  "delivery": {
    "mode": "announce",
    "channel": "slack",
    "to": "channel:C1234567890",
    "bestEffort": true
  },
  "deleteAfterRun": false,
  "agentId": "ops",
  "description": "Daily briefing"
}
```

### Stagger Configuration

- Default: 5-minute deterministic stagger for top-of-hour recurring expressions
- Fixed-hour expressions (e.g., `0 7 * * *`) remain exact
- Override: `schedule.staggerMs` (0 for exact timing)
- CLI: `--stagger 30s` or `--exact`

### Retry Policy

**Transient errors (retried):** Rate limits, provider overload, network errors, 5xx, Cloudflare
**Permanent errors (immediate disable):** Auth failures, config errors, validation errors

**One-shot:** 3 retries with backoff (30s -> 1m -> 5m)
**Recurring:** Exponential backoff (30s -> 1m -> 5m -> 15m -> 60m), resets after success

### Configuration

```json5
{
  cron: {
    enabled: true,                              // or env OPENCLAW_SKIP_CRON=1
    store: "~/.openclaw/cron/jobs.json",
    maxConcurrentRuns: 1,
    retry: {
      maxAttempts: 3,
      backoffMs: [60000, 120000, 300000],
      retryOn: ["rate_limit", "overloaded", "network", "server_error"],
    },
    webhookToken: "replace-with-token",
    sessionRetention: "24h",                    // auto-cleanup
    runLog: { maxBytes: "2mb", keepLines: 2000 },
  }
}
```

### Cron vs Heartbeat Decision Framework

| Use Heartbeat When... | Use Cron When... |
|----------------------|-----------------|
| Multiple periodic checks to batch | Exact timing required |
| Context from recent conversations matters | Tasks need session isolation |
| Slight timing drift is acceptable | Different model/thinking level needed |
| Cost reduction through batching | One-shot reminders with precise timestamps |
| Smart suppression (HEARTBEAT_OK) desired | Delivery to specific channel required |

---

## 5. Skill Precedence Rules

### Three-Tier Hierarchy

| Priority | Location | Scope |
|----------|----------|-------|
| **Highest** | `<workspace>/skills/` | Per-agent only |
| **Middle** | `~/.openclaw/skills/` | Shared across all agents on machine |
| **Lowest** | Bundled skills (npm package or OpenClaw.app) | ~50 official skills |

### Additional Directories

- `skills.load.extraDirs` in `~/.openclaw/openclaw.json` -- scanned at **lowest** precedence
- Plugin skills via `openclaw.plugin.json` -- participate in standard precedence

### Multi-Agent Setup

- **Per-agent skills:** `<workspace>/skills/` -- visible only to that agent
- **Shared skills:** `~/.openclaw/skills/` -- accessible to all agents on same machine
- **Extra directories:** For multi-agent skill packs via config

### Conflict Resolution

If the same skill name exists in more than one location:
1. Workspace wins over managed/local
2. Managed/local wins over bundled
3. Extra directories have lowest precedence

### Configuration Override

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],      // Allowlist for bundled only
    entries: {
      "skill-name": {
        enabled: false,                         // Disable regardless of availability
        apiKey: { source: "env", provider: "default", id: "ENV_VAR" },
        env: { ENV_VAR: "value" },
        config: { customField: "value" },
      }
    },
    load: {
      extraDirs: ["/path/to/skills"],
      watch: true,
      watchDebounceMs: 250,
    },
    install: {
      preferBrew: true,
      nodeManager: "npm",                       // npm | pnpm | yarn | bun
    }
  }
}
```

---

## 6. Skill Discovery & Loading

### The Demand-Loading (Progressive Disclosure) Pattern

OpenClaw does NOT embed all skill instructions into every prompt. Instead:

1. **At session start:** Snapshot of eligible skills is created
2. **In system prompt:** Only compact metadata injected (~97 chars per skill)
3. **On demand:** Model explicitly reads `SKILL.md` via `read` tool when needed
4. **Hot reload:** Skills can refresh mid-session when watcher is enabled

This keeps prompts lean while enabling targeted tool use.

### System Prompt Injection Format

When eligible skills exist, OpenClaw injects an `<available_skills>` XML block:

```xml
<available_skills>
  <skill name="github" description="GitHub operations via gh CLI: issues, PRs, CI runs" location="/path/to/skills/github/SKILL.md" />
  <skill name="weather" description="Fetch weather data for cities" location="/path/to/skills/weather/SKILL.md" />
  ...
</available_skills>
```

The prompt instructs the model: "Use `read` to load the SKILL.md at the listed location when you need it."

### Token Impact Calculation

```
Base overhead: 195 characters (when >= 1 skill exists)
Per skill: 97 + len(XML-escaped name) + len(XML-escaped description) + len(XML-escaped location)
```

XML escaping expands `& < > " '` into entities. Rough estimate: ~24 tokens per skill.

### Eligibility Gating (Load-Time Filters)

Before a skill appears in `<available_skills>`, it must pass:

1. **OS check:** `metadata.openclaw.os` matches current platform
2. **Binary check:** All `requires.bins` exist on PATH; at least one `requires.anyBins` exists
3. **Env check:** Required environment variables exist or are provided in config
4. **Config check:** Required configuration paths are truthy
5. **Enabled check:** Not set to `enabled: false` in config
6. **Bundled check:** Not filtered by `allowBundled` whitelist
7. **Always override:** `always: true` skips all other filters

### Environment Injection Per Run

1. Metadata is read
2. Values from `skills.entries.<key>.env` or `apiKey` applied to `process.env`
3. System prompt includes eligible skills
4. Original environment restored after run completion

### Filesystem Watching

```json5
{
  skills: {
    load: {
      watch: true,          // Enable skill folder watching
      watchDebounceMs: 250  // Debounce interval
    }
  }
}
```

Changed skills/configs take effect on new sessions. Workspace/extra-dir discovery validates that resolved paths remain within configured roots (security).

### Remote macOS Node Skills

When Gateway runs on Linux with connected macOS nodes, OpenClaw can treat macOS-only skills as eligible when required binaries are present on that node. Skills execute via the `nodes` tool.

---

## 7. 2025-2026 Updates & Releases

### Version History & Release Cadence

OpenClaw uses **date-based versioning** (e.g., `2026.3.7`).

| Version | Date | Key Changes |
|---------|------|-------------|
| v2026.3.7 | 2026-03-08 | ContextEngine plugin slot, ACP persistent channel bindings, Telegram topic agent routing, per-agent compaction sections, Gemini 3.1 Flash-Lite support |
| v2026.3.2 | 2026-03-04 | SecretRef system (64 credential targets), PDF tool, MiniMax-M2.5-highspeed, Ollama embeddings for memory, heartbeat workspace-path guardrails |
| v2026.3.1 | 2026-03-01 | Adaptive thinking levels, health endpoints (`/health`, `/healthz`, `/ready`) |
| v2026.2.26 | 2026-02-26 | `openclaw secrets` CLI (audit, configure, apply, reload) |
| v2026.2.25 | 2026-02-25 | Various fixes |
| v2026.2.24 | 2026-02-24 | Natural language stop commands |

### Key Milestones

- **November 2025:** Launched as "Clawdbot" by Peter Steinberger
- **Late January 2026:** Renamed to "Moltbot" then "OpenClaw" due to trademark disputes with Anthropic
- **January 2026:** 100K GitHub stars in one week; 400+ malicious ClawHub skills discovered
- **February 2026:** VirusTotal partnership for skill scanning; OpenAI acquisition of Peter Steinberger
- **March 2026:** 250K+ stars, 48.8K forks, 1.5M weekly npm downloads

### Update Channels

Three channels available:
- **Stable** -- production environments
- **Beta** -- newer features, measured risk
- **Dev** -- main branch, latest changes

Managed via `openclaw update wizard` and `openclaw update status`.

### Security Incidents (2025-2026)

- 400+ malicious plugins in ClawHub (Feb 2026) -- led to VirusTotal partnership
- CVE-2026-25253 reported
- Fake GitHub repositories distributing infostealers (Steal Packer, GhostSocks, AMOS)
- Prompt injection attack vectors creating persistent C2 channels
- MoltBook database exposure (1.5M API keys)

### Key Resources

- **GitHub:** github.com/openclaw/openclaw
- **Docs:** docs.openclaw.ai
- **ClawHub (Skills):** clawhub.com (5,700+ skills)
- **Discord:** community.openclaw.ai
- **Changelog:** github.com/openclaw/openclaw/blob/main/CHANGELOG.md

---

## 8. MoltBook Skill Structure

### What MoltBook Is

MoltBook (moltbook.com) is "the front page of the agent internet" -- a Reddit-like social network specifically for AI agents. Agents post, comment, vote, and form communities ("submolts"). Launched by Matt Schlicht in late January 2026.

### MoltBook Skill Architecture

The MoltBook skill is considered "sophisticated" because it demonstrates the full skill pattern:

**Directory structure:**

```
moltbook/
├── SKILL.md              # Main skill definition with frontmatter
├── scripts/
│   ├── api.py            # General-purpose API client (all endpoints)
│   ├── post_comment.py   # Comment/reply with captcha + duplicate prevention
│   ├── create_post.py    # Create posts with captcha + duplicate prevention
│   ├── upload_avatar.py  # Avatar and banner management
│   ├── register.sh       # Agent registration
│   ├── setup_credentials.sh  # Save API key locally
│   ├── check_claim.sh    # Verify agent claim status
│   └── update-original-skill-files.sh  # Download latest + diff
└── references/
    ├── api-reference.md      # Full API endpoint documentation
    ├── community-rules.md    # Rate limits and content guidelines
    └── captcha-system.md     # Undocumented captcha system docs
```

### MoltBook Rate Limits

| Resource | Limit | Window |
|----------|-------|--------|
| General requests | 100 | 1 minute |
| Posts | 1 | 30 minutes |
| Comments | 50 | 1 hour |
| New agent (first 24h) | Stricter limits | 24 hours |

### MoltBook Heartbeat Integration

The MoltBook SKILL.md configures agents to check the platform periodically:
- Minimum interval: **4 hours** between platform checks
- During each heartbeat: browse content, decide whether to post/comment, return to dormancy
- Distinct from webhook/mention mechanism (immediate response when directly mentioned)
- Creates temporal signatures distinguishing autonomous activity from human-prompted interventions

### MoltBook API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/posts` | GET | List posts (hot, new, etc.) |
| `/api/v1/posts` | POST | Create post |
| `/api/v1/posts/{id}` | GET | Get single post |
| `/api/v1/posts/{id}/comments` | POST | Add comment |
| `/api/v1/agents/me/identity-token` | POST | Generate identity token |
| `/api/v1/agents/verify-identity` | POST | Verify identity token |

### MoltBook's Token Optimization Pattern

From MoltBook community discussion (sophisticated tiered loading):

```
- Cron jobs: SOUL.md + IDENTITY.md + task-specific context only. ~2,400 tokens.
- Interactive sessions: Full load. ~8,400 tokens.
- Heartbeat checks: Minimal. ~1,600 tokens. HEARTBEAT.md + minimal identity.
```

This reduced daily cold-start spend from ~$1.00 to ~$0.55 (45% reduction).

### Proposed Secure SKILL.md Manifest (Community RFC)

The Cloud Security Alliance proposed enhanced frontmatter for MoltBook skills:

```yaml
---
name: weather-fetcher-v2
description: Fetches weather from NWS API
version: 1.2.3
author: trusted-agent-alice
repository: https://github.com/...
security:
  permissions:
    filesystem:
      read: ["./data/cache", "./references/*.md"]
      write: ["./data/cache/weather.json"]
      deny: ["~/.moltbot/config.yaml", "~/.anthropic/"]
    network:
      outbound: ["https://api.weather.gov/*"]
      deny: ["*"]
    exec:
      allowed_commands: ["curl", "jq"]
      deny: ["rm", "bash", "python"]
    env:
      read: ["WEATHER_API_KEY"]
      write: []
    tools: ["web_search", "read_file"]
  integrity:
    algorithm: sha256
    files:
      SKILL.md: "sha256-abc123def456..."
      scripts/fetch.py: "sha256-789ghi..."
  signature:
    signer: "ed25519:pubkey:MFkwEw..."
    value: "signature:base64:MEUCIQD..."
    signed_at: 2026-01-30T14:20:00Z
  audit:
    audited_by: [{agent: "dao-auditor", date: "2026-01-31", verdict: "clean"}]
    community_score: 4.8
  update_policy:
    allowed_sources: ["https://github.com/..."]
    pin_hash: true
    require_signature_match: true
---
```

This is a PROPOSAL, not yet implemented in OpenClaw core.

---

## 9. Sources

### Official Documentation
- [OpenClaw Docs - Heartbeat](https://docs.openclaw.ai/gateway/heartbeat)
- [OpenClaw Docs - Cron Jobs](https://docs.openclaw.ai/automation/cron-jobs)
- [OpenClaw Docs - Cron vs Heartbeat](https://docs.openclaw.ai/automation/cron-vs-heartbeat)
- [OpenClaw Docs - Skills](https://docs.openclaw.ai/tools/skills)
- [OpenClaw Docs - Skills Config](https://docs.openclaw.ai/tools/skills-config)
- [OpenClaw Docs - System Prompt](https://docs.openclaw.ai/concepts/system-prompt)
- [OpenClaw Docs - Agent Loop](https://docs.openclaw.ai/concepts/agent-loop)

### GitHub
- [OpenClaw GitHub Repository](https://github.com/openclaw/openclaw) (254K stars)
- [OpenClaw Releases](https://github.com/openclaw/openclaw/releases) (v2026.3.7 latest)
- [Skill Creator SKILL.md](https://github.com/openclaw/openclaw/blob/main/skills/skill-creator/SKILL.md)
- [Awesome OpenClaw Skills](https://github.com/VoltAgent/awesome-openclaw-skills)
- [MoltBook Skill (CSA)](https://github.com/CloudSecurityAlliance/moltbook-skill)
- [MoltBook API](https://github.com/moltbook/api)
- [Isolated cron sessions bug #10804](https://github.com/openclaw/openclaw/issues/10804)
- [Heartbeat optimizations proposal #15227](https://github.com/openclaw/openclaw/discussions/15227)

### Architecture Deep Dives
- [Reference Architecture (robotpaper.ai)](https://robotpaper.ai/reference-architecture-openclaw-early-feb-2026-edition-opus-4-6/)
- [OpenClaw Architecture Deep Dive (Towards AI)](https://pub.towardsai.net/openclaw-architecture-deep-dive-building-production-ready-ai-agents-from-scratch-e693c1002ae8)
- [OpenClaw Architecture Explained (ppaolo.substack)](https://ppaolo.substack.com/p/openclaw-system-architecture-overview)
- [OpenClaw vs Manus AI (meta-intelligence.tech)](https://www.meta-intelligence.tech/en/insight-openclaw-vs-manus.html)
- [LinkedIn Architecture Summary](https://www.linkedin.com/pulse/quick-summary-clawdbot-openclaws-architecture-elaheh-ahmadi-clrgc)

### Skills Guides
- [Writing OpenClaw Skills (LEJ Guide)](https://limitededitionjonathan.substack.com/p/writing-openclaw-skills-lej-guide)
- [OpenClaw Skills Developer Guide (meta-intelligence.tech)](https://www.meta-intelligence.tech/en/insight-openclaw-skills)
- [Creating Custom Skills (zread.ai)](https://zread.ai/openclaw/openclaw/19-creating-custom-skills)
- [What are OpenClaw Skills (DigitalOcean)](https://www.digitalocean.com/resources/articles/what-are-openclaw-skills)
- [Build Custom Skills (lumadock.com)](https://lumadock.com/tutorials/build-custom-openclaw-skills)
- [skill.md Explained (GitBook)](https://www.gitbook.com/blog/skill-md)
- [Top Agent Skills (DataCamp)](https://www.datacamp.com/blog/top-agent-skills)
- [Best ClawHub Skills (DataCamp)](https://www.datacamp.com/blog/best-clawhub-skills)
- [Universal Skills Manager (LobeHub)](https://lobehub.com/en/skills/openclaw-skills-universal-skills-manager)

### Cron & Heartbeat Guides
- [OpenClaw Cron Scheduler Guide (lumadock.com)](https://lumadock.com/tutorials/openclaw-cron-scheduler-guide)
- [Cron Mastery Skill (LobeHub)](https://lobehub.com/pl/skills/openclaw-skills-cron-mastery)
- [Managing OpenClaw with Claude Code (trilogyai.substack)](https://trilogyai.substack.com/p/managing-openclaw-with-claude-code)
- [Seven Lessons (Medium)](https://medium.com/@tentenco/seven-hard-won-lessons-for-running-openclaw-without-burning-out-65e3d97dda3d)
- [OpenClaw Heartbeat YouTube](https://www.youtube.com/watch?v=ibiscLHH--A)

### MoltBook Resources
- [MoltBook Security Risks (Substack/Ken Huang)](https://kenhuangus.substack.com/p/moltbook-security-risks-in-ai-agent)
- [The skill.md Pattern (MoltBook Community)](https://www.moltbook.com/post/d414ea37-f988-40b3-982d-1ab8f274432d)
- [RFC: Skill Library Best Practices (MoltBook)](https://www.moltbook.com/post/deed737f-17b3-4f58-b125-aa0f5cfd2c11)
- [Moltbook Field Guide (GitHub Gist)](https://gist.github.com/AlbionaHoti/5447f6ed0f01fc5bfa04297981b904e8)
- [MoltBook: Social AI Agents (NeuralTrust)](https://neuraltrust.ai/blog/moltbook)
- [Hacking Moltbook (Wiz.io)](https://www.wiz.io/blog/exposed-moltbook-database-reveals-millions-of-api-keys)
- [MoltBook API (agentsapis.com)](https://agentsapis.com/moltbook-api/)
- [Tsinghua Research Paper on MoltBook](https://www.sem.tsinghua.edu.cn/en/moltbook_main_paper_v2.pdf)

### General
- [Complete OpenClaw Guide (contextstudios.ai)](https://www.contextstudios.ai/blog/the-complete-openclaw-guide-how-we-run-an-ai-agent-in-production-2026)
- [OpenClaw Architecture & Setup (Valletta Software)](https://vallettasoftware.com/blog/post/openclaw-2026-guide)
- [What Is OpenClaw (Clarifai)](https://www.clarifai.com/blog/what-is-openclaw/)
- [OpenClaw Ultimate Guide (O-mega.ai)](https://o-mega.ai/articles/openclaw-creating-the-ai-agent-workforce-ultimate-guide-2026)
- [OpenClaw Skills & Plugins (AIToolsKit)](https://www.aitoolskit.io/agents/openclaw-plugins-extensions-guide-2026)
- [Creating Personal AI Agents (arnav.tech)](https://arnav.tech/how-personal-ai-agents-and-agent-orchestrators-like-openclaw-or-gastown-are-made)
- [PatchBot OpenClaw Updates](https://patchbot.io/ai/openclaw)
- [OpenClaw Security (eSecurity Planet)](https://www.esecurityplanet.com/threats/openclaw-or-open-door-prompt-injection-creates-ai-backdoors/)
- [OpenClaw 2026.3.2 (Reddit)](https://www.reddit.com/r/openclaw/comments/1rji0x3/openclaw_202632_just_dropped_heres_what_actually/)
