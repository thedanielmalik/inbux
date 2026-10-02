import { SupabaseClient } from "@supabase/supabase-js";

export async function getOrCreateWorkspace(supabase: SupabaseClient) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: existing } = await supabase.from("workspaces").select("id,name").eq("owner_id", auth.user.id).limit(1).maybeSingle();
  if (existing) return existing;
  const { data: created } = await supabase.from("workspaces").insert({ owner_id: auth.user.id }).select("id,name").single();
  return created;
}
