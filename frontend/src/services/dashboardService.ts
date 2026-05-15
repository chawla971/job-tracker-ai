import { api } from "@/lib/api";
import type { DashboardData } from "@/types/dashboard";

export const dashboardService = {
  get: () => api.get<DashboardData>("/api/dashboard/"),
};
