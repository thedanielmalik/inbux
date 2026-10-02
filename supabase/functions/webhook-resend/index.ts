import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Resend } from "npm:resend@latest";
import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SECRET_KEYS = Deno.env.get("SUPABASE_SECRET_KEYS")!;
const secretMap = JSON.parse(SUPABASE_SECRET_KEYS || "{}");
const SUPABASE_SECRET_KEY = secretMap.default || Object.values(secretMap)[0];

const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const resend = new Resend(RESEND_API_KEY);

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const payload = await req.text();
  try {
    const event = resend.webhooks.verify({
      payload,
      headers: {
        id: req.headers.get("svix-id") ?? "",
        timestamp: req.headers.get("svix-timestamp") ?? "",
        signature: req.headers.get("svix-signature") ?? ""
      },
      webhookSecret: WEBHOOK_SECRET
    }) as any;

    const eventId = req.headers.get("svix-id") ?? event?.data?.email_id ?? crypto.randomUUID();
    const { error: insertError } = await admin.from("webhook_events").insert({
      provider: "resend",
      event_id: eventId,
      event_type: event.type,
      payload: event
    });
    if (insertError?.code === "23505") return Response.json({ ok: true, duplicate: true });
    if (insertError) throw insertError;

    const data = event.data ?? {};
    const recipientId = data.tags?.inbux_recipient;
    const campaignId = data.tags?.inbux_campaign;
    const emailId = data.email_id ?? null;

    if (recipientId && campaignId) {
      const updates: Record<string, unknown> = {};
      if (event.type === "email.sent") updates.status = "sent";
      if (event.type === "email.delivered") { updates.status = "delivered"; updates.delivered_at = event.created_at ?? new Date().toISOString(); }
      if (event.type === "email.opened") { updates.opened_at = event.created_at ?? new Date().toISOString(); }
      if (event.type === "email.clicked") { updates.clicked_at = event.created_at ?? new Date().toISOString(); }
      if (event.type === "email.bounced") { updates.status = "bounced"; updates.bounced_at = event.created_at ?? new Date().toISOString(); }
      if (event.type === "email.complained") { updates.status = "complained"; updates.complained_at = event.created_at ?? new Date().toISOString(); }

      if (Object.keys(updates).length) {
        await admin.from("campaign_recipients").update(updates).eq("id", recipientId).eq("campaign_id", campaignId);
        const { count: sentCount } = await admin.from("campaign_recipients").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).in("status", ["sent","delivered","bounced","complained"]);
        const { count: deliveredCount } = await admin.from("campaign_recipients").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "delivered");
        const { count: bouncedCount } = await admin.from("campaign_recipients").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "bounced");
        const { count: complainedCount } = await admin.from("campaign_recipients").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "complained");
        const { count: openedCount } = await admin.from("campaign_recipients").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).not("opened_at", "is", null);
        const { count: clickedCount } = await admin.from("campaign_recipients").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).not("clicked_at", "is", null);
        await admin.from("campaigns").update({
          sent_count: sentCount ?? 0,
          delivered_count: deliveredCount ?? 0,
          bounced_count: bouncedCount ?? 0,
          complained_count: complainedCount ?? 0,
          opened_count: openedCount ?? 0,
          clicked_count: clickedCount ?? 0,
          updated_at: new Date().toISOString()
        }).eq("id", campaignId);
      }

      if (event.type === "email.bounced" || event.type === "email.complained") {
        const email = Array.isArray(data.to) ? data.to[0] : data.to;
        if (email) {
          await admin.from("contacts").update({ status: event.type === "email.complained" ? "complained" : "bounced", updated_at: new Date().toISOString() }).eq("email", email).eq("workspace_id", (await admin.from("campaigns").select("workspace_id").eq("id", campaignId).single()).data?.workspace_id);
          await admin.from("suppressions").upsert({
            workspace_id: (await admin.from("campaigns").select("workspace_id").eq("id", campaignId).single()).data?.workspace_id,
            email: String(email).toLowerCase(),
            reason: event.type === "email.complained" ? "complaint" : "bounce",
            source: "resend_webhook"
          }, { onConflict: "workspace_id,email" });
        }
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return new Response("Invalid webhook", { status: 400 });
  }
});