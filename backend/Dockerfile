FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (separate layer = cached unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the embedding model so it's baked into the image.
# This adds ~90MB but means zero download delay at runtime.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY . .

RUN chmod +x entrypoint.sh
