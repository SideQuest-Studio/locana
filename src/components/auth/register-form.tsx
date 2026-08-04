"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/src/lib/supabase/client";
import { AuthShell } from "@/src/components/auth/auth-shell";

export function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    router.push("/auth/redirect");
    router.refresh();
  }

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/redirect` : undefined,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
    }
  }

  return (
    <AuthShell title="Create account" subtitle="Book stays across Quezon Province">
      <div className="space-y-4">
        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full py-3.5 rounded-2xl border border-[#E2D1B8] flex items-center justify-center gap-2 text-sm font-semibold text-[#1F2A2E] hover:bg-[#F0DFC2]/40 transition-colors disabled:opacity-60"
        >
          {googleLoading ? "Connecting…" : "Continue with Google"}
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
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="fullName" className="block text-xs font-semibold text-[#1F2A2E] mb-1.5">
            Full name
          </label>
          <input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-2xl border border-[#E2D1B8] text-sm outline-none focus:border-[#1E88E5] focus:ring-2 focus:ring-[#1E88E5]/20"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-[#1F2A2E] mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-2xl border border-[#E2D1B8] text-sm outline-none focus:border-[#1E88E5] focus:ring-2 focus:ring-[#1E88E5]/20"
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
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-2xl border border-[#E2D1B8] text-sm outline-none focus:border-[#1E88E5] focus:ring-2 focus:ring-[#1E88E5]/20"
          />
        </div>
        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#1E88E5] to-[#0E7C7B] text-white text-sm font-semibold disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="text-xs text-center text-[#64716F] mt-6">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[#1E88E5] hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
