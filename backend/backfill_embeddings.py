"""
Backfill embeddings for all existing data.
Run inside the backend container:
    docker exec job-tracker-ai-backend-1 python backfill_embeddings.py

Prints progress for each item so you can see exactly what's working/failing.
"""
import logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger(__name__)

from app.database import SessionLocal
from app.models.job import Job
from app.models.coffee_chat import CoffeeChat
from app.models.interview import Interview
from app.models.user_profile import UserProfile
from app.models.embedding import SourceType
from app.rag.pipeline import embed_and_store


def backfill():
    db = SessionLocal()
    ok = fail = skip = 0

    try:
        # ── Jobs ──────────────────────────────────────────────────────────────
        jobs = db.query(Job).all()
        log.info("Found %d jobs", len(jobs))
        for j in jobs:
            if not j.jd_text or not j.jd_text.strip():
                skip += 1
                continue
            try:
                log.info("  Embedding JD: %s — %s (%d chars)", j.company_name, j.role_title, len(j.jd_text))
                embed_and_store(db, SourceType.job_jd, j.id, j.jd_text, user_id=j.user_id)
                log.info("  ✓ Done")
                ok += 1
            except Exception as e:
                log.error("  ✗ FAILED: %s", e)
                fail += 1

        # ── Coffee chats ──────────────────────────────────────────────────────
        chats = db.query(CoffeeChat).all()
        log.info("Found %d coffee chats", len(chats))
        for c in chats:
            if not c.notes or not c.notes.strip():
                skip += 1
                continue
            try:
                log.info("  Embedding chat notes: %s", c.id)
                embed_and_store(db, SourceType.coffee_chat_notes, c.id, c.notes, user_id=c.user_id)
                log.info("  ✓ Done")
                ok += 1
            except Exception as e:
                log.error("  ✗ FAILED: %s", e)
                fail += 1

        # ── Interviews ────────────────────────────────────────────────────────
        interviews = db.query(Interview).all()
        log.info("Found %d interviews", len(interviews))
        for iv in interviews:
            if iv.prep_notes and iv.prep_notes.strip():
                try:
                    log.info("  Embedding prep notes: %s", iv.id)
                    embed_and_store(db, SourceType.interview_prep, iv.id, iv.prep_notes, user_id=iv.user_id)
                    log.info("  ✓ Done")
                    ok += 1
                except Exception as e:
                    log.error("  ✗ FAILED: %s", e)
                    fail += 1
            else:
                skip += 1

            if iv.post_interview_notes and iv.post_interview_notes.strip():
                try:
                    log.info("  Embedding post-interview notes: %s", iv.id)
                    embed_and_store(db, SourceType.interview_post, iv.id, iv.post_interview_notes, user_id=iv.user_id)
                    log.info("  ✓ Done")
                    ok += 1
                except Exception as e:
                    log.error("  ✗ FAILED: %s", e)
                    fail += 1
            else:
                skip += 1

        # ── Profiles ──────────────────────────────────────────────────────────
        profiles = db.query(UserProfile).all()
        log.info("Found %d profiles", len(profiles))
        for p in profiles:
            if p.resume_text and p.resume_text.strip():
                try:
                    log.info("  Embedding resume for profile %s", p.id)
                    embed_and_store(db, SourceType.user_resume, p.id, p.resume_text, user_id=p.user_id)
                    log.info("  ✓ Done")
                    ok += 1
                except Exception as e:
                    log.error("  ✗ FAILED: %s", e)
                    fail += 1
            else:
                skip += 1

            if p.about_me and p.about_me.strip():
                try:
                    log.info("  Embedding about_me for profile %s", p.id)
                    embed_and_store(db, SourceType.user_about, p.id, p.about_me, user_id=p.user_id)
                    log.info("  ✓ Done")
                    ok += 1
                except Exception as e:
                    log.error("  ✗ FAILED: %s", e)
                    fail += 1
            else:
                skip += 1

    finally:
        db.close()

    log.info("─" * 40)
    log.info("Backfill complete: %d OK, %d failed, %d skipped (no text)", ok, fail, skip)


if __name__ == "__main__":
    backfill()
