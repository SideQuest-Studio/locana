import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/src/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import type { PartnerStatus, UserRole } from "@/src/types/database.types";

const AUTH_PREFIXES = ["/login", "/register"];
const CUSTOMER_PREFIX = "/account";
const PARTNER_PREFIX = "/dashboard";
const ADMIN_PREFIX = "/admin";

type MiddlewareProfile = {
  role: UserRole;
  partner: { status: PartnerStatus } | { status: PartnerStatus }[] | null;
};

function isPartnerApproved(profile: MiddlewareProfile) {
  const partner = profile.partner;
  const status = Array.isArray(partner) ? partner[0]?.status : partner?.status;
  return status === "approved";
}

function isPartnerRole(role: UserRole) {
  return role === "partner_owner" || role === "partner_staff";
}

export async function middleware(request: NextRequest) {
  // 1. Refresh session and get the updated response
  const supabaseResponse = await updateSession(request);
  
  const { pathname } = request.nextUrl;

  // IMMEDIATELY exempt the auth callback route
  if (pathname.startsWith("/auth/redirect")) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = AUTH_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`));
  const isProtected =
    pathname.startsWith(CUSTOMER_PREFIX) ||
    pathname.startsWith(PARTNER_PREFIX) ||
    pathname.startsWith(ADMIN_PREFIX);

  if (pathname.startsWith("/auth/redirect")) {
    return supabaseResponse;
  }

  if (!isAuthRoute && !isProtected) {
    return supabaseResponse;
  }

  if (isAuthRoute) {
    if (user) {
      return NextResponse.redirect(new URL("/auth/redirect", request.url));
    }
    return supabaseResponse;
  }

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = profile.role as UserRole;
  console.log(`Middleware: Path ${pathname}, Role: ${role}`);

  if (pathname.startsWith(ADMIN_PREFIX)) {
    if (role !== "admin") {
      console.log("Middleware: Redirecting non-admin from admin path");
      return NextResponse.redirect(new URL("/account", request.url));
    }
    return supabaseResponse;
  }

  if (pathname.startsWith(PARTNER_PREFIX)) {
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (!isPartnerRole(role)) {
      console.log("Middleware: Redirecting non-partner from partner path");
      return NextResponse.redirect(new URL("/account", request.url));
    }
    // Only check approval status if user has a partner role
    if (isPartnerRole(role) && !isPartnerApproved(profile as MiddlewareProfile)) {
      console.log("Middleware: Redirecting unapproved partner");
      return NextResponse.redirect(new URL("/account?pending=partner", request.url));
    }
    return supabaseResponse;
  }

  if (pathname.startsWith(CUSTOMER_PREFIX)) {
    if (role === "admin") {
      console.log("Middleware: Redirecting admin from customer path");
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    console.log("Middleware: Allowing access to customer path");
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
    "/register/:path*",
    "/auth/redirect",
  ],
};
