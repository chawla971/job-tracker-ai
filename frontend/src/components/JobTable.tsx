import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { JobForm } from "@/components/JobForm";
import type { Job, JobStatus, JobUpdate } from "@/types/job";

interface JobTableProps {
  jobs: Job[];
  onUpdate: (id: string, data: JobUpdate) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function JobTable({ jobs, onUpdate, onDelete }: JobTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  if (jobs.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        No job applications yet. Add your first one above.
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Company</th>
            <th className="text-left px-4 py-3 font-medium">Role</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="text-left px-4 py-3 font-medium">Location</th>
            <th className="text-left px-4 py-3 font-medium">Applied</th>
            <th className="text-right px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {jobs.map((job) =>
            editingId === job.id ? (
              <tr key={job.id}>
                <td colSpan={6} className="px-4 py-4 bg-muted/20">
                  <JobForm
                    initial={job}
                    onSubmit={async (data) => {
                      await onUpdate(job.id, data as JobUpdate);
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                </td>
              </tr>
            ) : (
              <tr
                key={job.id}
                className="hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/jobs/${job.id}`)}
              >
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-1.5">
                    {job.company_name}
                    {job.posting_url && (
                      <a
                        href={job.posting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{job.role_title}</td>
                <td className="px-4 py-3">
                  <Badge variant={job.status as JobStatus}>
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {job.location_remote_status ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{job.date_applied ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(job.id);
                      }}
                    >
                      <Pencil size={15} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={deletingId === job.id}
                      title="Delete"
                      className="text-destructive hover:text-destructive"
                      onClick={async (e) => {
                        e.stopPropagation();
                        setDeletingId(job.id);
                        await onDelete(job.id);
                        setDeletingId(null);
                      }}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
