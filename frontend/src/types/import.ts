import type { JobStatus } from "@/types/job";

export interface ImportRow {
  row_num: number;
  company_name: string | null;
  role_title: string | null;
  status: JobStatus | string;
  date_applied: string | null;
  location_remote_status: string | null;
  notes: string | null;
  issues: string[];
  is_duplicate: boolean;
}

export interface ImportPreviewResponse {
  rows: ImportRow[];
  column_mapping: Record<string, string>;
  unmapped_columns: string[];
  total_rows: number;
  importable_count: number;
  duplicate_count: number;
  error_count: number;
}

export interface ImportSummary {
  imported: number;
  skipped_duplicates: number;
  skipped_errors: number;
}
