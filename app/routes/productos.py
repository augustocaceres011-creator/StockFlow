"""Endpoints para la gestión de productos del inventario."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import ProductoCreate, ProductoUpdate, ProductoOut
from app.services import producto_service

router = APIRouter(prefix="/productos", tags=["Productos"])


@router.get(
    "",
    response_model=List[ProductoOut],
    summary="Listar todos los productos",
    description="Devuelve el catálogo completo de productos con su estado calculado.",
)
def listar_todos(db: Session = Depends(get_db)) -> List[ProductoOut]:
    """Obtiene la lista de todos los productos registrados."""
    return producto_service.listar_productos(db)


@router.get(
    "/{producto_id}",
    response_model=ProductoOut,
    summary="Obtener un producto por ID",
    description="Devuelve los detalles de un producto específico o 404 si no existe.",
)
def obtener_por_id(producto_id: int, db: Session = Depends(get_db)) -> ProductoOut:
    """Busca y retorna un producto según su clave primaria."""
    producto = producto_service.obtener_producto_por_id(db, producto_id)
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Producto con ID {producto_id} no encontrado.",
        )
    return producto


@router.post(
    "",
    response_model=ProductoOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un nuevo producto",
    description=(
        "Registra un producto en el inventario previa validación de sus campos."
    ),
)
def crear(datos: ProductoCreate, db: Session = Depends(get_db)) -> ProductoOut:
    """Inserta un nuevo producto y devuelve el registro persistido."""
    return producto_service.crear_producto(db, datos)


@router.put(
    "/{producto_id}",
    response_model=ProductoOut,
    summary="Actualizar un producto existente",
    description=("Actualiza nombre, precio y stock de un producto o retorna 404."),
)
def actualizar(
    producto_id: int, datos: ProductoUpdate, db: Session = Depends(get_db)
) -> ProductoOut:
    """Actualiza la información de un producto registrado."""
    producto = producto_service.actualizar_producto(db, producto_id, datos)
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Producto con ID {producto_id} no encontrado.",
        )
    return producto


@router.delete(
    "/{producto_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un producto",
    description=("Elimina un producto del inventario o retorna 404 si no existe."),
)
def eliminar(producto_id: int, db: Session = Depends(get_db)) -> None:
    """Elimina un producto del catálogo."""
    eliminado = producto_service.eliminar_producto(db, producto_id)
    if not eliminado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Producto con ID {producto_id} no encontrado.",
        )
    return None
