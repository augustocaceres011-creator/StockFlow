"""Capa de lógica de negocio para la gestión de productos e inventario.

Cumple con el principio de Responsabilidad Única (SRP): centraliza todas
las operaciones sobre el catálogo y el cálculo de métricas financieras
y de existencias, aislando las rutas HTTP de la lógica de acceso a datos.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Producto
from app.schemas import ProductoCreate, ProductoUpdate


def determinar_estado(stock: int) -> str:
    """Calcula el estado del producto en base al umbral de inventario.

    Regla de negocio:
    - Menor a 10 unidades: "Stock bajo"
    - 10 unidades o más: "En stock"
    """
    return "Stock bajo" if stock < 10 else "En stock"


def formatear_producto(producto: Producto) -> Dict[str, Any]:
    """Convierte una entidad Producto en un diccionario con el estado calculado."""
    return {
        "id": producto.id,
        "nombre": producto.nombre,
        "precio": producto.precio,
        "stock": producto.stock,
        "estado": determinar_estado(producto.stock),
        "fecha_creacion": producto.fecha_creacion,
    }


def listar_productos(db: Session) -> List[Dict[str, Any]]:
    """Obtiene la lista completa de productos ordenados por su identificador."""
    productos = db.query(Producto).order_by(Producto.id.asc()).all()
    return [formatear_producto(p) for p in productos]


def obtener_producto_por_id(db: Session, producto_id: int) -> Optional[Dict[str, Any]]:
    """Busca un producto por su clave primaria ID."""
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        return None
    return formatear_producto(producto)


def crear_producto(db: Session, datos: ProductoCreate) -> Dict[str, Any]:
    """Crea y persiste un nuevo producto en la base de datos."""
    nuevo_producto = Producto(
        nombre=datos.nombre,
        precio=datos.precio,
        stock=datos.stock,
    )
    db.add(nuevo_producto)
    db.commit()
    db.refresh(nuevo_producto)
    return formatear_producto(nuevo_producto)


def actualizar_producto(
    db: Session, producto_id: int, datos: ProductoUpdate
) -> Optional[Dict[str, Any]]:
    """Actualiza los datos de un producto existente."""
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        return None

    producto.nombre = datos.nombre
    producto.precio = datos.precio
    producto.stock = datos.stock

    db.commit()
    db.refresh(producto)
    return formatear_producto(producto)


def eliminar_producto(db: Session, producto_id: int) -> bool:
    """Elimina un producto por su ID. Retorna True si se eliminó, False si no existe."""
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        return False

    db.delete(producto)
    db.commit()
    return True


def obtener_estadisticas(db: Session) -> Dict[str, Any]:
    """Calcula estadísticas generales del inventario.

    Si no hay productos registrados, retorna todos los valores en 0.
    """
    total_registros = db.query(Producto).count()
    if total_registros == 0:
        return {
            "stock_total": 0,
            "precio_promedio": 0.0,
            "precio_maximo": 0.0,
            "precio_minimo": 0.0,
        }

    # Suma total de unidades en stock
    stock_total = db.query(func.coalesce(func.sum(Producto.stock), 0)).scalar() or 0

    # Métricas de precios
    precio_promedio = (
        db.query(func.coalesce(func.avg(Producto.precio), 0.0)).scalar() or 0.0
    )
    precio_maximo = (
        db.query(func.coalesce(func.max(Producto.precio), 0.0)).scalar() or 0.0
    )
    precio_minimo = (
        db.query(func.coalesce(func.min(Producto.precio), 0.0)).scalar() or 0.0
    )

    return {
        "stock_total": int(stock_total),
        "precio_promedio": round(float(precio_promedio), 2),
        "precio_maximo": round(float(precio_maximo), 2),
        "precio_minimo": round(float(precio_minimo), 2),
    }


def sembrar_datos_iniciales(db: Session) -> None:
    """Inserta 5 productos de ejemplo en caso de que la tabla esté vacía."""
    total_existente = db.query(Producto).count()
    if total_existente == 0:
        productos_semilla = [
            Producto(nombre="Arroz 1 kg", precio=1.25, stock=120),
            Producto(nombre="Aceite 900 ml", precio=3.40, stock=8),
            Producto(nombre="Frijoles 1 lb", precio=0.95, stock=64),
            Producto(nombre="Leche 1 L", precio=1.10, stock=36),
            Producto(nombre="Azúcar 2 lb", precio=1.60, stock=5),
        ]
        db.add_all(productos_semilla)
        db.commit()
