import { useState } from "react";
import { Loader2, Sparkles, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Job, JobCreate, JobStatus, JobUpdate } from "@/types/job";
import { jobService } from "@/services/jobService";

const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: "saved", label: "Saved (not applied yet)" },
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
];

interface JobFormProps {
  initial?: Job;
  onSubmit: (data: JobCreate | JobUpdate) => Promise<void>;
  onCancel: () => void;
}

export function JobForm({ initial, onSubmit, onCancel }: JobFormProps) {
  const [fields, setFields] = useState({
    company_name: initial?.company_name ?? "",
    role_title: initial?.role_title ?? "",
    posting_url: initial?.posting_url ?? "",
    location_remote_status: initial?.location_remote_status ?? "",
    status: (initial?.status ?? "saved") as JobStatus,
    date_applied: initial?.date_applied ?? "",
    jd_text: initial?.jd_text ?? "",
    notes: initial?.notes ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleJDPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = e.clipboardData.getData("text");
    if (pasted.length < 100) return; // too short to be a real JD
    setExtracting(true);
    try {
      const extracted = await jobService.parseJD(pasted);
      setFields((prev) => ({
        ...prev,
        company_name: prev.company_name || extracted.company,
        role_title: prev.role_title || extracted.title,
        location_remote_status: prev.location_remote_status || extracted.location,
        // Only set applied + today's date if still at the default "saved" state
        ...(prev.status === "saved" && extracted.company
          ? {
              status: "applied" as JobStatus,
              date_applied: new Date().toISOString().slice(0, 10),
            }
          : {}),
      }));
    } catch {
      // Silently ignore extraction errors — user can still fill in manually
    } finally {
      setExtracting(false);
    }
  }

  async function handleFetchJD() {
    if (!fields.posting_url.trim()) return;
    setFetching(true);
    setFetchMsg(null);
    try {
      const result = await jobService.fetchJD(fields.posting_url.trim());
      if (result.error) {
        setFetchMsg({ type: "error", text: result.error });
        return;
      }
      setFields((prev) => ({
        ...prev,
        company_name: prev.company_name || result.company_name || prev.company_name,
        role_title: prev.role_title || result.role_title || prev.role_title,
        location_remote_status: prev.location_remote_status || result.location || prev.location_remote_status,
        jd_text: prev.jd_text || result.jd_text || prev.jd_text,
        ...(prev.status === "saved" && result.company_name
          ? { status: "applied" as JobStatus, date_applied: new Date().toISOString().slice(0, 10) }
          : {}),
      }));
      const gotJD = !!result.jd_text;
      const gotBasic = !!(result.company_name || result.role_title);
      const gotAny = gotJD || gotBasic;
      setFetchMsg(
        !gotAny
          ? { type: "error", text: "Couldn't extract job details. Fill in the details manually." }
          : gotJD
          ? { type: "success", text: "Fetched job details" }
          : { type: "error", text: "Company and role fetched — job description couldn't be extracted. Add it manually." }
      );
    } catch {
      setFetchMsg({ type: "error", text: "Couldn't access this page. Fill in the details manually." });
    } finally {
      setFetching(false);
      setTimeout(() => setFetchMsg(null), 6000);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        ...fields,
        posting_url: fields.posting_url || undefined,
        location_remote_status: fields.location_remote_status || undefined,
        date_applied: fields.date_applied || undefined,
        jd_text: fields.jd_text || undefined,
        notes: fields.notes || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="company_name">Company *</Label>
          <Input
            id="company_name"
            name="company_name"
            value={fields.company_name}
            onChange={handleChange}
            placeholder="Acme Corp"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="role_title">Role *</Label>
          <Input
            id="role_title"
            name="role_title"
            value={fields.role_title}
            onChange={handleChange}
            placeholder="Software Engineer"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            value={fields.status}
            onChange={handleChange}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date_applied">
            Date Applied
            {fields.status === "saved" && (
              <span className="ml-1 text-muted-foreground font-normal">(not needed yet)</span>
            )}
          </Label>
          <Input
            id="date_applied"
            name="date_applied"
            type="date"
            value={fields.date_applied}
            onChange={handleChange}
            disabled={fields.status === "saved"}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="posting_url">Job Posting URL</Label>
          <div className="flex gap-2">
            <Input
              id="posting_url"
              name="posting_url"
              type="url"
              value={fields.posting_url}
              onChange={handleChange}
              placeholder="https://..."
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!fields.posting_url.trim() || fetching || submitting}
              onClick={handleFetchJD}
              className="shrink-0"
            >
              {fetching
                ? <Loader2 size={13} className="animate-spin" />
                : <><Download size={13} className="mr-1.5" />Fetch</>}
            </Button>
          </div>
          {fetchMsg && (
            <p className={`text-xs ${fetchMsg.type === "success" ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
              {fetchMsg.text}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="location_remote_status">Location / Remote Status</Label>
          <Input
            id="location_remote_status"
            name="location_remote_status"
            value={fields.location_remote_status}
            onChange={handleChange}
            placeholder="Remote, Toronto ON, Hybrid..."
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="jd_text">Job Description</Label>
          {extracting && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 size={12} className="animate-spin" />
              <Sparkles size={12} />
              Extracting fields...
            </span>
          )}
        </div>
        <Textarea
          id="jd_text"
          name="jd_text"
          value={fields.jd_text}
          onChange={handleChange}
          onPaste={handleJDPaste}
          placeholder="Paste the full job description here — company, role, and location will auto-fill"
          className="min-h-[120px]"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          value={fields.notes}
          onChange={handleChange}
          placeholder="Any notes about this application..."
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : initial ? "Update Job" : "Add Job"}
        </Button>
      </div>
    </form>
  );
}
