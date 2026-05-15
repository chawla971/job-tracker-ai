import { api } from "@/lib/api";
import type { Job, JobCreate, JobUpdate, JobDetail } from "@/types/job";

export interface JDExtracted {
  company: string;
  title: string;
  location: string;
}

export interface JDFetched {
  company_name: string | null;
  role_title: string | null;
  location: string | null;
  jd_text: string | null;
  error: string | null;
}

export const jobService = {
  getAll: () => api.get<Job[]>("/api/jobs/"),
  getOne: (id: string) => api.get<Job>(`/api/jobs/${id}`),
  getDetail: (id: string) => api.get<JobDetail>(`/api/jobs/${id}/detail`),
  create: (data: JobCreate) => api.post<Job>("/api/jobs/", data),
  update: (id: string, data: JobUpdate) => api.patch<Job>(`/api/jobs/${id}`, data),
  delete: (id: string) => api.delete(`/api/jobs/${id}`),
  parseJD: (text: string) => api.post<JDExtracted>("/api/jobs/parse-jd", { text }),
  fetchJD: (url: string) => api.post<JDFetched>("/api/scrape-jd/", { url }),
};
