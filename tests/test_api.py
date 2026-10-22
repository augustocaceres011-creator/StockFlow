"""Suite de pruebas unitarias y de integración para la API de StockFlow.

Utiliza una base de datos SQLite en memoria (StaticPool) para aislar cada prueba,
sobrescribiendo la dependencia get_db de FastAPI.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app

# Base de datos SQLite en memoria exclusiva para las pruebas
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    """Sobrescribe la dependencia get_db para apuntar a la base de datos en memoria."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Aplicamos el reemplazo de la dependencia en la app de FastAPI
app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def prepare_test_db():
    """Prepara tablas limpias antes de cada prueba y las destruye al finalizar."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client():
    """Provee un cliente de pruebas HTTP usando TestClient (httpx)."""
    return TestClient(app)


# ==========================================
# PRUEBAS DEL CRUD DE PRODUCTOS
# ==========================================


def test_crear_producto_exitoso(client: TestClient):
    """Verifica que un producto válido se cree correctamente con código HTTP 201."""
    payload = {"nombre": "Café Colombiano 500g", "precio": 5.50, "stock": 25}
    response = client.post("/api/v1/productos", json=payload)
    assert response.status_code == 201

    datos = response.json()
    assert datos["id"] is not None
    assert datos["nombre"] == "Café Colombiano 500g"
    assert datos["precio"] == 5.50
    assert datos["stock"] == 25
    assert datos["estado"] == "En stock"


def test_crear_producto_con_stock_bajo(client: TestClient):
    """Verifica que el estado sea 'Stock bajo' cuando el stock sea menor a 10."""
    payload = {"nombre": "Galletas de Avena", "precio": 1.75, "stock": 4}
    response = client.post("/api/v1/productos", json=payload)
    assert response.status_code == 201

    datos = response.json()
    assert datos["estado"] == "Stock bajo"


def test_listar_productos(client: TestClient):
    """Verifica la obtención de la lista completa de productos."""
    client.post(
        "/api/v1/productos",
        json={"nombre": "Producto 1", "precio": 10.0, "stock": 15},
    )
    client.post(
        "/api/v1/productos",
        json={"nombre": "Producto 2", "precio": 20.0, "stock": 5},
    )

    response = client.get("/api/v1/productos")
    assert response.status_code == 200
    lista = response.json()
    assert len(lista) == 2
    assert lista[0]["nombre"] == "Producto 1"
    assert lista[1]["nombre"] == "Producto 2"


def test_obtener_producto_por_id_existente(client: TestClient):
    """Verifica la consulta de un producto por su ID existente."""
    creado = client.post(
        "/api/v1/productos",
        json={"nombre": "Leche Entera", "precio": 1.20, "stock": 50},
    ).json()

    producto_id = creado["id"]
    response = client.get(f"/api/v1/productos/{producto_id}")
    assert response.status_code == 200
    assert response.json()["id"] == producto_id
    assert response.json()["nombre"] == "Leche Entera"


def test_obtener_producto_por_id_no_existente(client: TestClient):
    """Verifica que un ID no existente devuelva código HTTP 404."""
    response = client.get("/api/v1/productos/99999")
    assert response.status_code == 404
    assert "no encontrado" in response.json()["detail"].lower()


def test_actualizar_producto_existente(client: TestClient):
    """Verifica la actualización de los datos de un producto (PUT)."""
    creado = client.post(
        "/api/v1/productos",
        json={"nombre": "Harina de Trigo", "precio": 1.50, "stock": 20},
    ).json()

    producto_id = creado["id"]
    update_payload = {
        "nombre": "Harina de Trigo Especial",
        "precio": 1.80,
        "stock": 8,  # Al cambiar a 8 debe pasar a 'Stock bajo'
    }
    response = client.put(f"/api/v1/productos/{producto_id}", json=update_payload)
    assert response.status_code == 200

    actualizado = response.json()
    assert actualizado["nombre"] == "Harina de Trigo Especial"
    assert actualizado["precio"] == 1.80
    assert actualizado["stock"] == 8
    assert actualizado["estado"] == "Stock bajo"


def test_actualizar_producto_no_existente(client: TestClient):
    """Verifica que actualizar un ID inexistente devuelva HTTP 404."""
    update_payload = {"nombre": "No existe", "precio": 5.0, "stock": 10}
    response = client.put("/api/v1/productos/99999", json=update_payload)
    assert response.status_code == 404


def test_eliminar_producto_existente(client: TestClient):
    """Verifica la eliminación física de un producto con HTTP 204."""
    creado = client.post(
        "/api/v1/productos",
        json={"nombre": "Jabón Líquido", "precio": 2.50, "stock": 30},
    ).json()

    producto_id = creado["id"]
    del_response = client.delete(f"/api/v1/productos/{producto_id}")
    assert del_response.status_code == 204

    # Comprobar que ya no existe
    get_response = client.get(f"/api/v1/productos/{producto_id}")
    assert get_response.status_code == 404


def test_eliminar_producto_no_existente(client: TestClient):
    """Verifica que intentar eliminar un ID inexistente devuelva HTTP 404."""
    del_response = client.delete("/api/v1/productos/99999")
    assert del_response.status_code == 404


# ==========================================
# PRUEBAS DE VALIDACIÓN (HTTP 422)
# ==========================================


def test_error_validacion_precio_negativo(client: TestClient):
    """Verifica error 422 cuando el precio es menor o igual a cero."""
    payload = {"nombre": "Cereal", "precio": -3.50, "stock": 10}
    response = client.post("/api/v1/productos", json=payload)
    assert response.status_code == 422

    # Verifica que el mensaje contenga el error en español
    cuerpo = response.json()
    assert "detail" in cuerpo
    mensajes = [str(err["mensaje"]) for err in cuerpo["detail"]]
    assert any("mayor que 0" in msg for msg in mensajes)


def test_error_validacion_precio_cero(client: TestClient):
    """Verifica error 422 cuando el precio es cero."""
    payload = {"nombre": "Cereal", "precio": 0.0, "stock": 10}
    response = client.post("/api/v1/productos", json=payload)
    assert response.status_code == 422


def test_error_validacion_nombre_vacio(client: TestClient):
    """Verifica error 422 cuando el nombre está vacío o solo contiene espacios."""
    payload = {"nombre": "   ", "precio": 2.50, "stock": 10}
    response = client.post("/api/v1/productos", json=payload)
    assert response.status_code == 422

    cuerpo = response.json()
    mensajes = [str(err["mensaje"]) for err in cuerpo["detail"]]
    assert any("no puede estar vacío" in msg for msg in mensajes)


def test_error_validacion_stock_negativo(client: TestClient):
    """Verifica error 422 cuando el stock es negativo."""
    payload = {"nombre": "Aceite de Oliva", "precio": 7.00, "stock": -5}
    response = client.post("/api/v1/productos", json=payload)
    assert response.status_code == 422

    cuerpo = response.json()
    mensajes = [str(err["mensaje"]) for err in cuerpo["detail"]]
    assert any("no puede ser un número negativo" in msg for msg in mensajes)


# ==========================================
# PRUEBAS DE ESTADÍSTICAS
# ==========================================


def test_estadisticas_sin_datos(client: TestClient):
    """Verifica que sin productos registrados las estadísticas devuelvan ceros."""
    response = client.get("/api/v1/estadisticas")
    assert response.status_code == 200

    stats = response.json()
    assert stats["stock_total"] == 0
    assert stats["precio_promedio"] == 0.0
    assert stats["precio_maximo"] == 0.0
    assert stats["precio_minimo"] == 0.0


def test_estadisticas_con_datos(client: TestClient):
    """Verifica el cálculo de estadísticas con un conjunto conocido de productos."""
    # Producto 1: precio 10.0, stock 5
    client.post(
        "/api/v1/productos",
        json={"nombre": "Prod A", "precio": 10.0, "stock": 5},
    )
    # Producto 2: precio 20.0, stock 15
    client.post(
        "/api/v1/productos",
        json={"nombre": "Prod B", "precio": 20.0, "stock": 15},
    )
    # Producto 3: precio 30.0, stock 30
    client.post(
        "/api/v1/productos",
        json={"nombre": "Prod C", "precio": 30.0, "stock": 30},
    )

    response = client.get("/api/v1/estadisticas")
    assert response.status_code == 200

    stats = response.json()
    # Total stock: 5 + 15 + 30 = 50
    assert stats["stock_total"] == 50
    # Promedio precio: (10 + 20 + 30) / 3 = 20.0
    assert stats["precio_promedio"] == 20.0
    # Máximo: 30.0
    assert stats["precio_maximo"] == 30.0
    # Mínimo: 10.0
    assert stats["precio_minimo"] == 10.0


# ==========================================
# PRUEBAS DEL SISTEMA Y DIAGNÓSTICO
# ==========================================


def test_diagnostico_sistema(client: TestClient):
    """Verifica que el endpoint de diagnóstico devuelva métricas de salud técnica válidas."""
    client.post(
        "/api/v1/productos",
        json={"nombre": "Item Diagnostico", "precio": 15.5, "stock": 10},
    )

    response = client.get("/api/v1/sistema/diagnostico")
    assert response.status_code == 200

    data = response.json()
    assert data["estado"] == "operativo"
    assert data["base_datos"] == "conectada"
    assert data["total_productos"] == 1
    assert "latencia_db_ms" in data
    assert data["latencia_db_ms"] >= 0
    assert "timestamp" in data
