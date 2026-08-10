import { createClient } from "@/src/lib/supabase/server";

export default async function AdminDebugPage() {
  const supabase = await createClient();
  
  // Test 1: Check user role
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id || "")
    .single();

  // Test 2: Execute is_admin function directly
  const { data: isAdmin, error: rpcError } = await supabase.rpc("is_admin");

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold mb-4">Admin Debug Info</h1>
      <pre className="bg-gray-100 p-4 rounded">
        {JSON.stringify({
          userId: user?.id,
          profileRole: profile?.role,
          profileError,
          isAdminFuncResult: isAdmin,
          rpcError
        }, null, 2)}
      </pre>
    </div>
  );
}
