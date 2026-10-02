"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowUpRight, BarChart3, Bell, CheckCircle2, ChevronDown, CircleHelp,
  FileText, Filter, Inbox, LayoutDashboard, Mail, MoreHorizontal, Plus,
  Search, Send, Settings2, ShieldCheck, Target, Users, XCircle, Zap
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

const deliveryData = [
  { day: "Mon", delivered: 9200, opened: 4300 },
  { day: "Tue", delivered: 11500, opened: 5700 },
  { day: "Wed", delivered: 13200, opened: 6400 },
  { day: "Thu", delivered: 10800, opened: 5200 },
  { day: "Fri", delivered: 15400, opened: 7800 },
  { day: "Sat", delivered: 12300, opened: 6100 },
  { day: "Sun", delivered: 17600, opened: 9200 }
];

const campaigns = [
  { name: "NFEC October Reminder", audience: "NFEC 2026", sent: "17,842", delivery: "99.1%", open: "48.6%", status: "Sent", date: "Oct 1, 2026" },
  { name: "LDMA October Training", audience: "LDMA Leads", sent: "8,426", delivery: "98.7%", open: "44.2%", status: "Sent", date: "Sep 30, 2026" },
  { name: "WAWO Black Friday Prep", audience: "WAWO Customers", sent: "—", delivery: "—", open: "—", status: "Draft", date: "Sep 29, 2026" }
];

const nav = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Campaigns", icon: Send, badge: "3" },
  { label: "Contacts", icon: Users },
  { label: "Automations", icon: Zap },
  { label: "Templates", icon: FileText },
  { label: "Inbox Health", icon: ShieldCheck },
  { label: "Segments", icon: Target },
  { label: "Reports", icon: BarChart3 }
];

