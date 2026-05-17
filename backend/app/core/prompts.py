"""
Shared LLM prompt constants.
Centralised here so the same extraction logic isn't duplicated across routers.
"""

EXTRACTION_SYSTEM = (
    "You are a data extraction assistant. "
    "Always respond with valid JSON only — no markdown, no explanation."
)

JD_FIELD_EXTRACTION_PROMPT = """Extract the following fields from the job description below.
Return ONLY a JSON object with exactly these three keys:
  "company"  — the company name
  "title"    — the job title or role
  "location" — the work location. Use "Remote" if fully remote, "Hybrid" if hybrid.
               Otherwise use City, Province/State format (e.g. "Toronto, ON").
               If you see a street address, extract just the city from it.

Use an empty string "" only if a field truly cannot be determined.

Job description:
{text}"""

JD_FULL_EXTRACTION_PROMPT = """Extract from this job posting. Return valid JSON only — no markdown fences, no explanation:
{{"company_name": "...", "role_title": "...", "location": "...", "jd_text": "..."}}

Rules:
- jd_text: full job description as PLAIN TEXT ONLY — no HTML tags, no CSS classes, no angle brackets. Include responsibilities, requirements, about the company, etc.
- location: city/province, "Remote", or "Hybrid" — not a street address
- Set any field you cannot determine to null

Job posting content:
{text}"""
