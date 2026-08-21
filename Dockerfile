# syntax=docker/dockerfile:1.7

FROM python:3.13-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    UV_NO_DEV=1 \
    UV_PYTHON_DOWNLOADS=0 \
    VIRTUAL_ENV=/app/.venv \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app


# ---------- dependencies ----------
FROM base AS builder

COPY --from=ghcr.io/astral-sh/uv:0.11.2 /uv /bin/uv

COPY pyproject.toml uv.lock ./

RUN --mount=type=cache,target=/root/.cache/uv,sharing=locked \
    uv sync \
        --locked \
        --no-install-project \
        --no-editable


# ---------- runtime ----------
FROM base AS runtime

RUN groupadd --system --gid 1000 app \
    && useradd --system --uid 1000 --gid app --create-home app \
    && install -d -o app -g app /home/app/.cache/huggingface \
    && chown app:app /app

COPY --from=builder --chown=app:app /app/.venv /app/.venv

COPY --chown=app:app . /app

USER app

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]