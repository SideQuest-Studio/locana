import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
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

  if (data) return data as Profile;

  // Auto-heal missing profile for authenticated user
  try {
    const admin = createAdminClient();
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
    const [firstName, ...rest] = fullName ? fullName.trim().split(" ") : [user.email?.split("@")[0] || "Guest"];
    const lastName = rest.length > 0 ? rest.join(" ") : (firstName === "Guest" ? "User" : firstName);
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

    const { data: newProfile } = await admin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email?.toLowerCase() || "",
          first_name: firstName,
          last_name: lastName,
          avatar_url: avatarUrl,
          role: "customer",
        },
        { onConflict: "id" }
      )
      .select("*")
      .single();

    return (newProfile as Profile) || null;
  } catch (err) {
    console.error("getProfile: Auto-heal profile error", err);
    return null;
  }
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const profile = await getProfile();
  if (!profile) return null;

  const supabase = await createClient();
  let partner: Partner | null = null;
  if (profile.partner_id) {
    const { data: partnerData } = await supabase
      .from("partners")
      .select("*")
      .eq("id", profile.partner_id)
      .single();
    if (partnerData) partner = partnerData as Partner;
  } else if (isPartnerRole(profile.role)) {
    const { data: partnerData } = await supabase
      .from("partners")
      .select("*")
      .eq("owner_id", profile.id)
      .single();
    if (partnerData) partner = partnerData as Partner;
  }

  return { ...profile, partner } as UserProfile;
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
