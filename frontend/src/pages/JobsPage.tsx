import { useState, useEffect, useCallback } from "react";
import { Plus, X, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobForm } from "@/components/JobForm";
import { JobTable } from "@/components/JobTable";
import { CsvImportModal } from "@/components/CsvImportModal";
import { jobService } from "@/services/jobService";
import type { Job, JobCreate, JobUpdate } from "@/types/job";

export function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const loadJobs = useCallback(async () => {
    try {
      const data = await jobService.getAll();
      setJobs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  async function handleCreate(data: JobCreate | JobUpdate) {
    const created = await jobService.create(data as JobCreate);
    setJobs((prev) => [created, ...prev]);
    setShowForm(false);
    window.dispatchEvent(new CustomEvent("jobsChanged"));
  }

  async function handleUpdate(id: string, data: JobUpdate) {
    const updated = await jobService.update(id, data);
    setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
  }

  async function handleDelete(id: string) {
    await jobService.delete(id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
    window.dispatchEvent(new CustomEvent("jobsChanged"));
  }

  async function handleImported() {
    await loadJobs();
    window.dispatchEvent(new CustomEvent("jobsChanged"));
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Job Applications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {jobs.length} application{jobs.length !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
            <FileUp size={14} className="mr-1.5" />Import CSV
          </Button>
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? <><X size={15} className="mr-1.5" />Cancel</> : <><Plus size={15} className="mr-1.5" />Add Job</>}
          </Button>
        </div>
      </div>

      {/* Add form — shown inline when toggled */}
      {showForm && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-base font-medium mb-4">New Job Application</h2>
          <JobForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground">
          Loading...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <JobTable
          jobs={jobs}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      {showImport && (
        <CsvImportModal
          onClose={() => setShowImport(false)}
          onImported={handleImported}
        />
      )}
    </div>
  );
}
