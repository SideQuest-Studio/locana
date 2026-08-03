"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/src/lib/supabase/client";
import { AuthShell } from "@/src/components/auth/auth-shell";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/auth/redirect";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your DIP account">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
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
            className="w-full px-4 py-3 rounded-2xl border border-[#E2D1B8] text-sm outline-none focus:border-[#1E88E5] focus:ring-2 focus:ring-[#1E88E5]/20"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#1E88E5] to-[#0E7C7B] text-white text-sm font-semibold disabled:opacity-60"
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
