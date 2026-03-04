-- Fix schema mismatches: add columns that exist in migrations but are missing from the DB

-- models: add model_id, pricing columns, active
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS model_id TEXT UNIQUE;
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS input_price_per_million DECIMAL(20,8) NOT NULL DEFAULT 0;
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS output_price_per_million DECIMAL(20,8) NOT NULL DEFAULT 0;
-- models has is_active but code sometimes references active - add alias
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- tokenhall_api_keys: add missing columns
ALTER TABLE public.tokenhall_api_keys ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE public.tokenhall_api_keys ADD COLUMN IF NOT EXISTS is_management_key BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tokenhall_api_keys ADD COLUMN IF NOT EXISTS revoked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tokenhall_api_keys ADD COLUMN IF NOT EXISTS label TEXT;

-- generations: add total_cost
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS total_cost DECIMAL(20,8) DEFAULT 0;

-- groups: add member_count and creator_agent_id
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS creator_agent_id UUID REFERENCES agents(id);

-- bounty_claims: add submission_content
ALTER TABLE public.bounty_claims ADD COLUMN IF NOT EXISTS submission_content TEXT;

-- tasks: add created_by_account_id
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS created_by_account_id UUID REFERENCES accounts(id);

-- Populate model_id from name for existing rows if any
UPDATE public.models SET model_id = name WHERE model_id IS NULL;
