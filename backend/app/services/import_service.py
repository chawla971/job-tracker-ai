"""
CSV / Excel import service.

Responsibilities:
  1. Parse uploaded file into raw rows
  2. Auto-detect which column maps to which job field
  3. Validate and normalise every row, flag issues
  4. (On confirm) bulk-insert importable rows, skip duplicates
"""
import csv
import io
from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.job import Job, JobStatus

# ── Column alias tables ───────────────────────────────────────────────────────

COLUMN_ALIASES: dict[str, list[str]] = {
    "company_name":           ["company", "employer", "organization", "company name", "employer name"],
    "role_title":             ["role", "title", "position", "job title", "role title", "job position"],
    "status":                 ["status", "application status", "stage"],
    "date_applied":           ["date applied", "applied date", "application date", "applied on", "date"],
    "location_remote_status": ["location", "remote", "remote status", "location/remote", "city"],
    "notes":                  ["notes", "comments", "note", "comment", "remarks"],
}

STATUS_ALIASES: dict[str, list[str]] = {
    "saved":        ["saved", "save", "bookmarked", "wishlist", "interested", "to apply"],
    "applied":      ["applied", "submitted", "application sent", "sent"],
    "networking":   ["networking", "network", "referral"],
    "interviewing": ["interviewing", "interview", "in progress", "interviews"],
    "offer":        ["offer", "offered", "offer received", "got offer"],
    "rejected":     ["rejected", "rejection", "declined", "not selected", "no"],
}

_STATUS_LOOKUP: dict[str, str] = {
    alias: status
    for status, aliases in STATUS_ALIASES.items()
    for alias in aliases
}


# ── Schema for a single preview/import row ────────────────────────────────────

class ImportRow(BaseModel):
    row_num: int
    company_name: Optional[str] = None
    role_title:   Optional[str] = None
    status:       str = "saved"
    date_applied: Optional[str] = None
    location_remote_status: Optional[str] = None
    notes:        Optional[str] = None
    issues:       list[str] = []
    is_duplicate: bool = False

    @property
    def can_import(self) -> bool:
        return bool(self.company_name and self.company_name.strip()
                    and self.role_title and self.role_title.strip())


class ImportPreviewResponse(BaseModel):
    rows:              list[ImportRow]
    column_mapping:    dict[str, str]   # raw header → our field name
    unmapped_columns:  list[str]
    total_rows:        int
    importable_count:  int
    duplicate_count:   int
    error_count:       int


class ImportConfirmRequest(BaseModel):
    rows: list[ImportRow]   # possibly edited by the user in the preview table


class ImportSummary(BaseModel):
    imported: int
    skipped_duplicates: int
    skipped_errors: int


# ── Parsing ───────────────────────────────────────────────────────────────────

def _parse_file(content: bytes, filename: str) -> list[dict[str, str]]:
    """Return list of dicts (header → cell value) from CSV or Excel."""
    lower = filename.lower()
    if lower.endswith(".xlsx") or lower.endswith(".xls"):
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            return []
        headers = [str(c).strip() if c is not None else "" for c in rows[0]]
        def _cell(c):
            from datetime import date as _d, datetime as _dt
            if c is None:
                return ""
            if isinstance(c, (_d, _dt)):
                return c.strftime("%Y-%m-%d")
            return str(c).strip()

        return [
            {headers[i]: _cell(cell) for i, cell in enumerate(row)}
            for row in rows[1:]
            if any(cell is not None for cell in row)
        ]
    else:
        text = content.decode("utf-8-sig", errors="replace")
        reader = csv.DictReader(io.StringIO(text))
        return [
            {k.strip(): (v.strip() if v else "") for k, v in row.items()}
            for row in reader
            if any(v.strip() for v in row.values())
        ]


def _detect_mapping(headers: list[str]) -> tuple[dict[str, str], list[str]]:
    """Map raw headers to our field names. Returns (mapping, unmapped)."""
    mapping: dict[str, str] = {}
    used_fields: set[str] = set()
    for header in headers:
        normalised = header.lower().strip()
        for field, aliases in COLUMN_ALIASES.items():
            if field not in used_fields and normalised in aliases:
                mapping[header] = field
                used_fields.add(field)
                break
    unmapped = [h for h in headers if h not in mapping]
    return mapping, unmapped


def _normalise_status(raw: str) -> tuple[str, Optional[str]]:
    """Return (normalised_status, issue_or_None)."""
    if not raw:
        return "saved", None
    looked_up = _STATUS_LOOKUP.get(raw.lower().strip())
    if looked_up:
        return looked_up, None
    return "saved", f"Unknown status '{raw}' — defaulted to Saved"


