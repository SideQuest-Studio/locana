"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/src/lib/supabase/client";
import { AuthShell } from "@/src/components/auth/auth-shell";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/auth/redirect";
  const registered = searchParams.get("registered");
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    errorParam === "auth_failed"
      ? "Authentication failed. Please try again."
      : errorParam === "profile_error"
      ? "Account session issue. Please sign in again."
      : null
  );
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message || "Invalid email or password.");
        setLoading(false);
        return;
      }

      if (data?.session) {
        // Full navigation to target/redirect route ensures fresh server-side session cookies
        window.location.href = redirect;
      } else {
        setError("Sign in succeeded but session was not established. Please check your credentials.");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during sign in.");
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const redirectUrl = typeof window !== "undefined"
        ? `${window.location.origin}/auth/redirect${redirect !== "/auth/redirect" ? `?next=${encodeURIComponent(redirect)}` : ""}`
        : undefined;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (oauthError) {
        setError(oauthError.message || "Failed to start Google sign-in.");
        setGoogleLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred with Google Sign In.");
      setGoogleLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your DIP account">
      {registered === "partner" && (
        <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Partner application received! Once approved by admin, you will receive full partner dashboard access. Sign in to view your application status.
          </span>
        </div>
      )}

      {registered === "true" && (
        <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>Account created successfully! Please sign in below.</span>
        </div>
      )}

      {registered === "verify_email" && (
        <div className="mb-4 p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <span>Please check your email inbox to verify your account, then sign in below.</span>
        </div>
      )}

      <div className="space-y-4">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full py-3.5 rounded-2xl border border-[#E2D1B8] bg-white flex items-center justify-center gap-3 text-sm font-semibold text-[#1F2A2E] hover:bg-[#F0DFC2]/40 transition-colors disabled:opacity-60 shadow-xs"
        >
          {googleLoading ? (
            <div className="w-5 h-5 border-2 border-[#1E88E5] border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E2D1B8]" />
          </div>
          <span className="relative bg-[#FFF8EE] px-4 text-xs text-[#64716F]">Or continue with email</span>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        {error && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-[#1F2A2E] mb-1.5">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full px-4 py-3 bg-white rounded-2xl border border-[#E2D1B8] text-sm outline-none focus:border-[#1E88E5] focus:ring-2 focus:ring-[#1E88E5]/20"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-[#1F2A2E] mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full px-4 py-3 bg-white rounded-2xl border border-[#E2D1B8] text-sm outline-none focus:border-[#1E88E5] focus:ring-2 focus:ring-[#1E88E5]/20"
          />
        </div>
        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#1E88E5] to-[#0E7C7B] text-white text-sm font-semibold disabled:opacity-60 shadow-md hover:shadow-lg transition-all active:scale-[0.99]"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="text-xs text-center text-[#64716F] mt-6">
        No account?{" "}
        <Link href="/register" className="font-semibold text-[#1E88E5] hover:underline">
          Register
        </Link>
        {" · "}
        <Link href="/register/partner" className="font-semibold text-[#0E7C7B] hover:underline">
          List as partner
        </Link>
      </p>
    </AuthShell>
  );
}
