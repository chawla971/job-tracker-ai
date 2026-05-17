"""
JD Scraping endpoint — multi-strategy extraction in order of reliability:

1. LinkedIn detection → immediate friendly error (blocks all bots)
2. Job-board-specific APIs (Ashby, Greenhouse, Lever) → structured JSON, no LLM needed
3. JSON-LD structured data embedded in the page → machine-readable, no LLM needed
4. Generic HTML scrape + LLM extraction → last resort

All paths run jd_text through _strip_html() to guarantee no HTML leaks into the field.
"""
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


# ── Shared utilities ──────────────────────────────────────────────────────────

def _strip_html(text: Optional[str]) -> Optional[str]:
    """
    Remove any leaked HTML tags from extracted text.
    Applied to jd_text regardless of which extraction path was used.
    """
    if not text or "<" not in text:
        return text
    cleaned = BeautifulSoup(text, "html.parser").get_text(separator="\n", strip=True)
    return cleaned or None


def _html_to_text(html: str) -> Optional[str]:
    """Convert an HTML string to clean readable text."""
    if not html or not html.strip():
        return None
    return BeautifulSoup(html, "html.parser").get_text(separator="\n", strip=True) or None


def _build_response(result: dict) -> ScrapeResponse:
    """Normalise a result dict into ScrapeResponse, stripping any HTML from jd_text."""
    return ScrapeResponse(
        company_name=result.get("company_name") or None,
        role_title=result.get("role_title") or None,
        location=result.get("location") or None,
        jd_text=_strip_html(result.get("jd_text")) or None,
    )


# ── Strategy 1: Job-board APIs ────────────────────────────────────────────────

def _try_ashby(url: str) -> Optional[dict]:
    """Ashby public posting API — URL: jobs.ashbyhq.com/{org}/{job-id}"""
    m = re.match(r"https://jobs\.ashbyhq\.com/([^/]+)/([^/?#]+)", url)
    if not m:
        return None
    org, job_id = m.group(1), m.group(2)
    try:
        resp = http_requests.get(f"https://api.ashbyhq.com/posting-api/job-board/{org}", timeout=10)
        if not resp.ok:
            return None
        postings = resp.json().get("jobPostings", [])
        job = next((j for j in postings if j.get("id") == job_id), None)
        if not job:
            return None
        return {
            "company_name": org.capitalize(),
            "role_title": job.get("title"),
            "location": job.get("location"),
            "jd_text": _html_to_text(job.get("descriptionHtml", "")),
        }
    except Exception:
        return None


def _try_greenhouse(url: str) -> Optional[dict]:
    """
    Greenhouse public jobs API.
    Supports both classic (boards.greenhouse.io) and new (job-boards.greenhouse.io).
    Falls back to URL slug for company name when the API doesn't return it.
    """
    m = re.search(r"greenhouse\.io/([^/]+)/jobs/(\d+)", url)
    if not m:
        return None
    company_slug, job_id = m.group(1), m.group(2)
    try:
        resp = http_requests.get(
            f"https://boards-api.greenhouse.io/v1/boards/{company_slug}/jobs/{job_id}",
            timeout=10,
        )
        if not resp.ok:
            return None
        job = resp.json()
        location = None
        if job.get("location"):
            location = job["location"].get("name")
        # The API sometimes doesn't include the company name; fall back to the URL slug
        company_from_api = (job.get("company") or {}).get("name")
        company_name = company_from_api or company_slug.replace("-", " ").title()
        return {
            "company_name": company_name,
            "role_title": job.get("title"),
            "location": location,
            "jd_text": _html_to_text(job.get("content", "")),
        }
    except Exception:
        return None


def _try_lever(url: str) -> Optional[dict]:
    """Lever public posting API — URL: jobs.lever.co/{company}/{posting-id}"""
    m = re.match(r"https://jobs\.lever\.co/([^/]+)/([^/?#]+)", url)
    if not m:
        return None
    company, posting_id = m.group(1), m.group(2)
    try:
        resp = http_requests.get(f"https://api.lever.co/v0/postings/{company}/{posting_id}", timeout=10)
        if not resp.ok:
            return None
        job = resp.json()
        lists = job.get("lists", [])
        parts = [job.get("descriptionPlain", "")] + [
            f"{l.get('text', '')}\n{l.get('content', '')}" for l in lists
        ]
        jd_text = "\n\n".join(p for p in parts if p).strip() or None
        location = (job.get("categories") or {}).get("location")
        return {
            "company_name": job.get("company"),
            "role_title": job.get("text"),
            "location": location,
            "jd_text": jd_text,
        }
    except Exception:
        return None


