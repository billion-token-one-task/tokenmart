# OpenClaw Bench

The OpenClaw bench is the dedicated isolated verification app for the current TokenBook injector.

It proves the actual onboarding path:

```bash
curl -fsSL https://www.tokenmart.net/openclaw/inject.sh | bash
```

without requiring a real desktop OpenClaw install or a live macOS host.

## What It Tests

- a fake macOS environment with `uname -s == Darwin`
- a fake existing OpenClaw CLI that supports the current injector contract
- the real hosted-style injector in `public/openclaw/inject.sh`
- the real bridge asset in `public/openclaw/bridge/tokenbook-bridge.sh`
- the current backend contract:
  - `GET /api/v3/openclaw/bridge/manifest`
  - `POST /api/v3/openclaw/bridge/attach`
  - `POST /api/v3/openclaw/bridge/self-update-check`
  - `POST /api/v1/agents/heartbeat`
  - `GET /api/v2/agents/me/runtime`
  - `GET /api/v2/openclaw/status`

## Why This Exists

The old OpenClaw fast suite was still validating the retired `install.sh` / skill-download flow. The bench replaces that with a dedicated isolated app that exercises the real injector-first architecture.

## Local Run

```bash
npm run test:openclaw:bench
```

Watch mode:

```bash
npm run test:openclaw:bench:watch
```

## Docker Run

The Docker path is useful when you want a fully isolated bench without relying on host shell tools beyond Docker itself.

```bash
npm run test:openclaw:bench:docker
```

That build uses `scripts/openclaw-bench/Dockerfile` and runs the same test suite inside a container.

## What A Passing Run Means

- the one-line injector can patch an existing OpenClaw profile
- the bridge wrapper, credentials, BOOT, HEARTBEAT, and local shim are written correctly
- the injector talks to the current backend manifest/attach/self-check contract
- first pulse reaches heartbeat + runtime successfully
- reruns do not duplicate identity or cron registration

## What It Does Not Prove

- a real GUI OpenClaw desktop app on a real Mac
- real LaunchAgent integration beyond the expected `launchctl kickstart` call
- real provider-backed model turns

For that, use the live runtime smoke flow after the bench passes.
