from datetime import datetime, date, timedelta
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.chat import ChatRequest, ChatResponse, SourceChunk
from app.llm.base import Message
from app.llm.factory import get_llm_provider
from app.rag.search import similarity_search
from app.services.profile_service import get_or_create_profile
from app.models.job import Job, JobStatus
from app.models.contact import Contact, ContactStatus
from app.models.coffee_chat import CoffeeChat
from app.models.interview import Interview
from app.models.user import User
from app.core.dependencies import get_current_user
from app.core.llm_errors import raise_for_llm_error

router = APIRouter()

_BASE_SYSTEM = """You are a job search assistant embedded in the user's personal job tracker app.

You have full access to:
- Their resume and personal background notes
- A live TRACKER SUMMARY: every job application with status, all contacts, upcoming interviews and coffee chats, overdue follow-ups
- Job descriptions they've saved (via semantic search)
- Coffee chat notes and interview prep/post-interview notes (via semantic search)

Rules:
- Be direct and actionable. The user is actively job searching and needs practical help, not generic career advice.
- Use the TRACKER SUMMARY for pipeline questions, counts, status checks, and scheduling. Never say you don't know how many jobs they've applied to — the data is in the tracker summary.
- When referencing jobs or companies, use specific details from the provided context (company name, role title, requirements from the JD).
- Structure longer responses with clear headers and bullet points for scannability.
- Keep responses focused — don't repeat the user's resume back to them unless they ask.
- When comparing the user's background to a JD, be honest about gaps rather than just highlighting matches.
- Only say "I don't know" if the information genuinely isn't tracked in the app.
- When prepping for interviews, tailor advice to the specific role and company, not generic tips."""


def build_tracker_summary(db: Session, user_id) -> str:
    """
    Always-injected structured context — answers pipeline, count, status, and
    scheduling questions without relying on semantic search.
    """
    now = datetime.utcnow()
    two_weeks_out = now + timedelta(days=14)
    one_week_out = now + timedelta(days=7)

    lines: list[str] = []

    # ── Job applications ──────────────────────────────────────────────────────
    jobs = db.query(Job).filter(Job.user_id == user_id).order_by(Job.created_at.desc()).all()
    job_map = {j.id: j for j in jobs}

    status_counts: Counter = Counter(j.status for j in jobs)
    rejected_count = status_counts.get(JobStatus.rejected, 0)

    ordered_statuses = [
        JobStatus.saved, JobStatus.applied, JobStatus.networking,
        JobStatus.interviewing, JobStatus.offer,
    ]
    count_parts = [
        f"{s.value.capitalize()}: {status_counts[s]}"
        for s in ordered_statuses
        if status_counts[s] > 0
    ]
    if rejected_count:
        count_parts.append(f"Rejected: {rejected_count}")

    lines.append(f"## JOB APPLICATIONS ({len(jobs)} total)")
    lines.append("Status: " + (" | ".join(count_parts) if count_parts else "none"))

    active_jobs = [j for j in jobs if j.status != JobStatus.rejected]
    if active_jobs:
        lines.append("")
        for j in active_jobs:
            parts = [j.company_name, j.role_title, j.status.value.capitalize()]
            if j.date_applied:
                parts.append(f"Applied: {j.date_applied.strftime('%b %d, %Y')}")
            if j.location_remote_status:
                parts.append(j.location_remote_status)
            if j.notes:
                snippet = j.notes[:80] + ("..." if len(j.notes) > 80 else "")
                parts.append(f"Notes: {snippet}")
            lines.append("  - " + " | ".join(parts))

    if rejected_count:
        lines.append(f"  - [{rejected_count} rejected role(s) not shown]")

    # ── Contacts ─────────────────────────────────────────────────────────────
    contacts = db.query(Contact).filter(Contact.user_id == user_id).all()
    if contacts:
        overdue = [c for c in contacts if c.is_overdue]
        active = [c for c in contacts if not c.is_overdue and c.status != ContactStatus.chat_done]
        done_count = sum(1 for c in contacts if c.status == ContactStatus.chat_done)

        lines.append("")
        lines.append(f"## CONTACTS ({len(contacts)} total)")

        if overdue:
            lines.append("OVERDUE FOLLOW-UPS:")
            for c in overdue:
                label = f"{c.name} @ {c.company}" if c.company else c.name
                lines.append(f"  - {label} | {c.status.value.replace('_', ' ')} | due {c.follow_up_date} [OVERDUE]")

        for c in active:
            label = f"{c.name} @ {c.company}" if c.company else c.name
            fu = f" | follow-up {c.follow_up_date}" if c.follow_up_date else ""
            lines.append(f"  - {label} | {c.status.value.replace('_', ' ')}{fu}")

        if done_count:
            lines.append(f"  - [{done_count} contact(s) with completed chats]")

    # ── Upcoming interviews ──────────────────────────────────────────────────
    upcoming_ivs = (
        db.query(Interview)
        .filter(Interview.user_id == user_id, Interview.date_time >= now, Interview.date_time <= two_weeks_out)
        .order_by(Interview.date_time)
        .all()
    )
    if upcoming_ivs:
        lines.append("")
        lines.append("## UPCOMING INTERVIEWS (next 14 days)")
        for iv in upcoming_ivs:
            job = job_map.get(iv.job_id)
            company = job.company_name if job else "?"
            role = job.role_title if job else "?"
            dt = iv.date_time.strftime("%b %d")
            parts = [dt, company, role, iv.round_type]
            if iv.interviewer_name:
                parts.append(f"with {iv.interviewer_name}")
            lines.append("  - " + " | ".join(parts))

    # ── Upcoming coffee chats ────────────────────────────────────────────────
    upcoming_chats = (
        db.query(CoffeeChat)
        .filter(CoffeeChat.user_id == user_id, CoffeeChat.date_time >= now, CoffeeChat.date_time <= one_week_out)
        .order_by(CoffeeChat.date_time)
        .all()
    )
    if upcoming_chats:
        lines.append("")
        lines.append("## UPCOMING COFFEE CHATS (next 7 days)")
        cid_set = [c.contact_id for c in upcoming_chats]
        contact_map = {
            c.id: c
            for c in db.query(Contact).filter(Contact.id.in_(cid_set)).all()
        }
        for chat in upcoming_chats:
            contact = contact_map.get(chat.contact_id)
            label = f"{contact.name} @ {contact.company}" if (contact and contact.company) else (contact.name if contact else "?")
            dt = chat.date_time.strftime("%b %d")
            lines.append(f"  - {dt} | {label}")

    return "\n".join(lines) if lines else "No tracker data yet."


