import { useState, useRef } from "react";
import { Upload, Download, X, AlertTriangle, CheckCircle2, SkipForward, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importService } from "@/services/importService";
import type { ImportPreviewResponse, ImportRow } from "@/types/import";

const JOB_STATUSES = ["saved", "applied", "networking", "interviewing", "offer", "rejected"];

const COLUMN_GUIDE = [
  { field: "Company *",      aliases: "Company, Employer, Organization" },
  { field: "Role *",         aliases: "Role, Title, Position, Job Title" },
  { field: "Status",         aliases: "Status — Applied, Saved, Interviewing, Offer, Rejected" },
  { field: "Date Applied",   aliases: "Date Applied, Applied Date, Application Date" },
  { field: "Location",       aliases: "Location, Remote Status" },
  { field: "Notes",          aliases: "Notes, Comments" },
];

type Step = "instructions" | "preview" | "importing" | "done";

interface Props {
  onClose: () => void;
  onImported: () => void;
}

function RowStatusBadge({ row }: { row: ImportRow }) {
  if (row.is_duplicate)
    return <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Duplicate</span>;
  if (!row.company_name?.trim() || !row.role_title?.trim())
    return <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Missing fields</span>;
  if (row.issues.length > 0)
    return <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Fixable</span>;
  return <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Ready</span>;
}

function EditableCell({
  value, onChange, type = "text", placeholder = "",
}: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full min-w-0 bg-background border border-input rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
    />
  );
}

function canImport(row: ImportRow) {
  return !!(row.company_name?.trim() && row.role_title?.trim()) && !row.is_duplicate;
}

