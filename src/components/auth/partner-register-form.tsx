"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerPartner } from "@/src/actions/auth/register-partner";
import { AuthShell } from "@/src/components/auth/auth-shell";

export function PartnerRegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    businessName: "",
    businessEmail: "",
    businessPhone: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await registerPartner(form);

    if (!result.success) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    router.push("/login?registered=partner");
  }

  const inputClass =
    "w-full px-4 py-3 rounded-2xl border border-[#E2D1B8] text-sm outline-none focus:border-[#0E7C7B] focus:ring-2 focus:ring-[#0E7C7B]/20";

  return (
    <AuthShell
      title="Partner registration"
      subtitle="List your property on DIP — approval required before partner access"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="businessName" className="block text-xs font-semibold text-[#1F2A2E] mb-1.5">
            Business name
          </label>
          <input
            id="businessName"
            value={form.businessName}
            onChange={(e) => update("businessName", e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="fullName" className="block text-xs font-semibold text-[#1F2A2E] mb-1.5">
            Your full name
          </label>
          <input
            id="fullName"
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-[#1F2A2E] mb-1.5">
            Account email
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-[#1F2A2E] mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            required
            minLength={6}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="businessEmail" className="block text-xs font-semibold text-[#1F2A2E] mb-1.5">
            Business email (optional)
          </label>
          <input
            id="businessEmail"
            type="email"
            value={form.businessEmail}
            onChange={(e) => update("businessEmail", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="businessPhone" className="block text-xs font-semibold text-[#1F2A2E] mb-1.5">
            Business phone (optional)
          </label>
          <input
            id="businessPhone"
            value={form.businessPhone}
            onChange={(e) => update("businessPhone", e.target.value)}
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#0E7C7B] to-[#1E88E5] text-white text-sm font-semibold disabled:opacity-60"
        >
          {loading ? "Submitting…" : "Submit partner application"}
        </button>
      </form>

      <p className="text-xs text-center text-[#64716F] mt-6">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-[#1E88E5] hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