def _normalise_date(raw) -> tuple[Optional[str], Optional[str]]:
    """
    Accept a raw cell value (string, datetime.date, or datetime.datetime from openpyxl)
    and return (iso_string_or_None, issue_or_None).
    Always returns a str, never a date object, so Pydantic accepts it.
    """
    from datetime import datetime as _dt, date as _date
    if raw is None or raw == "":
        return None, None
    # openpyxl date cells arrive as date/datetime objects — convert directly
    if isinstance(raw, (_date, _dt)):
        return raw.strftime("%Y-%m-%d"), None
    raw = str(raw).strip()
    if not raw:
        return None, None
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%d-%m-%Y", "%m-%d-%Y",
                "%Y/%m/%d", "%B %d, %Y", "%b %d, %Y"):
        try:
            return _dt.strptime(raw, fmt).strftime("%Y-%m-%d"), None
        except ValueError:
            pass
    return None, f"Couldn't parse date '{raw}'"


# ── Core functions ────────────────────────────────────────────────────────────

def build_preview(content: bytes, filename: str, db: Session, user_id: UUID) -> ImportPreviewResponse:
    raw_rows = _parse_file(content, filename)
    if not raw_rows:
        return ImportPreviewResponse(
            rows=[], column_mapping={}, unmapped_columns=[],
            total_rows=0, importable_count=0, duplicate_count=0, error_count=0,
        )

    headers = list(raw_rows[0].keys())
    mapping, unmapped = _detect_mapping(headers)

    # Pre-fetch existing (company, role) pairs for duplicate detection
    existing = {
        (j.company_name.lower(), j.role_title.lower())
        for j in db.query(Job.company_name, Job.role_title).filter(Job.user_id == user_id).all()
    }

    rows: list[ImportRow] = []
    for i, raw in enumerate(raw_rows, start=2):  # row 2 = first data row
        def get(field: str) -> str:
            for header, mapped in mapping.items():
                if mapped == field:
                    return raw.get(header, "").strip()
            return ""

        company  = get("company_name") or None
        role     = get("role_title") or None
        issues: list[str] = []

        if not company:
            issues.append("Missing company name")
        if not role:
            issues.append("Missing role / job title")

        status_raw            = get("status")
        status, status_issue  = _normalise_status(status_raw)
        if status_issue:
            issues.append(status_issue)

        date_raw             = get("date_applied")
        date_val, date_issue = _normalise_date(date_raw)
        if date_issue:
            issues.append(date_issue)

        is_dup = bool(
            company and role
            and (company.lower(), role.lower()) in existing
        )
        if is_dup:
            issues.append("Duplicate — already in your tracker")

        rows.append(ImportRow(
            row_num=i,
            company_name=company,
            role_title=role,
            status=status,
            date_applied=date_val,
            location_remote_status=get("location_remote_status") or None,
            notes=get("notes") or None,
            issues=issues,
            is_duplicate=is_dup,
        ))

    importable = sum(1 for r in rows if r.can_import and not r.is_duplicate)
    duplicates = sum(1 for r in rows if r.is_duplicate)
    errors     = sum(1 for r in rows if not r.can_import)

    return ImportPreviewResponse(
        rows=rows,
        column_mapping={h: f for h, f in mapping.items()},
        unmapped_columns=unmapped,
        total_rows=len(rows),
        importable_count=importable,
        duplicate_count=duplicates,
        error_count=errors,
    )


def confirm_import(request: ImportConfirmRequest, db: Session, user_id: UUID) -> ImportSummary:
    existing = {
        (j.company_name.lower(), j.role_title.lower())
        for j in db.query(Job.company_name, Job.role_title).filter(Job.user_id == user_id).all()
    }

    imported = skipped_dup = skipped_err = 0
    new_jobs: list[Job] = []

    for row in request.rows:
        company = (row.company_name or "").strip()
        role    = (row.role_title or "").strip()

        if not company or not role:
            skipped_err += 1
            continue

        if (company.lower(), role.lower()) in existing:
            skipped_dup += 1
            continue

        try:
            status = JobStatus(row.status)
        except ValueError:
            status = JobStatus.saved

        job = Job(
            user_id=user_id,
            company_name=company,
            role_title=role,
            status=status,
            date_applied=date.fromisoformat(row.date_applied) if row.date_applied else None,
            location_remote_status=row.location_remote_status or None,
            notes=row.notes or None,
        )
        db.add(job)
        db.flush()  # populate job.id before commit
        new_jobs.append(job)
        existing.add((company.lower(), role.lower()))
        imported += 1

    db.commit()

    # Embed notes for newly imported jobs that have them.
    from app.models.embedding import SourceType
    from app.rag.pipeline import embed_and_store
    for job in new_jobs:
        if job.notes and job.notes.strip():
            embed_and_store(db, SourceType.job_jd, job.id, job.notes, user_id=user_id)

    return ImportSummary(imported=imported, skipped_duplicates=skipped_dup, skipped_errors=skipped_err)


TEMPLATE_CSV = """\
Company,Role,Status,Date Applied,Location,Notes
Acme Corp,Software Engineer,Applied,2026-01-15,Toronto ON,Strong culture fit
Google,Senior Developer,Interviewing,2026-02-01,Remote,Exciting team
"""
