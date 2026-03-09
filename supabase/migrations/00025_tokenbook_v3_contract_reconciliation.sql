begin;

alter table if exists public.mission_events
  add column if not exists reward_split_id uuid null references public.reward_splits(id) on delete cascade,
  add column if not exists score_hints jsonb not null default '{}'::jsonb,
  add column if not exists happened_at timestamptz null;

update public.mission_events
set
  happened_at = coalesce(happened_at, published_at, created_at),
  score_hints = case
    when score_hints = '{}'::jsonb then jsonb_strip_nulls(
      jsonb_build_object(
        'urgency', urgency_score,
        'trust_signal', quality_score
      )
    )
    else score_hints
  end
where happened_at is null or score_hints = '{}'::jsonb;

alter table if exists public.mission_events
  alter column happened_at set not null;

create index if not exists idx_mission_events_happened_at
  on public.mission_events (mountain_id, visibility, happened_at desc);

alter table if exists public.public_signal_posts
  add column if not exists artifact_thread_id uuid null references public.artifact_threads(id) on delete set null,
  add column if not exists author_agent_id uuid null references public.agents(id) on delete set null,
  add column if not exists author_account_id uuid null references public.accounts(id) on delete set null,
  add column if not exists signal_type text not null default 'update',
  add column if not exists headline text not null default '',
  add column if not exists body text not null default '',
  add column if not exists stats jsonb not null default '{}'::jsonb;

update public.public_signal_posts
set
  author_agent_id = coalesce(author_agent_id, agent_id),
  author_account_id = coalesce(author_account_id, account_id),
  signal_type = coalesce(nullif(signal_type, ''), signal_kind, 'update'),
  headline = coalesce(nullif(headline, ''), title, 'Signal'),
  body = coalesce(nullif(body, ''), content, ''),
  stats = case
    when stats = '{}'::jsonb then jsonb_strip_nulls(
      jsonb_build_object(
        'replies', reply_count,
        'reposts', repost_count,
        'reactions', reaction_count,
        'urgency', metadata -> 'urgency'
      )
    )
    else stats
  end
where
  author_agent_id is null
  or author_account_id is null
  or headline = ''
  or body = ''
  or stats = '{}'::jsonb;

alter table if exists public.artifact_threads
  add column if not exists stats jsonb not null default '{}'::jsonb;

update public.artifact_threads
set stats = case
  when stats = '{}'::jsonb then jsonb_strip_nulls(
    jsonb_build_object(
      'message_count', message_count,
      'last_activity_at', last_activity_at
    )
  )
  else stats
end
where stats = '{}'::jsonb;

alter table if exists public.artifact_thread_messages
  add column if not exists artifact_thread_id uuid null references public.artifact_threads(id) on delete cascade,
  add column if not exists author_agent_id uuid null references public.agents(id) on delete set null,
  add column if not exists body text null,
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.artifact_thread_messages
set
  artifact_thread_id = coalesce(artifact_thread_id, thread_id),
  author_agent_id = coalesce(author_agent_id, agent_id),
  body = coalesce(body, content),
  payload = case
    when payload = '{}'::jsonb then jsonb_strip_nulls(
      jsonb_build_object(
        'evidence_refs', evidence_refs,
        'metadata', metadata,
        'account_id', account_id
      )
    )
    else payload
  end,
  updated_at = coalesce(updated_at, created_at)
where
  artifact_thread_id is null
  or body is null
  or payload = '{}'::jsonb;

alter table if exists public.artifact_thread_messages
  alter column artifact_thread_id set not null,
  alter column body set not null;

alter table if exists public.coalition_members
  add column if not exists role text null,
  add column if not exists contribution_summary jsonb not null default '{}'::jsonb;

update public.coalition_members
set
  role = coalesce(role, role_slot, 'contributor'),
  contribution_summary = case
    when contribution_summary = '{}'::jsonb then coalesce(metadata, '{}'::jsonb)
    else contribution_summary
  end
where role is null or contribution_summary = '{}'::jsonb;

alter table if exists public.coalition_members
  alter column role set not null;

alter table if exists public.contradiction_clusters
  add column if not exists visibility text not null default 'public',
  add column if not exists linked_deliverable_ids uuid[] not null default '{}',
  add column if not exists linked_verification_run_ids uuid[] not null default '{}',
  add column if not exists adjudication_notes jsonb not null default '{}'::jsonb,
  add column if not exists created_by_agent_id uuid null references public.agents(id) on delete set null;

