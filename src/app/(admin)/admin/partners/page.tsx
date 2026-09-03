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

  // 1. Fetch all partner registrations (pending first, then newest)
  const { data: partners, error: partnerError } = await supabase
    .from("partners")
    .select("*")
    .order("created_at", { ascending: false });

  if (partnerError) {
    return (
      <div className="text-sm text-red-600 p-4 border border-red-200 rounded-lg bg-red-50">
        <h2 className="font-bold">Error loading partners:</h2>
        <p>{partnerError.message}</p>
      </div>
    );
  }

  // 2. Fetch profiles for the partners (include phone for detail modal)
  const ownerIds = (partners ?? []).map((p) => p.owner_id);
  let profiles: Pick<Profile, "id" | "first_name" | "last_name" | "email" | "phone_number" | "created_at">[] | null = [];
  let profileError = null as unknown;

  if (ownerIds.length > 0) {
    const res = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, phone_number, created_at")
      .in("id", ownerIds);
    profiles = res.data;
    profileError = res.error;
  }

  if (profileError) {
    return (
      <div className="text-sm text-red-600 p-4 border border-red-200 rounded-lg bg-red-50">
        <h2 className="font-bold">Error loading partner owners:</h2>
        <p>{String((profileError as Error)?.message ?? profileError)}</p>
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
        <h1 className="text-2xl font-bold text-[#1F2A2E]">Partner registrations</h1>
        <p className="text-sm text-[#64716F] mt-1">
          Click a registration to view full details, documents and approve or send feedback
        </p>
      </div>
      <PartnerApprovalTable
        partners={
          partnersWithOwners as (Partner & {
            owner: Pick<Profile, "first_name" | "last_name" | "email" | "phone_number" | "created_at"> | null;
          })[]
        }
      />
    </div>
  );
}
