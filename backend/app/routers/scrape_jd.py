import json
import re
from typing import Optional

import requests as http_requests
from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException
from app.core.llm_errors import raise_for_llm_error
from app.core.prompts import EXTRACTION_SYSTEM, JD_FULL_EXTRACTION_PROMPT
from pydantic import BaseModel

router = APIRouter()

_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}



class ScrapeRequest(BaseModel):
    url: str


class ScrapeResponse(BaseModel):
    company_name: Optional[str] = None
    role_title: Optional[str] = None
    location: Optional[str] = None
    jd_text: Optional[str] = None
    error: Optional[str] = None


# ── Job-board-specific API handlers ──────────────────────────────────────────
# These boards render JD content via JS so HTML scraping gets an empty page.
# Their public posting APIs return structured JSON with the full description.

def _try_ashby(url: str) -> Optional[dict]:
    """
    Ashby public posting API.
    URL:  https://jobs.ashbyhq.com/{org}/{job-id}
    API:  https://api.ashbyhq.com/posting-api/job-board/{org}
    """
    m = re.match(r"https://jobs\.ashbyhq\.com/([^/]+)/([^/?#]+)", url)
    if not m:
        return None
    org, job_id = m.group(1), m.group(2)
    try:
        resp = http_requests.get(
            f"https://api.ashbyhq.com/posting-api/job-board/{org}",
            timeout=10,
        )
        if not resp.ok:
            return None
        postings = resp.json().get("jobPostings", [])
        job = next((j for j in postings if j.get("id") == job_id), None)
        if not job:
            return None
        desc_html = job.get("descriptionHtml", "") or ""
        desc_text = (
            BeautifulSoup(desc_html, "html.parser").get_text(separator="\n", strip=True)
            if desc_html else None
        )
        return {
            "company_name": org.capitalize(),
            "role_title": job.get("title"),
            "location": job.get("location"),
            "jd_text": desc_text,
        }
    except Exception:
        return None


def _try_greenhouse(url: str) -> Optional[dict]:
    """
    Greenhouse public jobs API.
    URL:  https://job-boards.greenhouse.io/{company}/jobs/{id}
          https://boards.greenhouse.io/{company}/jobs/{id}
    API:  https://boards-api.greenhouse.io/v1/boards/{company}/jobs/{id}
    """
    m = re.search(r"greenhouse\.io/([^/]+)/jobs/(\d+)", url)
    if not m:
        return None
    company, job_id = m.group(1), m.group(2)
    try:
        resp = http_requests.get(
            f"https://boards-api.greenhouse.io/v1/boards/{company}/jobs/{job_id}",
            timeout=10,
        )
        if not resp.ok:
            return None
        job = resp.json()
        desc_html = job.get("content", "") or ""
        desc_text = (
            BeautifulSoup(desc_html, "html.parser").get_text(separator="\n", strip=True)
            if desc_html else None
        )
        location = None
        if job.get("location"):
            location = job["location"].get("name")
        return {
            "company_name": job.get("company", {}).get("name"),
            "role_title": job.get("title"),
            "location": location,
            "jd_text": desc_text,
        }
    except Exception:
        return None


def _try_lever(url: str) -> Optional[dict]:
    """
    Lever public posting API.
    URL: https://jobs.lever.co/{company}/{posting-id}
    API: https://api.lever.co/v0/postings/{company}/{posting-id}
    """
    m = re.match(r"https://jobs\.lever\.co/([^/]+)/([^/?#]+)", url)
    if not m:
        return None
    company, posting_id = m.group(1), m.group(2)
    try:
        resp = http_requests.get(
            f"https://api.lever.co/v0/postings/{company}/{posting_id}",
            timeout=10,
        )
        if not resp.ok:
            return None
        job = resp.json()
        # Lever returns lists of text blocks; join them
        lists = job.get("lists", [])
        description_parts = [job.get("descriptionPlain", "")] + [
            f"{l.get('text', '')}\n{l.get('content', '')}" for l in lists
        ]
        jd_text = "\n\n".join(p for p in description_parts if p).strip() or None
        location = None
        if job.get("categories"):
            location = job["categories"].get("location")
        return {
            "company_name": job.get("company"),
            "role_title": job.get("text"),
            "location": location,
            "jd_text": jd_text,
        }
    except Exception:
        return None


# ── HTML fallback ─────────────────────────────────────────────────────────────

def _clean_html(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "header", "footer",
                      "noscript", "iframe", "svg", "aside"]):
        tag.decompose()
    text = soup.get_text(separator="\n", strip=True)
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    SCRAPE_MAX_CHARS = 16_000  # ~4000 tokens at 4 chars/token
    return "\n".join(lines)[:SCRAPE_MAX_CHARS]


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("", response_model=ScrapeResponse)
@router.post("/", response_model=ScrapeResponse)
async def scrape_jd(data: ScrapeRequest) -> ScrapeResponse:
    url = data.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL cannot be empty")

    # LinkedIn blocks all automated access — detect early and save the round-trip
    if "linkedin.com" in url:
        return ScrapeResponse(
            error="LinkedIn requires login to view job details. Open the posting and paste the description manually."
        )

    # Try job-board-specific APIs first (they return structured data including JD text)
    for handler in (_try_ashby, _try_greenhouse, _try_lever):
        result = handler(url)
        if result is not None:
            return ScrapeResponse(
                company_name=result.get("company_name") or None,
                role_title=result.get("role_title") or None,
                location=result.get("location") or None,
                jd_text=result.get("jd_text") or None,
            )

    # Generic HTML fallback — fetch page and extract with LLM
    try:
        resp = http_requests.get(url, headers=_BROWSER_HEADERS, timeout=10)
        resp.raise_for_status()
    except http_requests.exceptions.Timeout:
        return ScrapeResponse(
            error="Couldn't access this page — it timed out. Fill in the details manually."
        )
    except http_requests.exceptions.RequestException:
        return ScrapeResponse(
            error="Couldn't access this page. Fill in the details manually."
        )

    cleaned = _clean_html(resp.text)
    if not cleaned.strip():
        return ScrapeResponse(
            error="The page didn't contain readable text. Fill in the details manually."
        )

    from app.llm.base import Message
    from app.llm.factory import get_llm_provider

    try:
        llm = get_llm_provider()
        raw = await llm.complete(
            system="You are a data extraction assistant. Always respond with valid JSON only — no markdown, no explanation.",
            messages=[Message(role="user", content=JD_FULL_EXTRACTION_PROMPT.format(text=cleaned))],
        )
        parsed = json.loads(raw.strip())
        return ScrapeResponse(
            company_name=parsed.get("company_name") or None,
            role_title=parsed.get("role_title") or None,
            location=parsed.get("location") or None,
            jd_text=parsed.get("jd_text") or None,
        )
    except json.JSONDecodeError:
        return ScrapeResponse(error="Couldn't extract job details. Fill in the details manually.")
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise_for_llm_error(e)
