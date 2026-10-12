"""Esquemas de validación y serialización de datos con Pydantic v2.

Define la estructura de entrada y salida para los endpoints de la API,
asegurando reglas de validación con mensajes amigables en español.
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator


class ProductoBase(BaseModel):
    """Atributos comunes para la creación y edición de productos."""

    nombre: str
    precio: float
    stock: int

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v: str) -> str:
        """Valida que el nombre no esté vacío y no exceda 100 caracteres."""
        if not isinstance(v, str):
            raise ValueError("El nombre debe ser una cadena de texto.")
        limpio = v.strip()
        if len(limpio) == 0:
            raise ValueError(
                "El nombre no puede estar vacío ni contener solo espacios."
            )
        if len(limpio) > 100:
            raise ValueError("El nombre no puede tener más de 100 caracteres.")
        return limpio

    @field_validator("precio")
    @classmethod
    def validar_precio(cls, v: float) -> float:
        """Valida que el precio sea estrictamente mayor a 0 y redondea a 2 decimales."""
        if v is None:
            raise ValueError("El precio es obligatorio.")
        if v <= 0:
            raise ValueError("El precio debe ser mayor que 0.")
        return round(float(v), 2)

    @field_validator("stock")
    @classmethod
    def validar_stock(cls, v: int) -> int:
        """Valida que el stock sea un entero no negativo."""
        if isinstance(v, bool) or not isinstance(v, int):
            raise ValueError("El stock debe ser un número entero válido.")
        if v < 0:
            raise ValueError("El stock no puede ser un número negativo.")
        return v


class ProductoCreate(ProductoBase):
    """Esquema para la creación de un nuevo producto (POST)."""

    pass


class ProductoUpdate(ProductoBase):
    """Esquema para la actualización completa de un producto (PUT)."""

    pass


class ProductoOut(BaseModel):
    """Esquema de respuesta al consultar uno o varios productos."""

    id: int
    nombre: str
    precio: float
    stock: int
    estado: str  # "En stock" o "Stock bajo"
    fecha_creacion: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Estadisticas(BaseModel):
    """Esquema para las métricas globales del inventario."""

    stock_total: int
    precio_promedio: float
    precio_maximo: float
    precio_minimo: float

    model_config = ConfigDict(from_attributes=True)
