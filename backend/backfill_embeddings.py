"""
One-time backfill: embed all existing data that was saved before the embedding
pipeline was connected. Safe to run multiple times — embed_and_store deletes
existing embeddings before re-inserting, so it won't create duplicates.

Run inside the backend container:
    docker-compose exec backend python backfill_embeddings.py
"""
from app.database import SessionLocal
from app.models.job import Job
from app.models.coffee_chat import CoffeeChat
from app.models.interview import Interview
from app.models.user_profile import UserProfile
from app.models.embedding import SourceType
from app.rag.pipeline import embed_and_store


def backfill():
    db = SessionLocal()
    try:
        jobs = db.query(Job).all()
        print(f"Jobs: {len(jobs)}")
        for job in jobs:
            if job.jd_text and job.jd_text.strip():
                print(f"  Embedding JD: {job.company_name} — {job.role_title}")
                embed_and_store(db, SourceType.job_jd, job.id, job.jd_text)

        chats = db.query(CoffeeChat).all()
        print(f"Coffee chats: {len(chats)}")
        for chat in chats:
            if chat.notes and chat.notes.strip():
                print(f"  Embedding chat notes: {chat.id}")
                embed_and_store(db, SourceType.coffee_chat_notes, chat.id, chat.notes)

        interviews = db.query(Interview).all()
        print(f"Interviews: {len(interviews)}")
        for iv in interviews:
            if iv.prep_notes and iv.prep_notes.strip():
                print(f"  Embedding prep notes: {iv.id}")
                embed_and_store(db, SourceType.interview_prep, iv.id, iv.prep_notes)
            if iv.post_interview_notes and iv.post_interview_notes.strip():
                print(f"  Embedding post-interview notes: {iv.id}")
                embed_and_store(db, SourceType.interview_post, iv.id, iv.post_interview_notes)

        profiles = db.query(UserProfile).all()
        print(f"Profiles: {len(profiles)}")
        for p in profiles:
            if p.resume_text and p.resume_text.strip():
                print(f"  Embedding resume")
                embed_and_store(db, SourceType.user_resume, p.id, p.resume_text)
            if p.about_me and p.about_me.strip():
                print(f"  Embedding about me")
                embed_and_store(db, SourceType.user_about, p.id, p.about_me)

        print("\nBackfill complete.")

    finally:
        db.close()


if __name__ == "__main__":
    backfill()