update public.contradiction_clusters
set
  linked_deliverable_ids = case
    when coalesce(array_length(linked_deliverable_ids, 1), 0) = 0 then coalesce(deliverable_ids, '{}')
    else linked_deliverable_ids
  end,
  linked_verification_run_ids = case
    when coalesce(array_length(linked_verification_run_ids, 1), 0) = 0 then coalesce(verification_run_ids, '{}')
    else linked_verification_run_ids
  end,
  adjudication_notes = case
    when adjudication_notes = '{}'::jsonb then coalesce(metadata, '{}'::jsonb)
    else adjudication_notes
  end
where
  coalesce(array_length(linked_deliverable_ids, 1), 0) = 0
  or coalesce(array_length(linked_verification_run_ids, 1), 0) = 0
  or adjudication_notes = '{}'::jsonb;

alter table if exists public.replication_calls
  add column if not exists visibility text not null default 'public',
  add column if not exists expires_at timestamptz null;

update public.replication_calls
set expires_at = coalesce(expires_at, due_at)
where expires_at is null and due_at is not null;

alter table if exists public.method_cards
  add column if not exists originating_agent_id uuid null references public.agents(id) on delete set null,
  add column if not exists body text not null default '',
  add column if not exists role_tags text[] not null default '{}',
  add column if not exists linked_deliverable_ids uuid[] not null default '{}',
  add column if not exists linked_verification_run_ids uuid[] not null default '{}',
  add column if not exists outcome_summary jsonb not null default '{}'::jsonb,
  add column if not exists usefulness_score numeric(18,6) not null default 50,
  add column if not exists status text not null default 'published';

update public.method_cards
set
  originating_agent_id = coalesce(originating_agent_id, created_by_agent_id),
  linked_deliverable_ids = case
    when coalesce(array_length(linked_deliverable_ids, 1), 0) = 0 then coalesce(linked_artifact_ids, '{}')
    else linked_deliverable_ids
  end,
  usefulness_score = coalesce(usefulness_score, verified_usefulness::numeric, 50),
  status = coalesce(nullif(status, ''), 'published')
where
  originating_agent_id is null
  or coalesce(array_length(linked_deliverable_ids, 1), 0) = 0
  or status is null;

alter table if exists public.agent_requests
  add column if not exists verification_run_id uuid null references public.verification_runs(id) on delete cascade,
  add column if not exists contradiction_cluster_id uuid null references public.contradiction_clusters(id) on delete cascade,
  add column if not exists requested_by_agent_id uuid null references public.agents(id) on delete set null,
  add column if not exists role_needed text null,
  add column if not exists capability_requirements jsonb not null default '{}'::jsonb,
  add column if not exists freeform_note text null;

update public.agent_requests
set
  requested_by_agent_id = coalesce(requested_by_agent_id, requester_agent_id),
  role_needed = coalesce(role_needed, payload ->> 'role_needed'),
  capability_requirements = case
    when capability_requirements = '{}'::jsonb then
      case
        when required_capabilities is not null then jsonb_build_object('required_capabilities', required_capabilities)
        else '{}'::jsonb
      end
    else capability_requirements
  end,
  freeform_note = coalesce(freeform_note, payload ->> 'note')
where
  requested_by_agent_id is null
  or capability_requirements = '{}'::jsonb
  or (freeform_note is null and payload ? 'note');

alter table if exists public.agent_offers
  add column if not exists author_agent_id uuid null references public.agents(id) on delete cascade,
  add column if not exists coalition_session_id uuid null references public.coalition_sessions(id) on delete cascade,
  add column if not exists offer_type text not null default 'capability',
  add column if not exists capability_payload jsonb not null default '{}'::jsonb;

update public.agent_offers
set
  author_agent_id = coalesce(author_agent_id, agent_id),
  offer_type = coalesce(nullif(offer_type, ''), offer_kind, 'capability'),
  capability_payload = case
    when capability_payload = '{}'::jsonb then
      case
        when capability_tags is not null then jsonb_build_object('capability_tags', capability_tags)
        else coalesce(payload, '{}'::jsonb)
      end
    else capability_payload
  end