export default function Home() {
  const [active, setActive] = useState("Overview");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const filteredCampaigns = useMemo(
    () => campaigns.filter((c) => (c.name + " " + c.audience).toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">i</div><span>inbux</span></div>
        <button className="workspace"><span className="avatar">DM</span><span className="workspace-copy"><strong>Daniel Malik</strong><small>Workspace</small></span><ChevronDown size={16}/></button>
        <nav className="nav"><div className="nav-section">WORKSPACE</div>{nav.map(({label,icon:Icon,badge}) => (
          <button key={label} onClick={() => setActive(label)} className={"nav-item " + (active === label ? "active" : "")}>
            <Icon size={18}/><span>{label}</span>{badge && <em>{badge}</em>}
          </button>
        ))}</nav>
        <div className="sidebar-footer">
          <button className="nav-item"><Settings2 size={18}/><span>Settings</span></button>
          <button className="nav-item"><CircleHelp size={18}/><span>Help Center</span></button>
          <div className="plan-card"><div className="plan-title">Inbox Health</div><div className="plan-score"><span>92</span><small>/100</small></div><div className="progress"><i style={{width:"92%"}}/></div><p>Your sending setup is healthy.</p></div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div><div className="eyebrow">FRIDAY, OCTOBER 2, 2026</div><h1>{active}</h1></div>
          <div className="top-actions">
            <div className="search"><Search size={17}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search campaigns..."/>{search && <button onClick={()=>setSearch("")}><XCircle size={15}/></button>}</div>
            <button className="icon-btn"><Bell size={18}/><span className="dot"/></button><button className="profile">DM</button>
          </div>
        </header>

        <div className="hero-row">
          <div><div className="status"><span className="live-dot"/> SYSTEMS HEALTHY</div><p className="hero-copy">Build campaigns your audience wants to receive — and protect the reputation that gets them there.</p></div>
          <button className="primary" onClick={()=>setShowCreate(true)}><Plus size={17}/> Create campaign</button>
        </div>

        <section className="kpi-grid">
          <Kpi icon={<Users size={20}/>} tone="purple" label="Active contacts" value="48,294" change="+12.4%" detail="vs last month"/>
          <Kpi icon={<Inbox size={20}/>} tone="green" label="Delivery rate" value="98.7%" change="+0.8%" detail="vs last month"/>
          <Kpi icon={<Mail size={20}/>} tone="blue" label="Open rate" value="46.2%" change="+3.1%" detail="vs last month"/>
          <Kpi icon={<ShieldCheck size={20}/>} tone="orange" label="Inbox health" value="92/100" change="Healthy" detail="across domains"/>
        </section>

        <div className="main-grid">
          <section className="panel chart-panel">
            <div className="panel-header"><div><h2>Delivery & engagement</h2><p>Emails delivered and opened over the last 7 days.</p></div><button className="filter-btn"><Filter size={15}/>Last 7 days<ChevronDown size={14}/></button></div>
            <div className="chart-legend"><span><i className="legend-delivered"/>Delivered</span><span><i className="legend-opened"/>Opened</span></div>
            <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={deliveryData} margin={{top:10,right:15,left:-20,bottom:0}}><defs><linearGradient id="deliveryFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7157ff" stopOpacity={0.18}/><stop offset="100%" stopColor="#7157ff" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ececf3"/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize:12,fill:"#89899a"}}/><YAxis axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#aaa9b7"}} width={46} tickFormatter={(v)=>Math.round(v/1000)+"k"}/><Tooltip contentStyle={{borderRadius:12,border:"1px solid #ececf3",boxShadow:"0 10px 30px rgba(25,20,60,.08)"}}/><Area type="monotone" dataKey="delivered" stroke="#7157ff" fill="url(#deliveryFill)" strokeWidth={2.5}/><Area type="monotone" dataKey="opened" stroke="#17a673" fill="transparent" strokeWidth={2}/></AreaChart></ResponsiveContainer></div>
          </section>

          <section className="panel health-panel">
            <div className="panel-header"><div><h2>Inbox Health</h2><p>Signals that impact deliverability.</p></div><button className="more"><MoreHorizontal size={18}/></button></div>
            <div className="health-score"><div className="score-ring"><span>92</span><small>/100</small></div><div><strong>Healthy</strong><p>No critical issues detected.</p></div></div>
            <div className="health-list">
              <HealthRow label="Domain authentication" value="Good"/><HealthRow label="Bounce rate" value="0.42%"/><HealthRow label="Spam complaints" value="0.03%"/><HealthRow label="List quality" value="94%"/>
            </div>
            <button className="text-btn">View deliverability details <ArrowUpRight size={15}/></button>
          </section>
        </div>

        <section className="panel campaign-panel">
          <div className="panel-header"><div><h2>Recent campaigns</h2><p>Your latest sends and drafts.</p></div><button className="ghost-btn" onClick={()=>setActive("Campaigns")}>View all <ArrowUpRight size={15}/></button></div>
          <div className="table"><div className="table-head"><span>CAMPAIGN</span><span>AUDIENCE</span><span>SENT</span><span>DELIVERY</span><span>OPEN RATE</span><span>STATUS</span><span>DATE</span></div>
          {filteredCampaigns.map((c)=><div className="table-row" key={c.name}><strong>{c.name}</strong><span>{c.audience}</span><span>{c.sent}</span><span>{c.delivery}</span><span>{c.open}</span><span><b className={"status-pill "+c.status.toLowerCase()}>{c.status}</b></span><span>{c.date}</span></div>)}</div>
        </section>

        <section className="quick-grid">
          <QuickAction icon={<Users/>} title="Import contacts" text="Upload a CSV and keep your audience clean." onClick={()=>setActive("Contacts")}/>
          <QuickAction icon={<FileText/>} title="Browse templates" text="Start from a proven campaign layout." onClick={()=>setActive("Templates")}/>
          <QuickAction icon={<ShieldCheck/>} title="Check domain health" text="Review SPF, DKIM and DMARC configuration." onClick={()=>setActive("Inbox Health")}/>
        </section>
      </section>

      {showCreate && <div className="modal-backdrop" onClick={()=>setShowCreate(false)}><div className="modal" onClick={(e)=>e.stopPropagation()}>
        <div className="modal-top"><div><div className="eyebrow">NEW CAMPAIGN</div><h2>Create an email campaign</h2></div><button className="icon-btn" onClick={()=>setShowCreate(false)}><XCircle/></button></div>
        <label>Campaign name<input defaultValue="Untitled campaign"/></label>
        <label>Audience<select defaultValue="NFEC 2026"><option>NFEC 2026</option><option>LDMA Leads</option><option>WAWO Customers</option></select></label>
        <div className="health-warning"><ShieldCheck size={18}/><div><strong>Pre-send protection enabled</strong><p>Inbux will validate your list, check suppression rules and run deliverability checks before sending.</p></div></div>
        <div className="modal-actions"><button className="ghost-btn" onClick={()=>setShowCreate(false)}>Cancel</button><button className="primary" onClick={()=>setShowCreate(false)}>Continue <ArrowUpRight size={15}/></button></div>
      </div></div>}
    </main>
  );
}

function Kpi({icon,tone,label,value,change,detail}:{icon:ReactNode;tone:string;label:string;value:string;change:string;detail:string}){
  return <article className="kpi-card"><div className={"kpi-icon "+tone}>{icon}</div><div className="kpi-meta"><span>{label}</span><strong>{value}</strong><small className="up">{change} <span>{detail}</span></small></div></article>;
}

function HealthRow({label,value}:{label:string;value:string}){
  return <div className="health-row"><span>{label}</span><span className="health-value"><CheckCircle2/>{value}</span></div>;
}

function QuickAction({icon,title,text,onClick}:{icon:ReactNode;title:string;text:string;onClick:()=>void}){
  return <button className="quick-card" onClick={onClick}><div className="quick-icon">{icon}</div><div><strong>{title}</strong><p>{text}</p></div><ArrowUpRight size={16}/></button>;
}
