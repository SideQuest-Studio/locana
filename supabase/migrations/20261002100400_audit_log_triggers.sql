-- Migration: audit_log_triggers
-- Down: DROP TRIGGER audit_<table> ON public.<table> for each table below; DROP FUNCTION public.write_audit_log();
--
-- partners is deliberately not audited here: approvals run with the service role (auth.uid() is null),
-- so approve-partner.ts writes its own audit rows with the admin actor.

CREATE OR REPLACE FUNCTION public.write_audit_log()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND to_jsonb(NEW) = to_jsonb(OLD) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  VALUES (
    auth.uid(),
    CASE TG_OP WHEN 'INSERT' THEN 'create' WHEN 'UPDATE' THEN 'update' ELSE 'delete' END::public.audit_action,
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END
  );
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.write_audit_log() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['properties', 'room_types', 'rate_plans', 'pricing_rules', 'room_type_availability'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'audit_' || t, t);
    EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.write_audit_log()', 'audit_' || t, t);
  END LOOP;
END $$;
