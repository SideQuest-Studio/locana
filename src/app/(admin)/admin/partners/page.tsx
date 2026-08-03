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

  const { data: partners, error } = await supabase
    .from("partners")
    .select("*, owner:profiles!partners_owner_id_fkey(first_name, last_name, email)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <div className="text-sm text-red-600">
        Could not load partners. Ensure your account has admin access.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1F2A2E]">Partner approvals</h1>
        <p className="text-sm text-[#64716F] mt-1">Review and approve new partner applications</p>
      </div>
      <PartnerApprovalTable
        partners={(partners ?? []) as (Partner & {
          owner: Pick<Profile, "first_name" | "last_name" | "email"> | null;
        })[]}
      />
    </div>
  );
}
