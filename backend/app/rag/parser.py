import io
from fastapi import UploadFile


async def parse_document(file: UploadFile) -> str:
    """
    Extract plain text from an uploaded PDF or DOCX file.
    Returns empty string if parsing fails or file type is unsupported.
    """
    content = await file.read()
    filename = (file.filename or "").lower()

    if filename.endswith(".pdf"):
        return _parse_pdf(content)
    elif filename.endswith(".docx"):
        return _parse_docx(content)
    else:
        # Assume plain text
        return content.decode("utf-8", errors="ignore")


def _parse_pdf(content: bytes) -> str:
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(content))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text.strip())
    return "\n\n".join(pages)


def _parse_docx(content: bytes) -> str:
    from docx import Document
    doc = Document(io.BytesIO(content))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs)
