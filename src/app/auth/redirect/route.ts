import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getPostLoginPath } from "@/src/lib/auth/get-profile";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const origin = request.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  // Create a placeholder response that we will populate with cookies
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

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("Auth redirect error:", error.message);
    return NextResponse.redirect(new URL("/login", origin));
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

  if (!profile) {
    return NextResponse.redirect(new URL("/login", origin));
  }
  
  const redirectPath = getPostLoginPath(profile as any);
  
  // Return a new response that carries the cookies from the `response` above
  const finalResponse = NextResponse.redirect(new URL(redirectPath, origin));
  response.cookies.getAll().forEach(cookie => {
    finalResponse.cookies.set(cookie.name, cookie.value, cookie.options);
  });
  
  return finalResponse;
}