"use client";

import React, { useState, useEffect } from "react";
import { X, Mail, Lock, Eye, EyeOff, Compass, AlertCircle, Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";
import { supabaseConfig } from "@/src/lib/supabase-auth";
import Image from "next/image";
import dipLogo from "@/src/assets/dip.png"

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, authMode, setAuthMode } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (isAuthModalOpen) {
      setErrorMsg(null);
      setEmail("");
      setPassword("");
    }
  }, [isAuthModalOpen, authMode]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabaseConfig.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message || "Invalid email or password.");
      } else {
        closeAuthModal();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setGoogleLoading(true);
    try {
      const { error } = await supabaseConfig.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });

      if (error) {
        setErrorMsg(error.message || "Failed to sign in with Google.");
        setGoogleLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred with Google Sign In.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1F2A2E]/70 backdrop-blur-md transition-opacity duration-300 animate-fadeIn"
        onClick={closeAuthModal}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-[#FFF8EE] rounded-3xl shadow-[0_25px_60px_-15px_rgba(31,42,46,0.35)] border border-[#F0DFC2] overflow-hidden z-10 animate-scaleUp">
        {/* Header decoration bar */}
        <div className="h-2 w-full bg-gradient-to-r from-[#1E88E5] via-[#0E7C7B] to-[#F2994A]" />

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 p-2 rounded-full text-[#1F2A2E]/60 hover:text-[#1F2A2E] hover:bg-[#F0DFC2]/60 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-7 sm:p-9">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg mb-3">
              <Image src={dipLogo} alt="DIP Logo" className="w-full h-full object-cover" />
            </div>
            <h2
              className="text-2xl font-bold text-[#1F2A2E]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {authMode === "login" ? "Welcome Back to DIP" : "Join DIP Resort & Hotels"}
            </h2>
            <p className="text-sm text-[#1F2A2E]/70 mt-1">
              {authMode === "login"
                ? "Sign in to manage your bookings & wishlist"
                : "Instant registration powered by Google"}
            </p>
          </div>

          {/* Tab Selector */}
          <div className="grid grid-cols-2 p-1 bg-[#F5E6D3] rounded-2xl mb-6 border border-[#E8D5BC]">
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className={`py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 ${authMode === "login"
                ? "bg-white text-[#1F2A2E] shadow-sm"
                : "text-[#1F2A2E]/60 hover:text-[#1F2A2E]"
                }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("signup")}
              className={`py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 ${authMode === "signup"
                ? "bg-white text-[#1E88E5] shadow-sm"
                : "text-[#1F2A2E]/60 hover:text-[#1F2A2E]"
                }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* LOGIN MODE */}
          {authMode === "login" ? (
            <div className="space-y-4">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2A2E] mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1F2A2E]/40" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-white border border-[#E2D1B8] focus:border-[#1E88E5] focus:ring-2 focus:ring-[#1E88E5]/20 rounded-2xl text-sm text-[#1F2A2E] placeholder-[#1F2A2E]/35 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2A2E] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1F2A2E]/40" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-10 py-3 bg-white border border-[#E2D1B8] focus:border-[#1E88E5] focus:ring-2 focus:ring-[#1E88E5]/20 rounded-2xl text-sm text-[#1F2A2E] placeholder-[#1F2A2E]/35 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#1F2A2E]/40 hover:text-[#1F2A2E]"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-[#1E88E5] to-[#0E7C7B] hover:from-[#1976D2] hover:to-[#0B6968] text-white text-sm font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In with Email</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-5">
                <div className="border-t border-[#E8D5BC] w-full" />
                <span className="bg-[#FFF8EE] px-3 text-[11px] font-semibold text-[#1F2A2E]/50 uppercase tracking-wider whitespace-nowrap">
                  or continue with
                </span>
                <div className="border-t border-[#E8D5BC] w-full" />
              </div>

              {/* Google Sign In Option */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
                className="w-full py-3.5 px-4 bg-white border border-[#E2D1B8] hover:bg-[#FDF7EE] hover:border-[#1E88E5]/40 text-[#1F2A2E] text-sm font-semibold rounded-2xl shadow-xs transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-3"
              >
                {googleLoading ? (
                  <div className="w-5 h-5 border-2 border-[#1E88E5] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* SIGN UP MODE — GMAIL ONLY REQUIREMENT */
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1E88E5]/10 to-[#0E7C7B]/10 border border-[#1E88E5]/20 text-center">
                <div className="inline-flex p-2 rounded-xl bg-white shadow-xs text-[#1E88E5] mb-2">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-[#1F2A2E] mb-1">
                  Gmail Sign-Up Only
                </h3>
                <p className="text-xs text-[#1F2A2E]/75 leading-relaxed">
                  For enhanced security and instant verification, new account sign-ups on DIP require a Google account.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full py-4 px-4 bg-white border border-[#1E88E5]/40 hover:bg-[#FDF7EE] hover:border-[#1E88E5] text-[#1F2A2E] text-sm font-bold rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-3 group"
              >
                {googleLoading ? (
                  <div className="w-5 h-5 border-2 border-[#1E88E5] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
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
                    <span>Sign up with Gmail</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-[#1F2A2E]/50 leading-normal">
                By continuing with Google, you agree to DIP&apos;s Terms of Service and Privacy Policy.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="py-4 px-7 bg-[#F7EBD9] border-t border-[#F0DFC2] text-center text-xs text-[#1F2A2E]/70">
          {authMode === "login" ? (
            <span>
              Don&apos;t have an account yet?{" "}
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className="font-bold text-[#1E88E5] hover:underline"
              >
                Sign up with Gmail
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className="font-bold text-[#1E88E5] hover:underline"
              >
                Log in here
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
