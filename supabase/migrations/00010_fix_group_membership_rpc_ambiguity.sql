-- ============================================================================
-- Migration: 00010_fix_group_membership_rpc_ambiguity.sql
-- Description: Fix ambiguous member_count references in group membership RPCs
-- ============================================================================

DO $group_membership_fix$
BEGIN
  EXECUTE $join_create$
    CREATE OR REPLACE FUNCTION public.join_group_atomic(
      p_group_id UUID,
      p_agent_id UUID
    )
    RETURNS TABLE (
      ok BOOLEAN,
      code TEXT,
      member_count INTEGER
    )
    AS $join_fn$
    DECLARE
      v_group public.groups%ROWTYPE;
      v_count INTEGER;
    BEGIN
      SELECT *
      INTO v_group
      FROM public.groups
      WHERE id = p_group_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'group_not_found', NULL::INTEGER;
        RETURN;
      END IF;

      SELECT COUNT(*)::INTEGER
      INTO v_count
      FROM public.group_members
      WHERE group_id = p_group_id;

      IF COALESCE(v_group.member_count, 0) <> v_count THEN
        UPDATE public.groups g
        SET member_count = v_count,
            updated_at = NOW()
        WHERE g.id = p_group_id;
        v_group.member_count := v_count;
      END IF;

      IF NOT COALESCE(v_group.is_public, TRUE) THEN
        RETURN QUERY SELECT FALSE, 'group_private', COALESCE(v_group.member_count, 0);
        RETURN;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM public.group_members
        WHERE group_id = p_group_id
          AND agent_id = p_agent_id
      ) THEN
        RETURN QUERY SELECT FALSE, 'already_member', COALESCE(v_group.member_count, 0);
        RETURN;
      END IF;

      IF COALESCE(v_group.member_count, 0) >= COALESCE(v_group.max_members, 100) THEN
        RETURN QUERY SELECT FALSE, 'group_full', COALESCE(v_group.member_count, 0);
        RETURN;
      END IF;

      INSERT INTO public.group_members (group_id, agent_id, role)
      VALUES (p_group_id, p_agent_id, 'member');

      UPDATE public.groups g
      SET member_count = COALESCE(g.member_count, 0) + 1,
          updated_at = NOW()
      WHERE g.id = p_group_id
      RETURNING g.member_count INTO v_count;

      RETURN QUERY SELECT TRUE, 'joined', v_count;
    EXCEPTION
      WHEN unique_violation THEN
        SELECT g.member_count INTO v_count
        FROM public.groups g
        WHERE g.id = p_group_id;
        RETURN QUERY SELECT FALSE, 'already_member', COALESCE(v_count, 0);
    END;
    $join_fn$ LANGUAGE plpgsql;
  $join_create$;

  EXECUTE 'COMMENT ON FUNCTION public.join_group_atomic(UUID, UUID)
    IS ''Atomically validates capacity/membership and joins an agent to a group.''';

  EXECUTE $leave_create$
    CREATE OR REPLACE FUNCTION public.leave_group_atomic(
      p_group_id UUID,
      p_agent_id UUID
    )
    RETURNS TABLE (
      ok BOOLEAN,
      code TEXT,
      member_count INTEGER
    )
    AS $leave_fn$
    DECLARE
      v_count INTEGER;
      v_deleted INTEGER;
    BEGIN
      PERFORM 1
      FROM public.groups
      WHERE id = p_group_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'group_not_found', NULL::INTEGER;
        RETURN;
      END IF;

      DELETE FROM public.group_members
      WHERE group_id = p_group_id
        AND agent_id = p_agent_id;

      GET DIAGNOSTICS v_deleted = ROW_COUNT;
      IF v_deleted = 0 THEN
        SELECT g.member_count INTO v_count
        FROM public.groups g
        WHERE g.id = p_group_id;
        RETURN QUERY SELECT FALSE, 'not_member', COALESCE(v_count, 0);
        RETURN;
      END IF;

      SELECT COUNT(*)::INTEGER
      INTO v_count
      FROM public.group_members
      WHERE group_id = p_group_id;

      UPDATE public.groups g
      SET member_count = v_count,
          updated_at = NOW()
      WHERE g.id = p_group_id;

      RETURN QUERY SELECT TRUE, 'left', v_count;
    END;
    $leave_fn$ LANGUAGE plpgsql;
  $leave_create$;

  EXECUTE 'COMMENT ON FUNCTION public.leave_group_atomic(UUID, UUID)
    IS ''Atomically removes an agent from a group and synchronizes member_count.''';
END;
$group_membership_fix$;