def _build_system_prompt(
    profile_context: str,
    tracker_summary: str,
    rag_chunks: list[SourceChunk],
) -> str:
    """
    Four-layer system prompt:
      1. Base instructions
      2. User background (resume + about me)
      3. Tracker summary (structured: jobs, contacts, interviews, coffee chats)
      4. Semantic context (JD chunks, notes matched to this query)
    """
    parts = [_BASE_SYSTEM]

    if profile_context.strip():
        parts.append("\n\n--- USER BACKGROUND ---\n" + profile_context.strip())

    if tracker_summary.strip():
        parts.append("\n\n--- TRACKER SUMMARY ---\n" + tracker_summary.strip())

    if rag_chunks:
        chunk_text = "\n\n".join(
            f"[{c.source_type} | id:{c.source_id}]\n{c.chunk_text}" for c in rag_chunks
        )
        parts.append("\n\n--- RELEVANT CONTEXT (JDs, NOTES, CHATS) ---\n" + chunk_text)

    return "\n".join(parts)


def _get_profile_context(db: Session, user_id) -> str:
    profile = get_or_create_profile(db, user_id)
    sections = []
    if profile.resume_text and profile.resume_text.strip():
        sections.append("RESUME:\n" + profile.resume_text.strip())
    if profile.about_me and profile.about_me.strip():
        sections.append("ABOUT ME:\n" + profile.about_me.strip())
    return "\n\n".join(sections)


@router.post("", response_model=ChatResponse)
@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> ChatResponse:
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Track 1a: profile (resume + about me)
    profile_context = _get_profile_context(db, current_user.id)

    # Track 1b: structured tracker state — always injected
    tracker_summary = build_tracker_summary(db, current_user.id)

    # Track 2: semantic search for depth (JDs, notes, chat notes)
    from app.models.embedding import SourceType
    raw_results = similarity_search(db, request.message, top_k=5, user_id=current_user.id)
    print(f"[RAG] query='{request.message[:60]}' → {len(raw_results)} results: "
          f"{[(r.source_type, round(r.distance, 3)) for r in raw_results]}")
    rag_chunks = [
        SourceChunk(
            source_type=r.source_type.value if hasattr(r.source_type, "value") else str(r.source_type),
            source_id=r.source_id,
            chunk_text=r.chunk_text,
            distance=r.distance,
        )
        for r in raw_results
        if r.source_type not in (SourceType.user_resume, SourceType.user_about)
    ]

    TOKEN_BUDGET = 3000
    MAX_CHARS = TOKEN_BUDGET * 4

    # Truncate tracker summary if it would push the prompt over budget
    profile_chars = len(profile_context)
    rag_chars = sum(len(c.chunk_text) for c in rag_chunks)
    base_chars = len(_BASE_SYSTEM) + profile_chars + rag_chars
    if base_chars + len(tracker_summary) > MAX_CHARS:
        allowed = max(200, MAX_CHARS - base_chars)
        tracker_summary = tracker_summary[:allowed] + "\n  [truncated — too many applications to fit in context]"

    system = _build_system_prompt(profile_context, tracker_summary, rag_chunks)
    estimated_tokens = len(system) // 4
    print(f"[CHAT] system_prompt ~{estimated_tokens} tokens ({len(system)} chars)"
          + (" [TRUNCATED]" if estimated_tokens > TOKEN_BUDGET else ""))

    capped_history = request.history[-15:]
    messages = [Message(role=m.role, content=m.content) for m in capped_history]
    messages.append(Message(role="user", content=request.message))

    try:
        llm = get_llm_provider()
        reply = await llm.complete(system=system, messages=messages)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise_for_llm_error(e)

    return ChatResponse(reply=reply, sources=rag_chunks)
