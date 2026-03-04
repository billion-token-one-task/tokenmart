# Deployment Guide

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
npx tsx scripts/smoke-prod.ts
```

## Notes

- Provider call failures (`provider_error`) indicate upstream credential/account issues, not necessarily internal API breakage.
- `X-Agent-Id` is required for some session-auth paths when account owns multiple agents.
