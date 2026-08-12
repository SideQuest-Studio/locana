import { type NextRequest, NextResponse } from "next/server";
import { updateSession, createRedirect } from "@/src/lib/supabase/middleware";
import type { PartnerStatus, UserRole } from "@/src/types/database.types";

const AUTH_PREFIXES = ["/login", "/register"];
const CUSTOMER_PREFIX = "/account";
const PARTNER_PREFIX = "/dashboard";
const ADMIN_PREFIX = "/admin";

function isPartnerRole(role: UserRole) {
  return role === "partner_owner" || role === "partner_staff";
}

export async function middleware(request: NextRequest) {
  // 1. Refresh session and get response & user
  const { supabaseResponse, user, supabase } = await updateSession(request);
  
  const { pathname } = request.nextUrl;

  const isAuthRoute = AUTH_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`));
  const isProtected =
    pathname.startsWith(CUSTOMER_PREFIX) ||
    pathname.startsWith(PARTNER_PREFIX) ||
    pathname.startsWith(ADMIN_PREFIX);

  if (!isAuthRoute && !isProtected) {
    return supabaseResponse;
  }

  // If already logged in and visiting login/register, redirect to post-login path
  if (isAuthRoute) {
    if (user) {
      const redirectUrl = new URL("/auth/redirect", request.url);
      const next = request.nextUrl.searchParams.get("redirect");
      if (next) redirectUrl.searchParams.set("next", next);
      return createRedirect(redirectUrl, request, supabaseResponse);
    }
    return supabaseResponse;
  }

  // Protected route: user must be logged in
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return createRedirect(loginUrl, request, supabaseResponse);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, partner_id")
    .eq("id", user.id)
    .single();

  // If profile is not found yet for authenticated user, forward to /auth/redirect for auto-healing
  if (!profile) {
    const healUrl = new URL("/auth/redirect", request.url);
    healUrl.searchParams.set("next", pathname);
    return createRedirect(healUrl, request, supabaseResponse);
  }

  const role = (profile.role || "customer") as UserRole;

  let partnerStatus: PartnerStatus | null = null;
  if (isPartnerRole(role)) {
    if (profile.partner_id) {
      const { data: partner } = await supabase
        .from("partners")
        .select("status")
        .eq("id", profile.partner_id)
        .single();
      partnerStatus = (partner?.status as PartnerStatus) ?? null;
    } else {
      const { data: partner } = await supabase
        .from("partners")
        .select("status")
        .eq("owner_id", user.id)
        .single();
      partnerStatus = (partner?.status as PartnerStatus) ?? null;
    }
  }

  if (pathname.startsWith(ADMIN_PREFIX)) {
    if (role !== "admin") {
      return createRedirect(new URL("/account", request.url), request, supabaseResponse);
    }
    return supabaseResponse;
  }

  if (pathname.startsWith(PARTNER_PREFIX)) {
    if (role === "admin") {
      return createRedirect(new URL("/admin", request.url), request, supabaseResponse);
    }
    if (!isPartnerRole(role)) {
      return createRedirect(new URL("/account", request.url), request, supabaseResponse);
    }
    if (partnerStatus !== "approved") {
      return createRedirect(new URL("/account?pending=partner", request.url), request, supabaseResponse);
    }
    return supabaseResponse;
  }

  if (pathname.startsWith(CUSTOMER_PREFIX)) {
    if (role === "admin") {
      return createRedirect(new URL("/admin", request.url), request, supabaseResponse);
    }
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/account/:path*",
    "/dashboard/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/register/:path*",
    "/auth/redirect",
    "/auth/callback",
  ],
};
