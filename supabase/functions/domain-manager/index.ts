import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server@^1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

async function resend(path: string, options: RequestInit = {}) {
  return fetch(`https://api.resend.com${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
}

Deno.serve(async (req) => withSupabase({ auth: "user" }, async (req, ctx) => {
  if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY is not configured." }, 503);
  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  if (action === "add") {
    const domain = String(body.domain || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) return json({ error: "Enter a valid domain." }, 400);

    const response = await resend("/domains", { method: "POST", body: JSON.stringify({ name: domain }) });
    const result = await response.json();
    if (!response.ok) return json({ error: result?.message || "Resend could not add the domain." }, response.status);

    const { data, error } = await ctx.supabase.from("sending_domains").upsert({
      workspace_id: (await ctx.supabase.from("workspaces").select("id").limit(1).single()).data?.id,
      domain,
      provider: "resend",
      provider_domain_id: result.id,
      status: result.status === "verified" ? "verified" : "pending",
      spf_status: result.status === "verified" ? "verified" : "pending",
      dkim_status: result.status === "verified" ? "verified" : "pending",
      dmarc_status: "pending",
      dns_records: result.records || []
    }, { onConflict: "workspace_id,domain" }).select().single();

    if (error) return json({ error: error.message }, 500);
    return json(data);
  }

  if (action === "verify") {
    const id = String(body.id || "");
    const { data: local } = await ctx.supabase.from("sending_domains").select("*").eq("id", id).single();
    if (!local?.provider_domain_id) return json({ error: "Domain not found." }, 404);

    const response = await resend(`/domains/${local.provider_domain_id}/verify`, { method: "POST", body: "{}" });
    const result = await response.json();
    if (!response.ok) return json({ error: result?.message || "Verification request failed." }, response.status);

    const verified = result.status === "verified";
    const { data, error } = await ctx.supabase.from("sending_domains").update({
      status: verified ? "verified" : "pending",
      spf_status: verified ? "verified" : "pending",
      dkim_status: verified ? "verified" : "pending",
      verified_at: verified ? new Date().toISOString() : null,
      dns_records: result.records || local.dns_records || []
    }).eq("id", id).select().single();

    if (error) return json({ error: error.message }, 500);
    return json(data);
  }

  return json({ error: "Unknown action." }, 400);
})(req));