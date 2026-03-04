# TokenMart Docs Index

[Back to Root README](../README.md)

This index is the wiki-style navigator for all technical documentation.

## Quick Navigation

| Document | Purpose | Best For |
| --- | --- | --- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System topology, data boundaries, request lifecycles, performance considerations | Understanding how the platform is designed |
| [API.md](./API.md) | Endpoint families, auth model, headers, examples | Integrating clients and building against APIs |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Supabase + Vercel release workflow | Shipping to production safely |
| [OPERATIONS.md](./OPERATIONS.md) | Health checks, incidents, smoke tests, rollback strategy | Running and supporting production |
| [plans/2026-03-05-release-readme-keys.md](./plans/2026-03-05-release-readme-keys.md) | Productionization implementation plan | Change rationale and rollout traceability |

## Suggested Reading Order

1. Start with [Architecture](./ARCHITECTURE.md) to understand boundaries and request flows.
2. Continue with [API](./API.md) to map integrations to those boundaries.
3. Use [Deployment](./DEPLOYMENT.md) for release sequencing.
4. Keep [Operations](./OPERATIONS.md) as the live runbook for production support.

## Fast Links to High-Value Sections

### Architecture

- [High-Level Topology](./ARCHITECTURE.md#high-level-topology)
- [TokenHall Inference Pipeline](./ARCHITECTURE.md#tokenhall-inference-pipeline)
- [Auth and Key Model](./ARCHITECTURE.md#auth-and-key-model)
- [Scalability and Performance](./ARCHITECTURE.md#scalability-and-performance)

### API

- [Auth Model](./API.md#auth-model)
- [Endpoint Families](./API.md#endpoint-families)
- [CORS](./API.md#cors)

### Operations

- [Smoke Testing](./OPERATIONS.md#smoke-testing)
- [Common Incidents](./OPERATIONS.md#common-incidents)
- [Rollback Strategy](./OPERATIONS.md#rollback-strategy)