# ── Strategy 2: JSON-LD structured data ──────────────────────────────────────

def _try_json_ld(html: str) -> Optional[dict]:
    """
    Many job boards embed machine-readable job data in JSON-LD format:
      <script type="application/ld+json">{"@type": "JobPosting", ...}</script>
    This is the most reliable extraction path for supported sites because
    it's structured data meant to be machine-read (not scraped).
    """
    soup = BeautifulSoup(html, "html.parser")
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            # Handle @graph arrays and single objects
            if isinstance(data, dict):
                items = data.get("@graph", [data])
            elif isinstance(data, list):
                items = data
            else:
                continue

            for item in items:
                if not isinstance(item, dict):
                    continue
                if item.get("@type") not in ("JobPosting", "jobPosting"):
                    continue

                # Extract location from nested structure
                location = None
                job_loc = item.get("jobLocation")
                if isinstance(job_loc, list):
                    job_loc = job_loc[0] if job_loc else None
                if isinstance(job_loc, dict):
                    address = job_loc.get("address", {})
                    if isinstance(address, dict):
                        parts = [address.get("addressLocality"), address.get("addressRegion")]
                        location = ", ".join(p for p in parts if p) or None
                    elif isinstance(address, str):
                        location = address

                # Employer / company
                hiring_org = item.get("hiringOrganization", {})
                company = hiring_org.get("name") if isinstance(hiring_org, dict) else None

                desc = item.get("description", "")
                return {
                    "company_name": company,
                    "role_title": item.get("title"),
                    "location": location,
                    "jd_text": _html_to_text(desc) if desc else None,
                }
        except Exception:
            continue
    return None


# ── Strategy 3: Generic HTML + LLM ───────────────────────────────────────────

def _clean_html(html: str) -> str:
    """Strip noise tags, extract readable text, truncate to ~4000 LLM tokens."""
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "header", "footer",
                      "noscript", "iframe", "svg", "aside"]):
        tag.decompose()
    text = soup.get_text(separator="\n", strip=True)
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    SCRAPE_MAX_CHARS = 16_000
    return "\n".join(lines)[:SCRAPE_MAX_CHARS]


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("", response_model=ScrapeResponse)
@router.post("/", response_model=ScrapeResponse)
async def scrape_jd(data: ScrapeRequest) -> ScrapeResponse:
    url = data.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL cannot be empty")

    if "linkedin.com" in url:
        return ScrapeResponse(
            error="LinkedIn requires login to view job details. Open the posting and paste the description manually."
        )

    # ── Strategy 1: Job-board APIs ────────────────────────────────────────────
    for handler in (_try_ashby, _try_greenhouse, _try_lever):
        result = handler(url)
        if result is not None:
            return _build_response(result)

    # ── Fetch the page (needed for strategies 2 and 3) ───────────────────────
    try:
        resp = http_requests.get(url, headers=_BROWSER_HEADERS, timeout=10)
        resp.raise_for_status()
    except http_requests.exceptions.Timeout:
        return ScrapeResponse(error="Couldn't access this page — it timed out. Fill in the details manually.")
    except http_requests.exceptions.RequestException:
        return ScrapeResponse(error="Couldn't access this page. Fill in the details manually.")

    # ── Strategy 2: JSON-LD structured data ───────────────────────────────────
    json_ld_result = _try_json_ld(resp.text)
    if json_ld_result is not None and (json_ld_result.get("role_title") or json_ld_result.get("jd_text")):
        return _build_response(json_ld_result)

    # ── Strategy 3: HTML clean-text + LLM ────────────────────────────────────
    cleaned = _clean_html(resp.text)
    if not cleaned.strip():
        return ScrapeResponse(error="The page didn't contain readable text. Fill in the details manually.")

    from app.llm.base import Message
    from app.llm.factory import get_llm_provider

    try:
        llm = get_llm_provider()
        raw = await llm.complete(
            system=EXTRACTION_SYSTEM,
            messages=[Message(role="user", content=JD_FULL_EXTRACTION_PROMPT.format(text=cleaned))],
        )
        parsed = json.loads(raw.strip())
        return _build_response({
            "company_name": parsed.get("company_name"),
            "role_title": parsed.get("role_title"),
            "location": parsed.get("location"),
            "jd_text": parsed.get("jd_text"),
        })
    except json.JSONDecodeError:
        return ScrapeResponse(error="Couldn't extract job details. Fill in the details manually.")
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise_for_llm_error(e)
