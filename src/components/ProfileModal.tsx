"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Mail,
  Calendar,
  ShieldCheck,
  Heart,
  LogOut,
  Edit2,
  Check,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";
import { useWishlist } from "@/src/context/WishlistContext";
import { createClient } from "@/src/lib/supabase/client";

export default function ProfileModal() {
  const { user, isProfileModalOpen, closeProfileModal, signOut } = useAuth();
  const { wishlist } = useWishlist();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || user.email?.split("@")[0] || "");
    }
  }, [user]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isProfileModalOpen) {
        closeProfileModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isProfileModalOpen, closeProfileModal]);

  if (!isProfileModalOpen || !user) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setSaveLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });

      if (error) {
        setStatusMsg({ type: "error", text: error.message || "Failed to update profile." });
      } else {
        setStatusMsg({ type: "success", text: "Profile updated successfully!" });
        setIsEditing(false);
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "An unexpected error occurred." });
    } finally {
      setSaveLoading(false);
    }
  };

  const formattedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Recently";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1F2A2E]/70 backdrop-blur-md transition-opacity duration-300 animate-fadeIn"
        onClick={closeProfileModal}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-[#FFF8EE] rounded-3xl shadow-[0_25px_60px_-15px_rgba(31,42,46,0.35)] border border-[#F0DFC2] overflow-hidden z-10 animate-scaleUp">
        {/* Top Gradient Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-[#1E88E5] via-[#0E7C7B] to-[#F2994A]" />

        {/* Close Button */}
        <button
          onClick={closeProfileModal}
          className="absolute top-5 right-5 p-2 rounded-full text-[#1F2A2E]/60 hover:text-[#1F2A2E] hover:bg-[#F5E6D3] transition-all z-20"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header Banner & User Badge */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1E88E5] to-[#0E7C7B] flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-[#1E88E5]/25 border-2 border-white">
                {(fullName || user.email || "U")[0].toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-white" title="Verified Account">
                <ShieldCheck className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="text-center sm:text-left flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1E88E5]/10 text-[#1E88E5] text-xs font-semibold mb-1">
                <Sparkles className="h-3 w-3" />
                Customer Account
              </div>
              <h3 className="text-xl font-bold text-[#1F2A2E]">
                {fullName || "Valued Guest"}
              </h3>
              <p className="text-xs text-[#1F2A2E]/60">{user.email}</p>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-3.5 rounded-2xl bg-white/80 border border-[#F0DFC2] flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#1E88E5]/10 text-[#1E88E5]">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] text-[#1F2A2E]/60 font-medium">Saved Resorts</p>
                <p className="text-base font-bold text-[#1F2A2E]">{wishlist.size} places</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/80 border border-[#F0DFC2] flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#0E7C7B]/10 text-[#0E7C7B]">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] text-[#1F2A2E]/60 font-medium">Member Since</p>
                <p className="text-xs font-bold text-[#1F2A2E]">{formattedDate}</p>
              </div>
            </div>
          </div>

          {/* Alert Message */}
          {statusMsg && (
            <div
              className={`mb-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                statusMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              <Check className="h-4 w-4 shrink-0" />
              {statusMsg.text}
            </div>
          )}

          {/* Profile Details Form */}
          <div className="space-y-4 bg-white/60 p-4 sm:p-5 rounded-2xl border border-[#F0DFC2]">
            <div className="flex items-center justify-between border-b border-[#F0DFC2]/60 pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1F2A2E]/70">
                Personal Information
              </h4>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-semibold text-[#1E88E5] hover:underline flex items-center gap-1"
                >
                  <Edit2 className="h-3 w-3" /> Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2A2E] mb-1">
                    Display Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-[#1F2A2E]/40" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#E2D1B8] rounded-xl text-[#1F2A2E] focus:outline-none focus:ring-2 focus:ring-[#1E88E5]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="flex-1 py-2 px-4 bg-[#1E88E5] hover:bg-[#1565C0] text-white text-xs font-semibold rounded-xl transition-all shadow-md disabled:opacity-50"
                  >
                    {saveLoading ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#1F2A2E]/60 flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-[#1E88E5]" /> Name
                  </span>
                  <span className="font-semibold text-[#1F2A2E]">
                    {fullName || "Not provided"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#1F2A2E]/60 flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-[#1E88E5]" /> Email
                  </span>
                  <span className="font-semibold text-[#1F2A2E]">{user.email}</span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => {
                closeProfileModal();
                signOut();
              }}
              className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
