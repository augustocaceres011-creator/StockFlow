# StockFlow 📦

**StockFlow** es un sistema web y API REST para la gestión de inventario, diseñado con una arquitectura modular y limpia siguiendo los principios **SOLID** (en particular, el principio de **Responsabilidad Única**). Este proyecto fue concebido con fines académicos para la asignatura de **Desarrollo de Software (primer año)**, priorizando código legible, documentado en español y fácil de defender en una presentación técnica.

---

## 🌟 Características Principales

- **Arquitectura en capas (Separation of Concerns)**:
  - `routes/`: Controladores HTTP livianos que gestionan peticiones y respuestas.
  - `services/`: Lógica de negocio pura (cálculo de estado del stock, validaciones financieras, métricas globales).
  - `models.py`: Entidades relacionales con SQLAlchemy 2.x.
  - `schemas.py`: Contratos de datos, serialización y validaciones de negocio con Pydantic v2.
  - `database.py`: Gestión de conexión y sesiones inyectables (`Depends`).
- **Validaciones robustas con mensajes en español**: Reglas estrictas para nombres limpios, precios positivos con 2 decimales y control de inventario.
- **Detección automática de Stock Bajo**: Todo producto con stock menor a 10 unidades es catalogado dinámicamente como `"Stock bajo"`.
- **Carga inicial de datos (Seeding)**: Al arrancar la aplicación por primera vez, si la tabla está vacía, se cargan automáticamente 5 productos de prueba.
- **Frontend SPA moderno**: Desarrollado en **HTML, CSS y JavaScript nativo (Vanilla)**, responsivo (adaptable a celulares < 700px), accesible (atributos `aria-*` y botones ≥ 44px) y con micro-interacciones sin recarga de página.
- **Documentación interactiva**: Swagger UI disponible de fábrica en `/docs`.

---

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
| :--- | :--- |
| **Lenguaje** | Python 3.11 |
| **Framework Web** | FastAPI 0.111 |
| **Servidor ASGI** | Uvicorn |
| **Validación / Schemas** | Pydantic v2 & Pydantic-Settings |
| **ORM / Persistencia** | SQLAlchemy 2.x con SQLite local (`stockflow.db`) |
| **Gestor de Paquetes** | Poetry 1.8+ |
| **Testing** | Pytest 8.x + HTTPX (con SQLite en memoria) |
| **Linters y Formato** | Black y Flake8 |
| **Frontend** | HTML5 semántico, CSS3 moderno (Design Tokens), Vanilla JS (Fetch API) |
| **Contenerización** | Docker (Multi-stage build con usuario no-root) y Docker Compose |
| **CI/CD** | GitHub Actions (`.github/workflows/ci.yml`) |

---

## 📁 Estructura del Proyecto

```text
stockflow/
├── app/
│   ├── __init__.py
│   ├── main.py            # Instancia FastAPI, middlewares, lifespan y montaje estático
│   ├── config.py          # Settings tipadas con pydantic-settings (.env)
│   ├── database.py        # Engine SQLite, SessionLocal y generador get_db
│   ├── models.py          # Modelo ORM Producto (SQLAlchemy)
│   ├── schemas.py         # Modelos de validación ProductoCreate, Update, Out y Estadísticas
│   ├── routes/            # Endpoints HTTP (desacoplados de la lógica de negocio)
│   │   ├── __init__.py
│   │   ├── productos.py   # CRUD de productos
│   │   └── estadisticas.py# Métricas cuantitativas
│   └── services/          # Capa de dominio y reglas de negocio
│       ├── __init__.py
│       └── producto_service.py
├── static/                # Frontend SPA servido directamente por FastAPI
│   ├── index.html         # Estructura semántica accesible
│   ├── styles.css         # Estilos puros, variables de color y diseño responsivo
│   └── app.js             # Lógica cliente con Fetch API y refresco reactivo
├── tests/                 # Suite de pruebas automatizadas
│   ├── __init__.py
│   └── test_api.py        # Pruebas de integración y validaciones con base en memoria
├── .github/
│   └── workflows/
│       └── ci.yml         # Pipeline de Integración Continua (Linting + Tests + Docker)
├── Dockerfile             # Multi-stage build liviano con usuario no-root
├── docker-compose.yml     # Orquestación local con persistencia por volúmenes
├── .env.example           # Plantilla de variables de entorno
├── .gitignore             # Exclusión de .env, bases de datos y temporales
├── .flake8                # Configuración de linter (88 caracteres)
├── pyproject.toml         # Manifiesto de dependencias Poetry
├── poetry.lock            # Bloqueo determinista de dependencias
└── README.md              # Documentación técnica completa
```

---

## ⚙️ Configuración y Variables de Entorno

