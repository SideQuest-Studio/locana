import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { PartnerApprovalTable } from "@/src/components/admin/partner-approval-table";
import type { Partner, Profile } from "@/src/types/database.types";

export default async function AdminPartnersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 1. Fetch pending partners
  const { data: partners, error: partnerError } = await supabase
    .from("partners")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (partnerError) {
    return (
      <div className="text-sm text-red-600 p-4 border border-red-200 rounded-lg bg-red-50">
        <h2 className="font-bold">Error loading partners:</h2>
        <p>{partnerError.message}</p>
      </div>
    );
  }

  // 2. Fetch profiles for the partners
  const ownerIds = (partners ?? []).map((p) => p.owner_id);
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .in("id", ownerIds);

  if (profileError) {
    return (
      <div className="text-sm text-red-600 p-4 border border-red-200 rounded-lg bg-red-50">
        <h2 className="font-bold">Error loading partner owners:</h2>
        <p>{profileError.message}</p>
      </div>
    );
  }

  // 3. Merge data
  const profileMap = new Map(profiles?.map((p) => [p.id, p]));
  const partnersWithOwners = (partners ?? []).map((partner) => ({
    ...partner,
    owner: profileMap.get(partner.owner_id) || null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1F2A2E]">Partner approvals</h1>
        <p className="text-sm text-[#64716F] mt-1">Review and approve new partner applications</p>
      </div>
      <PartnerApprovalTable
        partners={partnersWithOwners as (Partner & {
          owner: Pick<Profile, "first_name" | "last_name" | "email"> | null;
        })[]}
      />
    </div>
  );
}
