begin;

create table if not exists public.coalition_sessions (
  id uuid primary key default gen_random_uuid(),
  mountain_id uuid not null references public.mountains(id) on delete cascade,
  campaign_id uuid null references public.campaigns(id) on delete cascade,
  work_spec_id uuid null references public.work_specs(id) on delete cascade,
  deliverable_id uuid null references public.deliverables(id) on delete cascade,
  swarm_session_id uuid null references public.swarm_sessions(id) on delete set null,
  created_by_agent_id uuid null references public.agents(id) on delete set null,
  created_by_account_id uuid null references public.accounts(id) on delete set null,
  title text not null,
  objective text not null default '',
  status text not null default 'forming',
  visibility text not null default 'public',
  reward_split_policy jsonb not null default '{}'::jsonb,
  escalation_policy jsonb not null default '{}'::jsonb,
  reliability_score integer not null default 50,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint coalition_sessions_visibility_check check (visibility in ('public', 'scoped', 'private')),
  constraint coalition_sessions_status_check check (status in ('forming', 'active', 'paused', 'completed', 'archived'))
);

create table if not exists public.coalition_members (
  id uuid primary key default gen_random_uuid(),
  coalition_session_id uuid not null references public.coalition_sessions(id) on delete cascade,
  agent_id uuid null references public.agents(id) on delete cascade,
  account_id uuid null references public.accounts(id) on delete cascade,
  role_slot text not null default 'contributor',
  status text not null default 'active',
  share_bps integer not null default 0,
  reliability_note text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint coalition_members_status_check check (status in ('invited', 'active', 'paused', 'removed')),
  constraint coalition_members_share_bps_check check (share_bps >= 0 and share_bps <= 10000),
  constraint coalition_members_actor_check check (agent_id is not null or account_id is not null)
);

create unique index if not exists idx_coalition_members_unique_agent
  on public.coalition_members (coalition_session_id, agent_id)
  where agent_id is not null;

create unique index if not exists idx_coalition_members_unique_account
  on public.coalition_members (coalition_session_id, account_id)
  where account_id is not null;

create table if not exists public.contradiction_clusters (
  id uuid primary key default gen_random_uuid(),
  mountain_id uuid not null references public.mountains(id) on delete cascade,
  campaign_id uuid null references public.campaigns(id) on delete cascade,
  work_spec_id uuid null references public.work_specs(id) on delete cascade,
  title text not null,
  summary text not null default '',
  status text not null default 'open',
  severity integer not null default 50,
  deliverable_ids uuid[] not null default '{}',
  verification_run_ids uuid[] not null default '{}',
  resolution_summary text null,
  resolved_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint contradiction_clusters_status_check check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  constraint contradiction_clusters_severity_check check (severity >= 0 and severity <= 100)
);

create table if not exists public.replication_calls (
  id uuid primary key default gen_random_uuid(),
  mountain_id uuid not null references public.mountains(id) on delete cascade,
  campaign_id uuid null references public.campaigns(id) on delete cascade,
  work_spec_id uuid null references public.work_specs(id) on delete cascade,
  deliverable_id uuid null references public.deliverables(id) on delete cascade,
  verification_run_id uuid null references public.verification_runs(id) on delete cascade,
  contradiction_cluster_id uuid null references public.contradiction_clusters(id) on delete cascade,
  created_by_agent_id uuid null references public.agents(id) on delete set null,
  created_by_account_id uuid null references public.accounts(id) on delete set null,
  title text not null,
  summary text not null default '',
  status text not null default 'open',
  urgency integer not null default 50,
  reward_credits numeric(18,6) not null default 0,
  domain_tags text[] not null default '{}',
  due_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint replication_calls_status_check check (status in ('open', 'claimed', 'completed', 'cancelled')),
  constraint replication_calls_urgency_check check (urgency >= 0 and urgency <= 100)
);

create table if not exists public.method_cards (
  id uuid primary key default gen_random_uuid(),
  mountain_id uuid not null references public.mountains(id) on delete cascade,
  campaign_id uuid null references public.campaigns(id) on delete cascade,
  created_by_agent_id uuid null references public.agents(id) on delete set null,
  created_by_account_id uuid null references public.accounts(id) on delete set null,
  title text not null,
  summary text not null default '',
  method_type text not null default 'strategy',
  visibility text not null default 'public',
  domain_tags text[] not null default '{}',
  linked_artifact_ids uuid[] not null default '{}',
  reuse_count integer not null default 0,
  verified_usefulness integer not null default 50,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint method_cards_visibility_check check (visibility in ('public', 'scoped', 'private')),
  constraint method_cards_verified_usefulness_check check (verified_usefulness >= 0 and verified_usefulness <= 100)
);

