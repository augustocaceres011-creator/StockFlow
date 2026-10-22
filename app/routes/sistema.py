"""Endpoints de diagnóstico, salud del sistema y soporte técnico."""

import sys
import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Producto
from app.schemas import DiagnosticoSistema

router = APIRouter(prefix="/sistema", tags=["Sistema & Soporte"])


@router.get(
    "/diagnostico",
    response_model=DiagnosticoSistema,
    summary="Diagnóstico de salud del sistema",
    description=(
        "Evalúa la conectividad con la base de datos SQLite, latencia de consulta, "
        "conteo de registros y estado general de la plataforma para soporte técnico."
    ),
)
def obtener_diagnostico(db: Session = Depends(get_db)) -> DiagnosticoSistema:
    """Ejecuta una verificación de salud técnica de la plataforma."""
    inicio = time.perf_counter()
    # Verifica conectividad real con el motor SQL
    db.execute(text("SELECT 1"))
    total_prods = db.query(Producto).count()
    fin = time.perf_counter()
    latencia_ms = round((fin - inicio) * 1000, 2)

    return DiagnosticoSistema(
        estado="operativo",
        servidor="FastAPI / Uvicorn",
        version_api="1.0.0",
        version_python=sys.version.split()[0],
        base_datos="conectada",
        total_productos=total_prods,
        latencia_db_ms=latencia_ms,
        timestamp=datetime.now(timezone.utc),
    )
