import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, X, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { JobForm } from "@/components/JobForm";
import { ContactForm } from "@/components/ContactForm";
import { InterviewForm } from "@/components/InterviewForm";
import { jobService } from "@/services/jobService";
import { contactService } from "@/services/contactService";
import { interviewService } from "@/services/interviewService";
import type { JobStatus, JobUpdate } from "@/types/job";
import type { Interview, InterviewUpdate } from "@/types/interview";
import type { ContactCreate } from "@/types/contact";
import { formatDateTime } from "@/lib/time";

// We use the extended job type locally
interface JobDetail {
  id: string;
  company_name: string;
  role_title: string;
  posting_url: string | null;
  location_remote_status: string | null;
  jd_text: string | null;
  status: JobStatus;
  date_applied: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  contacts: Array<{
    id: string;
    name: string;
    company: string | null;
    status: string;
    is_overdue: boolean;
    follow_up_date: string | null;
    linkedin_url: string | null;
    coffee_chats: Array<{ id: string; date_time: string; notes: string | null }>;
  }>;
  interviews: Interview[];
}

const STATUS_LABELS: Record<string, string> = {
  reached_out: "Reached Out",
  responded: "Responded",
  chat_scheduled: "Chat Scheduled",
  chat_done: "Chat Done",
};

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingJob, setEditingJob] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [editingInterviewId, setEditingInterviewId] = useState<string | null>(null);

  async function reload() {
    if (!id) return;
    const data = await (jobService as any).getDetail(id);
    setJob(data);
  }

  useEffect(() => {
    if (!id) return;
    (jobService as any)
      .getDetail(id)
      .then(setJob)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleJobUpdate(data: JobUpdate) {
    if (!id) return;
    await jobService.update(id, data);
    await reload();
    setEditingJob(false);
  }

  async function handleAddContact(data: ContactCreate | import("@/types/contact").ContactUpdate) {
    await contactService.create({ ...data, job_id: id } as ContactCreate);
    await reload();
    setShowContactForm(false);
  }

  async function handleAddInterview(data: import("@/types/interview").InterviewCreate | import("@/types/interview").InterviewUpdate) {
    await interviewService.create(data as import("@/types/interview").InterviewCreate);
    await reload();
    setShowInterviewForm(false);
  }

  async function handleUpdateInterview(interviewId: string, data: InterviewUpdate) {
    await interviewService.update(interviewId, data);
    await reload();
    setEditingInterviewId(null);
  }

  async function handleDeleteInterview(interviewId: string) {
    await interviewService.delete(interviewId);
    await reload();
  }

  async function handleDeleteJob() {
    if (!id || !confirm("Delete this job? This will also remove linked contacts and interviews.")) return;
    await jobService.delete(id);
    navigate("/");
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8 text-muted-foreground">Loading...</div>;
  if (error) return <div className="max-w-4xl mx-auto px-4 py-8 text-destructive">Error: {error}</div>;
  if (!job) return <div className="max-w-4xl mx-auto px-4 py-8 text-muted-foreground">Job not found.</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back to Applications
      </button>

      {/* Job header */}
      {editingJob ? (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-base font-medium mb-4">Edit Job</h2>
          <JobForm
            initial={job as any}
            onSubmit={handleJobUpdate}
            onCancel={() => setEditingJob(false)}
          />
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold">{job.company_name}</h1>
                <Badge variant={job.status}>
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </Badge>
                {job.posting_url && (
                  <a href={job.posting_url} target="_blank" rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
              <p className="text-muted-foreground mt-0.5">{job.role_title}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => setEditingJob(true)} title="Edit">
                <Pencil size={15} />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDeleteJob}
                className="text-destructive hover:text-destructive" title="Delete">
                <Trash2 size={15} />
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {job.location_remote_status && (
              <div>
                <span className="text-muted-foreground">Location</span>
                <p className="font-medium mt-0.5">{job.location_remote_status}</p>
              </div>
            )}
            {job.date_applied && (
              <div>
                <span className="text-muted-foreground">Applied</span>
                <p className="font-medium mt-0.5">{job.date_applied}</p>
              </div>
            )}
          </div>

          {job.notes && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{job.notes}</p>
            </div>
          )}

          {job.jd_text && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-1">Job Description</p>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground line-clamp-4">{job.jd_text}</p>
            </div>
          )}
        </div>
      )}

      {/* Interviews */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Interviews ({job.interviews.length})</h2>
          <Button size="sm" onClick={() => setShowInterviewForm((v) => !v)}>
            {showInterviewForm ? <><X size={14} className="mr-1" />Cancel</> : <><Plus size={14} className="mr-1" />Add Interview</>}
          </Button>
        </div>

        {showInterviewForm && (
          <div className="rounded-lg border bg-card p-5">
            <InterviewForm
              jobId={job.id}
              onSubmit={handleAddInterview}
              onCancel={() => setShowInterviewForm(false)}
            />
          </div>
        )}

        {job.interviews.length === 0 && !showInterviewForm && (
          <p className="text-sm text-muted-foreground py-2">No interviews scheduled yet.</p>
        )}

        {job.interviews.map((interview) =>
          editingInterviewId === interview.id ? (
            <div key={interview.id} className="rounded-lg border bg-card p-5">
              <InterviewForm
                jobId={job.id}
                initial={interview}
                onSubmit={(data) => handleUpdateInterview(interview.id, data as InterviewUpdate)}
                onCancel={() => setEditingInterviewId(null)}
              />
            </div>
          ) : (
            <div key={interview.id} className="rounded-lg border bg-card p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-sm">{interview.round_type}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(interview.date_time)}</p>
                  {interview.interviewer_name && (
                    <p className="text-xs text-muted-foreground">with {interview.interviewer_name}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditingInterviewId(interview.id)}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteInterview(interview.id)}
                    className="text-destructive hover:text-destructive">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              {interview.prep_notes && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Prep Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{interview.prep_notes}</p>
                </div>
              )}
              {interview.post_interview_notes && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Post-Interview Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{interview.post_interview_notes}</p>
                </div>
              )}
            </div>
          )
        )}
      </section>

      {/* Contacts */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Contacts ({job.contacts.length})</h2>
          <Button size="sm" onClick={() => setShowContactForm((v) => !v)}>
            {showContactForm ? <><X size={14} className="mr-1" />Cancel</> : <><Plus size={14} className="mr-1" />Add Contact</>}
          </Button>
        </div>

        {showContactForm && (
          <div className="rounded-lg border bg-card p-5">
            <ContactForm
              defaultJobId={job.id}
              onSubmit={handleAddContact}
              onCancel={() => setShowContactForm(false)}
            />
          </div>
        )}

        {job.contacts.length === 0 && !showContactForm && (
          <p className="text-sm text-muted-foreground py-2">No contacts linked to this job.</p>
        )}

        {job.contacts.map((contact) => (
          <div
            key={contact.id}
            className="rounded-lg border bg-card p-4 hover:bg-muted/20 cursor-pointer"
            onClick={() => navigate(`/contacts/${contact.id}`)}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-sm">{contact.name}</p>
                  {contact.linkedin_url && (
                    <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted-foreground hover:text-foreground">
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                {contact.company && <p className="text-xs text-muted-foreground">{contact.company}</p>}
              </div>
              <span className="text-xs text-muted-foreground">{STATUS_LABELS[contact.status]}</span>
            </div>

            {contact.follow_up_date && (
              <p className={`text-xs mt-1.5 ${contact.is_overdue ? "text-orange-600 font-medium" : "text-muted-foreground"}`}>
                Follow-up: {contact.follow_up_date}{contact.is_overdue ? " (overdue)" : ""}
              </p>
            )}

            {contact.coffee_chats.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {contact.coffee_chats.length} coffee chat{contact.coffee_chats.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
