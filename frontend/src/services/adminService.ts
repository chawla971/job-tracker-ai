import { api } from "@/lib/api";

export interface AdminStats {
  total_users: number;
  new_users_this_week: number;
  total_jobs: number;
  daily_active_users: number;
}

export const adminService = {
  getStats: () => api.get<AdminStats>("/api/admin/stats"),
};
