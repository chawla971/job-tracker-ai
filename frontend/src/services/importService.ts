import { api } from "@/lib/api";
import type { ImportPreviewResponse, ImportRow, ImportSummary } from "@/types/import";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const importService = {
  preview: (file: File): Promise<ImportPreviewResponse> => {
    const form = new FormData();
    form.append("file", file);
    return api.postForm<ImportPreviewResponse>("/api/jobs/import/preview", form);
  },

  confirm: (rows: ImportRow[]): Promise<ImportSummary> =>
    api.post<ImportSummary>("/api/jobs/import/confirm", { rows }),

  downloadTemplate: async () => {
    const token = localStorage.getItem("jwt");
    const res = await fetch(`${BASE}/api/jobs/import/template`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "job_tracker_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  },
};
