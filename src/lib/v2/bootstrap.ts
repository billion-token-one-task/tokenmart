import { createClient } from "@supabase/supabase-js";
import type { Json } from "@/types/database";
import { METACULUS_OFFICIAL_AGENT_NAME, METACULUS_SUMMIT_SLUG, PLACEHOLDER_MOUNTAIN_SLUGS, metaculusCampaignSeeds, metaculusMountainSeed, metaculusWorkSpecSeeds } from "./seed";

export interface MetaculusBootstrapBlueprint {
  mountain: {
    slug: string;
    title: string;
    domain: string;
    visibility: string;
    status: string;
    total_budget_credits: number;
    budget_envelopes: Record<string, unknown>;
    governance_policy: Record<string, unknown>;
    decomposition_policy: Record<string, unknown>;
    settlement_policy_mode: string;
    settlement_policy: Record<string, unknown>;
    metadata: Record<string, unknown>;
  };
  campaigns: Array<{
    title: string;
    summary: string;
    hypothesis: string | null;
    budget_credits: number;
    risk_ceiling: string;
    decomposition_aggressiveness: number;
    status: string;
  }>;
  work_specs: Array<{
    title: string;
    summary: string;
    campaign_title: string;
    contribution_type: string;
    role_type: string;
    allowed_role_types: string[];
    checkpoint_cadence_minutes: number;
    priority: number;
    risk_class: string;
    speculative: boolean;
    synthesis_required: boolean;
    status: string;
    input_contract: Record<string, unknown>;
    output_contract: Record<string, unknown>;
    verification_contract: Record<string, unknown>;
    reward_envelope: Record<string, unknown>;
    duplication_policy: Record<string, unknown>;
    metadata: Record<string, unknown>;
    dependency_titles: string[];
  }>;
  external_target: {
    provider: string;
    target_slug: string;
    rules_snapshot: Record<string, unknown>;
    submission_policy: Record<string, unknown>;
    disclosure_policy: Record<string, unknown>;
    metadata: Record<string, unknown>;
  };
  official_agent_name: string;
  placeholder_slugs: readonly string[];
}

export function buildMetaculusBootstrapBlueprint(): MetaculusBootstrapBlueprint {
  const workSpecTitleBySeedId = new Map(metaculusWorkSpecSeeds.map((spec) => [spec.id, spec.title]));

  return {
    mountain: {
      slug: METACULUS_SUMMIT_SLUG,
      title: metaculusMountainSeed.title,
      domain: metaculusMountainSeed.domain,
      visibility: metaculusMountainSeed.visibility,
      status: metaculusMountainSeed.status,
      total_budget_credits: metaculusMountainSeed.total_budget_credits,
      budget_envelopes: metaculusMountainSeed.budget_envelopes as unknown as Record<string, unknown>,
      governance_policy: metaculusMountainSeed.governance_policy,
      decomposition_policy: metaculusMountainSeed.decomposition_policy,
      settlement_policy_mode: metaculusMountainSeed.settlement_policy_mode,
      settlement_policy: metaculusMountainSeed.settlement_policy,
      metadata: metaculusMountainSeed.metadata,
    },
    campaigns: metaculusCampaignSeeds.map((campaign) => ({
      title: campaign.title,
      summary: campaign.summary,
      hypothesis: campaign.hypothesis,
      budget_credits: campaign.budget_credits,
      risk_ceiling: campaign.risk_ceiling,
      decomposition_aggressiveness: campaign.decomposition_aggressiveness,
      status: campaign.status,
    })),
    work_specs: metaculusWorkSpecSeeds.map((spec) => ({
      title: spec.title,
      summary: spec.summary,
      campaign_title:
        metaculusCampaignSeeds.find((campaign) => campaign.id === spec.campaign_id)?.title ??
        "Rules + Compliance Mirror",
      contribution_type: spec.contribution_type,
      role_type: spec.role_type,
      allowed_role_types: spec.allowed_role_types,
      checkpoint_cadence_minutes: spec.checkpoint_cadence_minutes,
      priority: spec.priority,
      risk_class: spec.risk_class,
      speculative: spec.speculative,
      synthesis_required: spec.synthesis_required,
      status: spec.status,
      input_contract: spec.input_contract,
      output_contract: spec.output_contract,
      verification_contract: spec.verification_contract,
      reward_envelope: spec.reward_envelope,
      duplication_policy: spec.duplication_policy,
      metadata: spec.metadata,
      dependency_titles: spec.dependency_edges
        .map((edge) => String(edge.work_spec_id ?? ""))
        .map((id) => workSpecTitleBySeedId.get(id))
        .filter((title): title is string => Boolean(title)),
    })),
    external_target: {
      provider: "metaculus",
      target_slug: "spring-aib-2026",
      rules_snapshot: {
        noHumanInLoopDuringForecasting: true,
        mandatoryCommentPerForecast: true,
        singlePrizeEligibleBotPerUser: true,
        disclosureRequired: true,
      },
      submission_policy: {
        outwardFacingMode: "single_official_bot",
        officialSubmissionWorker: "Official Submission Pipeline",
      },
      disclosure_policy: {
        publishMethodSummary: true,
        preservePromptAuditTrail: true,
      },
      metadata: {
        current_season: "Spring 2026",
        question_coverage: 0,
        forecast_count: 0,
        comment_count: 0,
        comment_compliance_rate: 0,
        leaderboard_status: "not_started",
        last_sync_at: null,
      },
    },
    official_agent_name: METACULUS_OFFICIAL_AGENT_NAME,
    placeholder_slugs: PLACEHOLDER_MOUNTAIN_SLUGS,
  };
}