where
  author_agent_id is null
  or capability_payload = '{}'::jsonb;

alter table if exists public.mission_subscriptions
  add column if not exists subscriber_agent_id uuid null references public.agents(id) on delete cascade,
  add column if not exists subscriber_account_id uuid null references public.accounts(id) on delete cascade,
  add column if not exists mountain_id uuid null references public.mountains(id) on delete cascade,
  add column if not exists campaign_id uuid null references public.campaigns(id) on delete cascade,
  add column if not exists artifact_thread_id uuid null references public.artifact_threads(id) on delete cascade,
  add column if not exists coalition_session_id uuid null references public.coalition_sessions(id) on delete cascade,
  add column if not exists method_card_id uuid null references public.method_cards(id) on delete cascade,
  add column if not exists target_agent_id uuid null references public.agents(id) on delete cascade,
  add column if not exists subscription_type text not null default 'mountain';

update public.mission_subscriptions
set
  subscriber_agent_id = coalesce(subscriber_agent_id, agent_id),
  subscriber_account_id = coalesce(subscriber_account_id, account_id),
  subscription_type = coalesce(nullif(subscription_type, ''), subject_kind, 'mountain'),
  mountain_id = case when mountain_id is null and subject_kind = 'mountain' then subject_id else mountain_id end,
  campaign_id = case when campaign_id is null and subject_kind = 'campaign' then subject_id else campaign_id end,
  artifact_thread_id = case when artifact_thread_id is null and subject_kind = 'artifact' then subject_id else artifact_thread_id end,
  coalition_session_id = case when coalition_session_id is null and subject_kind = 'coalition' then subject_id else coalition_session_id end,
  method_card_id = case when method_card_id is null and subject_kind = 'method' then subject_id else method_card_id end,
  target_agent_id = case when target_agent_id is null and subject_kind = 'agent' then subject_id else target_agent_id end
where
  subscriber_agent_id is null
  or subscriber_account_id is null
  or mountain_id is null
  or campaign_id is null
  or artifact_thread_id is null
  or coalition_session_id is null
  or method_card_id is null
  or target_agent_id is null;

alter table if exists public.trust_role_scores
  add column if not exists role text null;

update public.trust_role_scores
set role = coalesce(role, role_key)
where role is null;

alter table if exists public.feed_author_affinities
  add column if not exists last_interaction_at timestamptz null;

update public.feed_author_affinities
set last_interaction_at = coalesce(last_interaction_at, last_interacted_at)
where last_interaction_at is null and last_interacted_at is not null;

alter table if exists public.feed_impressions
  add column if not exists item_type text null,
  add column if not exists item_id uuid null,
  add column if not exists rank_position integer not null default 0,
  add column if not exists feed_mode text not null default 'for_you',
  add column if not exists context jsonb not null default '{}'::jsonb;

update public.feed_impressions
set
  item_type = coalesce(item_type, feed_item_kind),
  item_id = coalesce(item_id, feed_item_id),
  rank_position = coalesce(rank_position, position, 0),
  feed_mode = coalesce(nullif(feed_mode, ''), feed_tab, 'for_you'),
  context = case
    when context = '{}'::jsonb then coalesce(impression_context, '{}'::jsonb)
    else context
  end
where
  item_type is null
  or item_id is null
  or context = '{}'::jsonb;

alter table if exists public.feed_impressions
  alter column item_type set not null,
  alter column item_id set not null;

alter table if exists public.feed_feedback
  add column if not exists item_type text null,
  add column if not exists item_id uuid null,
  add column if not exists feedback_type text null,
  add column if not exists context jsonb not null default '{}'::jsonb;

update public.feed_feedback
set
  item_type = coalesce(item_type, feed_item_kind),
  item_id = coalesce(item_id, feed_item_id),
  feedback_type = coalesce(feedback_type, feedback_kind),
  context = case
    when context = '{}'::jsonb then jsonb_strip_nulls(jsonb_build_object('value', value) || coalesce(metadata, '{}'::jsonb))
    else context
  end
where
  item_type is null
  or item_id is null
  or feedback_type is null
  or context = '{}'::jsonb;

alter table if exists public.feed_feedback
  alter column item_type set not null,
  alter column item_id set not null,
  alter column feedback_type set not null;

commit;
