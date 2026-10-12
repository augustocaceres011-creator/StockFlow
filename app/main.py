"""Punto de entrada principal de la aplicación FastAPI StockFlow.

Configura el ciclo de vida (lifespan), middlewares de CORS, manejo centralizado
de excepciones de validación, montaje de rutas bajo el prefijo /api/v1 y
servicio de archivos estáticos del frontend.
"""

from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.routes import productos, estadisticas
from app.services import producto_service


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Gestiona el ciclo de vida de la aplicación.

    Al iniciar:
    1. Crea automáticamente las tablas si no existen.
    2. Si la tabla 'productos' está vacía, siembra 5 productos iniciales.
    """
    # 1. Creación de tablas en SQLite
    Base.metadata.create_all(bind=engine)

    # 2. Carga inicial de datos de demostración
    db = SessionLocal()
    try:
        producto_service.sembrar_datos_iniciales(db)
    finally:
        db.close()

    yield
    # Lógica de cierre o limpieza si fuera requerida


# Inicialización de la aplicación FastAPI
app = FastAPI(
    title=settings.APP_NAME,
    description="API REST para la gestión de inventario y catálogo de productos.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configuración de políticas CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Traduce los errores de validación de Pydantic a un formato claro en español.

    Devuelve un código HTTP 422 con una lista amigable de errores por campo.
    """
    errores = []
    for error in exc.errors():
        # Extrae el nombre del campo que causó el error
        campo = error["loc"][-1] if error.get("loc") else "general"
        mensaje = error.get("msg", "Valor inválido")

        # Limpia prefijos automáticos de Pydantic si existen
        if mensaje.startswith("Value error, "):
            mensaje = mensaje.replace("Value error, ", "")

        errores.append({"campo": str(campo), "mensaje": mensaje})

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": errores,
            "mensaje": "Error de validación en los datos enviados.",
        },
    )


# Registro de routers bajo el prefijo /api/v1
app.include_router(productos.router, prefix="/api/v1")
app.include_router(estadisticas.router, prefix="/api/v1")

# Ruta absoluta al directorio de archivos estáticos
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


# Servir página principal del frontend
@app.get("/", include_in_schema=False)
async def serve_index() -> FileResponse:
    """Devuelve la página principal del frontend index.html."""
    index_path = STATIC_DIR / "index.html"
    return FileResponse(index_path)


# Montaje de archivos estáticos (CSS, JS, iconos)
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
