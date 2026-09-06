# ── AfyaToken ML Fraud Detection Service ──────────────────────────
# Multi-stage build for FastAPI + XGBoost
FROM python:3.11-slim AS builder
WORKDIR /app

# System deps for scikit-learn/xgboost compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libgomp1 curl && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: production
FROM python:3.11-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 curl && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd -r afyaTokenml && useradd -r -g afyaTokenml -s /sbin/nologin afyaTokenml

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code + trained model
COPY --chown=afyaTokenml:afyaTokenml . .

ENV ENV=production
ENV PORT=8001

USER afyaTokenml
EXPOSE 8001

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2", "--access-log"]