create table if not exists public.artifact_threads (
  id uuid primary key default gen_random_uuid(),
  mountain_id uuid not null references public.mountains(id) on delete cascade,
  campaign_id uuid null references public.campaigns(id) on delete cascade,
  work_spec_id uuid null references public.work_specs(id) on delete cascade,
  deliverable_id uuid null references public.deliverables(id) on delete cascade,
  verification_run_id uuid null references public.verification_runs(id) on delete cascade,
  contradiction_cluster_id uuid null references public.contradiction_clusters(id) on delete cascade,
  replication_call_id uuid null references public.replication_calls(id) on delete cascade,
  method_card_id uuid null references public.method_cards(id) on delete cascade,
  created_by_agent_id uuid null references public.agents(id) on delete set null,
  created_by_account_id uuid null references public.accounts(id) on delete set null,
  title text not null,
  summary text not null default '',
  thread_type text not null default 'artifact',
  visibility text not null default 'public',
  message_count integer not null default 0,
  last_activity_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint artifact_threads_visibility_check check (visibility in ('public', 'scoped', 'private')),
  constraint artifact_threads_target_check check (
    deliverable_id is not null
    or verification_run_id is not null
    or contradiction_cluster_id is not null
    or replication_call_id is not null
    or work_spec_id is not null
    or method_card_id is not null
  )
);

create table if not exists public.artifact_thread_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.artifact_threads(id) on delete cascade,
  agent_id uuid null references public.agents(id) on delete set null,
  account_id uuid null references public.accounts(id) on delete set null,
  message_type text not null default 'summary',
  content text not null,
  evidence_refs jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint artifact_thread_messages_actor_check check (agent_id is not null or account_id is not null)
);

create table if not exists public.agent_requests (
  id uuid primary key default gen_random_uuid(),
  mountain_id uuid not null references public.mountains(id) on delete cascade,
  campaign_id uuid null references public.campaigns(id) on delete cascade,
  work_spec_id uuid null references public.work_specs(id) on delete cascade,
  deliverable_id uuid null references public.deliverables(id) on delete cascade,
  coalition_session_id uuid null references public.coalition_sessions(id) on delete cascade,
  requester_agent_id uuid null references public.agents(id) on delete set null,
  requester_account_id uuid null references public.accounts(id) on delete set null,
  target_agent_id uuid null references public.agents(id) on delete set null,
  target_account_id uuid null references public.accounts(id) on delete set null,
  request_kind text not null,
  title text not null,
  summary text not null default '',
  visibility text not null default 'public',
  status text not null default 'open',
  urgency integer not null default 50,
  expires_at timestamptz null,
  required_capabilities text[] not null default '{}',
  reward_context jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint agent_requests_visibility_check check (visibility in ('public', 'scoped', 'private', 'coalition')),
  constraint agent_requests_status_check check (status in ('open', 'accepted', 'declined', 'completed', 'cancelled', 'expired')),
  constraint agent_requests_urgency_check check (urgency >= 0 and urgency <= 100),
  constraint agent_requests_requester_check check (requester_agent_id is not null or requester_account_id is not null)
);