La aplicación requiere la presencia de las siguientes variables de entorno para inicializar (definidas en `app/config.py`):

1. Copiá el archivo de plantilla `.env.example` a un archivo `.env`:
   ```bash
   cp .env.example .env
   ```
2. El archivo `.env` debe contener los siguientes valores:
   ```env
   DATABASE_URL=sqlite:///./stockflow.db
   PORT=8000
   APP_NAME=StockFlow
   CORS_ORIGINS=http://localhost:8000,http://127.0.0.1:8000,*
   ```

> **Nota de Seguridad**: El archivo `.env` y la base de datos `stockflow.db` están excluidos explícitamente en `.gitignore` para no exponer secretos ni datos locales.

---

## 🚀 Guía de Instalación y Ejecución Local

### 1. Requisitos Previos
- Python 3.11 instalado.
- Poetry instalado (`pip install poetry` o mediante instalador oficial).

### 2. Instalación de dependencias
En la raíz del proyecto, ejecutá:
```bash
poetry install
```

### 3. Ejecutar la aplicación
Iniciá el servidor de desarrollo con recarga en caliente:
```bash
poetry run uvicorn app.main:app --reload --port 8000
```

- **Interfaz Web**: Abrí en tu navegador [http://localhost:8000](http://localhost:8000)
- **Documentación Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Documentación ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🧪 Pruebas Automatizadas y Calidad de Código

### Ejecutar las pruebas con Pytest
Las pruebas utilizan una base de datos SQLite en memoria (`sqlite:///:memory:`) con `StaticPool`, garantizando un entorno aislado y rápido para cada prueba:
```bash
poetry run pytest -v
```

### Comprobación de formato (Black)
```bash
poetry run black --check app tests
```
*(Para aplicar formato automático ejecutá `poetry run black app tests`)*

### Análisis estático de código (Flake8)
```bash
poetry run flake8 app tests
```

---

## 🐳 Despliegue con Docker y Docker Compose

### Uso con Docker Compose (Recomendado)
Para compilar y levantar la aplicación con volumen persistente para la base de datos:
```bash
docker compose up --build
```
Para detener el contenedor:
```bash
docker compose down
```

### Compilar y correr con Docker directamente
1. Construir la imagen:
   ```bash
   docker build -t stockflow:latest .
   ```
2. Ejecutar el contenedor:
   ```bash
   docker run -d -p 8000:8000 --env-file .env --name stockflow-container stockflow:latest
   ```

---

## 📡 Tabla de Endpoints de la API (/api/v1)

| Método | Endpoint | Código Éxito | Códigos Error | Descripción |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/v1/productos` | `200 OK` | `500` | Devuelve el catálogo completo con el campo calculado `estado` ("En stock" o "Stock bajo"). |
| `GET` | `/api/v1/productos/{id}` | `200 OK` | `404`, `422` | Obtiene un producto por su clave primaria. |
| `POST` | `/api/v1/productos` | `201 Created` | `422` | Crea un producto validando que nombre no esté vacío, precio > 0 y stock ≥ 0. |
| `PUT` | `/api/v1/productos/{id}` | `200 OK` | `404`, `422` | Actualiza nombre, precio y stock de un producto existente. |
| `DELETE` | `/api/v1/productos/{id}` | `204 No Content`| `404`, `422` | Elimina permanentemente el producto especificado. |
| `GET` | `/api/v1/estadisticas` | `200 OK` | `500` | Calcula y devuelve `stock_total`, `precio_promedio`, `precio_maximo` y `precio_minimo` (o ceros si está vacío). |

---

## 💻 Interfaz Web y Experiencia de Usuario

- **Dashboard de 4 Métricas**: Muestra en tiempo real Stock total, Precio promedio, Precio máximo y Precio mínimo.
- **Tabla con Avatares Dinámicos**: Cuadros con colores armónicos e iniciales según el nombre del producto.
- **Insignias de Estado**: Verde para `"En stock"` y naranja suave para `"Stock bajo"` (cuando el stock es < 10).
- **Modales Accesibles**:
  - Formulario de creación y edición con validación en línea de cada campo bajo error de API.
  - Confirmación explícita con nombre del producto antes de proceder a la eliminación.
- **Modo Responsive (< 700px)**:
  - Oculta la barra lateral para maximizar el espacio útil en pantalla.
  - Convierte las filas de la tabla en tarjetas verticales independientes.
  - Incorpora una barra inferior con botón ancho de "+ Nuevo producto".
- **Notificaciones Toast**: Mensajes flotantes de confirmación para cada operación exitosa o aviso de error de red.

---

## 👥 Proyecto Académico
- **Asignatura**: Desarrollo de Software - Primer Año
- **Proyecto**: StockFlow - Sistema de Gestión de Inventario
