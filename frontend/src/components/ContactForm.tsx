import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Contact, ContactCreate, ContactUpdate, ContactStatus } from "@/types/contact";
import type { Job } from "@/types/job";

const STATUS_OPTIONS: { value: ContactStatus; label: string }[] = [
  { value: "awaiting_response", label: "Awaiting Response" },
  { value: "responded", label: "Responded" },
  { value: "chat_scheduled", label: "Chat Scheduled" },
  { value: "chat_done", label: "Chat Done" },
];

interface ContactFormProps {
  initial?: Contact;
  jobs?: Job[];
  defaultJobId?: string;
  onSubmit: (data: ContactCreate | ContactUpdate) => Promise<void>;
  onCancel: () => void;
}

export function ContactForm({ initial, jobs = [], defaultJobId, onSubmit, onCancel }: ContactFormProps) {
  const today = new Date().toISOString().split("T")[0];

  const [fields, setFields] = useState({
    name: initial?.name ?? "",
    company: initial?.company ?? "",
    linkedin_url: initial?.linkedin_url ?? "",
    meeting_link: initial?.meeting_link ?? "",
    job_id: initial?.job_id ?? defaultJobId ?? "",
    outreach_date: initial?.outreach_date ?? today,
    status: (initial?.status ?? "awaiting_response") as ContactStatus,
    follow_up_date: initial?.follow_up_date ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isChatDone = fields.status === "chat_done";

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFields((prev) => {
      const next = { ...prev, [name]: value };
      // Clear follow-up date when switching to chat_done
      if (name === "status" && value === "chat_done") {
        next.follow_up_date = "";
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        ...fields,
        company: fields.company || undefined,
        linkedin_url: fields.linkedin_url || undefined,
        meeting_link: fields.meeting_link || undefined,
        job_id: fields.job_id || undefined,
        follow_up_date: isChatDone ? undefined : (fields.follow_up_date || undefined),
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
          <Label htmlFor="name">Name *</Label>
          <Input id="name" name="name" value={fields.name} onChange={handleChange} placeholder="Jane Smith" required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="company">Company</Label>
          <Input id="company" name="company" value={fields.company} onChange={handleChange} placeholder="Google" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="linkedin_url">LinkedIn URL</Label>
          <Input id="linkedin_url" name="linkedin_url" type="url" value={fields.linkedin_url} onChange={handleChange} placeholder="https://linkedin.com/in/..." />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="job_id">Linked Job (optional)</Label>
          <select
            id="job_id"
            name="job_id"
            value={fields.job_id}
            onChange={handleChange}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">— General networking —</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.company_name} — {j.role_title}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="outreach_date">Outreach Date *</Label>
          <Input id="outreach_date" name="outreach_date" type="date" value={fields.outreach_date} onChange={handleChange} required />
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

        {/* Meeting link — only relevant when a chat is scheduled */}
        {fields.status === "chat_scheduled" && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="meeting_link">Meeting Link</Label>
            <Input
              id="meeting_link"
              name="meeting_link"
              type="url"
              value={fields.meeting_link}
              onChange={handleChange}
              placeholder="https://meet.google.com/..."
            />
          </div>
        )}

        {/* Only show follow-up date when it's relevant */}
        {!isChatDone && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="follow_up_date">
              Follow-up Date{" "}
              <span className="text-muted-foreground font-normal">(auto: outreach + 5 days if left blank)</span>
            </Label>
            <Input
              id="follow_up_date"
              name="follow_up_date"
              type="date"
              value={fields.follow_up_date}
              onChange={handleChange}
            />
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : initial ? "Update Contact" : "Add Contact"}
        </Button>
      </div>
    </form>
  );
}
