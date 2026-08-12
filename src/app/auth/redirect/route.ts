import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { getPostLoginPath } from "@/src/lib/auth/get-profile";
import type { UserProfile, Partner } from "@/src/types/database.types";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") || searchParams.get("redirect");
  const origin = request.nextUrl.origin;

  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Auth redirect code exchange error:", error.message);
      const redirectResp = NextResponse.redirect(new URL("/login?error=auth_failed", origin));
      response.cookies.getAll().forEach(c => redirectResp.cookies.set(c));
      return redirectResp;
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirectResp = NextResponse.redirect(new URL("/login", origin));
    response.cookies.getAll().forEach(c => redirectResp.cookies.set(c));
    return redirectResp;
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Auto-heal missing profile to avoid infinite redirect loops
  if (!profile) {
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

      if (newProfile) {
        profile = newProfile;
      }
    } catch (err) {
      console.error("Failed to auto-create missing profile:", err);
    }
  }

  if (!profile) {
    // If profile still cannot be created, sign out session before redirecting to avoid infinite loop
    await supabase.auth.signOut();
    const redirectResp = NextResponse.redirect(new URL("/login?error=profile_error", origin));
    response.cookies.getAll().forEach(c => redirectResp.cookies.set(c));
    return redirectResp;
  }

  let partner: Partner | null = null;
  if (profile.role === "partner_owner" || profile.role === "partner_staff") {
    if (profile.partner_id) {
      const { data: partnerData } = await supabase
        .from("partners")
        .select("*")
        .eq("id", profile.partner_id)
        .single();
      if (partnerData) partner = partnerData as Partner;
    } else {
      const { data: partnerData } = await supabase
        .from("partners")
        .select("*")
        .eq("owner_id", user.id)
        .single();
      if (partnerData) partner = partnerData as Partner;
    }
  }

  const userProfile = { ...profile, partner } as UserProfile;
  
  let redirectPath: string;
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    redirectPath = next;
  } else {
    redirectPath = getPostLoginPath(userProfile);
  }

  const finalResponse = NextResponse.redirect(new URL(redirectPath, origin));
  response.cookies.getAll().forEach(cookie => {
    finalResponse.cookies.set(cookie);
  });

  return finalResponse;
}