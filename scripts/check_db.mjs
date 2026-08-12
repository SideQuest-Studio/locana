import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Read .env manually
const envContent = fs.readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.split("=");
  if (k && v.length > 0) env[k.trim()] = v.join("=").trim();
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function main() {
  console.log("Checking Supabase DB tables...");

  const { data: areas, error: areaErr } = await supabase.from("areas").select("*");
  console.log("Areas count:", areas?.length, areaErr ? `Error: ${areaErr.message}` : "");
  if (areas && areas.length > 0) console.log("Areas:", areas.map(a => a.name_en));

  const { data: partners, error: partErr } = await supabase.from("partners").select("*");
  console.log("Partners count:", partners?.length, partErr ? `Error: ${partErr.message}` : "");
  if (partners && partners.length > 0) console.log("Partners:", partners.map(p => ({ id: p.id, name: p.business_name, status: p.status })));

  const { data: properties, error: propErr } = await supabase.from("properties").select("*, area:areas(*), partner:partners(*)");
  console.log("Properties count:", properties?.length, propErr ? `Error: ${propErr.message}` : "");
  if (properties && properties.length > 0) {
    console.log("Properties in DB:", properties.map(p => ({ id: p.id, name: p.name, slug: p.slug, area: p.area?.name_en })));
  }

  const { data: wishlists, error: wishErr } = await supabase.from("wishlists").select("*");
  console.log("Wishlists count:", wishlists?.length, wishErr ? `Error: ${wishErr.message}` : "");

  const { data: profiles, error: profErr } = await supabase.from("profiles").select("*");
  console.log("Profiles count:", profiles?.length, profErr ? `Error: ${profErr.message}` : "");
}

main();
