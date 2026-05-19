import { api } from "@/lib/api";

export type FeedbackType = "bug" | "feature" | "other";
export type FeedbackStatus = "open" | "reviewed" | "resolved";

export interface FeedbackItem {
  id: string;
  type: FeedbackType;
  description: string;
  status: FeedbackStatus;
  admin_notes: string | null;
  created_at: string;
  user_email: string | null;
}

export const feedbackService = {
  submit: (type: FeedbackType, description: string) =>
    api.post<FeedbackItem>("/api/feedback/", { type, description }),
  listAdmin: () => api.get<FeedbackItem[]>("/api/feedback/admin"),
  updateStatus: (id: string, status: FeedbackStatus) =>
    api.patch<{ ok: boolean }>(`/api/feedback/${id}/status?status=${status}`, {}),
  updateNotes: (id: string, admin_notes: string) =>
    api.patch<{ ok: boolean }>(`/api/feedback/${id}/notes`, { admin_notes }),
};
