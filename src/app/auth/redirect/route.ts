import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getPostLoginPath } from "@/src/lib/auth/get-profile";
import type { UserProfile, Partner } from "@/src/types/database.types";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
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
      const redirectResp = NextResponse.redirect(new URL("/login", origin));
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    const redirectResp = NextResponse.redirect(new URL("/login", origin));
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
  const redirectPath = getPostLoginPath(userProfile);

  const finalResponse = NextResponse.redirect(new URL(redirectPath, origin));
  response.cookies.getAll().forEach(cookie => {
    finalResponse.cookies.set(cookie);
  });

  return finalResponse;
}