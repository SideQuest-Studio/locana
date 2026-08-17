import { redirect } from "next/navigation";
import { getUserProfile } from "@/src/lib/auth/get-profile";
import { createClient } from "@/src/lib/supabase/server";
import { VerificationCenter } from "@/src/components/partner/verification/verification-center";
import type { PartnerVerificationDocument } from "@/src/types/database.types";

export default async function VerificationPage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/login");
  if (!profile.partner) redirect("/account?pending=partner");

  const supabase = await createClient();

  const { data: documents, error } = await supabase
    .from("partner_verification_documents")
    .select("*")
    .eq("partner_id", profile.partner.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching partner verification documents:", error);
  }

  return (
    <VerificationCenter
      partner={profile.partner}
      documents={(documents as PartnerVerificationDocument[]) || []}
    />
  );
}
