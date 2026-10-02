import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server@^1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APP_URL = Deno.env.get("INBUX_APP_URL") ?? Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "https://liijxwiambsqapgbbfre.supabase.co";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

Deno.serve(async (req) => {
  return withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY is not configured." }, 503);
    if (!APP_URL) return json({ error: "INBUX_APP_URL is not configured." }, 503);

    const body = await req.json().catch(() => null);
    const campaignId = body?.campaignId as string | undefined;
    if (!campaignId) return json({ error: "campaignId is required." }, 400);

    const { data: campaign, error: campaignError } = await ctx.supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();
    if (campaignError || !campaign) return json({ error: "Campaign not found." }, 404);

    if (campaign.status === "sending" || campaign.status === "sent") {
      return json({ error: "This campaign has already been sent or is currently sending." }, 409);
    }

    if (!campaign.subject || !campaign.from_name || !campaign.from_email || !campaign.html_content) {
      return json({ error: "Complete the subject, sender and content before sending." }, 400);
    }
    if (!validEmail(campaign.from_email)) return json({ error: "From email is invalid." }, 400);

    const fromDomain = campaign.from_email.split("@")[1]?.toLowerCase();
    const { data: domain } = await ctx.supabase
      .from("sending_domains")
      .select("id,domain,status,provider")
      .eq("workspace_id", campaign.workspace_id)
      .eq("domain", fromDomain)
      .eq("status", "verified")
      .limit(1)
      .maybeSingle();

    if (!domain || domain.provider !== "resend") {
      return json({ error: "The sender domain must be verified before sending." }, 400);
    }

    const { data: contacts, error: contactsError } = await ctx.supabase
      .from("contacts")
      .select("id,email,first_name,last_name,unsubscribe_token")
      .eq("workspace_id", campaign.workspace_id)
      .eq("status", "subscribed")
      .order("created_at", { ascending: true });

    if (contactsError) return json({ error: contactsError.message }, 500);
    if (!contacts?.length) return json({ error: "There are no subscribed contacts to send to." }, 400);

    const emails = contacts.filter((c) => validEmail(c.email));
    const emailsWithNoSuppression: typeof emails = [];
    const suppressionSet = new Set<string>();

    for (let i = 0; i < emails.length; i += 500) {
      const slice = emails.slice(i, i + 500).map((c) => c.email.toLowerCase());
      const { data: suppressions } = await ctx.supabase
        .from("suppressions")
        .select("email")
        .eq("workspace_id", campaign.workspace_id)
        .in("email", slice);
      for (const s of suppressions ?? []) suppressionSet.add(s.email.toLowerCase());
    }

    for (const contact of emails) {
      if (!suppressionSet.has(contact.email.toLowerCase())) emailsWithNoSuppression.push(contact);
    }

    if (!emailsWithNoSuppression.length) return json({ error: "Every subscribed contact is suppressed." }, 400);

    const { data: existingRecipients } = await ctx.supabase
      .from("campaign_recipients")
      .select("contact_id,status")
      .eq("campaign_id", campaign.id);

    if (existingRecipients?.length) {
      const alreadyQueued = new Set(existingRecipients.filter((r) => r.status !== "failed").map((r) => r.contact_id));
      for (let i = emailsWithNoSuppression.length - 1; i >= 0; i--) {
        if (alreadyQueued.has(emailsWithNoSuppression[i].id)) emailsWithNoSuppression.splice(i, 1);
      }
    }

    if (!emailsWithNoSuppression.length) {
      return json({ error: "All eligible recipients are already queued for this campaign." }, 409);
    }

    const { error: statusError } = await ctx.supabase
      .from("campaigns")
      .update({
        status: "sending",
        started_at: new Date().toISOString(),
        audience_count: emailsWithNoSuppression.length,
        updated_at: new Date().toISOString()
      })
      .eq("id", campaign.id);
    if (statusError) return json({ error: statusError.message }, 500);

    const recipients = emailsWithNoSuppression.map((c) => ({ campaign_id: campaign.id, contact_id: c.id, status: "queued" }));
    const { error: recipientInsertError } = await ctx.supabase.from("campaign_recipients").upsert(recipients, { onConflict: "campaign_id,contact_id", ignoreDuplicates: true });
    if (recipientInsertError) {
      await ctx.supabase.from("campaigns").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", campaign.id);
      return json({ error: recipientInsertError.message }, 500);
    }

    const baseUrl = APP_URL.replace(/\/$/, "");
    const footer = `<p style="margin-top:32px;font-size:12px;color:#667085">You are receiving this email because you subscribed to this list. <a href="${baseUrl}/functions/v1/unsubscribe?token=CONTACT_TOKEN">Unsubscribe</a></p>`;

    let sent = 0;
    const failures: string[] = [];

    for (let i = 0; i < emailsWithNoSuppression.length; i += 100) {
      const batch = emailsWithNoSuppression.slice(i, i + 100);
      const payload = batch.map((contact) => ({
        from: `${campaign.from_name} <${campaign.from_email}>`,
        to: [contact.email],
        subject: campaign.subject,
        html: campaign.html_content.replaceAll("CONTACT_TOKEN", contact.unsubscribe_token ?? "") + footer.replace("CONTACT_TOKEN", contact.unsubscribe_token ?? ""),
        ...(campaign.reply_to ? { reply_to: [campaign.reply_to] } : {}),
        tags: [
          { name: "inbux_campaign", value: campaign.id },
          { name: "inbux_recipient", value: contact.id }
        ]
      }));

      const response = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `inbux-campaign-${campaign.id}-batch-${i / 100}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        failures.push(typeof result?.message === "string" ? result.message : "Resend rejected a batch.");
        await ctx.supabase.from("campaign_recipients").update({ status: "failed" }).eq("campaign_id", campaign.id).in("contact_id", batch.map((c) => c.id));
        continue;
      }

      const ids = Array.isArray(result?.data) ? result.data : [];
      for (let j = 0; j < batch.length; j++) {
        const providerId = ids[j]?.id ?? null;
        await ctx.supabase
          .from("campaign_recipients")
          .update({ status: "sent", provider_message_id: providerId, sent_at: new Date().toISOString() })
          .eq("campaign_id", campaign.id)
          .eq("contact_id", batch[j].id);
      }
      sent += batch.length;
    }

    await ctx.supabase.from("campaigns").update({
      status: failures.length ? "failed" : "sent",
      sent_count: sent,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq("id", campaign.id);

    return json({
      ok: failures.length === 0,
      campaignId: campaign.id,
      sent,
      attempted: emailsWithNoSuppression.length,
      failures
    }, failures.length ? 207 : 200);
  })(req);
});