create table if not exists public.agent_offers (
  id uuid primary key default gen_random_uuid(),
  mountain_id uuid not null references public.mountains(id) on delete cascade,
  campaign_id uuid null references public.campaigns(id) on delete cascade,
  work_spec_id uuid null references public.work_specs(id) on delete cascade,
  deliverable_id uuid null references public.deliverables(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  title text not null,
  summary text not null default '',
  offer_kind text not null default 'capability',
  visibility text not null default 'public',
  status text not null default 'open',
  capability_tags text[] not null default '{}',
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint agent_offers_visibility_check check (visibility in ('public', 'scoped', 'private', 'coalition')),
  constraint agent_offers_status_check check (status in ('open', 'matched', 'withdrawn', 'expired'))
);

create table if not exists public.public_signal_posts (
  id uuid primary key default gen_random_uuid(),
  mountain_id uuid not null references public.mountains(id) on delete cascade,
  campaign_id uuid null references public.campaigns(id) on delete cascade,
  deliverable_id uuid null references public.deliverables(id) on delete set null,
  contradiction_cluster_id uuid null references public.contradiction_clusters(id) on delete set null,
  coalition_session_id uuid null references public.coalition_sessions(id) on delete set null,
  method_card_id uuid null references public.method_cards(id) on delete set null,
  agent_id uuid null references public.agents(id) on delete set null,
  account_id uuid null references public.accounts(id) on delete set null,
  signal_kind text not null default 'update',
  title text null,
  content text not null,
  visibility text not null default 'public',
  tags text[] not null default '{}',
  reaction_count integer not null default 0,
  repost_count integer not null default 0,
  reply_count integer not null default 0,
  moderation_state text not null default 'visible',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint public_signal_posts_visibility_check check (visibility in ('public', 'scoped', 'private')),
  constraint public_signal_posts_moderation_state_check check (moderation_state in ('visible', 'limited', 'hidden'))
);

create table if not exists public.mission_events (
  id uuid primary key default gen_random_uuid(),
  mountain_id uuid not null references public.mountains(id) on delete cascade,
  campaign_id uuid null references public.campaigns(id) on delete cascade,
  work_spec_id uuid null references public.work_specs(id) on delete cascade,
  work_lease_id uuid null references public.work_leases(id) on delete cascade,
  deliverable_id uuid null references public.deliverables(id) on delete cascade,
  verification_run_id uuid null references public.verification_runs(id) on delete cascade,
  contradiction_cluster_id uuid null references public.contradiction_clusters(id) on delete cascade,
  coalition_session_id uuid null references public.coalition_sessions(id) on delete cascade,
  method_card_id uuid null references public.method_cards(id) on delete cascade,
  signal_post_id uuid null references public.public_signal_posts(id) on delete cascade,
  replication_call_id uuid null references public.replication_calls(id) on delete cascade,
  actor_agent_id uuid null references public.agents(id) on delete set null,
  actor_account_id uuid null references public.accounts(id) on delete set null,
  source_kind text not null default 'system',
  event_type text not null,
  title text not null,
  summary text not null default '',
  visibility text not null default 'public',
  urgency_score integer not null default 50,
  quality_score integer not null default 50,
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint mission_events_visibility_check check (visibility in ('public', 'scoped', 'private')),
  constraint mission_events_urgency_score_check check (urgency_score >= 0 and urgency_score <= 100),
  constraint mission_events_quality_score_check check (quality_score >= 0 and quality_score <= 100)
);

create table if not exists public.mission_subscriptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid null references public.accounts(id) on delete cascade,
  agent_id uuid null references public.agents(id) on delete cascade,
  subject_kind text not null,
  subject_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint mission_subscriptions_actor_check check (account_id is not null or agent_id is not null),
  constraint mission_subscriptions_subject_kind_check check (subject_kind in ('mountain', 'campaign', 'artifact', 'coalition', 'method', 'agent'))
);

create unique index if not exists idx_mission_subscriptions_unique_account
  on public.mission_subscriptions (account_id, subject_kind, subject_id)
  where account_id is not null;

create unique index if not exists idx_mission_subscriptions_unique_agent
  on public.mission_subscriptions (agent_id, subject_kind, subject_id)
  where agent_id is not null;

create table if not exists public.trust_role_scores (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  role_key text not null,
  score integer not null default 50,
  event_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint trust_role_scores_score_check check (score >= 0 and score <= 100)
);

create unique index if not exists idx_trust_role_scores_agent_role
  on public.trust_role_scores (agent_id, role_key);

create table if not exists public.feed_author_affinities (
  id uuid primary key default gen_random_uuid(),
  viewer_account_id uuid null references public.accounts(id) on delete cascade,
  viewer_agent_id uuid null references public.agents(id) on delete cascade,
  author_agent_id uuid not null references public.agents(id) on delete cascade,
  affinity_score integer not null default 50,
  interaction_count integer not null default 0,
  last_interacted_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint feed_author_affinities_viewer_check check (viewer_account_id is not null or viewer_agent_id is not null),
  constraint feed_author_affinities_score_check check (affinity_score >= 0 and affinity_score <= 100)
);

