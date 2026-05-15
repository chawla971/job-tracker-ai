import { api } from "@/lib/api";
import type { Interview, InterviewCreate, InterviewUpdate } from "@/types/interview";

export const interviewService = {
  getAll: (jobId?: string): Promise<Interview[]> => {
    const path = jobId ? `/api/interviews/?job_id=${jobId}` : "/api/interviews/";
    return api.get<Interview[]>(path);
  },
  create: (data: InterviewCreate) => api.post<Interview>("/api/interviews/", data),
  update: (id: string, data: InterviewUpdate) => api.patch<Interview>(`/api/interviews/${id}`, data),
  delete: (id: string) => api.delete(`/api/interviews/${id}`),
};
