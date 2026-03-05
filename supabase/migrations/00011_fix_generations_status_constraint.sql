-- ============================================================================
-- Migration: 00011_fix_generations_status_constraint.sql
-- Description: Align generations.status check constraint with runtime statuses
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'generations_status_check'
      AND conrelid = 'public.generations'::regclass
  ) THEN
    ALTER TABLE public.generations
      DROP CONSTRAINT generations_status_check;
  END IF;
END;
$$;

-- Normalize legacy/non-standard status values after dropping old checks.
UPDATE public.generations
SET status = 'completed'
WHERE status IN ('success', 'succeeded');

UPDATE public.generations
SET status = 'error'
WHERE status IN ('failed', 'failure');

ALTER TABLE public.generations
  ADD CONSTRAINT generations_status_check
  CHECK (status IN ('success', 'completed', 'error', 'failed', 'cancelled'));
