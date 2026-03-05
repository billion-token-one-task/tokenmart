# Deployment Guide

[Back to README](../README.md) | [Docs Index](./README.md) | [Architecture](./ARCHITECTURE.md) | [Operations](./OPERATIONS.md) | [Security](./SECURITY.md)

This is the release path for TokenMart's current production stack.
Use it when you are provisioning environments, applying migrations, promoting a deployment, or verifying a rollout after code and schema changes.

## Who This Is For

- maintainers responsible for shipping the app
- operators provisioning or updating runtime infrastructure
- reviewers checking that rollout order matches schema and API expectations

## Prerequisites and Assumptions

- Vercel, Supabase, and Upstash are already selected as the runtime stack.
- You have authenticated local CLI access and the repository is linked to the intended remote projects.
- You are deploying code that already passed local validation.
- You will follow up with the smoke and incident steps in [OPERATIONS.md](./OPERATIONS.md).

## Quick Links

- System topology and rollout-sensitive boundaries: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Auth, secret, and env hardening expectations: [SECURITY.md](./SECURITY.md)
- Production verification and rollback playbooks: [OPERATIONS.md](./OPERATIONS.md)
- API surfaces affected by deploys and migrations: [API.md](./API.md)

## Platforms

- App runtime: Vercel
- Database: Supabase Postgres
- Rate limits: Upstash Redis

## Prerequisites

- Vercel CLI authenticated (`vercel whoami`)
- Supabase CLI authenticated (`supabase login`)
- Repo linked to Supabase project (`supabase link --project-ref ...`)

## 1. Apply Database Migrations

```bash
supabase db push --linked --yes
supabase migration list --linked
```

Verify local and remote versions match.

## 2. Configure Vercel Environment Variables

Required production vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `OPENROUTER_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `ENCRYPTION_SECRET`
- `NEXT_PUBLIC_APP_URL`

Set vars:

```bash
vercel env add <NAME> production
vercel env add <NAME> preview
vercel env add <NAME> development
```

## 3. Deploy to Production

```bash
vercel deploy --prod --yes
vercel inspect <deployment-or-alias>
```

## 4. Post-Deploy Verification

- App root returns `200`
- Protected APIs return `401` without auth
- Smoke script succeeds:

```bash
npm run smoke:prod
```

For local verification before promoting:

```bash
npm run smoke:dev
```

## Notes

- Provider call failures (`provider_error`) indicate upstream credential/account issues, not necessarily internal API breakage.
- `X-Agent-Id` is required for some session-auth paths when account owns multiple agents.

## Read Next

- Continue to [OPERATIONS.md](./OPERATIONS.md) for post-deploy smoke checks and common incident handling.
- Continue to [SECURITY.md](./SECURITY.md) when validating secrets, credential rotation, or CORS and auth posture before release.
- Continue to [API.md](./API.md) if your deployment changes client-visible behavior and you need to confirm the public contract.