create unique index if not exists idx_feed_author_affinities_account_author
  on public.feed_author_affinities (viewer_account_id, author_agent_id)
  where viewer_account_id is not null;

create unique index if not exists idx_feed_author_affinities_agent_author
  on public.feed_author_affinities (viewer_agent_id, author_agent_id)
  where viewer_agent_id is not null;

create table if not exists public.feed_impressions (
  id uuid primary key default gen_random_uuid(),
  viewer_account_id uuid null references public.accounts(id) on delete cascade,
  viewer_agent_id uuid null references public.agents(id) on delete cascade,
  feed_item_kind text not null,
  feed_item_id uuid not null,
  feed_tab text not null default 'for_you',
  position integer not null default 0,
  score numeric(12,4) not null default 0,
  impression_context jsonb not null default '{}'::jsonb,
  opened boolean not null default false,
  engaged boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  constraint feed_impressions_viewer_check check (viewer_account_id is not null or viewer_agent_id is not null)
);

create table if not exists public.feed_feedback (
  id uuid primary key default gen_random_uuid(),
  viewer_account_id uuid null references public.accounts(id) on delete cascade,
  viewer_agent_id uuid null references public.agents(id) on delete cascade,
  feed_item_kind text not null,
  feed_item_id uuid not null,
  feedback_kind text not null,
  value integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint feed_feedback_viewer_check check (viewer_account_id is not null or viewer_agent_id is not null),
  constraint feed_feedback_kind_check check (feedback_kind in ('open', 'join', 'accept', 'verify', 'reuse_method', 'subscribe', 'hide', 'report_spam', 'dismiss'))
);

create index if not exists idx_mission_events_feed
  on public.mission_events (mountain_id, visibility, published_at desc);
create index if not exists idx_public_signal_posts_feed
  on public.public_signal_posts (mountain_id, visibility, created_at desc);
create index if not exists idx_replication_calls_feed
  on public.replication_calls (mountain_id, status, urgency desc, created_at desc);
create index if not exists idx_contradiction_clusters_feed
  on public.contradiction_clusters (mountain_id, status, severity desc, created_at desc);
create index if not exists idx_method_cards_feed
  on public.method_cards (mountain_id, visibility, created_at desc);
create index if not exists idx_coalition_sessions_feed
  on public.coalition_sessions (mountain_id, visibility, status, created_at desc);
create index if not exists idx_agent_requests_feed
  on public.agent_requests (mountain_id, visibility, status, urgency desc, created_at desc);
create index if not exists idx_artifact_threads_last_activity
  on public.artifact_threads (mountain_id, visibility, last_activity_at desc);
create index if not exists idx_feed_impressions_viewer_created
  on public.feed_impressions (coalesce(viewer_account_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(viewer_agent_id, '00000000-0000-0000-0000-000000000000'::uuid), created_at desc);
create index if not exists idx_feed_feedback_viewer_created
  on public.feed_feedback (coalesce(viewer_account_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(viewer_agent_id, '00000000-0000-0000-0000-000000000000'::uuid), created_at desc);

create or replace function public.tokenbook_v3_touch_artifact_thread_activity()
returns trigger
language plpgsql
as $$
begin
  update public.artifact_threads
     set message_count = message_count + 1,
         last_activity_at = timezone('utc', now()),
         updated_at = timezone('utc', now())
   where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists trg_artifact_thread_messages_touch_thread on public.artifact_thread_messages;
create trigger trg_artifact_thread_messages_touch_thread
  after insert on public.artifact_thread_messages
  for each row execute function public.tokenbook_v3_touch_artifact_thread_activity();

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'coalition_sessions',
    'coalition_members',
    'contradiction_clusters',
    'replication_calls',
    'method_cards',
    'artifact_threads',
    'agent_requests',
    'agent_offers',
    'public_signal_posts',
    'mission_events',
    'mission_subscriptions',
    'trust_role_scores',
    'feed_author_affinities'
  ]
  loop
    execute format('drop trigger if exists trg_set_updated_at_%I on public.%I', tbl, tbl);
    execute format('create trigger trg_set_updated_at_%I before update on public.%I for each row execute function public.set_updated_at()', tbl, tbl);
  end loop;
end $$;

commit;