function mergeJson(current: Json | null | undefined, next: Record<string, unknown>) {
  return {
    ...(current && typeof current === "object" && !Array.isArray(current)
      ? (current as Record<string, unknown>)
      : {}),
    ...next,
  };
}

export async function bootstrapMetaculusSummit(input: {
  supabaseUrl: string;
  serviceRoleKey: string;
  adminEmail: string;
}) {
  const blueprint = buildMetaculusBootstrapBlueprint();
  const db = createClient(input.supabaseUrl, input.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: adminAccount, error: adminError } = await db
    .from("accounts")
    .select("id, email")
    .eq("email", input.adminEmail.toLowerCase())
    .maybeSingle();

  if (adminError) {
    throw new Error(`Failed to resolve admin account: ${adminError.message}`);
  }
  if (!adminAccount) {
    throw new Error(`Admin account not found for ${input.adminEmail}`);
  }

  await db.from("mountains").delete().in("slug", [...blueprint.placeholder_slugs]);

  const { data: officialAgent, error: officialAgentError } = await db
    .from("agents")
    .upsert(
      {
        name: blueprint.official_agent_name,
        harness: "openclaw",
        description: "Official outward-facing Metaculus competition bot.",
        owner_account_id: adminAccount.id,
        claimed: true,
        status: "active",
        trust_tier: 3,
        metadata: {
          mission_role: "official_submission_bot",
          external_provider: "metaculus",
        },
      },
      { onConflict: "name" }
    )
    .select("id, metadata")
    .single();

  if (officialAgentError || !officialAgent) {
    throw new Error(`Failed to upsert official agent: ${officialAgentError?.message ?? "unknown error"}`);
  }

  const mountainPayload = {
    slug: blueprint.mountain.slug,
    title: metaculusMountainSeed.title,
    thesis: metaculusMountainSeed.thesis,
    target_problem: metaculusMountainSeed.target_problem,
    success_criteria: metaculusMountainSeed.success_criteria,
    domain: blueprint.mountain.domain,
    horizon: metaculusMountainSeed.horizon,
    visibility: blueprint.mountain.visibility,
    status: blueprint.mountain.status,
    created_by_account_id: adminAccount.id,
    total_budget_credits: blueprint.mountain.total_budget_credits,
    budget_envelopes: blueprint.mountain.budget_envelopes,
    governance_policy: blueprint.mountain.governance_policy,
    decomposition_policy: blueprint.mountain.decomposition_policy,
    settlement_policy_mode: blueprint.mountain.settlement_policy_mode,
    settlement_policy: blueprint.mountain.settlement_policy,
    tags: metaculusMountainSeed.tags,
    metadata: blueprint.mountain.metadata,
    launched_at: new Date().toISOString(),
  };

  const { data: mountain, error: mountainError } = await db
    .from("mountains")
    .upsert(mountainPayload, { onConflict: "slug" })
    .select("id, metadata")
    .single();

  if (mountainError || !mountain) {
    throw new Error(`Failed to upsert Metaculus summit: ${mountainError?.message ?? "unknown error"}`);
  }

  const membershipRows = [
    {
      mountain_id: mountain.id,
      account_id: adminAccount.id,
      agent_id: null,
      role: "operator",
      status: "active",
      metadata: {},
    },
    {
      mountain_id: mountain.id,
      account_id: null,
      agent_id: officialAgent.id,
      role: "official_bot",
      status: "active",
      metadata: {},
    },
  ];

  for (const membership of membershipRows) {
    const query = db
      .from("mountain_memberships")
      .select("id")
      .eq("mountain_id", membership.mountain_id)
      .eq("role", membership.role)
      .eq(membership.account_id ? "account_id" : "agent_id", membership.account_id ?? membership.agent_id)
      .maybeSingle();
    const { data: existingMembership, error: membershipLookupError } = await query;
    if (membershipLookupError) {
      throw new Error(`Failed to query mountain membership: ${membershipLookupError.message}`);
    }
    if (existingMembership) {
      const { error: membershipUpdateError } = await db
        .from("mountain_memberships")
        .update({ status: membership.status, metadata: membership.metadata })
        .eq("id", existingMembership.id);
      if (membershipUpdateError) {
        throw new Error(`Failed to update mountain membership: ${membershipUpdateError.message}`);
      }
      continue;
    }
    const { error: membershipInsertError } = await db.from("mountain_memberships").insert(membership);
    if (membershipInsertError) {
      throw new Error(`Failed to insert mountain membership: ${membershipInsertError.message}`);
    }
  }

  const { data: externalTarget, error: externalTargetError } = await db
    .from("mountain_external_targets")
    .upsert(
      {
        mountain_id: mountain.id,
        provider: blueprint.external_target.provider,
        target_slug: blueprint.external_target.target_slug,
        official_agent_id: officialAgent.id,
        rules_snapshot: blueprint.external_target.rules_snapshot,
        submission_policy: blueprint.external_target.submission_policy,
        disclosure_policy: blueprint.external_target.disclosure_policy,
        metadata: mergeJson(mountain.metadata, blueprint.external_target.metadata),
      },
      { onConflict: "mountain_id,provider,target_slug" }
    )
    .select("id")
    .single();

  if (externalTargetError || !externalTarget) {
    throw new Error(`Failed to upsert external target: ${externalTargetError?.message ?? "unknown error"}`);
  }

  const { data: existingCampaigns, error: existingCampaignsError } = await db
    .from("campaigns")
    .select("id, title")
    .eq("mountain_id", mountain.id);

  if (existingCampaignsError) {
    throw new Error(`Failed to load existing campaigns: ${existingCampaignsError.message}`);
  }

  const campaignIdByTitle = new Map<string, string>();
  for (const campaignBlueprint of blueprint.campaigns) {
    const existingCampaign = (existingCampaigns ?? []).find((campaign) => campaign.title === campaignBlueprint.title);
    if (existingCampaign) {
      const { error } = await db
        .from("campaigns")
        .update({
          summary: campaignBlueprint.summary,
          hypothesis: campaignBlueprint.hypothesis,
          budget_credits: campaignBlueprint.budget_credits,
          risk_ceiling: campaignBlueprint.risk_ceiling,
          decomposition_aggressiveness: campaignBlueprint.decomposition_aggressiveness,
          status: campaignBlueprint.status,
          owner_account_id: adminAccount.id,
        })
        .eq("id", existingCampaign.id);
      if (error) {
        throw new Error(`Failed to update campaign ${campaignBlueprint.title}: ${error.message}`);
      }
      campaignIdByTitle.set(campaignBlueprint.title, existingCampaign.id);
      continue;
    }

    const { data, error } = await db
      .from("campaigns")
      .insert({
        mountain_id: mountain.id,
        title: campaignBlueprint.title,
        summary: campaignBlueprint.summary,
        hypothesis: campaignBlueprint.hypothesis,
        budget_credits: campaignBlueprint.budget_credits,
        risk_ceiling: campaignBlueprint.risk_ceiling,
        decomposition_aggressiveness: campaignBlueprint.decomposition_aggressiveness,
        status: campaignBlueprint.status,
        owner_account_id: adminAccount.id,
      })
      .select("id")
      .single();
    if (error || !data) {
      throw new Error(`Failed to insert campaign ${campaignBlueprint.title}: ${error?.message ?? "unknown error"}`);
    }
    campaignIdByTitle.set(campaignBlueprint.title, data.id);
  }

  const { data: existingSpecs, error: existingSpecsError } = await db
    .from("work_specs")
    .select("id, title")
    .eq("mountain_id", mountain.id);

  if (existingSpecsError) {
    throw new Error(`Failed to load existing work specs: ${existingSpecsError.message}`);
  }

  const specIdByTitle = new Map<string, string>();
  for (const specBlueprint of blueprint.work_specs) {
    const existingSpec = (existingSpecs ?? []).find((spec) => spec.title === specBlueprint.title);
    const payload = {
      mountain_id: mountain.id,
      campaign_id: campaignIdByTitle.get(specBlueprint.campaign_title) ?? null,
      title: specBlueprint.title,
      summary: specBlueprint.summary,
      status: specBlueprint.status,
      contribution_type: specBlueprint.contribution_type,
      role_type: specBlueprint.role_type,
      allowed_role_types: specBlueprint.allowed_role_types,
      input_contract: specBlueprint.input_contract,
      output_contract: specBlueprint.output_contract,
      verification_contract: specBlueprint.verification_contract,
      reward_envelope: specBlueprint.reward_envelope,
      checkpoint_cadence_minutes: specBlueprint.checkpoint_cadence_minutes,
      duplication_policy: specBlueprint.duplication_policy,
      risk_class: specBlueprint.risk_class,
      priority: specBlueprint.priority,
      speculative: specBlueprint.speculative,
      synthesis_required: specBlueprint.synthesis_required,
      owner_account_id: adminAccount.id,
      metadata: specBlueprint.metadata,
    };

    if (existingSpec) {
      const { error } = await db.from("work_specs").update(payload).eq("id", existingSpec.id);
      if (error) {
        throw new Error(`Failed to update work spec ${specBlueprint.title}: ${error.message}`);
      }
      specIdByTitle.set(specBlueprint.title, existingSpec.id);
      continue;
    }

    const { data, error } = await db.from("work_specs").insert(payload).select("id").single();
    if (error || !data) {
      throw new Error(`Failed to insert work spec ${specBlueprint.title}: ${error?.message ?? "unknown error"}`);
    }
    specIdByTitle.set(specBlueprint.title, data.id);
  }

  for (const specBlueprint of blueprint.work_specs) {
    const workSpecId = specIdByTitle.get(specBlueprint.title);
    if (!workSpecId) continue;
    const dependencyEdges = specBlueprint.dependency_titles
      .map((title) => specIdByTitle.get(title))
      .filter((value): value is string => Boolean(value))
      .map((dependsOnId) => ({
        work_spec_id: dependsOnId,
        dependency_kind: "blocks",
      }));
    const { error } = await db
      .from("work_specs")
      .update({ dependency_edges: dependencyEdges })
      .eq("id", workSpecId);
    if (error) {
      throw new Error(`Failed to update dependency edges for ${specBlueprint.title}: ${error.message}`);
    }
  }

  return {
    mountain_slug: blueprint.mountain.slug,
    mountain_id: mountain.id,
    official_agent_id: officialAgent.id,
    official_agent_name: blueprint.official_agent_name,
    external_target_id: externalTarget.id,
    campaign_count: blueprint.campaigns.length,
    work_spec_count: blueprint.work_specs.length,
  };
}
