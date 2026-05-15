export type JobStatus =
  | "saved"
  | "applied"
  | "networking"
  | "interviewing"
  | "offer"
  | "rejected";

export interface Job {
  id: string;
  company_name: string;
  role_title: string;
  posting_url: string | null;
  location_remote_status: string | null;
  jd_text: string | null;
  status: JobStatus;
  date_applied: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobCreate {
  company_name: string;
  role_title: string;
  posting_url?: string;
  location_remote_status?: string;
  jd_text?: string;
  status: JobStatus;
  date_applied?: string;
  notes?: string;
}

export interface JobUpdate {
  company_name?: string;
  role_title?: string;
  posting_url?: string;
  location_remote_status?: string;
  jd_text?: string;
  status?: JobStatus;
  date_applied?: string;
  notes?: string;
}

export interface JobDetail extends Job {
  contacts: import("@/types/contact").ContactWithChats[];
  interviews: import("@/types/interview").Interview[];
}