export function CsvImportModal({ onClose, onImported }: Props) {
  const [step, setStep] = useState<Step>("instructions");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ imported: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────

  function updateRow(rowNum: number, patch: Partial<ImportRow>) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.row_num !== rowNum) return r;
        const updated = { ...r, ...patch };
        // Recompute issues after edit (excluding duplicate marker)
        const newIssues = updated.is_duplicate
          ? ["Duplicate — already in your tracker"]
          : [
              ...(!updated.company_name?.trim() ? ["Missing company name"] : []),
              ...(!updated.role_title?.trim() ? ["Missing role / job title"] : []),
              // preserve non-field issues (e.g. bad date)
              ...r.issues.filter((i) => i.startsWith("Couldn't parse") || i.startsWith("Unknown status")),
            ];
        return { ...updated, issues: newIssues };
      })
    );
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setStep("importing");
    try {
      const result = await importService.preview(file);
      setPreview(result);
      setRows(result.rows);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
      setStep("instructions");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleConfirm() {
    setStep("importing");
    try {
      const result = await importService.confirm(rows.filter(canImport));
      setSummary({ imported: result.imported, skipped: result.skipped_duplicates + result.skipped_errors });
      setStep("done");
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setStep("preview");
    }
  }

  const importableCount = rows.filter(canImport).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-card rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="font-semibold text-base">
            {step === "instructions" && "Import Jobs from CSV / Excel"}
            {step === "preview" && `Preview — ${preview?.total_rows} rows detected`}
            {step === "importing" && "Importing..."}
            {step === "done" && "Import Complete"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ── Instructions ── */}
          {step === "instructions" && (
            <>
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                <strong>Tip:</strong> Download the template below, fill it in (delete the example rows first), then upload.
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Accepted column names</p>
                <div className="rounded-lg border overflow-hidden text-sm">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wide text-muted-foreground">Field</th>
                        <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wide text-muted-foreground">Column names we recognise</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {COLUMN_GUIDE.map((c) => (
                        <tr key={c.field}>
                          <td className="px-3 py-2 font-medium whitespace-nowrap">{c.field}</td>
                          <td className="px-3 py-2 text-muted-foreground">{c.aliases}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-2">* Required. Column names are case-insensitive.</p>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={importService.downloadTemplate}>
                  <Download size={14} className="mr-1.5" />Download template
                </Button>
                <Button size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload size={14} className="mr-1.5" />Upload CSV / Excel
                </Button>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />
              </div>
            </>
          )}

          {/* ── Loading ── */}
          {step === "importing" && (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Processing...</span>
            </div>
          )}

          {/* ── Preview ── */}
          {step === "preview" && preview && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: <CheckCircle2 size={14} className="text-green-500" />, label: "Ready to import", value: importableCount },
                  { icon: <AlertTriangle size={14} className="text-amber-500" />, label: "Has issues", value: rows.filter((r) => r.issues.length > 0 && !r.is_duplicate).length },
                  { icon: <SkipForward size={14} className="text-muted-foreground" />, label: "Duplicates (skipped)", value: preview.duplicate_count },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="rounded-lg bg-secondary px-4 py-3 flex items-center gap-2.5">
                    {icon}
                    <div>
                      <p className="text-lg font-semibold">{value}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {preview.unmapped_columns.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Ignored columns (not recognised): <span className="font-medium">{preview.unmapped_columns.join(", ")}</span>
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                Cells in <span className="text-amber-600 dark:text-amber-400 font-medium">amber</span> or{" "}
                <span className="text-red-600 dark:text-red-400 font-medium">red</span> are editable — fix them directly in the table below.
              </p>

              {/* Table */}
              <div className="rounded-lg border overflow-auto max-h-72">
                <table className="w-full text-xs min-w-[700px]">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">#</th>
                      <th className="text-left px-3 py-2 font-medium">Company *</th>
                      <th className="text-left px-3 py-2 font-medium">Role *</th>
                      <th className="text-left px-3 py-2 font-medium">Status</th>
                      <th className="text-left px-3 py-2 font-medium">Date Applied</th>
                      <th className="text-left px-3 py-2 font-medium">Location</th>
                      <th className="text-left px-3 py-2 font-medium">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((row) => {
                      const missingCompany = !row.company_name?.trim();
                      const missingRole = !row.role_title?.trim();
                      const rowOk = canImport(row);
                      const rowBg = row.is_duplicate
                        ? "bg-muted/30 opacity-60"
                        : !rowOk
                        ? "bg-red-50 dark:bg-red-900/10"
                        : row.issues.length > 0
                        ? "bg-amber-50 dark:bg-amber-900/10"
                        : "";

                      return (
                        <tr key={row.row_num} className={rowBg}>
                          <td className="px-3 py-2 text-muted-foreground">{row.row_num}</td>

                          <td className="px-3 py-2 min-w-[140px]">
                            {missingCompany && !row.is_duplicate ? (
                              <EditableCell
                                value={row.company_name ?? ""}
                                onChange={(v) => updateRow(row.row_num, { company_name: v })}
                                placeholder="Company name"
                              />
                            ) : (
                              <span>{row.company_name}</span>
                            )}
                          </td>

                          <td className="px-3 py-2 min-w-[140px]">
                            {missingRole && !row.is_duplicate ? (
                              <EditableCell
                                value={row.role_title ?? ""}
                                onChange={(v) => updateRow(row.row_num, { role_title: v })}
                                placeholder="Job title"
                              />
                            ) : (
                              <span>{row.role_title}</span>
                            )}
                          </td>

                          <td className="px-3 py-2 min-w-[120px]">
                            {row.issues.some((i) => i.startsWith("Unknown status")) && !row.is_duplicate ? (
                              <select
                                value={row.status}
                                onChange={(e) => updateRow(row.row_num, {
                                  status: e.target.value,
                                  issues: row.issues.filter((i) => !i.startsWith("Unknown status")),
                                })}
                                className="w-full bg-background border border-input rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                              >
                                {JOB_STATUSES.map((s) => (
                                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="capitalize">{row.status}</span>
                            )}
                          </td>

                          <td className="px-3 py-2 text-muted-foreground">{row.date_applied ?? "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{row.location_remote_status ?? "—"}</td>
                          <td className="px-3 py-2"><RowStatusBadge row={row} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </>
          )}

          {/* ── Done ── */}
          {step === "done" && summary && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
                <CheckCircle2 size={28} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-lg font-semibold">{summary.imported} job{summary.imported !== 1 ? "s" : ""} imported</p>
                {summary.skipped > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">{summary.skipped} skipped (duplicates or missing fields)</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t shrink-0">
          {step === "instructions" && (
            <>
              <p className="text-xs text-muted-foreground">Supports .csv, .xlsx, .xls — max 5 MB</p>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => { setStep("instructions"); setPreview(null); setRows([]); }}>
                ← Back
              </Button>
              <Button onClick={handleConfirm} disabled={importableCount === 0}>
                Import {importableCount} job{importableCount !== 1 ? "s" : ""}
              </Button>
            </>
          )}
          {step === "done" && (
            <div className="ml-auto">
              <Button onClick={onClose}>Done</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
