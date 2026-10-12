"""Configuración de la base de datos con SQLAlchemy 2.x.

Este módulo inicializa el motor (engine), la fábrica de sesiones (SessionLocal),
la clase base declarativa (Base) y la función generadora get_db para la
inyección de dependencias en los endpoints de FastAPI.
"""

from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import settings

# Para SQLite necesitamos permitir el acceso concurrente desde distintos hilos
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Motor de conexión a la base de datos
engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,
)

# Fábrica de sesiones para interactuar con la base de datos
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Clase base de la que heredarán nuestros modelos ORM
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Generador de sesiones para inyección de dependencias (Depends).

    Abre una sesión de base de datos para la petición actual y garantiza
    su cierre al finalizar, liberando los recursos de conexión.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
