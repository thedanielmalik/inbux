import "jsr:@supabase-functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SECRET_KEYS = Deno.env.get("SUPABASE_SECRET_KEYS")!;
const secretMap = JSON.parse(SUPABASE_SECRET_KEYS || "{}");
const SUPABASE_SECRET_KEY = secretMap.default || Object.values(secretMap)[0];
const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return new Response("Missing unsubscribe token.", { status: 400 });

  const { data: contact } = await admin.from("contacts").select("id,workspace_id,email").eq("unsubscribe_token", token).maybeSingle();
  if (!contact) return new Response("This unsubscribe link is invalid or expired.", { status: 404 });

  await admin.from("contacts").update({ status: "unsubscribed", updated_at: new Date().toISOString() }).eq("id", contact.id);
  await admin.from("suppressions").upsert({
    workspace_id: contact.workspace_id,
    email: contact.email.toLowerCase(),
    reason: "unsubscribe",
    source: "public_unsubscribe"
  }, { onConflict: "workspace_id,email" });

  return new Response(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed</title></head><body style="font-family:Arial,sans-serif;padding:48px;max-width:640px;margin:auto"><h1>You’re unsubscribed.</h1><p>You will no longer receive marketing emails from this list.</p></body></html>`, { headers: { "content-type": "text/html; charset=utf-8" } });
});