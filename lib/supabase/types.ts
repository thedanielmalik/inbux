export type ContactStatus = "subscribed" | "unsubscribed" | "bounced" | "complained" | "suppressed";
export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "paused" | "failed";
export type DeliveryStatus = "queued" | "sent" | "delivered" | "bounced" | "complained" | "failed";

export type Contact = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: ContactStatus;
  source: string | null;
  consent_at: string | null;
  last_engaged_at: string | null;
  created_at: string;
};

export type Campaign = {
  id: string;
  name: string;
  subject: string | null;
  status: CampaignStatus;
  audience_count: number;
  sent_count: number;
  delivered_count: number;
  bounced_count: number;
  complained_count: number;
  created_at: string;
};
