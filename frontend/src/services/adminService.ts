import { api } from "@/lib/api";

export interface AdminStats {
  total_users: number;
  new_users_this_week: number;
  total_jobs: number;
  daily_active_users: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  job_count: number;
  created_at: string;
  last_active_at: string | null;
}

export const adminService = {
  getStats: () => api.get<AdminStats>("/api/admin/stats"),
  getUsers: () => api.get<AdminUser[]>("/api/admin/users"),
};
