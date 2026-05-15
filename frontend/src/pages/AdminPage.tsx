import { useState, useEffect } from "react";
import { adminService, type AdminStats } from "@/services/adminService";

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg bg-secondary px-5 py-5">
      <p className="text-3xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

export function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminService.getStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-lg font-medium">Admin</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Platform overview</p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {stats && (
        <section className="space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
            Stats
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard value={stats.total_users}        label="Total users" />
            <StatCard value={stats.new_users_this_week} label="New this week" />
            <StatCard value={stats.total_jobs}          label="Jobs tracked" />
            <StatCard value={stats.daily_active_users}  label="Active today" />
          </div>
        </section>
      )}
    </div>
  );
}
