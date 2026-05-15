import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContactForm } from "@/components/ContactForm";
import { contactService } from "@/services/contactService";
import { jobService } from "@/services/jobService";
import type { Contact, ContactStatus } from "@/types/contact";
import type { Job } from "@/types/job";

const STATUS_LABELS: Record<ContactStatus, string> = {
  awaiting_response: "Awaiting",
  responded: "Responded",
  chat_scheduled: "Scheduled",
  chat_done: "Done",
};

const STATUS_BADGE_VARIANT: Record<ContactStatus, "awaiting" | "responded" | "scheduled" | "done"> = {
  awaiting_response: "awaiting",
  responded: "responded",
  chat_scheduled: "scheduled",
  chat_done: "done",
};

const ALL_STATUSES: ContactStatus[] = ["awaiting_response", "responded", "chat_scheduled", "chat_done"];

export function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ContactStatus | "">("");
  const [filterOverdue, setFilterOverdue] = useState(false);
  const navigate = useNavigate();

  const loadContacts = useCallback(async () => {
    const params = {
      status: filterStatus || undefined,
      overdue_only: filterOverdue || undefined,
    };
    const data = await contactService.getAll(params);
    setContacts(data);
  }, [filterStatus, filterOverdue]);

  useEffect(() => {
    Promise.all([loadContacts(), jobService.getAll().then(setJobs)]).finally(() =>
      setLoading(false)
    );
  }, [loadContacts]);

  async function handleCreate(data: Parameters<typeof contactService.create>[0]) {
    const created = await contactService.create(data);
    setContacts((prev) => [created, ...prev]);
    setShowForm(false);
  }

  const jobMap = Object.fromEntries(jobs.map((j) => [j.id, j]));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? <><X size={15} className="mr-1.5" />Cancel</> : <><Plus size={15} className="mr-1.5" />Add Contact</>}
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-base font-medium mb-4">New Contact</h2>
          <ContactForm
            jobs={jobs}
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterOverdue((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors duration-150 ${
            filterOverdue
              ? "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700"
              : "bg-background text-muted-foreground border-input hover:bg-accent"
          }`}
        >
          <AlertCircle size={12} />
          Overdue only
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors duration-150 ${
              filterStatus === s
                ? "border-transparent"
                : "bg-background text-muted-foreground border-input hover:bg-accent"
            }`}
          >
            {filterStatus === s
              ? <Badge variant={STATUS_BADGE_VARIANT[s]}>{STATUS_LABELS[s]}</Badge>
              : STATUS_LABELS[s]}
          </button>
        ))}
        {(filterStatus || filterOverdue) && (
          <button
            onClick={() => { setFilterStatus(""); setFilterOverdue(false); }}
            className="rounded-full px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading...</div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No contacts yet. Add your first one above.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Company</th>
                <th className="text-left px-4 py-3 font-medium">Linked Job</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contacts.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => navigate(`/contacts/${c.id}`)}
                >
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-1.5">
                      {c.name}
                      {c.linkedin_url && (
                        <a
                          href={c.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.company ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {c.job_id && jobMap[c.job_id]
                      ? `${jobMap[c.job_id].company_name} — ${jobMap[c.job_id].role_title}`
                      : <span className="italic">General networking</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE_VARIANT[c.status]}>
                      {STATUS_LABELS[c.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {c.follow_up_date ? (
                      <span className={`text-xs ${c.is_overdue ? "text-orange-600 font-medium" : "text-muted-foreground"}`}>
                        {c.is_overdue && <AlertCircle size={12} className="inline mr-1" />}
                        {c.follow_up_date}
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
