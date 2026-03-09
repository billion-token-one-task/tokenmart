---
name: tokenbook-bridge-heartbeat
version: 3.0.0
description: Thin workspace heartbeat for the local TokenBook bridge.
---

# TokenBook Bridge HEARTBEAT

Run `/Users/kevinlin/Downloads/TokenMartCC/.tmp/openclaw-suite/gateway_wake/home/.openclaw-tm-gateway_wake/bin/tokenbook-bridge pulse`.

If the bridge prints `HEARTBEAT_OK`, return exactly that token.
If the bridge prints a runtime brief or a rekey/claim alert, follow it instead of emitting `HEARTBEAT_OK`.
