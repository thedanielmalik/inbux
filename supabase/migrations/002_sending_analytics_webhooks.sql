alter table public.contacts
  add column if not exists unsubscribe_token text;

update public.contacts
set unsubscribe_token = encode(gen_random_bytes(18), 'hex')
where unsubscribe_token is null;

alter table public.contacts
  alter column unsubscribe_token set default encode(gen_random_bytes(18), 'hex');

create unique index if not exists contacts_unsubscribe_token_idx
  on public.contacts(unsubscribe_token);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'resend',
  event_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(provider, event_id)
);

create index if not exists webhook_events_type_created_idx
  on public.webhook_events(event_type, created_at desc);

alter table public.webhook_events enable row level security;

create policy "workspace owners can view campaign webhook events"
on public.webhook_events for select to authenticated
using (
  exists (
    select 1
    from public.campaign_recipients cr
    join public.campaigns c on c.id = cr.campaign_id
    where (cr.provider_message_id = webhook_events.payload->'data'->>'email_id'
       or cr.provider_message_id = webhook_events.payload->'data'->>'message_id')
      and public.is_workspace_member(c.workspace_id)
  )
);

grant select on public.webhook_events to authenticated;

alter table public.sending_domains
  add column if not exists provider_domain_id text,
  add column if not exists dns_records jsonb not null default '[]'::jsonb;

create unique index if not exists sending_domains_provider_domain_idx
  on public.sending_domains(provider_domain_id)
  where provider_domain_id is not null;