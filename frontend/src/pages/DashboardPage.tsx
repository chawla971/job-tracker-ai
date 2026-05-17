import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Calendar, Coffee, TrendingUp, Video, CheckCircle2, CalendarPlus } from "lucide-react";
import { googleCalendarUrl } from "@/lib/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarWidget, type CalendarEvent } from "@/components/CalendarWidget";
import { dashboardService } from "@/services/dashboardService";
import { api } from "@/lib/api";
import type { DashboardData } from "@/types/dashboard";
import type { JobStatus } from "@/types/job";
import { daysUntil, daysSince } from "@/lib/time";

const STATUS_BAR_COLORS: Record<JobStatus, string> = {
  saved:        "#9ca3af",
  applied:      "#378ADD",
  networking:   "#7c3aed",
  interviewing: "#d97706",
  offer:        "#16a34a",
  rejected:     "#dc2626",
};

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
      {children}
    </h2>
  );
}

interface RawCalEvent { date: string; type: string; label: string; }

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [calEvents, setCalEvents] = useState<RawCalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      dashboardService.get().then(setData),
      api.get<{ events: RawCalEvent[] }>("/api/calendar/events")
        .then((r) => setCalEvents(r.events))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="max-w-5xl mx-auto px-6 py-8 text-sm text-muted-foreground">Loading...</div>
  );
  if (!data) return null;

  const calendarEvents: CalendarEvent[] = calEvents.map((e) => ({
    date: e.date,
    type: e.type as CalendarEvent["type"],
    label: e.label,
  }));

  const hasActionItems =
    data.upcoming_interviews.length > 0 ||
    data.upcoming_coffee_chats.length > 0 ||
    data.overdue_follow_ups.length > 0;

  const savedCount = data.status_counts.find((s) => s.status === "saved")?.count ?? 0;
  const maxCount = Math.max(...data.status_counts.map((s) => s.count), 1);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-lg font-medium">Dashboard</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Your job search at a glance</p>
      </div>

      {/* ── Action Items ─────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeader>Action Items</SectionHeader>

        {!hasActionItems && savedCount === 0 ? (
          <div className="flex items-center gap-3 rounded-lg bg-secondary px-5 py-4 text-sm text-muted-foreground">
            <CheckCircle2 size={16} className="text-green-500 shrink-0" />
            You're all caught up — no overdue follow-ups or upcoming events in the next 7 days.
          </div>
        ) : (
          <>
            {savedCount > 0 && (
              <div
                className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-amber-100/60 dark:hover:bg-amber-900/20 transition-colors"
                onClick={() => navigate("/")}
              >
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  <span className="font-semibold">{savedCount}</span> saved job{savedCount !== 1 ? "s" : ""} you haven't applied to yet.
                </p>
                <ChevronLink />
              </div>
            )}

            {data.overdue_follow_ups.length > 0 && (
              <div className="rounded-lg border border-orange-200 dark:border-orange-800/40 bg-orange-50 dark:bg-orange-900/10 overflow-hidden">
                <div className="px-4 py-2.5 flex items-center gap-2 text-sm font-medium text-orange-800 dark:text-orange-300 border-b border-orange-100 dark:border-orange-800/30">
                  <AlertCircle size={14} />
                  Overdue Follow-ups ({data.overdue_follow_ups.length})
                </div>
                {data.overdue_follow_ups.map((c) => (
                  <div
                    key={c.id}
                    className="px-4 py-3 flex items-center justify-between hover:bg-orange-100/40 dark:hover:bg-orange-900/20 cursor-pointer transition-colors border-b last:border-b-0 border-orange-100 dark:border-orange-800/20"
                    onClick={() => navigate(`/contacts/${c.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.company ?? "No company"} · {daysSince(c.follow_up_date)}d overdue
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{c.status.replace("_", " ")}</span>
                  </div>
                ))}
              </div>
            )}

            {data.upcoming_interviews.length > 0 && (
              <div className="rounded-lg border bg-secondary overflow-hidden">
                <div className="px-4 py-2.5 flex items-center gap-2 text-sm font-medium border-b">
                  <Calendar size={14} />
                  Upcoming Interviews
                </div>
                {data.upcoming_interviews.map((i) => {
                  const days = daysUntil(i.date_time);
                  return (
                    <div key={i.id} className="px-4 py-3 flex items-center justify-between border-b last:border-b-0">
                      <div>
                        <p className="text-sm font-medium">{i.company_name}</p>
                        <p className="text-xs text-muted-foreground">{i.round_type} · {i.role_title}</p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          days <= 1
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                            : "bg-secondary text-muted-foreground"
                        }`}>
                          {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `in ${days}d`}
                        </span>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/jobs/${i.job_id}`)}>
                          Prep
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {data.upcoming_coffee_chats.length > 0 && (
              <div className="rounded-lg border bg-secondary overflow-hidden">
                <div className="px-4 py-2.5 flex items-center gap-2 text-sm font-medium border-b">
                  <Coffee size={14} />
                  Upcoming Coffee Chats
                </div>
                {data.upcoming_coffee_chats.map((c) => {
                  const days = daysUntil(c.date_time);
                  return (
                    <div key={c.id} className="px-4 py-3 flex items-center justify-between border-b last:border-b-0">
                      <div className="cursor-pointer" onClick={() => navigate(`/contacts/${c.contact_id}`)}>
                        <p className="text-sm font-medium">{c.contact_name}</p>
                        <p className="text-xs text-muted-foreground">{c.company ?? "No company"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `in ${days}d`}
                        </span>
                        <a
                          href={googleCalendarUrl({
                            title: `Coffee Chat — ${c.contact_name}${c.company ? ` (${c.company})` : ""}`,
                            startIso: c.date_time,
                            durationMinutes: 30,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Add to Google Calendar"
                        >
                          <Button size="sm" variant="outline">
                            <CalendarPlus size={12} className="mr-1.5" />Calendar
                          </Button>
                        </a>
                        {c.meeting_link && (
                          <a href={c.meeting_link} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline">
                              <Video size={12} className="mr-1.5" />Join
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Pipeline ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeader>Pipeline</SectionHeader>

        <div className="grid grid-cols-3 gap-3">
          {[
            { value: data.total_active, label: "Active applications" },
            { value: data.jobs_this_week, label: "Applied this week" },
            { value: data.status_counts.find((s) => s.status === "interviewing")?.count ?? 0, label: "Interviewing" },
          ].map(({ value, label }) => (
            <div key={label} className="rounded-lg bg-secondary px-4 py-4">
              <p className="text-2xl font-semibold">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-secondary overflow-hidden">
          <div className="px-4 py-2.5 flex items-center gap-2 text-sm font-medium border-b">
            <TrendingUp size={14} />
            Pipeline Breakdown
          </div>
          <div className="px-4 py-3 space-y-2.5">
            {data.status_counts.map((s) => (
              <div key={s.status} className="flex items-center gap-3">
                <div className="w-24 shrink-0">
                  <Badge variant={s.status as JobStatus}>{s.status.charAt(0).toUpperCase() + s.status.slice(1)}</Badge>
                </div>
                <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: s.count > 0 ? `${(s.count / maxCount) * 100}%` : "0%",
                      backgroundColor: STATUS_BAR_COLORS[s.status as JobStatus],
                    }}
                  />
                </div>
                <span className="text-sm font-medium w-5 text-right text-muted-foreground">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── Calendar ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
          Calendar
        </h2>
        <CalendarWidget events={calendarEvents} />
      </section>
    </div>
  );
}

function ChevronLink() {
  return <span className="text-xs text-muted-foreground underline">View</span>;
}

// CalendarWidget and calendarEvents are used inside DashboardPage JSX — exported via CalendarWidget import above.
