import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Plus, X, CalendarPlus } from "lucide-react";
import { googleCalendarUrl } from "@/lib/calendar";
import { Button } from "@/components/ui/button";
import { InterviewForm } from "@/components/InterviewForm";
import { interviewService } from "@/services/interviewService";
import { jobService } from "@/services/jobService";
import type { Interview, InterviewCreate, InterviewUpdate } from "@/types/interview";
import type { Job } from "@/types/job";
import { formatDateTime, daysUntil } from "@/lib/time";

type Tab = "upcoming" | "past";

export function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      interviewService.getAll(),
      jobService.getAll().then(setJobs),
    ])
      .then(([ivs]) => setInterviews(ivs))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(data: InterviewCreate | InterviewUpdate) {
    const created = await interviewService.create(data as InterviewCreate);
    setInterviews((prev) => [...prev, created]);
    setShowForm(false);
  }

  const now = new Date();
  const upcoming = interviews
    .filter((i) => new Date(i.date_time) >= now)
    .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());
  const past = interviews
    .filter((i) => new Date(i.date_time) < now)
    .sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime());

  const shown = tab === "upcoming" ? upcoming : past;
  const jobMap = Object.fromEntries(jobs.map((j) => [j.id, j]));

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium">Interviews</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {upcoming.length} upcoming · {past.length} past
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? <><X size={14} className="mr-1.5" />Cancel</> : <><Plus size={14} className="mr-1.5" />Add Interview</>}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border bg-card p-5">
          <h2 className="text-sm font-medium mb-4">New Interview</h2>
          <InterviewForm
            jobs={jobs}
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["upcoming", "past"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors duration-150 ${
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "upcoming" ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading...</div>
      ) : shown.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {tab === "upcoming"
            ? "No upcoming interviews. Add one from a job's detail page."
            : "No past interviews recorded."}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((interview) => {
            const job = jobMap[interview.job_id];
            const days = daysUntil(interview.date_time);
            const isUpcoming = tab === "upcoming";

            return (
              <div
                key={interview.id}
                className="rounded-lg border bg-secondary p-4 hover:bg-accent cursor-pointer transition-colors duration-150"
                onClick={() => navigate(`/jobs/${interview.job_id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">
                        {job ? job.company_name : "Unknown Company"}
                      </p>
                      <span className="text-[11px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                        {interview.round_type}
                      </span>
                      {isUpcoming && (
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          days === 0
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                            : days <= 3
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `in ${days}d`}
                        </span>
                      )}
                    </div>
                    {job && (
                      <p className="text-xs text-muted-foreground">{job.role_title}</p>
                    )}
                    {interview.interviewer_name && (
                      <p className="text-xs text-muted-foreground">
                        with {interview.interviewer_name}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground justify-end">
                      <Calendar size={12} />
                      {formatDateTime(interview.date_time)}
                    </div>
                    {isUpcoming && (
                      <a
                        href={googleCalendarUrl({
                          title: `${job?.company_name ?? "Interview"} — ${interview.round_type}`,
                          startIso: interview.date_time,
                          details: job ? `${job.role_title}${interview.prep_notes ? `\n\nPrep notes:\n${interview.prep_notes}` : ""}` : "",
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        <CalendarPlus size={11} />
                        Add to Calendar
                      </a>
                    )}
                  </div>
                </div>

                {(interview.prep_notes || interview.post_interview_notes) && (
                  <div className="mt-3 pt-3 border-t">
                    {isUpcoming && interview.prep_notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        <span className="font-medium text-foreground">Prep: </span>
                        {interview.prep_notes}
                      </p>
                    )}
                    {!isUpcoming && interview.post_interview_notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        <span className="font-medium text-foreground">Notes: </span>
                        {interview.post_interview_notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
