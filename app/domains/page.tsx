"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Globe2, RefreshCw, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateWorkspace } from "@/lib/inbux/workspace";

export default function DomainsPage() {
  const supabase = createClient();
  const [domains, setDomains] = useState<any[]>([]);
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const ws = await getOrCreateWorkspace(supabase);
    if (!ws) return;
    const { data } = await supabase.from("sending_domains").select("*").eq("workspace_id", ws.id).order("created_at", { ascending: false });
    setDomains(data || []);
  }

  useEffect(() => { load(); }, []);

  async function action(actionName: string, id?: string) {
    setBusy(true); setError(""); setMessage("");
    const { data, error: invokeError } = await supabase.functions.invoke("domain-manager", { body: { action: actionName, domain, id } });
    setBusy(false);
    if (invokeError || data?.error) { setError(invokeError?.message || data?.error || "Something went wrong."); return; }
    setDomain("");
    setMessage(actionName === "add" ? "Domain added. Add the DNS records below, then verify it." : "Verification check completed.");
    await load();
  }

  return <main className="domains-page">
    <header className="editor-head">
      <div><button className="back-link" onClick={() => location.assign("/")}>← Dashboard</button><div className="eyebrow">DELIVERABILITY</div><h1>Sending domains</h1><p>Authenticate your sending identity before Inbux can send campaigns.</p></div>
    </header>
    <section className="panel domain-add">
      <div><div className="editor-section-title"><Globe2 size={17}/><div><strong>Add a domain</strong><span>Use a domain you control</span></div></div>
      <div className="domain-add-row"><input value={domain} onChange={e=>setDomain(e.target.value)} placeholder="mail.yourbrand.com"/><button className="primary" disabled={busy||!domain.trim()} onClick={()=>action("add")}>{busy?"Working…":"Add domain"}</button></div></div>
      <div className="domain-note"><ShieldCheck size={16}/><span>Inbux will not mark a domain verified until the provider confirms it.</span></div>
    </section>
    {message&&<div className="notice success">{message}</div>}{error&&<div className="notice error">{error}</div>}
    <div className="domain-list">{domains.length?domains.map(d=><section className="panel domain-card" key={d.id}>
      <div className="domain-card-head"><div><div className="domain-name">{d.domain}</div><div className={"status-pill "+d.status}>{d.status}</div></div><button className="ghost-btn" disabled={busy} onClick={()=>action("verify",d.id)}><RefreshCw size={14}/> Verify</button></div>
      <div className="dns-grid">{(d.dns_records||[]).map((r:any,i:number)=><div className="dns-row" key={i}><div><strong>{r.type || "DNS"}</strong><span>{r.name || r.host || "—"}</span></div><code>{r.value || r.data || "—"}</code><button className="icon-btn" onClick={()=>navigator.clipboard.writeText(String(r.value||r.data||""))}><Copy size={14}/></button></div>)}</div>
      <div className="domain-checks">{[["SPF",d.spf_status],["DKIM",d.dkim_status],["DMARC",d.dmarc_status]].map(([k,v])=><div key={k}><span>{k}</span><b>{v==="verified"?<><Check size={13}/> Verified</>: "Setup needed"}</b></div>)}</div>
    </section>):<div className="empty"><Globe2 size={28}/><strong>No sending domains yet</strong><p>Add the domain you want to send from.</p></div>}</div>
  </main>;
}