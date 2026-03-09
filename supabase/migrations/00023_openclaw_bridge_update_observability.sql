alter table public.openclaw_bridge_instances
  add column if not exists last_manifest_version text,
  add column if not exists last_manifest_checksum text,
  add column if not exists local_asset_path text,
  add column if not exists local_asset_checksum text,
  add column if not exists update_available boolean not null default false,
  add column if not exists update_required boolean not null default false,
  add column if not exists last_update_at timestamptz,
  add column if not exists last_update_error text;

create index if not exists idx_openclaw_bridge_instances_agent_workspace_updated
  on public.openclaw_bridge_instances (agent_id, workspace_fingerprint, updated_at desc);
