"""Endpoints de métricas y estadísticas globales de StockFlow."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import Estadisticas
from app.services import producto_service

router = APIRouter(prefix="/estadisticas", tags=["Estadísticas"])


@router.get(
    "",
    response_model=Estadisticas,
    summary="Obtener estadísticas del inventario",
    description=(
        "Calcula y retorna el stock total acumulado, precio promedio, "
        "precio máximo y precio mínimo. Retorna 0 si no hay productos."
    ),
)
def obtener_metricas(db: Session = Depends(get_db)) -> Estadisticas:
    """Retorna las métricas cuantitativas consolidadas del inventario."""
    return producto_service.obtener_estadisticas(db)
