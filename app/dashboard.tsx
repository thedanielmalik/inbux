"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Dashboard() {
  const supabase = createClient();
  const [workspace, setWorkspace] = useState("My Inbux Workspace");
  const [contacts, setContacts] = useState(0);
  const [campaigns, setCampaigns] = useState(0);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      let { data: ws } = await supabase.from("workspaces").select("id,name").eq("owner_id", data.user.id).limit(1).maybeSingle();
      if (!ws) {
        const created = await supabase.from("workspaces").insert({ owner_id: data.user.id }).select("id,name").single();
        ws = created.data;
      }
      if (!ws) return;
      setWorkspace(ws.name);
      const [a,b] = await Promise.all([
        supabase.from("contacts").select("id", {count:"exact",head:true}).eq("workspace_id",ws.id).eq("status","subscribed"),
        supabase.from("campaigns").select("id", {count:"exact",head:true}).eq("workspace_id",ws.id)
      ]);
      setContacts(a.count ?? 0);
      setCampaigns(b.count ?? 0);
    }
    load();
  }, [supabase]);

  return <main style={{minHeight:"100vh",background:"#f7f7fb",fontFamily:"system-ui",padding:40}}>
    <div style={{maxWidth:1100,margin:"0 auto"}}>
      <strong style={{fontSize:28}}>inbux</strong>
      <p>{workspace}</p>
      <section style={{background:"#fff",borderRadius:18,padding:30,marginTop:30}}>
        <h1>Inbux is connected.</h1>
        <p>Your Supabase workspace is live and ready for the next product modules.</p>
        <div style={{display:"flex",gap:16,marginTop:25}}>
          <div style={{padding:20,border:"1px solid #eee",borderRadius:12}}>Active contacts<h2>{contacts}</h2></div>
          <div style={{padding:20,border:"1px solid #eee",borderRadius:12}}>Campaigns<h2>{campaigns}</h2></div>
          <div style={{padding:20,border:"1px solid #eee",borderRadius:12}}>Deliverability<h2>Setup</h2></div>
        </div>
      </section>
    </div>
  </main>;
}