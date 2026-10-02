create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My Inbux Workspace',
  created_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  company text,
  status text not null default 'subscribed' check (status in ('subscribed','unsubscribed','bounced','complained','suppressed')),
  source text,
  consent_at timestamptz,
  last_engaged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, email)
);

create table if not exists public.suppressions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  reason text not null check (reason in ('unsubscribe','bounce','complaint','manual','invalid')),
  source text,
  created_at timestamptz not null default now(),
  unique(workspace_id, email)
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  subject text,
  preview_text text,
  from_name text,
  from_email text,
  reply_to text,
  html_content text,
  status text not null default 'draft' check (status in ('draft','scheduled','sending','sent','paused','failed')),
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  audience_count integer not null default 0,
  sent_count integer not null default 0,
  delivered_count integer not null default 0,
  bounced_count integer not null default 0,
  complained_count integer not null default 0,
  unsubscribed_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','sent','delivered','bounced','complained','failed')),
  provider_message_id text,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  complained_at timestamptz,
  unique(campaign_id, contact_id)
);

create table if not exists public.sending_domains (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  domain text not null,
  status text not null default 'pending' check (status in ('pending','verified','warning','failed')),
  spf_status text not null default 'pending',
  dkim_status text not null default 'pending',
  dmarc_status text not null default 'pending',
  provider text not null default 'ses',
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  unique(workspace_id, domain)
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  subject text,
  html_content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contacts_workspace_status_idx on public.contacts(workspace_id, status);
create index if not exists contacts_workspace_engagement_idx on public.contacts(workspace_id, last_engaged_at);
create index if not exists suppressions_workspace_email_idx on public.suppressions(workspace_id, email);
create index if not exists campaigns_workspace_created_idx on public.campaigns(workspace_id, created_at desc);
create index if not exists campaign_recipients_campaign_status_idx on public.campaign_recipients(campaign_id, status);

alter table public.workspaces enable row level security;
alter table public.contacts enable row level security;
alter table public.suppressions enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_recipients enable row level security;
alter table public.sending_domains enable row level security;
alter table public.templates enable row level security;

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1 from public.workspaces
    where id = target_workspace and owner_id = (select auth.uid())
  );
$$;

create policy "workspace owners can manage workspaces"
on public.workspaces for all to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "workspace owners can manage contacts"
on public.contacts for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "workspace owners can manage suppressions"
on public.suppressions for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "workspace owners can manage campaigns"
on public.campaigns for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "workspace owners can manage recipients"
on public.campaign_recipients for all to authenticated
using (exists (
  select 1 from public.campaigns c
  where c.id = campaign_id and public.is_workspace_member(c.workspace_id)
))
with check (exists (
  select 1 from public.campaigns c
  where c.id = campaign_id and public.is_workspace_member(c.workspace_id)
));

create policy "workspace owners can manage sending domains"
on public.sending_domains for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "workspace owners can manage templates"
on public.templates for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));
