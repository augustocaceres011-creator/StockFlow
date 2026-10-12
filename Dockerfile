# ==============================================================================
# ETAPA 1: BUILDER (Instalación de dependencias con Poetry)
# ==============================================================================
FROM python:3.11-slim AS builder

WORKDIR /build

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_VERSION=1.8.3 \
    POETRY_HOME="/opt/poetry" \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    POETRY_NO_INTERACTION=1

# Instalar curl para descargar Poetry
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Instalar Poetry
RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH="$POETRY_HOME/bin:$PATH"

# Copiar archivos de dependencias
COPY pyproject.toml poetry.lock* README.md ./

# Instalar únicamente las dependencias principales de producción en .venv
RUN poetry install --no-root --only main

# ==============================================================================
# ETAPA 2: RUNTIME FINAL (Imagen liviana con usuario no-root)
# ==============================================================================
FROM python:3.11-slim AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

# Crear usuario y grupo no-root para seguridad
RUN groupadd -r appgroup && useradd -r -g appgroup -u 10001 -d /app -s /sbin/nologin appuser \
    && mkdir -p /app/data && chown -R appuser:appgroup /app

# Copiar el entorno virtual preconstruido
COPY --from=builder --chown=appuser:appgroup /build/.venv /app/.venv

# Copiar el código de la aplicación y la carpeta estática
COPY --chown=appuser:appgroup app /app/app
COPY --chown=appuser:appgroup static /app/static
COPY --chown=appuser:appgroup pyproject.toml README.md /app/

# Cambiar al usuario sin privilegios root
USER appuser

EXPOSE 8000

# Iniciar Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
