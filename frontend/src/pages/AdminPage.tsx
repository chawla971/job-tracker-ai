import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { adminService, type AdminStats, type AdminUser } from "@/services/adminService";
import { feedbackService, type FeedbackItem, type FeedbackStatus } from "@/services/feedbackService";
import { formatDate } from "@/lib/time";

type Tab = "overview" | "feedback";

function FeedbackModal({ item, onClose }: { item: FeedbackItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-card rounded-xl border shadow-lg w-full max-w-lg space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium capitalize">{item.type}</span>
            <span className="text-xs text-muted-foreground">· {formatDate(item.created_at)} · {item.user_email ?? "unknown"}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.description}</p>
      </div>
    </div>
  );
}

type SortKey = keyof Pick<AdminUser, "name" | "email" | "job_count" | "created_at" | "last_active_at">;

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg bg-secondary px-4 py-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function SortButton({ col, current, dir, onSort }: {
  col: SortKey; current: SortKey; dir: "asc" | "desc"; onSort: (k: SortKey) => void;
}) {
  return (
    <button onClick={() => onSort(col)}
      className="flex items-center gap-1 font-medium hover:text-foreground transition-colors">
      {col === "job_count" ? "Jobs" : col === "created_at" ? "Joined" : col === "last_active_at" ? "Last Active" : col.charAt(0).toUpperCase() + col.slice(1)}
      {current === col && <span className="text-[10px]">{dir === "asc" ? "↑" : "↓"}</span>}
    </button>
  );
}

export function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    Promise.all([adminService.getStats(), adminService.getUsers(), feedbackService.listAdmin()])
      .then(([s, u, f]) => { setStats(s); setUsers(u); setFeedback(f); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleStatusChange(id: string, status: FeedbackStatus) {
    await feedbackService.updateStatus(id, status);
    setFeedback((prev) => prev.map((f) => f.id === id ? { ...f, status } : f));
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  const sorted = [...users].sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-lg font-medium">Admin</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Platform overview</p>
      </div>

      <div className="flex gap-1 border-b">
        {(["overview", "feedback"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {t === "overview" ? "Overview" : `Feedback (${feedback.length})`}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {tab === "feedback" && (
        <section className="space-y-3">
          {feedback.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feedback submitted yet.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Type</th>
                    <th className="text-left px-4 py-2.5 font-medium">Description</th>
                    <th className="text-left px-4 py-2.5 font-medium">User</th>
                    <th className="text-left px-4 py-2.5 font-medium">Date</th>
                    <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {feedback.map((f) => (
                    <tr key={f.id} className="hover:bg-muted/20 cursor-pointer"
                      onClick={() => setSelectedFeedback(f)}>
                      <td className="px-4 py-3 capitalize">{f.type}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{f.description}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{f.user_email ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(f.created_at)}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <select value={f.status}
                          onChange={(e) => handleStatusChange(f.id, e.target.value as FeedbackStatus)}
                          className="text-xs rounded border border-input bg-background px-2 py-1">
                          <option value="open">Open</option>
                          <option value="reviewed">Reviewed</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "overview" && stats && (<>
        <section className="space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">Overview</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard value={stats.total_users} label="Total users" />
            <StatCard value={stats.new_users_this_week} label="New this week" />
            <StatCard value={stats.total_jobs} label="Jobs tracked" />
            <StatCard value={stats.daily_active_users} label="Active today" />
          </div>
        </section>

        {users.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
              Users ({users.length})
            </h2>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    {(["name", "email", "job_count", "created_at", "last_active_at"] as SortKey[]).map((k) => (
                      <th key={k} className="text-left px-4 py-2.5">
                        <SortButton col={k} current={sortKey} dir={sortDir} onSort={handleSort} />
                      </th>
                    ))}
                    <th className="text-left px-4 py-2.5 font-medium">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sorted.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.job_count}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {u.last_active_at ? formatDate(u.last_active_at) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {u.is_admin
                          ? <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">Admin</span>
                          : <span className="text-[11px] text-muted-foreground">User</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </>)}

      {selectedFeedback && (
        <FeedbackModal item={selectedFeedback} onClose={() => setSelectedFeedback(null)} />
      )}
    </div>
  );
}
