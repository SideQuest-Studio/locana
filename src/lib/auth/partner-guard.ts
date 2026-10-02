import { createClient } from "@/src/lib/supabase/server";
import { failure, type ActionResult } from "@/src/lib/api/response";

export type PartnerContext = {
  userId: string;
  partnerId: string;
  propertyId: string | null;
  canManage: boolean;
};

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export type PartnerGuardResult =
  | { ok: true; ctx: PartnerContext; supabase: ServerClient }
  | { ok: false; error: ActionResult<never> };

/**
 * Resolves the calling partner from the session, never from client input.
 * `manage` additionally requires an owner or manager (front desk staff are read/check-in only).
 * RLS enforces the same rules; this guard returns a clear error before the database is hit.
 */
export async function requirePartner(
  { manage = false }: { manage?: boolean } = {}
): Promise<PartnerGuardResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: failure("auth.unauthorized", "You must be signed in.") };
  }

  // partners has three FKs to profiles (owner_id, approved_by, and profiles.partner_id), so the embed
  // must name the relationship or PostgREST rejects it as ambiguous (PGRST201).
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, staff_role, partner_id, partner:partners!profiles_partner_id_fkey(status)")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("requirePartner: profile lookup failed:", profileError);
    return { ok: false, error: failure("unexpected.error", "We couldn't verify your partner account. Please try again.") };
  }

  const partner = Array.isArray(profile?.partner) ? profile.partner[0] : profile?.partner;
  const isPartnerRole = profile?.role === "partner_owner" || profile?.role === "partner_staff";
  if (!profile?.partner_id || !isPartnerRole || partner?.status !== "approved") {
    return {
      ok: false,
      error: failure("partner.not_approved", "Your partner account is not approved yet."),
    };
  }

  const canManage =
    profile.role === "partner_owner" ||
    (profile.role === "partner_staff" && profile.staff_role === "manager");
  if (manage && !canManage) {
    return {
      ok: false,
      error: failure("partner.forbidden", "Your staff role can't change property settings."),
    };
  }

  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("partner_id", profile.partner_id)
    .maybeSingle();

  return {
    ok: true,
    supabase,
    ctx: {
      userId: user.id,
      partnerId: profile.partner_id,
      propertyId: property?.id ?? null,
      canManage,
    },
  };
}
