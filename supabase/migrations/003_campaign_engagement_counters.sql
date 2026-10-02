alter table public.campaigns
  add column if not exists opened_count integer not null default 0,
  add column if not exists clicked_count integer not null default 0;

create index if not exists campaign_recipients_provider_message_idx
  on public.campaign_recipients(provider_message_id)
  where provider_message_id is not null;