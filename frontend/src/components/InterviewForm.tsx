import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Interview, InterviewCreate, InterviewUpdate } from "@/types/interview";
import type { Job } from "@/types/job";

const ROUND_TYPES = ["Phone Screen", "Technical", "Behavioral", "System Design", "Take-Home", "Final", "Other"];

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

interface InterviewFormProps {
  jobId?: string;       // required when adding from a job detail page
  jobs?: Job[];         // required when adding from the Interviews page (jobId not known)
  initial?: Interview;
  onSubmit: (data: InterviewCreate | InterviewUpdate) => Promise<void>;
  onCancel: () => void;
}

export function InterviewForm({ jobId, jobs, initial, onSubmit, onCancel }: InterviewFormProps) {
  const defaultDate = new Date().toISOString().slice(0, 10);
  const [selectedJobId, setSelectedJobId] = useState(jobId ?? "");

  const [fields, setFields] = useState({
    round_type: initial?.round_type ?? "Phone Screen",
    date: initial ? new Date(initial.date_time).toISOString().slice(0, 10) : defaultDate,
    time: initial ? new Date(initial.date_time).toTimeString().slice(0, 5) : "09:00",
    interviewer_name: initial?.interviewer_name ?? "",
    prep_notes: initial?.prep_notes ?? "",
    post_interview_notes: initial?.post_interview_notes ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFields((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!initial && !selectedJobId) {
      setError("Please select a job.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const date_time = `${fields.date}T${fields.time}:00`;
      if (initial) {
        await onSubmit({
          round_type: fields.round_type,
          date_time,
          interviewer_name: fields.interviewer_name || undefined,
          prep_notes: fields.prep_notes || undefined,
          post_interview_notes: fields.post_interview_notes || undefined,
        } as InterviewUpdate);
      } else {
        await onSubmit({
          job_id: selectedJobId,
          round_type: fields.round_type,
          date_time,
          interviewer_name: fields.interviewer_name || undefined,
          prep_notes: fields.prep_notes || undefined,
          post_interview_notes: fields.post_interview_notes || undefined,
        } as InterviewCreate);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* Job picker — only shown when jobId is not pre-set (i.e. adding from Interviews page) */}
        {!initial && !jobId && jobs && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="job_id">Job *</Label>
            <select
              id="job_id"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              required
              className={SELECT_CLASS}
            >
              <option value="">— Select a job —</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.company_name} — {j.role_title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="round_type">Round Type *</Label>
          <select
            id="round_type"
            name="round_type"
            value={fields.round_type}
            onChange={handleChange}
            className={SELECT_CLASS}
          >
            {ROUND_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date">Date *</Label>
          <input
            id="date"
            name="date"
            type="date"
            value={fields.date}
            onChange={handleChange}
            required
            className={SELECT_CLASS}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="time">Time *</Label>
          <input
            id="time"
            name="time"
            type="time"
            value={fields.time}
            onChange={handleChange}
            required
            className={SELECT_CLASS}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="interviewer_name">Interviewer Name</Label>
          <Input
            id="interviewer_name"
            name="interviewer_name"
            value={fields.interviewer_name}
            onChange={handleChange}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prep_notes">Prep Notes</Label>
        <Textarea
          id="prep_notes"
          name="prep_notes"
          value={fields.prep_notes}
          onChange={handleChange}
          placeholder="Questions to prepare, topics to review..."
          className="min-h-[100px]"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="post_interview_notes">Post-Interview Notes</Label>
        <Textarea
          id="post_interview_notes"
          name="post_interview_notes"
          value={fields.post_interview_notes}
          onChange={handleChange}
          placeholder="How it went, questions asked, follow-up actions..."
          className="min-h-[100px]"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : initial ? "Update Interview" : "Add Interview"}
        </Button>
      </div>
    </form>
  );
}
