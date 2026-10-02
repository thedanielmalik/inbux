"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, FileUp, Search, Upload, Users, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateWorkspace } from "@/lib/inbux/workspace";

type Contact={id:string;email:string;first_name:string|null;last_name:string|null;company:string|null;status:string;source:string|null;created_at:string};
function validEmail(email:string){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase()); }
function parseCSV(text:string){
  const rows=text.replace(/^\uFEFF/,"").split(/\r?\n/).filter(Boolean).map(r=>r.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(v=>v.trim().replace(/^"|"$/g,"")));
  if(!rows.length)return [];
  const headers=rows[0].map(h=>h.toLowerCase().replace(/[^a-z0-9]+/g,"_"));
  const idx=(names:string[])=>headers.findIndex(h=>names.includes(h));
  const email=idx(["email","email_address","e_mail"]), first=idx(["first_name","firstname","first"]), last=idx(["last_name","lastname","last"]), company=idx(["company","company_name"]);
  return rows.slice(1).map(r=>({email:email>=0?r[email]:"",first_name:first>=0?r[first]:"",last_name:last>=0?r[last]:"",company:company>=0?r[company]:""})).filter(x=>x.email);
}
export default function ContactsPage(){
  const supabase=createClient(), fileRef=useRef<HTMLInputElement>(null);
  const [workspace,setWorkspace]=useState<any>(null),[contacts,setContacts]=useState<Contact[]>([]),[query,setQuery]=useState(""),[loading,setLoading]=useState(true),[importing,setImporting]=useState(false),[notice,setNotice]=useState<string|null>(null),[error,setError]=useState<string|null>(null);
  async function load(){setLoading(true);const ws=workspace||await getOrCreateWorkspace(supabase);if(ws&&!workspace)setWorkspace(ws);if(ws){const {data}=await supabase.from("contacts").select("id,email,first_name,last_name,company,status,source,created_at").eq("workspace_id",ws.id).order("created_at",{ascending:false});setContacts(data||[]);}setLoading(false);}
  useEffect(()=>{load()},[]);
  async function importFile(file:File){
    setImporting(true);setNotice(null);setError(null);
    try{const rows=parseCSV(await file.text());if(!rows.length)throw new Error("No contacts were found in the CSV.");const ws=workspace||await getOrCreateWorkspace(supabase);if(!ws)throw new Error("Please sign in again.");
      const emails=[...new Set(rows.map(r=>r.email.trim().toLowerCase()))],existing=new Set(contacts.map(c=>c.email.toLowerCase()));
      const {data:supp}=await supabase.from("suppressions").select("email").eq("workspace_id",ws.id).in("email",emails);const suppressed=new Set((supp||[]).map((x:any)=>x.email.toLowerCase()));
      const clean=rows.filter(r=>validEmail(r.email)&&!existing.has(r.email.toLowerCase())&&!suppressed.has(r.email.toLowerCase())).filter((r,i,a)=>a.findIndex(x=>x.email.toLowerCase()===r.email.toLowerCase())===i);
      const invalid=rows.filter(r=>!validEmail(r.email)).length,skipped=rows.length-clean.length;
      if(clean.length){const {error:e}=await supabase.from("contacts").insert(clean.map(r=>({workspace_id:ws.id,email:r.email.trim().toLowerCase(),first_name:r.first_name||null,last_name:r.last_name||null,company:r.company||null,status:"subscribed",source:"csv_import",consent_at:new Date().toISOString()})));if(e)throw e;}
      setNotice(`Imported ${clean.length} contacts. Skipped ${Math.max(0,skipped)} duplicates/suppressed and ${invalid} invalid emails.`);await load();
    }catch(e:any){setError(e.message||"Import failed.");}finally{setImporting(false);if(fileRef.current)fileRef.current.value="";}
  }
  const filtered=useMemo(()=>contacts.filter(c=>[c.email,c.first_name,c.last_name,c.company].join(" ").toLowerCase().includes(query.toLowerCase())),[contacts,query]),subscribed=contacts.filter(c=>c.status==="subscribed").length;
  return <main className="contacts-page"><header className="contacts-head"><div><button className="back-link" onClick={()=>window.location.assign("/")}><ArrowLeft size={15}/> Dashboard</button><div className="eyebrow">AUDIENCE</div><h1>Contacts</h1><p>Own your audience. Keep unsubscribes, bounces and complaints out of your sends.</p></div><button className="primary" onClick={()=>fileRef.current?.click()}><Upload size={15}/> Import CSV</button></header>
    <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={e=>e.target.files?.[0]&&importFile(e.target.files[0])}/>
    {notice&&<div className="notice success"><CheckCircle2 size={17}/>{notice}<button onClick={()=>setNotice(null)}><XCircle size={15}/></button></div>}{error&&<div className="notice error"><XCircle size={17}/>{error}<button onClick={()=>setError(null)}><XCircle size={15}/></button></div>}
    <section className="contact-stats"><div><span>Total contacts</span><strong>{contacts.length}</strong></div><div><span>Subscribed</span><strong>{subscribed}</strong></div><div><span>Protected</span><strong>{contacts.length-subscribed}</strong></div></section>
    <section className="panel contacts-panel"><div className="contacts-toolbar"><div className="contact-search"><Search size={15}/><input placeholder="Search contacts..." value={query} onChange={e=>setQuery(e.target.value)}/></div><span>{loading?"Loading...":`${filtered.length} contacts`}</span></div>
    {loading?<div className="empty">Loading contacts…</div>:!filtered.length?<div className="empty"><Users size={32}/><strong>{query?"No matches":"Your audience starts here"}</strong><p>Import a CSV with an <b>email</b> column. Inbux will validate, deduplicate and respect your suppression list.</p><button className="primary" onClick={()=>fileRef.current?.click()}><FileUp size={15}/> Import contacts</button></div>:<div className="contact-table"><div className="contact-row contact-header"><span>CONTACT</span><span>COMPANY</span><span>STATUS</span><span>SOURCE</span></div>{filtered.map(c=><div className="contact-row" key={c.id}><span><strong>{[c.first_name,c.last_name].filter(Boolean).join(" ")||"—"}</strong><small>{c.email}</small></span><span>{c.company||"—"}</span><span><b className={"contact-status "+c.status}>{c.status}</b></span><span>{c.source||"manual"}</span></div>)}</div>}</section>
    <p className="import-note">{importing?"Importing and protecting your list…":"CSV import accepts email, first name, last name and company columns."}</p></main>;
}
