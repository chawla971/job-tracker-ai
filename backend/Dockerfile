FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (separate layer = cached unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


COPY . .

RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]
