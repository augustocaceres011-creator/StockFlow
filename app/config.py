"""Módulo de configuración centralizada de StockFlow.

Utiliza pydantic-settings para cargar y validar las variables de entorno
definidas en el archivo .env o en el entorno del sistema operativo.
"""

from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración tipada de la aplicación.

    Si alguna variable crítica no se encuentra definida, Pydantic lanzará
    un error impidiendo que la aplicación inicie en un estado inválido.
    """

    # URL de conexión a la base de datos (ej. sqlite:///./stockflow.db)
    DATABASE_URL: str

    # Puerto en el que se ejecuta el servidor Uvicorn (por defecto 8000)
    PORT: int = 8000

    # Nombre descriptivo de la aplicación
    APP_NAME: str

    # Orígenes permitidos para CORS (soporta lista o texto separado por comas)
    CORS_ORIGINS: Union[List[str], str]

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def procesar_cors_origins(cls, v: Union[List[str], str]) -> List[str]:
        """Convierte una cadena separada por comas en una lista de orígenes."""
        if isinstance(v, str):
            if v.strip() == "*":
                return ["*"]
            return [origen.strip() for origen in v.split(",") if origen.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


# Instancia singleton para acceder a las configuraciones en toda la app
settings = Settings()
