"""Definición del modelo de datos de SQLAlchemy para StockFlow."""

from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Producto(Base):
    """Modelo ORM que representa un producto dentro de la tabla 'productos'."""

    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(100), nullable=False, index=True)
    precio = Column(Float, nullable=False)
    stock = Column(Integer, nullable=False)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return f"<Producto(id={self.id}, nombre='{self.nombre}', stock={self.stock})>"
