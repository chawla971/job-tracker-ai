import type { JobStatus } from "./job";
import type { ContactStatus } from "./contact";

export interface StatusCount {
  status: JobStatus;
  count: number;
}

export interface UpcomingInterview {
  id: string;
  job_id: string;
  company_name: string;
  role_title: string;
  round_type: string;
  date_time: string;
}

export interface UpcomingCoffeeChat {
  id: string;
  contact_id: string;
  contact_name: string;
  company: string | null;
  date_time: string;
  meeting_link: string | null;
}

export interface OverdueFollowUp {
  id: string;
  name: string;
  company: string | null;
  follow_up_date: string;
  status: ContactStatus;
  job_id: string | null;
}

export interface ActivityItem {
  type: string;
  label: string;
  sub_label: string;
  timestamp: string;
  entity_id: string;
}

export interface DashboardData {
  upcoming_interviews: UpcomingInterview[];
  upcoming_coffee_chats: UpcomingCoffeeChat[];
  overdue_follow_ups: OverdueFollowUp[];
  status_counts: StatusCount[];
  jobs_this_week: number;
  total_active: number;
  recent_activity: ActivityItem[];
}
