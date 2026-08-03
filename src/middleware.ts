import { type NextRequest, NextResponse } from "next/server";
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
  const { pathname } = request.nextUrl;

  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = AUTH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isProtected =
    pathname.startsWith(CUSTOMER_PREFIX) ||
    pathname.startsWith(PARTNER_PREFIX) ||
    pathname.startsWith(ADMIN_PREFIX);

  if (pathname === "/auth/redirect") {
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
    .select("role, partner:partners(status)")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = profile.role as UserRole;

  if (pathname.startsWith(ADMIN_PREFIX)) {
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/account", request.url));
    }
    return supabaseResponse;
  }

  if (pathname.startsWith(PARTNER_PREFIX)) {
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (!isPartnerRole(role)) {
      return NextResponse.redirect(new URL("/account", request.url));
    }
    if (!isPartnerApproved(profile as MiddlewareProfile)) {
      return NextResponse.redirect(new URL("/account?pending=partner", request.url));
    }
    return supabaseResponse;
  }

  if (pathname.startsWith(CUSTOMER_PREFIX)) {
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
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
    "/register/:path*",
    "/auth/redirect",
  ],
};
