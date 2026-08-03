import { createClient } from "@/src/lib/supabase/server";
import type { Partner, Profile, UserProfile } from "@/src/types/database.types";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*, partner:partners(*)")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;

  const { partner, ...profile } = data as Profile & { partner: Partner | Partner[] | null };
  const partnerRow = Array.isArray(partner) ? partner[0] ?? null : partner;

  return { ...profile, partner: partnerRow };
}

export function isPartnerRole(role: Profile["role"]) {
  return role === "partner_owner" || role === "partner_staff";
}

export function canAccessPartnerDashboard(profile: UserProfile) {
  return (
    isPartnerRole(profile.role) &&
    profile.partner?.status === "approved"
  );
}

export function getPostLoginPath(profile: UserProfile): string {
  if (profile.role === "admin") return "/admin";
  if (canAccessPartnerDashboard(profile)) return "/dashboard";
  return "/account";
}

/** Nav items hidden for partner_staff with front_desk role */
export function canAccessPartnerNavItem(
  profile: UserProfile,
  item: "property" | "rooms" | "availability" | "rates" | "bookings" | "staff" | "verification"
): boolean {
  if (profile.role === "partner_owner") return true;
  if (profile.role !== "partner_staff") return false;

  if (profile.staff_role === "manager") {
    return item !== "staff";
  }

  // front_desk
  return item === "bookings";
}
