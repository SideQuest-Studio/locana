import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach((l) => {
  const [k, ...v] = l.split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim();
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

async function checkRLS() {
  const { data: tables, error } = await supabase.rpc("exec_sql", {
    query: "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';",
  });

  if (error) {
    console.log("exec_sql not available, testing individual tables with anon key...");
    const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

    const check = async (tbl) => {
      const { data, error: e } = await anon.from(tbl).select("*").limit(3);
      console.log(`Table ${tbl}:`, data ? `OK (${data.length} rows)` : `BLOCKED: ${e?.message}`);
    };

    await check("properties");
    await check("partners");
    await check("areas");
    await check("property_images");
    await check("room_types");
    await check("amenities");
    await check("property_amenities");
  } else {
    console.log("Tables RLS status:", tables);
  }
}

checkRLS();
