export type ContactStatus =
  | "awaiting_response"
  | "responded"
  | "chat_scheduled"
  | "chat_done";

export interface CoffeeChat {
  id: string;
  contact_id: string;
  date_time: string;
  meeting_link: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  job_id: string | null;
  name: string;
  linkedin_url: string | null;
  company: string | null;
  meeting_link: string | null;
  outreach_date: string;
  status: ContactStatus;
  follow_up_date: string | null;
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactWithChats extends Contact {
  coffee_chats: CoffeeChat[];
}

export interface ContactCreate {
  name: string;
  job_id?: string;
  linkedin_url?: string;
  company?: string;
  meeting_link?: string;
  outreach_date: string;
  status: ContactStatus;
  follow_up_date?: string;
}

export interface ContactUpdate {
  name?: string;
  job_id?: string | null;
  linkedin_url?: string;
  company?: string;
  meeting_link?: string;
  outreach_date?: string;
  status?: ContactStatus;
  follow_up_date?: string;
}

export interface CoffeeChatCreate {
  contact_id: string;
  date_time: string;
  meeting_link?: string;
  notes?: string;
}

export interface CoffeeChatUpdate {
  date_time?: string;
  meeting_link?: string;
  notes?: string;
}
