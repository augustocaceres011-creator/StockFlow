/**
 * ============================================================================
 * STOCKFLOW ENTERPRISE - SAAS FRONTEND CONTROLLER
 * ============================================================================
 * Arquitectura modular en JavaScript Puro (Vanilla JS).
 * - Navegación SPA reactiva entre módulos (Dashboard, Inventario, Movimientos, etc.)
 * - Analítica y visualizaciones interactivas SVG en tiempo real
 * - Búsqueda instantánea, filtros segmentados, ordenamiento y paginación
 * - Operaciones CRUD completas comunicadas con la API REST de FastAPI
 * - Registro y auditoría de entradas y salidas de mercancía
 * - Previsualización dinámica de producto y validaciones con mensajes amigables
 * - Notificaciones flotantes tipo Toast y modales accesibles
 */

document.addEventListener('DOMContentLoaded', () => {
  // Configuración base de la API REST
  const API_BASE = '/api/v1';

  // ==========================================================================
  // ESTADO GLOBAL DE LA APLICACIÓN
  // ==========================================================================
  let productosCache = [];
  let productoEnEdicion = null;
  let productoAEliminar = null;
  let vistaActual = 'dashboard';

  // Configuración de tabla (Filtro, orden y paginación)
  let filtroEstadoActual = 'todos'; // 'todos' | 'en-stock' | 'stock-bajo' | 'agotados'
  let ordenActual = 'id-asc';
  let paginaActual = 1;
  let elementosPorPagina = 10;

  // Bitácora de movimientos (Persistida en localStorage durante la sesión)
  let movimientosCache = [];
  try {
    const rawMov = localStorage.getItem('stockflow_movimientos');
    if (rawMov) movimientosCache = JSON.parse(rawMov);
  } catch (e) {
    movimientosCache = [];
  }

  // Paleta de colores para avatares de productos (Dark Premium: Turquesa, Azul Eléctrico y tonos suaves)
  const PALETA_AVATARES = [
    { bg: 'rgba(20, 184, 166, 0.16)', color: '#2DD4BF' }, // Turquesa
    { bg: 'rgba(99, 102, 241, 0.16)', color: '#A5B4FC' }, // Azul eléctrico
    { bg: 'rgba(16, 185, 129, 0.16)', color: '#6EE7B7' }, // Esmeralda suave
    { bg: 'rgba(245, 158, 11, 0.16)', color: '#FDE68A' }, // Ámbar suave
    { bg: 'rgba(139, 92, 246, 0.16)', color: '#C4B5FD' }, // Violeta
    { bg: 'rgba(6, 182, 212, 0.16)', color: '#67E8F9' },  // Cian
    { bg: 'rgba(239, 68, 68, 0.16)', color: '#FCA5A5' },  // Rojo suave
    { bg: 'rgba(59, 130, 246, 0.16)', color: '#93C5FD' }, // Azul zafiro
  ];

  // ==========================================================================
  // ELEMENTOS DEL DOM
  // ==========================================================================
  
  // Vistas SPA y Navegación
  const spaViews = document.querySelectorAll('.spa-view');
  const navLinks = document.querySelectorAll('.sidebar-nav .nav-link[data-section]');
  const breadcrumbCurrent = document.getElementById('header-breadcrumb-current');
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
  const btnMobileMenu = document.getElementById('btn-mobile-menu');

  // Topbar y Búsqueda Global
  const globalSearchInput = document.getElementById('global-search-input');
  const statValorTotalHeader = document.getElementById('stat-valor-total-header');
  const btnNotifications = document.getElementById('btn-notifications');
  const notificationsPopover = document.getElementById('notifications-popover');
  const notificationBadgeCount = document.getElementById('notification-badge-count');
  const popoverAlertCount = document.getElementById('popover-alert-count');
  const notificationsList = document.getElementById('notifications-list');

  // Perfil de Usuario Superior (Dark Premium SaaS)
  const userProfileWrapper = document.getElementById('user-profile-wrapper');
  const btnUserProfile = document.getElementById('btn-user-profile');
  const userDropdownMenu = document.getElementById('user-dropdown-menu');
  const menuItemProfile = document.getElementById('menu-item-profile');
  const menuItemSettings = document.getElementById('menu-item-settings');
  const menuItemLogout = document.getElementById('menu-item-logout');

  // Tarjetas de Métricas (Dashboard)
  const statStockTotal = document.getElementById('stat-stock-total');
  const statValorTotal = document.getElementById('stat-valor-total');
  const statPrecioPromedio = document.getElementById('stat-precio-promedio');
  const statPrecioMaximo = document.getElementById('stat-precio-maximo');
  const statPrecioMinimo = document.getElementById('stat-precio-minimo');
  const statAlertasTotal = document.getElementById('stat-alertas-total');
  const navProductCounter = document.getElementById('nav-product-counter');

  // Gráficos y Widgets del Dashboard
  const donutSegStock = document.getElementById('donut-seg-stock');
  const donutSegLow = document.getElementById('donut-seg-low');
  const donutSegOut = document.getElementById('donut-seg-out');
  const donutPercentageVal = document.getElementById('donut-percentage-val');
  const legendStockCount = document.getElementById('legend-stock-count');
  const legendLowCount = document.getElementById('legend-low-count');
  const legendOutCount = document.getElementById('legend-out-count');
  const badgeTotalItemsDonut = document.getElementById('badge-total-items-donut');
  const topProductsBarChart = document.getElementById('top-products-bar-chart');
  const criticalItemsList = document.getElementById('critical-items-list');
  const recentActivityTimeline = document.getElementById('recent-activity-timeline');

  // Catálogo de Productos y Tabla
  const tablaBody = document.getElementById('tabla-productos-body');
  const cardsContainer = document.getElementById('cards-container');
  const productCountBadge = document.getElementById('product-count-badge');
  const filtroBusqueda = document.getElementById('filtro-busqueda');
  const btnClearSearch = document.getElementById('btn-clear-search');
  const selectOrdenar = document.getElementById('select-ordenar');
  const selectPageSize = document.getElementById('select-page-size');
  const filterPills = document.querySelectorAll('.filter-pill');
  const pillCountTodos = document.getElementById('pill-count-todos');
  const pillCountEnStock = document.getElementById('pill-count-en-stock');
  const pillCountStockBajo = document.getElementById('pill-count-stock-bajo');
  const pillCountAgotados = document.getElementById('pill-count-agotados');
  const resultsRangeText = document.getElementById('results-range-text');
  const paginationButtons = document.getElementById('pagination-buttons');
  const currentPageNum = document.getElementById('current-page-num');
  const totalPagesNum = document.getElementById('total-pages-num');
  const btnRecargar = document.getElementById('btn-recargar');
  const btnRefreshDashboard = document.getElementById('btn-refresh-dashboard');
  const btnExportCsv = document.getElementById('btn-export-csv');

  // Estados Visuales (Carga, Vacío, Error)
  const loadingState = document.getElementById('loading-state');
  const emptyState = document.getElementById('empty-state');
  const errorBanner = document.getElementById('error-banner');
  const errorBannerMsg = document.getElementById('error-banner-msg');
  const btnReintentar = document.getElementById('btn-reintentar');

  // Modal Producto (Creación / Edición)
  const modalProducto = document.getElementById('modal-producto');
  const formProducto = document.getElementById('form-producto');
  const modalTitulo = document.getElementById('modal-titulo');
  const btnAbrirCrear = document.getElementById('btn-abrir-crear');
  const btnAbrirCrearCatalog = document.getElementById('btn-abrir-crear-catalog');
  const btnAbrirCrearMobile = document.getElementById('btn-abrir-crear-mobile');
  const btnEmptyCrear = document.getElementById('btn-empty-crear');
  const btnCerrarModal = document.getElementById('btn-cerrar-modal');
  const btnCancelarModal = document.getElementById('btn-cancelar-modal');
  const btnGuardarTexto = document.getElementById('btn-guardar-texto');
  const guardarSpinner = document.getElementById('guardar-spinner');
  const modalErrorGeneral = document.getElementById('modal-error-general');

  // Campos de Formulario de Producto
  const campoId = document.getElementById('producto-id');
  const campoNombre = document.getElementById('campo-nombre');
  const campoPrecio = document.getElementById('campo-precio');
  const campoStock = document.getElementById('campo-stock');
  const errorNombre = document.getElementById('error-nombre');
  const errorPrecio = document.getElementById('error-precio');
  const errorStock = document.getElementById('error-stock');
  const charCountNombre = document.getElementById('char-count-nombre');

  // Previsualización Dinámica en Modal
  const previewProductName = document.getElementById('preview-product-name');
  const previewProductPrice = document.getElementById('preview-product-price');
  const previewProductStock = document.getElementById('preview-product-stock');
  const previewProductTotal = document.getElementById('preview-product-total');
  const previewBadgeStatus = document.getElementById('preview-badge-status');
  const previewBadgeText = document.getElementById('preview-badge-text');

  // Modal Ajuste Rápido de Stock (Entradas y Salidas)
  const modalAjusteStock = document.getElementById('modal-ajuste-stock');
  const formAjusteStock = document.getElementById('form-ajuste-stock');
  const ajusteSelectProducto = document.getElementById('ajuste-select-producto');
  const ajusteCantidad = document.getElementById('ajuste-cantidad');
  const ajusteMotivo = document.getElementById('ajuste-motivo');
  const ajusteStockActual = document.getElementById('ajuste-stock-actual');
  const ajusteStockNuevo = document.getElementById('ajuste-stock-nuevo');
  const modalAjusteError = document.getElementById('modal-ajuste-error');
  const ajusteSpinner = document.getElementById('ajuste-spinner');
  const btnCerrarAjuste = document.getElementById('btn-cerrar-ajuste');
  const btnCancelarAjuste = document.getElementById('btn-cancelar-ajuste');
  const btnAbrirAjusteStock = document.getElementById('btn-abrir-ajuste-stock');
  const btnQuickAdjustHero = document.getElementById('btn-quick-adjust-hero');
  const labelTipoIn = document.getElementById('label-tipo-in');
  const labelTipoOut = document.getElementById('label-tipo-out');

  // Modal Confirmación Eliminar
  const modalEliminar = document.getElementById('modal-eliminar');
  const btnCerrarEliminar = document.getElementById('btn-cerrar-eliminar');
  const btnCancelarEliminar = document.getElementById('btn-cancelar-eliminar');
  const btnConfirmarEliminar = document.getElementById('btn-confirmar-eliminar');
  const nombreProductoEliminar = document.getElementById('nombre-producto-eliminar');
  const eliminarSpinner = document.getElementById('eliminar-spinner');

  // Movimientos & Reportes
  const tablaMovimientosBody = document.getElementById('tabla-movimientos-body');
  const emptyMovementsState = document.getElementById('empty-movements-state');
  const movementsTotalIn = document.getElementById('movements-total-in');
  const movementsTotalOut = document.getElementById('movements-total-out');
  const movementsTotalOps = document.getElementById('movements-total-ops');
  const btnLimpiarHistorialMov = document.getElementById('btn-limpiar-historial-mov');
  const tablaReportesBody = document.getElementById('tabla-reportes-body');
  const reportTotalInvested = document.getElementById('report-total-invested');
  const reportTopItemName = document.getElementById('report-top-item-name');
  const reportTopItemVal = document.getElementById('report-top-item-val');
  const reportAvailabilityRate = document.getElementById('report-availability-rate');
  const btnExportReportsJson = document.getElementById('btn-export-reports-json');
  const btnPrintReport = document.getElementById('btn-print-report');

  // Contenedor Toast
  const toastContainer = document.getElementById('toast-container');

  // ==========================================================================
  // FUNCIONES AUXILIARES Y FORMATO
  // ==========================================================================

  function formatearMoneda(valor) {
    const num = Number(valor) || 0;
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function escaparHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function obtenerEstiloAvatar(nombre) {
    let hash = 0;
    const clean = (nombre || 'P').trim();
    for (let i = 0; i < clean.length; i++) {
      hash = clean.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % PALETA_AVATARES.length;
    const estilo = PALETA_AVATARES[index];
    const iniciales = clean.substring(0, 2).toUpperCase();
    return { estilo, iniciales };
  }

  function mostrarToast(mensaje, tipo = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.setAttribute('role', 'status');

    const iconoSvg = tipo === 'success'
      ? `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`
      : `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

    toast.innerHTML = `
      ${iconoSvg}
      <span>${escaparHTML(mensaje)}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 250);
    }, 3800);
  }

  // ==========================================================================
  // BITÁCORA DE AUDITORÍA Y ACTIVIDAD RECIENTE
  // ==========================================================================

  function registrarMovimiento(productoId, productoNombre, tipo, cantidad, stockAnterior, stockNuevo, motivo) {
    const nuevoMovimiento = {
      id: Date.now(),
      fecha: new Date().toISOString(),
      productoId,
      productoNombre,
      tipo, // 'entrada' | 'salida' | 'creacion' | 'edicion' | 'eliminacion'
      cantidad,
      stockAnterior,
      stockNuevo,
      motivo: motivo || (tipo === 'entrada' ? 'Reabastecimiento de existencias' : 'Despacho de inventario')
    };

    movimientosCache.unshift(nuevoMovimiento);
    if (movimientosCache.length > 100) movimientosCache.pop();

    try {
      localStorage.setItem('stockflow_movimientos', JSON.stringify(movimientosCache));
    } catch (e) {
      console.warn('No se pudo persistir en localStorage:', e);
    }

    renderizarMovimientos();
    renderizarActividadReciente();
  }

  function renderizarActividadReciente() {
    if (!recentActivityTimeline) return;
    recentActivityTimeline.innerHTML = '';

    const recientes = movimientosCache.slice(0, 5);
    if (recientes.length === 0) {
      recentActivityTimeline.innerHTML = `
        <div style="padding: 1.25rem; text-align: center; color: var(--slate-400); font-size: 0.85rem;">
          No hay movimientos recientes registrados aún.
        </div>
      `;
      return;
    }

    recientes.forEach(mov => {
      const fechaObj = new Date(mov.fecha);
      const horaStr = fechaObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      
      let icono = '⚡';
      let bgClass = 'background: #EEF2FF; color: #4F46E5;';
      let accionStr = '';

      if (mov.tipo === 'entrada') {
        icono = '+';
        bgClass = 'background: #ECFDF5; color: #059669;';
        accionStr = `Entrada de <strong>+${mov.cantidad} u.</strong> en ${escaparHTML(mov.productoNombre)}`;
      } else if (mov.tipo === 'salida') {
        icono = '-';
        bgClass = 'background: #FEF2F2; color: #DC2626;';
        accionStr = `Salida de <strong>-${mov.cantidad} u.</strong> en ${escaparHTML(mov.productoNombre)}`;
      } else if (mov.tipo === 'creacion') {
        icono = '★';
        bgClass = 'background: #F0FDF4; color: #16A34A;';
        accionStr = `Nuevo producto creado: <strong>${escaparHTML(mov.productoNombre)}</strong>`;
      } else if (mov.tipo === 'eliminacion') {
        icono = '✕';
        bgClass = 'background: #FFF1F2; color: #E11D48;';
        accionStr = `Producto eliminado: <strong>${escaparHTML(mov.productoNombre)}</strong>`;
      } else {
        accionStr = `Actualización de <strong>${escaparHTML(mov.productoNombre)}</strong>`;
      }

      const item = document.createElement('div');
      item.className = 'timeline-entry';
      item.innerHTML = `
        <div class="timeline-icon-box" style="${bgClass}">${icono}</div>
        <div class="timeline-details">
          <span class="timeline-title">${accionStr}</span>
          <span class="timeline-time">${horaStr} • ${escaparHTML(mov.motivo)}</span>
        </div>
      `;
      recentActivityTimeline.appendChild(item);
    });
  }

  function renderizarMovimientos() {
    if (!tablaMovimientosBody) return;
    tablaMovimientosBody.innerHTML = '';

    let totalIn = 0;
    let totalOut = 0;

    movimientosCache.forEach(m => {
      if (m.tipo === 'entrada') totalIn += m.cantidad;
      if (m.tipo === 'salida') totalOut += m.cantidad;
    });

    if (movementsTotalIn) movementsTotalIn.textContent = `+${totalIn} u.`;
    if (movementsTotalOut) movementsTotalOut.textContent = `-${totalOut} u.`;
    if (movementsTotalOps) movementsTotalOps.textContent = String(movimientosCache.length);

    if (movimientosCache.length === 0) {
      if (emptyMovementsState) emptyMovementsState.style.display = 'flex';
      return;
    }
    if (emptyMovementsState) emptyMovementsState.style.display = 'none';

    movimientosCache.forEach(m => {
      const fechaObj = new Date(m.fecha);
      const fechaFormateada = `${fechaObj.toLocaleDateString('es-ES')} ${fechaObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
      
      const esEntrada = m.tipo === 'entrada';
      const badgeTipo = esEntrada 
        ? `<span class="badge badge-stock">+ Entrada</span>`
        : m.tipo === 'salida'
          ? `<span class="badge badge-out">- Salida</span>`
          : `<span class="badge" style="background: #EEF2FF; color: #4F46E5;">${m.tipo}</span>`;

      const cantStr = esEntrada ? `+${m.cantidad} u.` : m.tipo === 'salida' ? `-${m.cantidad} u.` : `${m.cantidad || 0} u.`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--slate-500);">${fechaFormateada}</span></td>
        <td><strong>${escaparHTML(m.productoNombre)}</strong></td>
        <td>${badgeTipo}</td>
        <td><strong class="${esEntrada ? 'text-emerald' : 'text-rose'}">${cantStr}</strong></td>
        <td>${m.stockNuevo !== undefined ? `${m.stockNuevo} u.` : '-'}</td>
        <td><span style="color: var(--slate-500); font-size: 0.84rem;">${escaparHTML(m.motivo)}</span></td>
      `;
      tablaMovimientosBody.appendChild(tr);
    });
  }

  // ==========================================================================
  // NAVEGACIÓN SPA ENTRE SECCIONES
  // ==========================================================================

  function cambiarVista(seccion) {
    vistaActual = seccion;

    spaViews.forEach(v => {
      if (v.id === `view-${seccion}`) {
        v.classList.add('active');
      } else {
        v.classList.remove('active');
      }
    });

    navLinks.forEach(link => {
      if (link.getAttribute('data-section') === seccion) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Actualizar miga de pan en el encabezado
    const nombresSecciones = {
      dashboard: 'Dashboard',
      inventario: 'Inventario & Catálogo',
      movimientos: 'Movimientos de Stock',
      reportes: 'Métricas & Reportes',
      sistema: 'Sistema & API',
      soporte: 'Soporte Técnico & Diagnóstico'
    };
    if (breadcrumbCurrent) {
      breadcrumbCurrent.textContent = nombresSecciones[seccion] || 'Dashboard';
    }

    // Cerrar sidebar en móviles tras navegar
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');

    // Desplazar suavemente hacia arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (seccion === 'reportes') renderizarReportesFinancieros();
    if (seccion === 'movimientos') renderizarMovimientos();
    if (seccion === 'soporte') inicializarModuloSoporte();
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const seccion = e.currentTarget.getAttribute('data-section');
      if (seccion) cambiarVista(seccion);
    });
  });

  const btnBrandLink = document.getElementById('brand-link');
  if (btnBrandLink) {
    btnBrandLink.addEventListener('click', (e) => {
      e.preventDefault();
      cambiarVista('dashboard');
    });
  }

  const btnVerTodosMov = document.getElementById('btn-ver-todos-movimientos');
  if (btnVerTodosMov) {
    btnVerTodosMov.addEventListener('click', () => cambiarVista('movimientos'));
  }

  const btnVerTodosRep = document.getElementById('btn-ver-todos-reportes');
  if (btnVerTodosRep) {
    btnVerTodosRep.addEventListener('click', () => cambiarVista('reportes'));
  }

  // Botón colapsar sidebar en escritorio
  if (btnToggleSidebar) {
    btnToggleSidebar.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  // Menú hamburguesa móvil
  if (btnMobileMenu) {
    btnMobileMenu.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      sidebarBackdrop.classList.toggle('active');
    });
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      sidebarBackdrop.classList.remove('active');
    });
  }

  // ==========================================================================
  // COMUNICACIÓN CON LA API (FETCH REST)
  // ==========================================================================

  async function cargarProductos() {
    mostrarCargando(true);
    ocultarErrorBanner();

    try {
      const response = await fetch(`${API_BASE}/productos`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: No se pudo obtener el inventario.`);
      }

      productosCache = await response.json();
      actualizarContadoresPills();
      actualizarVisualizacionesDashboard();
      renderizarProductos();
      poblarSelectProductosAjuste();
    } catch (error) {
      console.error('Error al cargar productos:', error);
      mostrarErrorBanner(error.message);
    } finally {
      mostrarCargando(false);
    }
  }

  async function cargarEstadisticas() {
    try {
      const response = await fetch(`${API_BASE}/estadisticas`);
      if (!response.ok) {
        throw new Error('Error al cargar métricas de inventario');
      }

      const stats = await response.json();
      actualizarTarjetasEstadisticas(stats);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  }

  function actualizarTarjetasEstadisticas(stats) {
    if (statStockTotal) {
      statStockTotal.textContent = Number(stats.stock_total).toLocaleString('es-ES');
    }
    if (statPrecioPromedio) {
      statPrecioPromedio.textContent = formatearMoneda(stats.precio_promedio);
    }
    if (statPrecioMaximo) {
      statPrecioMaximo.textContent = formatearMoneda(stats.precio_maximo);
    }
    if (statPrecioMinimo) {
      statPrecioMinimo.textContent = formatearMoneda(stats.precio_minimo);
    }
    if (navProductCounter) {
      navProductCounter.textContent = String(productosCache.length);
    }
  }

  async function refrescarTodo() {
    if (btnRecargar) btnRecargar.classList.add('is-spinning');
    if (btnRefreshDashboard) btnRefreshDashboard.classList.add('is-spinning');
    try {
      await Promise.all([cargarProductos(), cargarEstadisticas()]);
    } catch (error) {
      console.error('Error al sincronizar datos:', error);
    } finally {
      setTimeout(() => {
        if (btnRecargar) btnRecargar.classList.remove('is-spinning');
        if (btnRefreshDashboard) btnRefreshDashboard.classList.remove('is-spinning');
      }, 500);
    }
  }

  function resaltarFilaProducto(id) {
    if (!id || !tablaBody) return;
    const fila = tablaBody.querySelector(`tr[data-id="${id}"]`);
    if (fila) {
      fila.classList.remove('row-highlight-pulse');
      void fila.offsetWidth; // Forzar reflow para reiniciar la animación
      fila.classList.add('row-highlight-pulse');
      try {
        fila.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (e) {}
    }
  }

  // ==========================================================================
  // ANALÍTICA, GRÁFICOS INTERACTIVOS Y ALERTAS
  // ==========================================================================

  function actualizarVisualizacionesDashboard() {
    const totalItems = productosCache.length;
    let valorTotalAcumulado = 0;
    let enStockCount = 0;
    let bajoStockCount = 0;
    let agotadosCount = 0;
    const itemsCriticos = [];

    productosCache.forEach(p => {
      const val = (p.precio || 0) * (p.stock || 0);
      valorTotalAcumulado += val;

      if (p.stock === 0) {
        agotadosCount++;
        itemsCriticos.push(p);
      } else if (p.stock < 10) {
        bajoStockCount++;
        itemsCriticos.push(p);
      } else {
        enStockCount++;
      }
    });

    // 1. Métricas de Encabezado y Tarjetas
    if (statValorTotal) statValorTotal.textContent = formatearMoneda(valorTotalAcumulado);
    if (statValorTotalHeader) statValorTotalHeader.textContent = formatearMoneda(valorTotalAcumulado);
    
    const totalAlertas = bajoStockCount + agotadosCount;
    if (statAlertasTotal) statAlertasTotal.textContent = String(totalAlertas);

    // Indicador en campana de notificaciones
    if (notificationBadgeCount && popoverAlertCount) {
      if (totalAlertas > 0) {
        notificationBadgeCount.style.display = 'flex';
        notificationBadgeCount.textContent = String(totalAlertas);
        popoverAlertCount.textContent = `${totalAlertas} críticas`;
      } else {
        notificationBadgeCount.style.display = 'none';
        popoverAlertCount.textContent = '0 alertas';
      }
    }

    // Poblar lista de notificaciones flotante
    if (notificationsList) {
      if (itemsCriticos.length === 0) {
        notificationsList.innerHTML = `<div class="popover-empty">No hay alertas de stock bajo pendientes. Todo está en orden.</div>`;
      } else {
        notificationsList.innerHTML = '';
        itemsCriticos.forEach(item => {
          const notif = document.createElement('div');
          notif.className = 'notification-item';
          notif.innerHTML = `
            <div class="notif-icon-circle notif-icon-amber">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              </svg>
            </div>
            <div class="notif-details">
              <span class="notif-title">${escaparHTML(item.nombre)}</span>
              <span class="notif-desc">${item.stock === 0 ? '¡Agotado totalmente!' : `Stock crítico: solo ${item.stock} u.`}</span>
            </div>
          `;
          notificationsList.appendChild(notif);
        });
      }
    }

    // 2. Donut Chart SVG Interactivo
    const circunferencia = 2 * Math.PI * 62; // radio 62 ~= 389.55
    if (donutSegStock && donutSegLow && donutSegOut) {
      if (totalItems === 0) {
        donutSegStock.setAttribute('stroke-dasharray', `0 ${circunferencia}`);
        donutSegLow.setAttribute('stroke-dasharray', `0 ${circunferencia}`);
        donutSegOut.setAttribute('stroke-dasharray', `0 ${circunferencia}`);
        if (donutPercentageVal) donutPercentageVal.textContent = '0%';
      } else {
        const pctStock = enStockCount / totalItems;
        const pctLow = bajoStockCount / totalItems;
        const pctOut = agotadosCount / totalItems;

        const lenStock = pctStock * circunferencia;
        const lenLow = pctLow * circunferencia;
        const lenOut = pctOut * circunferencia;

        donutSegStock.setAttribute('stroke-dasharray', `${lenStock} ${circunferencia}`);
        donutSegStock.setAttribute('stroke-dashoffset', '0');

        donutSegLow.setAttribute('stroke-dasharray', `${lenLow} ${circunferencia}`);
        donutSegLow.setAttribute('stroke-dashoffset', `-${lenStock}`);

        donutSegOut.setAttribute('stroke-dasharray', `${lenOut} ${circunferencia}`);
        donutSegOut.setAttribute('stroke-dashoffset', `-${lenStock + lenLow}`);

        if (donutPercentageVal) {
          const saludOperativa = Math.round((enStockCount / totalItems) * 100);
          donutPercentageVal.textContent = `${saludOperativa}%`;
        }
      }
    }

    if (legendStockCount) legendStockCount.textContent = String(enStockCount);
    if (legendLowCount) legendLowCount.textContent = String(bajoStockCount);
    if (legendOutCount) legendOutCount.textContent = String(agotadosCount);
    if (badgeTotalItemsDonut) badgeTotalItemsDonut.textContent = `${totalItems} productos`;

    // 3. Gráfico de Barras de Top Productos por Valor
    if (topProductsBarChart) {
      topProductsBarChart.innerHTML = '';
      const ordenadosPorValor = [...productosCache]
        .map(p => ({ ...p, valorTotal: (p.precio || 0) * (p.stock || 0) }))
        .sort((a, b) => b.valorTotal - a.valorTotal)
        .slice(0, 5);

      if (ordenadosPorValor.length === 0) {
        topProductsBarChart.innerHTML = `<p style="color: var(--slate-400); font-size: 0.85rem; padding: 1rem 0;">No hay productos para analizar.</p>`;
      } else {
        const maxValor = Math.max(...ordenadosPorValor.map(p => p.valorTotal), 1);

        ordenadosPorValor.forEach(item => {
          const { estilo, iniciales } = obtenerEstiloAvatar(item.nombre);
          const porcentajeAncho = Math.max(8, Math.round((item.valorTotal / maxValor) * 100));

          const row = document.createElement('div');
          row.className = 'bar-row';
          row.innerHTML = `
            <div class="bar-row-info">
              <span class="bar-product-name">
                <span class="bar-product-avatar-tiny" style="background: ${estilo.bg}; color: ${estilo.color};">${iniciales}</span>
                ${escaparHTML(item.nombre)}
              </span>
              <span class="bar-product-vals">${formatearMoneda(item.valorTotal)} (${item.stock} u.)</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill" style="width: ${porcentajeAncho}%;"></div>
            </div>
          `;
          topProductsBarChart.appendChild(row);
        });
      }
    }

    // 4. Lista de Reposición Prioritaria
    if (criticalItemsList) {
      criticalItemsList.innerHTML = '';
      if (itemsCriticos.length === 0) {
        criticalItemsList.innerHTML = `
          <div style="padding: 1.5rem; text-align: center; color: var(--emerald-600); font-size: 0.88rem; background: var(--emerald-50); border-radius: var(--radius-md);">
            ✓ ¡Excelente! Todas las existencias están dentro de los niveles óptimos (≥10 unidades).
          </div>
        `;
      } else {
        itemsCriticos.slice(0, 4).forEach(item => {
          const { estilo, iniciales } = obtenerEstiloAvatar(item.nombre);
          const esAgotado = item.stock === 0;

          const row = document.createElement('div');
          row.className = 'critical-item-row';
          row.innerHTML = `
            <div class="critical-item-left">
              <div class="product-avatar" style="background-color: ${estilo.bg}; color: ${estilo.color}; width: 32px; height: 32px; font-size: 0.72rem;">
                ${iniciales}
              </div>
              <div>
                <strong style="font-size: 0.88rem;">${escaparHTML(item.nombre)}</strong>
                <div style="font-size: 0.75rem; color: var(--slate-400);">Código #${item.id} • ${formatearMoneda(item.precio)} c/u</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span class="critical-badge-pill ${esAgotado ? 'badge-out' : 'badge-low'}">
                ${esAgotado ? 'Agotado' : `${item.stock} u. restantes`}
              </span>
              <button class="btn btn-secondary btn-sm btn-quick-adjust" data-id="${item.id}" title="Reabastecer stock">
                + Surtir
              </button>
            </div>
          `;
          criticalItemsList.appendChild(row);
        });
      }
    }

    renderizarActividadReciente();
  }

  // ==========================================================================
  // FILTRADO, ORDENAMIENTO Y RENDERIZADO DE TABLA
  // ==========================================================================

  function actualizarContadoresPills() {
    let todos = productosCache.length;
    let enStock = 0;
    let stockBajo = 0;
    let agotados = 0;

    productosCache.forEach(p => {
      if (p.stock === 0) agotados++;
      else if (p.stock < 10) stockBajo++;
      else enStock++;
    });

    if (pillCountTodos) pillCountTodos.textContent = String(todos);
    if (pillCountEnStock) pillCountEnStock.textContent = String(enStock);
    if (pillCountStockBajo) pillCountStockBajo.textContent = String(stockBajo);
    if (pillCountAgotados) pillCountAgotados.textContent = String(agotados);
  }

  function obtenerProductosFiltradosYOrdenados() {
    const termino = (filtroBusqueda.value || '').toLowerCase().trim();

    let resultado = productosCache.filter(p => {
      // Filtro de texto
      const coincideTexto = !termino ||
        p.nombre.toLowerCase().includes(termino) ||
        String(p.id).includes(termino);

      if (!coincideTexto) return false;

      // Filtro por estado
      if (filtroEstadoActual === 'en-stock') return p.stock >= 10;
      if (filtroEstadoActual === 'stock-bajo') return p.stock > 0 && p.stock < 10;
      if (filtroEstadoActual === 'agotados') return p.stock === 0;
      return true;
    });

    // Ordenamiento
    resultado.sort((a, b) => {
      switch (ordenActual) {
        case 'id-desc': return b.id - a.id;
        case 'id-asc': return a.id - b.id;
        case 'nombre-asc': return a.nombre.localeCompare(b.nombre);
        case 'nombre-desc': return b.nombre.localeCompare(a.nombre);
        case 'stock-desc': return b.stock - a.stock;
        case 'stock-asc': return a.stock - b.stock;
        case 'precio-desc': return b.precio - a.precio;
        case 'precio-asc': return a.precio - b.precio;
        default: return a.id - b.id;
      }
    });

    return resultado;
  }

  function renderizarProductos() {
    const productos = obtenerProductosFiltradosYOrdenados();
    const totalFiltrados = productos.length;

    if (productCountBadge) {
      productCountBadge.textContent = `${totalFiltrados} ${totalFiltrados === 1 ? 'producto' : 'productos'}`;
    }

    if (totalFiltrados === 0) {
      tablaBody.innerHTML = '';
      cardsContainer.innerHTML = '';
      emptyState.style.display = 'flex';
      if (paginationButtons) paginationButtons.innerHTML = '';
      if (resultsRangeText) resultsRangeText.textContent = '0 de 0';
      return;
    }
    emptyState.style.display = 'none';

    // Paginación
    const totalPaginas = Math.ceil(totalFiltrados / elementosPorPagina) || 1;
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;

    const inicio = (paginaActual - 1) * elementosPorPagina;
    const fin = Math.min(inicio + elementosPorPagina, totalFiltrados);
    const paginados = productos.slice(inicio, fin);

    if (resultsRangeText) {
      resultsRangeText.textContent = `${inicio + 1} - ${fin} de ${totalFiltrados}`;
    }
    if (currentPageNum) currentPageNum.textContent = String(paginaActual);
    if (totalPagesNum) totalPagesNum.textContent = String(totalPaginas);

    renderizarBotonesPaginacion(totalPaginas);

    // 1. Renderizado Vista Tabla (Escritorio)
    tablaBody.innerHTML = '';
    paginados.forEach(prod => {
      const { estilo, iniciales } = obtenerEstiloAvatar(prod.nombre);
      const esAgotado = prod.stock === 0;
      const esStockBajo = prod.stock < 10;
      const badgeClase = esAgotado ? 'badge-out' : esStockBajo ? 'badge-low' : 'badge-stock';
      const badgeTexto = esAgotado ? 'Agotado' : prod.estado || (esStockBajo ? 'Stock bajo' : 'En stock');

      const maxCapacidad = 150;
      const pctStockBar = Math.min(100, Math.round((prod.stock / maxCapacidad) * 100));
      const fillBarClass = esAgotado ? 'fill-rose' : esStockBajo ? 'fill-amber' : 'fill-emerald';
      const valorEnBodega = (prod.precio || 0) * (prod.stock || 0);

      const tr = document.createElement('tr');
      tr.setAttribute('data-id', String(prod.id));
      tr.innerHTML = `
        <td>
          <div class="product-cell">
            <div class="product-avatar" style="background-color: ${estilo.bg}; color: ${estilo.color}">
              ${iniciales}
            </div>
            <div class="product-name-info">
              <span class="product-name">${escaparHTML(prod.nombre)}</span>
              <span class="product-subtext">Inventario activo</span>
            </div>
          </div>
        </td>
        <td><span class="product-id-tag">#${prod.id}</span></td>
        <td><span class="product-price">${formatearMoneda(prod.precio)}</span></td>
        <td>
          <div class="stock-meter-wrap">
            <div class="stock-meter-text"><strong>${prod.stock}</strong> u.</div>
            <div class="stock-meter-bar">
              <div class="stock-meter-fill ${fillBarClass}" style="width: ${pctStockBar}%;"></div>
            </div>
          </div>
        </td>
        <td><strong style="color: var(--slate-700); font-variant-numeric: tabular-nums;">${formatearMoneda(valorEnBodega)}</strong></td>
        <td>
          <span class="badge ${badgeClase}">
            <span class="badge-dot"></span>
            ${escaparHTML(badgeTexto)}
          </span>
        </td>
        <td class="td-actions">
          <div class="row-actions-group">
            <button class="btn-action-icon btn-action-adjust btn-quick-adjust" data-id="${prod.id}" aria-label="Ajustar stock de ${escaparHTML(prod.nombre)}" title="Ajustar existencias">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <polyline points="17 1 21 5 17 9"></polyline>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
              </svg>
            </button>
            <button class="btn-action-icon btn-edit" data-id="${prod.id}" aria-label="Editar producto ${escaparHTML(prod.nombre)}" title="Editar producto">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="btn-action-icon btn-action-delete btn-delete" data-id="${prod.id}" aria-label="Eliminar producto ${escaparHTML(prod.nombre)}" title="Eliminar producto">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      `;
      tablaBody.appendChild(tr);
    });

    // 2. Renderizado Vista Tarjetas (Móvil / Pantallas < 768px)
    cardsContainer.innerHTML = '';
    paginados.forEach(prod => {
      const { estilo, iniciales } = obtenerEstiloAvatar(prod.nombre);
      const esAgotado = prod.stock === 0;
      const esStockBajo = prod.stock < 10;
      const badgeClase = esAgotado ? 'badge-out' : esStockBajo ? 'badge-low' : 'badge-stock';
      const badgeTexto = esAgotado ? 'Agotado' : prod.estado || (esStockBajo ? 'Stock bajo' : 'En stock');
      const valorEnBodega = (prod.precio || 0) * (prod.stock || 0);

      const card = document.createElement('article');
      card.className = 'product-mobile-card';
      card.innerHTML = `
        <div class="mobile-card-header">
          <div class="product-cell">
            <div class="product-avatar" style="background-color: ${estilo.bg}; color: ${estilo.color}">
              ${iniciales}
            </div>
            <div class="product-name-info">
              <span class="product-name">${escaparHTML(prod.nombre)}</span>
              <span class="product-id-tag">#${prod.id}</span>
            </div>
          </div>
          <span class="badge ${badgeClase}">
            <span class="badge-dot"></span>
            ${escaparHTML(badgeTexto)}
          </span>
        </div>

        <div class="mobile-card-meta">
          <div class="mobile-meta-item">
            <span class="mobile-meta-label">Precio</span>
            <span class="mobile-meta-value">${formatearMoneda(prod.precio)}</span>
          </div>
          <div class="mobile-meta-item">
            <span class="mobile-meta-label">Stock</span>
            <span class="mobile-meta-value">${prod.stock} u.</span>
          </div>
          <div class="mobile-meta-item">
            <span class="mobile-meta-label">Valor</span>
            <span class="mobile-meta-value">${formatearMoneda(valorEnBodega)}</span>
          </div>
        </div>

        <div class="mobile-card-actions">
          <button class="btn btn-secondary btn-sm btn-quick-adjust" data-id="${prod.id}">
            ⚡ Ajustar
          </button>
          <button class="btn btn-secondary btn-sm btn-edit" data-id="${prod.id}">
            ✏️ Editar
          </button>
          <button class="btn btn-secondary btn-sm btn-delete" data-id="${prod.id}" style="color: var(--color-danger);">
            🗑️ Eliminar
          </button>
        </div>
      `;
      cardsContainer.appendChild(card);
    });
  }

  function renderizarBotonesPaginacion(totalPaginas) {
    if (!paginationButtons) return;
    paginationButtons.innerHTML = '';

    // Botón Anterior
    const btnPrev = document.createElement('button');
    btnPrev.className = 'page-btn';
    btnPrev.innerHTML = '&larr;';
    btnPrev.disabled = paginaActual <= 1;
    btnPrev.addEventListener('click', () => {
      if (paginaActual > 1) {
        paginaActual--;
        renderizarProductos();
      }
    });
    paginationButtons.appendChild(btnPrev);

    // Botones de Páginas Numeradas
    for (let i = 1; i <= totalPaginas; i++) {
      if (totalPaginas > 6 && Math.abs(paginaActual - i) > 2 && i !== 1 && i !== totalPaginas) {
        if (i === 2 || i === totalPaginas - 1) {
          const ellipsis = document.createElement('span');
          ellipsis.textContent = '...';
          ellipsis.style.padding = '0 0.25rem';
          paginationButtons.appendChild(ellipsis);
        }
        continue;
      }

      const btnNum = document.createElement('button');
      btnNum.className = `page-btn ${i === paginaActual ? 'active' : ''}`;
      btnNum.textContent = String(i);
      btnNum.addEventListener('click', () => {
        paginaActual = i;
        renderizarProductos();
      });
      paginationButtons.appendChild(btnNum);
    }

    // Botón Siguiente
    const btnNext = document.createElement('button');
    btnNext.className = 'page-btn';
    btnNext.innerHTML = '&rarr;';
    btnNext.disabled = paginaActual >= totalPaginas;
    btnNext.addEventListener('click', () => {
      if (paginaActual < totalPaginas) {
        paginaActual++;
        renderizarProductos();
      }
    });
    paginationButtons.appendChild(btnNext);
  }

  // ==========================================================================
  // PREVISUALIZACIÓN Y MODAL DE PRODUCTO
  // ==========================================================================

  function actualizarPrevisualizacionModal() {
    const nombre = (campoNombre.value || '').trim() || 'Nombre del producto...';
    const precio = parseFloat(campoPrecio.value) || 0;
    const stock = parseInt(campoStock.value, 10) || 0;
    const total = precio * stock;

    if (previewProductName) previewProductName.textContent = nombre;
    if (previewProductPrice) previewProductPrice.textContent = formatearMoneda(precio);
    if (previewProductStock) previewProductStock.textContent = `${stock} u.`;
    if (previewProductTotal) previewProductTotal.textContent = formatearMoneda(total);

    if (charCountNombre) {
      charCountNombre.textContent = `${campoNombre.value.length} / 100`;
    }

    if (previewBadgeStatus && previewBadgeText) {
      if (stock === 0) {
        previewBadgeStatus.className = 'badge badge-out';
        previewBadgeText.textContent = 'Agotado';
      } else if (stock < 10) {
        previewBadgeStatus.className = 'badge badge-low';
        previewBadgeText.textContent = 'Stock bajo';
      } else {
        previewBadgeStatus.className = 'badge badge-stock';
        previewBadgeText.textContent = 'En stock';
      }
    }
  }

  function abrirModalProducto(producto = null) {
    limpiarErroresFormulario();
    productoEnEdicion = producto;

    if (producto) {
      modalTitulo.textContent = 'Editar producto';
      btnGuardarTexto.textContent = 'Guardar cambios';
      campoId.value = producto.id;
      campoNombre.value = producto.nombre;
      campoPrecio.value = producto.precio;
      campoStock.value = producto.stock;
    } else {
      modalTitulo.textContent = 'Nuevo producto';
      btnGuardarTexto.textContent = 'Crear producto';
      formProducto.reset();
      campoId.value = '';
    }

    actualizarPrevisualizacionModal();
    modalProducto.classList.add('is-active');
    modalProducto.setAttribute('aria-hidden', 'false');
    setTimeout(() => campoNombre.focus(), 80);
  }

  function cerrarModalProducto() {
    modalProducto.classList.remove('is-active');
    modalProducto.setAttribute('aria-hidden', 'true');
    formProducto.reset();
    limpiarErroresFormulario();
    productoEnEdicion = null;
  }

  function limpiarErroresFormulario() {
    errorNombre.textContent = '';
    errorPrecio.textContent = '';
    errorStock.textContent = '';
    modalErrorGeneral.style.display = 'none';
    modalErrorGeneral.textContent = '';

    campoNombre.classList.remove('has-error');
    campoPrecio.classList.remove('has-error');
    campoStock.classList.remove('has-error');
  }

  function mostrarErroresValidacion(listaErrores) {
    limpiarErroresFormulario();

    if (!Array.isArray(listaErrores)) {
      modalErrorGeneral.textContent = 'Ocurrió un error en los datos enviados.';
      modalErrorGeneral.style.display = 'block';
      return;
    }

    listaErrores.forEach(err => {
      const campo = String(err.campo).toLowerCase();
      const mensaje = err.mensaje || 'Dato inválido';

      if (campo.includes('nombre')) {
        errorNombre.textContent = mensaje;
        campoNombre.classList.add('has-error');
      } else if (campo.includes('precio')) {
        errorPrecio.textContent = mensaje;
        campoPrecio.classList.add('has-error');
      } else if (campo.includes('stock')) {
        errorStock.textContent = mensaje;
        campoStock.classList.add('has-error');
      } else {
        modalErrorGeneral.textContent = mensaje;
        modalErrorGeneral.style.display = 'block';
      }
    });
  }

  async function manejarSubmitFormulario(e) {
    e.preventDefault();
    limpiarErroresFormulario();

    const nombre = campoNombre.value;
    const precio = campoPrecio.value !== '' ? parseFloat(campoPrecio.value) : null;
    const stock = campoStock.value !== '' ? parseInt(campoStock.value, 10) : null;

    const payload = {
      nombre: nombre,
      precio: precio,
      stock: stock
    };

    const esEdicion = !!campoId.value;
    const url = esEdicion
      ? `${API_BASE}/productos/${campoId.value}`
      : `${API_BASE}/productos`;
    const metodo = esEdicion ? 'PUT' : 'POST';

    guardarSpinner.style.display = 'inline-block';
    btnGuardarTexto.style.opacity = '0.7';
    const btnSubmit = document.getElementById('btn-guardar-producto');
    btnSubmit.disabled = true;

    try {
      const response = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 422) {
        mostrarErroresValidacion(data.detail);
        if (typeof registrarErrorSistema === 'function') {
          const detalleStr = Array.isArray(data.detail)
            ? data.detail.map(d => `${d.campo}: ${d.mensaje}`).join(', ')
            : 'Fallo en reglas de validación';
          registrarErrorSistema('validacion', 'HTTP 422', url, `Error de validación al guardar producto: ${detalleStr}`);
        }
        return;
      }

      if (!response.ok) {
        const errMsg = data.detail || 'Error al procesar la solicitud.';
        if (typeof registrarErrorSistema === 'function') {
          registrarErrorSistema('red', `HTTP ${response.status}`, url, errMsg);
        }
        throw new Error(errMsg);
      }

      cerrarModalProducto();
      await refrescarTodo();
      resaltarFilaProducto(data.id);

      // Registrar en bitácora de actividad
      registrarMovimiento(
        data.id,
        data.nombre,
        esEdicion ? 'edicion' : 'creacion',
        data.stock,
        productoEnEdicion ? productoEnEdicion.stock : 0,
        data.stock,
        esEdicion ? 'Actualización de especificaciones de catálogo' : 'Ingreso inicial de nuevo producto'
      );

      mostrarToast(
        esEdicion ? 'Producto actualizado correctamente' : 'Producto creado con éxito',
        'success'
      );
    } catch (err) {
      console.error('Error al guardar producto:', err);
      modalErrorGeneral.textContent = err.message || 'No se pudo conectar con el servidor.';
      modalErrorGeneral.style.display = 'block';
      if (typeof registrarErrorSistema === 'function') {
        registrarErrorSistema('red', 'ERR_API', url, err.message || 'Fallo de comunicación');
      }
    } finally {
      guardarSpinner.style.display = 'none';
      btnGuardarTexto.style.opacity = '1';
      btnSubmit.disabled = false;
    }
  }

  // ==========================================================================
  // AJUSTE RÁPIDO DE STOCK (ENTRADA / SALIDA)
  // ==========================================================================

  function poblarSelectProductosAjuste() {
    if (!ajusteSelectProducto) return;
    ajusteSelectProducto.innerHTML = '';

    productosCache.forEach(prod => {
      const opt = document.createElement('option');
      opt.value = prod.id;
      opt.textContent = `${prod.nombre} (Stock actual: ${prod.stock} u.)`;
      ajusteSelectProducto.appendChild(opt);
    });
  }

  function actualizarCalculoAjusteStock() {
    const prodId = parseInt(ajusteSelectProducto.value, 10);
    const prod = productosCache.find(p => p.id === prodId);
    if (!prod) return;

    const tipo = document.querySelector('input[name="tipo_movimiento"]:checked').value;
    const cant = parseInt(ajusteCantidad.value, 10) || 0;

    let nuevoStock = prod.stock;
    if (tipo === 'entrada') {
      nuevoStock = prod.stock + cant;
    } else {
      nuevoStock = Math.max(0, prod.stock - cant);
    }

    if (ajusteStockActual) ajusteStockActual.textContent = `${prod.stock} u.`;
    if (ajusteStockNuevo) ajusteStockNuevo.textContent = `${nuevoStock} u.`;
  }

  function abrirModalAjusteStock(productoId = null) {
    poblarSelectProductosAjuste();
    if (modalAjusteError) modalAjusteError.style.display = 'none';

    if (productoId) {
      ajusteSelectProducto.value = String(productoId);
    }
    actualizarCalculoAjusteStock();

    modalAjusteStock.classList.add('is-active');
    modalAjusteStock.setAttribute('aria-hidden', 'false');
  }

  function cerrarModalAjusteStock() {
    modalAjusteStock.classList.remove('is-active');
    modalAjusteStock.setAttribute('aria-hidden', 'true');
    formAjusteStock.reset();
  }

  async function manejarSubmitAjusteStock(e) {
    e.preventDefault();
    if (modalAjusteError) modalAjusteError.style.display = 'none';

    const prodId = parseInt(ajusteSelectProducto.value, 10);
    const prod = productosCache.find(p => p.id === prodId);
    if (!prod) return;

    const tipo = document.querySelector('input[name="tipo_movimiento"]:checked').value;
    const cant = parseInt(ajusteCantidad.value, 10) || 0;
    const motivo = (ajusteMotivo.value || '').trim();

    if (cant <= 0) {
      modalAjusteError.textContent = 'La cantidad debe ser mayor a 0.';
      modalAjusteError.style.display = 'block';
      return;
    }

    let nuevoStock = tipo === 'entrada' ? prod.stock + cant : prod.stock - cant;
    if (nuevoStock < 0) {
      modalAjusteError.textContent = `No hay suficiente stock disponible (Stock actual: ${prod.stock} u.).`;
      modalAjusteError.style.display = 'block';
      return;
    }

    ajusteSpinner.style.display = 'inline-block';
    const btnSubmit = document.getElementById('btn-confirmar-ajuste');
    btnSubmit.disabled = true;

    try {
      const response = await fetch(`${API_BASE}/productos/${prod.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: prod.nombre,
          precio: prod.precio,
          stock: nuevoStock
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error al actualizar el stock.');
      }

      registrarMovimiento(prod.id, prod.nombre, tipo, cant, prod.stock, nuevoStock, motivo);
      cerrarModalAjusteStock();
      await refrescarTodo();
      resaltarFilaProducto(prod.id);

      mostrarToast(`Ajuste de ${tipo === 'entrada' ? '+' : '-'}${cant} u. aplicado en "${prod.nombre}"`, 'success');
    } catch (err) {
      console.error('Error al aplicar ajuste:', err);
      modalAjusteError.textContent = err.message || 'No se pudo aplicar el movimiento.';
      modalAjusteError.style.display = 'block';
    } finally {
      ajusteSpinner.style.display = 'none';
      btnSubmit.disabled = false;
    }
  }

  // ==========================================================================
  // CONFIRMACIÓN Y ELIMINACIÓN DE PRODUCTO
  // ==========================================================================

  function abrirModalEliminar(producto) {
    productoAEliminar = producto;
    nombreProductoEliminar.textContent = `"${producto.nombre}" (#${producto.id})`;
    modalEliminar.classList.add('is-active');
    modalEliminar.setAttribute('aria-hidden', 'false');
    btnConfirmarEliminar.focus();
  }

  function cerrarModalEliminar() {
    modalEliminar.classList.remove('is-active');
    modalEliminar.setAttribute('aria-hidden', 'true');
    productoAEliminar = null;
  }

  async function confirmarEliminacion() {
    if (!productoAEliminar) return;

    eliminarSpinner.style.display = 'inline-block';
    btnConfirmarEliminar.disabled = true;

    try {
      const response = await fetch(`${API_BASE}/productos/${productoAEliminar.id}`, {
        method: 'DELETE'
      });

      if (!response.ok && response.status !== 204) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'No se pudo eliminar el producto.');
      }

      const prod = productoAEliminar;
      cerrarModalEliminar();
      await refrescarTodo();

      registrarMovimiento(
        prod.id,
        prod.nombre,
        'eliminacion',
        prod.stock,
        prod.stock,
        0,
        'Eliminación física del catálogo'
      );

      mostrarToast(`"${prod.nombre}" eliminado correctamente`, 'success');
    } catch (err) {
      console.error('Error al eliminar producto:', err);
      mostrarToast(err.message, 'danger');
    } finally {
      eliminarSpinner.style.display = 'none';
      btnConfirmarEliminar.disabled = false;
    }
  }

  // ==========================================================================
  // REPORTES FINANCIEROS Y EXPORTACIONES
  // ==========================================================================

  function renderizarReportesFinancieros() {
    if (!tablaReportesBody) return;
    tablaReportesBody.innerHTML = '';

    let valorTotalAlmacen = 0;
    productosCache.forEach(p => {
      valorTotalAlmacen += (p.precio || 0) * (p.stock || 0);
    });

    if (reportTotalInvested) reportTotalInvested.textContent = formatearMoneda(valorTotalAlmacen);

    const ordenados = [...productosCache]
      .map(p => ({
        ...p,
        valorTotal: (p.precio || 0) * (p.stock || 0),
        participacion: valorTotalAlmacen > 0 ? (((p.precio || 0) * (p.stock || 0)) / valorTotalAlmacen) * 100 : 0
      }))
      .sort((a, b) => b.valorTotal - a.valorTotal);

    if (ordenados.length > 0) {
      if (reportTopItemName) reportTopItemName.textContent = ordenados[0].nombre;
      if (reportTopItemVal) reportTopItemVal.textContent = formatearMoneda(ordenados[0].valorTotal);
    }

    const sinQuiebre = productosCache.filter(p => p.stock > 0).length;
    const tasaDisp = productosCache.length > 0 ? Math.round((sinQuiebre / productosCache.length) * 100) : 100;
    if (reportAvailabilityRate) reportAvailabilityRate.textContent = `${tasaDisp}%`;

    ordenados.forEach(prod => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escaparHTML(prod.nombre)}</strong> <span class="product-id-tag">#${prod.id}</span></td>
        <td>${formatearMoneda(prod.precio)}</td>
        <td><strong>${prod.stock}</strong> u.</td>
        <td><strong class="text-emerald">${formatearMoneda(prod.valorTotal)}</strong></td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span>${prod.participacion.toFixed(1)}%</span>
            <div style="flex: 1; height: 5px; background: var(--slate-100); border-radius: var(--radius-full); overflow: hidden;">
              <div style="height: 100%; width: ${Math.min(100, prod.participacion)}%; background: var(--primary-600); border-radius: var(--radius-full);"></div>
            </div>
          </div>
        </td>
      `;
      tablaReportesBody.appendChild(tr);
    });
  }

  function exportarCatalogoCSV() {
    if (productosCache.length === 0) {
      mostrarToast('No hay productos para exportar', 'danger');
      return;
    }

    const encabezados = ['ID', 'Nombre', 'Precio USD', 'Stock', 'Valor Total USD', 'Estado', 'Fecha Creación'];
    const filas = productosCache.map(p => [
      p.id,
      `"${p.nombre.replace(/"/g, '""')}"`,
      p.precio.toFixed(2),
      p.stock,
      (p.precio * p.stock).toFixed(2),
      `"${p.estado}"`,
      p.fecha_creacion || ''
    ]);

    const csvContent = '\uFEFF' + [encabezados.join(','), ...filas.map(f => f.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `StockFlow_Inventario_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    mostrarToast('Catálogo exportado en formato CSV', 'success');
  }

  function exportarReportesJSON() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(productosCache, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `StockFlow_Reporte_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
    mostrarToast('Reporte JSON descargado', 'success');
  }

  // ==========================================================================
  // ESTADOS VISUALES
  // ==========================================================================

  function mostrarCargando(estado) {
    if (loadingState) loadingState.style.display = estado ? 'flex' : 'none';
    if (estado && emptyState) emptyState.style.display = 'none';
  }

  function mostrarErrorBanner(mensaje) {
    if (errorBannerMsg) errorBannerMsg.textContent = mensaje;
    if (errorBanner) errorBanner.style.display = 'flex';
    if (typeof registrarErrorSistema === 'function') {
      registrarErrorSistema('red', 'ERR_CONEXION', `${API_BASE}/productos`, mensaje);
    }
  }

  function ocultarErrorBanner() {
    if (errorBanner) errorBanner.style.display = 'none';
  }

  // ==========================================================================
  // EVENT LISTENERS Y VINCULACIÓN
  // ==========================================================================

  // Modales de Creación
  if (btnAbrirCrear) btnAbrirCrear.addEventListener('click', () => abrirModalProducto());
  if (btnAbrirCrearCatalog) btnAbrirCrearCatalog.addEventListener('click', () => abrirModalProducto());
  if (btnAbrirCrearMobile) btnAbrirCrearMobile.addEventListener('click', () => abrirModalProducto());
  if (btnEmptyCrear) btnEmptyCrear.addEventListener('click', () => abrirModalProducto());

  // Cierre Modal Producto
  if (btnCerrarModal) btnCerrarModal.addEventListener('click', cerrarModalProducto);
  if (btnCancelarModal) btnCancelarModal.addEventListener('click', cerrarModalProducto);

  // Formulario Producto
  if (formProducto) formProducto.addEventListener('submit', manejarSubmitFormulario);
  if (campoNombre) campoNombre.addEventListener('input', actualizarPrevisualizacionModal);
  if (campoPrecio) campoPrecio.addEventListener('input', actualizarPrevisualizacionModal);
  if (campoStock) campoStock.addEventListener('input', actualizarPrevisualizacionModal);

  // Modal Ajuste Rápido de Stock
  if (btnAbrirAjusteStock) btnAbrirAjusteStock.addEventListener('click', () => abrirModalAjusteStock());
  if (btnQuickAdjustHero) btnQuickAdjustHero.addEventListener('click', () => abrirModalAjusteStock());
  if (btnCerrarAjuste) btnCerrarAjuste.addEventListener('click', cerrarModalAjusteStock);
  if (btnCancelarAjuste) btnCancelarAjuste.addEventListener('click', cerrarModalAjusteStock);
  if (formAjusteStock) formAjusteStock.addEventListener('submit', manejarSubmitAjusteStock);

  if (ajusteSelectProducto) ajusteSelectProducto.addEventListener('change', actualizarCalculoAjusteStock);
  if (ajusteCantidad) ajusteCantidad.addEventListener('input', actualizarCalculoAjusteStock);

  const radioIn = document.querySelector('input[name="tipo_movimiento"][value="entrada"]');
  const radioOut = document.querySelector('input[name="tipo_movimiento"][value="salida"]');
  if (radioIn && radioOut) {
    radioIn.addEventListener('change', () => {
      labelTipoIn.classList.add('active');
      labelTipoOut.classList.remove('active');
      actualizarCalculoAjusteStock();
    });
    radioOut.addEventListener('change', () => {
      labelTipoOut.classList.add('active');
      labelTipoIn.classList.remove('active');
      actualizarCalculoAjusteStock();
    });
  }

  // Modal Eliminación
  if (btnCerrarEliminar) btnCerrarEliminar.addEventListener('click', cerrarModalEliminar);
  if (btnCancelarEliminar) btnCancelarEliminar.addEventListener('click', cerrarModalEliminar);
  if (btnConfirmarEliminar) btnConfirmarEliminar.addEventListener('click', confirmarEliminacion);

  // Filtros por Pills
  filterPills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      filterPills.forEach(p => {
        p.classList.remove('active');
        p.setAttribute('aria-selected', 'false');
      });
      const target = e.currentTarget;
      target.classList.add('active');
      target.setAttribute('aria-selected', 'true');
      filtroEstadoActual = target.getAttribute('data-filter') || 'todos';
      paginaActual = 1;
      renderizarProductos();
    });
  });

  // Búsqueda en Vivo
  if (filtroBusqueda) {
    filtroBusqueda.addEventListener('input', (e) => {
      if (btnClearSearch) {
        btnClearSearch.style.display = e.target.value ? 'flex' : 'none';
      }
      paginaActual = 1;
      renderizarProductos();
    });
  }

  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      filtroBusqueda.value = '';
      btnClearSearch.style.display = 'none';
      paginaActual = 1;
      renderizarProductos();
    });
  }

  // Buscador Global en el Topbar (Ctrl + K)
  if (globalSearchInput) {
    globalSearchInput.addEventListener('input', (e) => {
      if (vistaActual !== 'inventario') cambiarVista('inventario');
      if (filtroBusqueda) {
        filtroBusqueda.value = e.target.value;
        if (btnClearSearch) btnClearSearch.style.display = e.target.value ? 'flex' : 'none';
      }
      paginaActual = 1;
      renderizarProductos();
    });
  }

  // Ordenamiento y Elementos por Página
  if (selectOrdenar) {
    selectOrdenar.addEventListener('change', (e) => {
      ordenActual = e.target.value;
      renderizarProductos();
    });
  }

  if (selectPageSize) {
    selectPageSize.addEventListener('change', (e) => {
      elementosPorPagina = parseInt(e.target.value, 10);
      paginaActual = 1;
      renderizarProductos();
    });
  }

  // Ordenamiento por encabezados de columna
  document.querySelectorAll('.th-sortable').forEach(th => {
    th.addEventListener('click', () => {
      const campo = th.getAttribute('data-sort');
      if (ordenActual === `${campo}-asc`) {
        ordenActual = `${campo}-desc`;
      } else {
        ordenActual = `${campo}-asc`;
      }
      if (selectOrdenar) selectOrdenar.value = ordenActual;
      renderizarProductos();
    });
  });

  // Notificaciones Popover
  if (btnNotifications && notificationsPopover) {
    btnNotifications.addEventListener('click', (e) => {
      e.stopPropagation();
      const visible = notificationsPopover.style.display === 'block';
      notificationsPopover.style.display = visible ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
      if (!notificationsPopover.contains(e.target) && e.target !== btnNotifications) {
        notificationsPopover.style.display = 'none';
      }
    });
  }

  // Botones de Acción en Fila (Delegación de Eventos)
  document.addEventListener('click', (e) => {
    // Editar
    const btnEdit = e.target.closest('.btn-edit');
    if (btnEdit) {
      const id = parseInt(btnEdit.getAttribute('data-id'), 10);
      const prod = productosCache.find(p => p.id === id);
      if (prod) abrirModalProducto(prod);
      return;
    }

    // Ajustar existencias
    const btnAdjust = e.target.closest('.btn-quick-adjust');
    if (btnAdjust) {
      const id = parseInt(btnAdjust.getAttribute('data-id'), 10);
      abrirModalAjusteStock(id);
      return;
    }

    // Eliminar
    const btnDel = e.target.closest('.btn-delete');
    if (btnDel) {
      const id = parseInt(btnDel.getAttribute('data-id'), 10);
      const prod = productosCache.find(p => p.id === id);
      if (prod) abrirModalEliminar(prod);
      return;
    }
  });

  // Botón atajo reposición primer crítico
  const btnReabastecerCritico = document.getElementById('btn-reabastecer-primer-critico');
  if (btnReabastecerCritico) {
    btnReabastecerCritico.addEventListener('click', () => {
      const primerCritico = productosCache.find(p => p.stock < 10);
      if (primerCritico) {
        abrirModalAjusteStock(primerCritico.id);
      } else {
        mostrarToast('No hay productos con stock crítico en este momento', 'success');
      }
    });
  }

  // Limpiar Bitácora
  if (btnLimpiarHistorialMov) {
    btnLimpiarHistorialMov.addEventListener('click', () => {
      movimientosCache = [];
      try { localStorage.removeItem('stockflow_movimientos'); } catch (e) {}
      renderizarMovimientos();
      renderizarActividadReciente();
      mostrarToast('Bitácora de movimientos restablecida', 'success');
    });
  }

  // Exportaciones
  if (btnExportCsv) btnExportCsv.addEventListener('click', exportarCatalogoCSV);
  if (btnExportReportsJson) btnExportReportsJson.addEventListener('click', exportarReportesJSON);
  if (btnPrintReport) btnPrintReport.addEventListener('click', () => window.print());

  // Refrescar
  if (btnRecargar) btnRecargar.addEventListener('click', refrescarTodo);
  if (btnRefreshDashboard) btnRefreshDashboard.addEventListener('click', refrescarTodo);
  if (btnReintentar) btnReintentar.addEventListener('click', refrescarTodo);

  // Atajos de Teclado
  document.addEventListener('keydown', (e) => {
    // Cerrar modales y menús con Escape
    if (e.key === 'Escape') {
      if (modalProducto && modalProducto.classList.contains('is-active')) cerrarModalProducto();
      if (modalAjusteStock && modalAjusteStock.classList.contains('is-active')) cerrarModalAjusteStock();
      if (modalEliminar && modalEliminar.classList.contains('is-active')) cerrarModalEliminar();
      if (typeof cerrarModalConfigSoporte === 'function') cerrarModalConfigSoporte();
      if (typeof cerrarModalPlanes === 'function') cerrarModalPlanes();
      if (typeof cerrarModalPago === 'function') cerrarModalPago();
      if (typeof cerrarModalPagoExito === 'function') cerrarModalPagoExito();
      if (typeof cerrarModalPerfil === 'function') cerrarModalPerfil();
      if (notificationsPopover) notificationsPopover.style.display = 'none';
      if (userDropdownMenu) {
        userDropdownMenu.style.display = 'none';
        if (userProfileWrapper) userProfileWrapper.classList.remove('is-open');
        if (btnUserProfile) btnUserProfile.setAttribute('aria-expanded', 'false');
      }
    }

    // Búsqueda rápida con Ctrl+K o Cmd+K
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (globalSearchInput) globalSearchInput.focus();
    }
  });

  // ==========================================================================
  // MÓDULO: AUTENTICACIÓN, SUSCRIPCIÓN, PAGO SIMULADO & PERFIL PRO
  // ==========================================================================

  const STORAGE_KEY_AUTH_USER = 'stockflow_pro_session';
  const STORAGE_KEY_REGISTERED_USERS = 'stockflow_registered_users';

  const USUARIO_DEMO = {
    name: 'Admin Inventario',
    email: 'admin@stockflow.dev',
    role: 'Administrador',
    plan: 'trial', // 'trial' | 'pro'
    trialDays: 30,
    trialStartDate: new Date().toISOString(),
    subMethod: null,
    subPrice: '$0.00 / mes',
    subStatus: 'Prueba Activa',
    subDate: null
  };

  let usuarioActual = null;

  // Elementos DOM - Pantalla de Acceso & Autenticación
  const authScreen = document.getElementById('auth-screen');
  const tabBtnLogin = document.getElementById('tab-btn-login');
  const tabBtnRegister = document.getElementById('tab-btn-register');
  const panelLogin = document.getElementById('panel-login');
  const panelRegister = document.getElementById('panel-register');
  const panelRecovery = document.getElementById('panel-recovery');
  const formLogin = document.getElementById('form-login');
  const loginEmail = document.getElementById('login-email');
  const loginPassword = document.getElementById('login-password');
  const loginRemember = document.getElementById('login-remember');
  const btnDemoQuickLogin = document.getElementById('btn-demo-quick-login');
  const btnShowRecovery = document.getElementById('btn-show-recovery');
  const btnBackToLogin = document.getElementById('btn-back-to-login');
  const formRegister = document.getElementById('form-register');
  const regName = document.getElementById('reg-name');
  const regEmail = document.getElementById('reg-email');
  const regPassword = document.getElementById('reg-password');
  const regPasswordConfirm = document.getElementById('reg-password-confirm');
  const regTerms = document.getElementById('reg-terms');
  const formRecovery = document.getElementById('form-recovery');
  const recoveryEmail = document.getElementById('recovery-email');
  const recoverySuccessBox = document.getElementById('recovery-success-box');

  // Elementos DOM - Header y Sidebar de Perfil y Plan
  const headerSubscriptionPill = document.getElementById('header-subscription-pill');
  const headerSubPlanName = document.getElementById('header-sub-plan-name');
  const headerSubPlanBadge = document.getElementById('header-sub-plan-badge');
  const headerSubPlanPrice = document.getElementById('header-sub-plan-price');
  const btnHeaderUpgradePro = document.getElementById('btn-header-upgrade-pro');
  const sidebarUserProfileBadge = document.getElementById('sidebar-user-profile-badge');
  const sidebarUserAvatar = document.getElementById('sidebar-user-avatar');
  const sidebarUserName = document.getElementById('sidebar-user-name');
  const sidebarUserRolePlan = document.getElementById('sidebar-user-role-plan');

  const topbarAvatarInitials = document.getElementById('topbar-avatar-initials');
  const topbarUserName = document.getElementById('topbar-user-name');
  const dropdownUserAvatar = document.getElementById('dropdown-user-avatar');
  const dropdownUserName = document.getElementById('dropdown-user-name');
  const dropdownUserEmail = document.getElementById('dropdown-user-email');
  const dropdownPlanBadge = document.getElementById('dropdown-plan-badge');
  const menuItemPlanes = document.getElementById('menu-item-planes');

  // Elementos DOM - Modal Planes de Suscripción
  const modalPlanes = document.getElementById('modal-planes-suscripcion');
  const btnCerrarPlanes = document.getElementById('btn-cerrar-planes');
  const btnCerrarPlanesFooter = document.getElementById('btn-cerrar-planes-footer');
  const cardPlanFree = document.getElementById('card-plan-free');
  const cardPlanPro = document.getElementById('card-plan-pro');
  const badgeCurrentFree = document.getElementById('badge-current-free');
  const btnSelectPlanFree = document.getElementById('btn-select-plan-free');
  const btnAbrirCheckout = document.getElementById('btn-abrir-checkout');

  // Elementos DOM - Pasarela de Pago Simulada
  const modalPago = document.getElementById('modal-pago-simulado');
  const btnCerrarPago = document.getElementById('btn-cerrar-pago');
  const btnCancelarPago = document.getElementById('btn-cancelar-pago');
  const formPagoSimulado = document.getElementById('form-pago-simulado');
  const btnConfirmarPago = document.getElementById('btn-confirmar-pago');
  const paymentSpinner = document.getElementById('payment-spinner');
  const paymentMethodCards = document.querySelectorAll('.payment-method-card');
  const fieldsCardPayment = document.getElementById('fields-card-payment');
  const fieldsPaypalPayment = document.getElementById('fields-paypal-payment');
  const btnAutollenarTarjeta = document.getElementById('btn-autollenar-tarjeta');
  const cardNumberInput = document.getElementById('card-number');
  const cardHolderInput = document.getElementById('card-holder');
  const cardExpiryInput = document.getElementById('card-expiry');
  const cardCvvInput = document.getElementById('card-cvv');
  const paypalEmailInput = document.getElementById('paypal-email');

  // Elementos DOM - Modal Celebración
  const modalPagoExito = document.getElementById('modal-pago-exito');
  const btnCerrarExitoPago = document.getElementById('btn-cerrar-exito-pago');

  // Elementos DOM - Modal Perfil
  const modalPerfil = document.getElementById('modal-perfil-usuario');
  const btnCerrarPerfil = document.getElementById('btn-cerrar-perfil');
  const btnCerrarPerfilFooter = document.getElementById('btn-cerrar-perfil-footer');
  const modalProfileAvatar = document.getElementById('modal-profile-avatar');
  const modalProfileName = document.getElementById('modal-profile-name');
  const modalProfileEmail = document.getElementById('modal-profile-email');
  const modalProfilePlanPill = document.getElementById('modal-profile-plan-pill');
  const modalProfileSubBadge = document.getElementById('modal-profile-sub-badge');
  const modalProfilePlanName = document.getElementById('modal-profile-plan-name');
  const modalProfilePlanPrice = document.getElementById('modal-profile-plan-price');
  const modalProfilePlanExpiry = document.getElementById('modal-profile-plan-expiry');
  const modalProfilePaymentMethod = document.getElementById('modal-profile-payment-method');
  const btnProfileUpgradeAction = document.getElementById('btn-profile-upgrade-action');
  const btnProfileResetDemo = document.getElementById('btn-profile-reset-demo');
  const btnModalLogout = document.getElementById('btn-modal-logout');

  function obtenerIniciales(nombre) {
    if (!nombre) return 'SF';
    const partes = nombre.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  function guardarSesionUsuario(recordar = true) {
    if (!usuarioActual) return;
    const dataStr = JSON.stringify(usuarioActual);
    if (recordar) {
      localStorage.setItem(STORAGE_KEY_AUTH_USER, dataStr);
    } else {
      sessionStorage.setItem(STORAGE_KEY_AUTH_USER, dataStr);
    }
  }

  function actualizarVisualesUsuarioYPlan() {
    if (!usuarioActual) return;

    const iniciales = obtenerIniciales(usuarioActual.name);
    const esPro = usuarioActual.plan === 'pro';

    // 1. Sidebar
    if (sidebarUserAvatar) sidebarUserAvatar.textContent = iniciales;
    if (sidebarUserName) sidebarUserName.textContent = usuarioActual.name;
    if (sidebarUserRolePlan) {
      if (esPro) {
        sidebarUserRolePlan.innerHTML = '<span class="badge-sub-dot" style="background:#F59E0B;box-shadow:0 0 8px rgba(245,158,11,0.6)"></span> ★ StockFlow PRO';
      } else {
        sidebarUserRolePlan.innerHTML = '<span class="badge-sub-dot"></span> Prueba (30d)';
      }
    }

    // 2. Topbar
    if (topbarAvatarInitials) topbarAvatarInitials.textContent = iniciales;
    if (topbarUserName) topbarUserName.textContent = usuarioActual.name;

    // 3. Dropdown Menu
    if (dropdownUserAvatar) dropdownUserAvatar.textContent = iniciales;
    if (dropdownUserName) dropdownUserName.textContent = usuarioActual.name;
    if (dropdownUserEmail) dropdownUserEmail.textContent = usuarioActual.email;
    if (dropdownPlanBadge) {
      if (esPro) {
        dropdownPlanBadge.textContent = 'PRO';
        dropdownPlanBadge.className = 'demo-tag plan-tag-pill badge-gold-pro';
      } else {
        dropdownPlanBadge.textContent = 'Prueba 30d';
        dropdownPlanBadge.className = 'demo-tag plan-tag-pill';
      }
    }

    // 4. Header Subscription Pill
    if (headerSubscriptionPill) {
      if (esPro) {
        headerSubscriptionPill.classList.add('is-pro-active');
        headerSubscriptionPill.title = 'Plan actual: StockFlow Pro ($5.99 / mes)';
      } else {
        headerSubscriptionPill.classList.remove('is-pro-active');
        headerSubscriptionPill.title = 'Plan actual: Prueba Gratuita 30 días';
      }
    }
    if (headerSubPlanName) {
      headerSubPlanName.textContent = esPro ? 'StockFlow Pro' : 'Prueba Gratuita';
    }
    if (headerSubPlanBadge) {
      headerSubPlanBadge.textContent = esPro ? 'PRO' : '30 días';
      if (esPro) {
        headerSubPlanBadge.style.background = 'rgba(245, 158, 11, 0.25)';
        headerSubPlanBadge.style.color = '#F59E0B';
      } else {
        headerSubPlanBadge.style.background = '';
        headerSubPlanBadge.style.color = '';
      }
    }
    if (headerSubPlanPrice) {
      headerSubPlanPrice.textContent = esPro ? '$5.99 / mes' : '$0.00 / mes';
    }
    if (btnHeaderUpgradePro) {
      if (esPro) {
        btnHeaderUpgradePro.innerHTML = '<span>★ Pro Activo</span>';
        btnHeaderUpgradePro.title = 'Gestionar suscripción StockFlow Pro';
      } else {
        btnHeaderUpgradePro.innerHTML = '<span>Mejorar a Pro</span> <span class="upgrade-price-tag">$5.99</span>';
        btnHeaderUpgradePro.title = 'Mejorar a StockFlow Pro por $5.99/mes';
      }
    }

    // 5. Modal de Planes
    if (badgeCurrentFree) {
      badgeCurrentFree.style.display = esPro ? 'none' : 'inline-block';
    }
    if (btnSelectPlanFree) {
      btnSelectPlanFree.textContent = esPro ? 'Prueba Finalizada' : 'Tu Plan Inicial (30 Días)';
    }
    if (btnAbrirCheckout) {
      if (esPro) {
        btnAbrirCheckout.innerHTML = '<span>Tu Plan Actual (StockFlow Pro)</span>';
        btnAbrirCheckout.classList.remove('btn-glow-gold');
      } else {
        btnAbrirCheckout.innerHTML = '<span>Obtener StockFlow Pro por $5.99/mes</span> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="9 18 15 12 9 6"></polyline></svg>';
        btnAbrirCheckout.classList.add('btn-glow-gold');
      }
    }

    // 6. Modal de Perfil
    if (modalProfileAvatar) modalProfileAvatar.textContent = iniciales;
    if (modalProfileName) modalProfileName.textContent = usuarioActual.name;
    if (modalProfileEmail) modalProfileEmail.textContent = usuarioActual.email;
    if (modalProfilePlanPill) {
      modalProfilePlanPill.textContent = esPro ? 'StockFlow PRO' : 'Prueba Gratuita (30d)';
    }
    if (modalProfileSubBadge) {
      modalProfileSubBadge.textContent = esPro ? 'Suscripción Activa' : 'Prueba Activa';
      modalProfileSubBadge.style.color = esPro ? '#F59E0B' : '#34D399';
    }
    if (modalProfilePlanName) {
      modalProfilePlanName.textContent = esPro ? 'StockFlow Pro ($5.99 / mes)' : 'Prueba Gratuita (30 días)';
    }
    if (modalProfilePlanPrice) {
      modalProfilePlanPrice.textContent = esPro ? '$5.99 USD / mes' : '$0.00 / mes';
    }
    if (modalProfilePlanExpiry) {
      modalProfilePlanExpiry.textContent = esPro ? 'Renovación mensual activa' : `${usuarioActual.trialDays || 30} días restantes`;
    }
    if (modalProfilePaymentMethod) {
      modalProfilePaymentMethod.textContent = esPro
        ? (usuarioActual.subMethod || 'Tarjeta de Crédito (Simulada)')
        : 'Ninguno (Periodo de gracia)';
    }
    if (btnProfileUpgradeAction) {
      if (esPro) {
        btnProfileUpgradeAction.innerHTML = '<span>★ Suscripción Pro Activa ($5.99/mes)</span>';
      } else {
        btnProfileUpgradeAction.innerHTML = '<span>Cambiar al Plan StockFlow Pro ($5.99/mes)</span>';
      }
    }

    if (cardHolderInput && (!cardHolderInput.value || cardHolderInput.value === 'Carlos Acereto')) {
      cardHolderInput.value = usuarioActual.name;
    }
  }

  function mostrarPanelAuth(panelId) {
    if (panelLogin) panelLogin.style.display = (panelId === 'panel-login') ? 'block' : 'none';
    if (panelRegister) panelRegister.style.display = (panelId === 'panel-register') ? 'block' : 'none';
    if (panelRecovery) panelRecovery.style.display = (panelId === 'panel-recovery') ? 'block' : 'none';

    if (panelId === 'panel-login') {
      if (tabBtnLogin) tabBtnLogin.classList.add('active');
      if (tabBtnRegister) tabBtnRegister.classList.remove('active');
    } else if (panelId === 'panel-register') {
      if (tabBtnRegister) tabBtnRegister.classList.add('active');
      if (tabBtnLogin) tabBtnLogin.classList.remove('active');
    } else {
      if (tabBtnLogin) tabBtnLogin.classList.remove('active');
      if (tabBtnRegister) tabBtnRegister.classList.remove('active');
    }
  }

  function abrirModalPlanes() {
    actualizarVisualesUsuarioYPlan();
    if (modalPlanes) {
      modalPlanes.classList.add('is-active');
      modalPlanes.setAttribute('aria-hidden', 'false');
    }
  }

  function cerrarModalPlanes() {
    if (modalPlanes) {
      modalPlanes.classList.remove('is-active');
      modalPlanes.setAttribute('aria-hidden', 'true');
    }
  }

  function abrirModalPago() {
    cerrarModalPlanes();
    cerrarModalPerfil();
    if (modalPago) {
      if (cardHolderInput && usuarioActual) {
        cardHolderInput.value = usuarioActual.name;
      }
      modalPago.classList.add('is-active');
      modalPago.setAttribute('aria-hidden', 'false');
    }
  }

  function cerrarModalPago() {
    if (modalPago) {
      modalPago.classList.remove('is-active');
      modalPago.setAttribute('aria-hidden', 'true');
    }
  }

  function abrirModalPagoExito() {
    if (modalPagoExito) {
      modalPagoExito.classList.add('is-active');
      modalPagoExito.setAttribute('aria-hidden', 'false');
    }
  }

  function cerrarModalPagoExito() {
    if (modalPagoExito) {
      modalPagoExito.classList.remove('is-active');
      modalPagoExito.setAttribute('aria-hidden', 'true');
    }
  }

  function abrirModalPerfil() {
    actualizarVisualesUsuarioYPlan();
    if (modalPerfil) {
      modalPerfil.classList.add('is-active');
      modalPerfil.setAttribute('aria-hidden', 'false');
    }
  }

  function cerrarModalPerfil() {
    if (modalPerfil) {
      modalPerfil.classList.remove('is-active');
      modalPerfil.setAttribute('aria-hidden', 'true');
    }
  }

  function cerrarSesionUsuario() {
    localStorage.removeItem(STORAGE_KEY_AUTH_USER);
    sessionStorage.removeItem(STORAGE_KEY_AUTH_USER);
    usuarioActual = null;

    cerrarModalProducto();
    cerrarModalAjusteStock();
    cerrarModalEliminar();
    if (typeof cerrarModalConfigSoporte === 'function') cerrarModalConfigSoporte();
    cerrarModalPlanes();
    cerrarModalPago();
    cerrarModalPagoExito();
    cerrarModalPerfil();

    if (userDropdownMenu) userDropdownMenu.style.display = 'none';
    if (userProfileWrapper) userProfileWrapper.classList.remove('is-open');

    if (authScreen) authScreen.style.display = 'flex';
    mostrarPanelAuth('panel-login');

    mostrarToast('Has cerrado sesión correctamente. ¡Hasta pronto!', 'success');
  }

  function inicializarEventosAuthYPro() {
    // Pestañas de Auth
    if (tabBtnLogin) tabBtnLogin.addEventListener('click', () => mostrarPanelAuth('panel-login'));
    if (tabBtnRegister) tabBtnRegister.addEventListener('click', () => mostrarPanelAuth('panel-register'));
    if (btnShowRecovery) btnShowRecovery.addEventListener('click', () => mostrarPanelAuth('panel-recovery'));
    if (btnBackToLogin) btnBackToLogin.addEventListener('click', () => mostrarPanelAuth('panel-login'));

    // Formulario de Inicio de Sesión
    if (formLogin) {
      formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = loginEmail ? loginEmail.value.trim().toLowerCase() : '';
        const password = loginPassword ? loginPassword.value : '';
        const recordar = loginRemember ? loginRemember.checked : true;

        if (!email) {
          mostrarToast('Por favor ingresa tu correo electrónico', 'error');
          loginEmail?.focus();
          return;
        }
        if (!password) {
          mostrarToast('Por favor ingresa tu contraseña', 'error');
          loginPassword?.focus();
          return;
        }

        let registrados = [];
        try {
          registrados = JSON.parse(localStorage.getItem(STORAGE_KEY_REGISTERED_USERS) || '[]');
        } catch (err) {
          registrados = [];
        }

        const coincidencia = registrados.find(u => u.email === email);
        let nombreFinal = 'Admin Inventario';
        if (coincidencia) {
          nombreFinal = coincidencia.name;
        } else if (email !== 'admin@stockflow.dev') {
          const partes = email.split('@')[0].split('.');
          nombreFinal = partes.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
        }

        usuarioActual = {
          name: nombreFinal,
          email: email,
          role: 'Administrador',
          plan: 'trial',
          trialDays: 30,
          trialStartDate: new Date().toISOString(),
          subMethod: null,
          subPrice: '$0.00 / mes',
          subStatus: 'Prueba Activa',
          subDate: null
        };

        guardarSesionUsuario(recordar);
        actualizarVisualesUsuarioYPlan();

        if (authScreen) authScreen.style.display = 'none';
        mostrarToast(`¡Bienvenido de nuevo, ${usuarioActual.name}!`, 'success');
      });
    }

    // Acceso Rápido de Demostración
    if (btnDemoQuickLogin) {
      btnDemoQuickLogin.addEventListener('click', (e) => {
        e.preventDefault();
        usuarioActual = { ...USUARIO_DEMO };
        guardarSesionUsuario(true);
        actualizarVisualesUsuarioYPlan();
        if (authScreen) authScreen.style.display = 'none';
        mostrarToast('¡Acceso Rápido de Demostración iniciado con éxito!', 'success');
      });
    }

    // Formulario de Registro con 30 días de Prueba Gratuita
    if (formRegister) {
      formRegister.addEventListener('submit', (e) => {
        e.preventDefault();
        const nombre = regName ? regName.value.trim() : '';
        const email = regEmail ? regEmail.value.trim().toLowerCase() : '';
        const password = regPassword ? regPassword.value : '';
        const confirm = regPasswordConfirm ? regPasswordConfirm.value : '';
        const terms = regTerms ? regTerms.checked : true;

        if (!nombre) {
          mostrarToast('Por favor ingresa tu nombre completo', 'error');
          regName?.focus();
          return;
        }
        if (!email || !/\S+@\S+\.\S+/.test(email)) {
          mostrarToast('Por favor ingresa un correo electrónico válido', 'error');
          regEmail?.focus();
          return;
        }
        if (!password || password.length < 6) {
          mostrarToast('La contraseña debe tener al menos 6 caracteres', 'error');
          regPassword?.focus();
          return;
        }
        if (password !== confirm) {
          mostrarToast('Las contraseñas no coinciden', 'error');
          regPasswordConfirm?.focus();
          return;
        }
        if (!terms) {
          mostrarToast('Debes aceptar los términos de la demostración para continuar', 'error');
          return;
        }

        const nuevoUsuario = {
          name: nombre,
          email: email,
          role: 'Administrador',
          plan: 'trial',
          trialDays: 30,
          trialStartDate: new Date().toISOString(),
          subMethod: null,
          subPrice: '$0.00 / mes',
          subStatus: 'Prueba Activa',
          subDate: null
        };

        let registrados = [];
        try {
          registrados = JSON.parse(localStorage.getItem(STORAGE_KEY_REGISTERED_USERS) || '[]');
        } catch (err) {
          registrados = [];
        }
        registrados.push({ email, password, name: nombre });
        localStorage.setItem(STORAGE_KEY_REGISTERED_USERS, JSON.stringify(registrados));

        usuarioActual = nuevoUsuario;
        guardarSesionUsuario(true);
        actualizarVisualesUsuarioYPlan();

        if (authScreen) authScreen.style.display = 'none';
        mostrarToast(`¡Bienvenido a StockFlow Pro, ${nombre}! Tu prueba gratuita de 30 días está activa.`, 'success');
      });
    }

    // Formulario de Recuperación de Contraseña
    if (formRecovery) {
      formRecovery.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = recoveryEmail ? recoveryEmail.value.trim() : '';
        if (!email || !/\S+@\S+\.\S+/.test(email)) {
          mostrarToast('Por favor ingresa un correo electrónico registrado válido', 'error');
          recoveryEmail?.focus();
          return;
        }
        if (recoverySuccessBox) {
          recoverySuccessBox.style.display = 'flex';
          recoverySuccessBox.innerHTML = `
            <span class="recovery-icon-circle">✓</span>
            <div>
              <strong>Enlace simulado enviado a ${escaparHTML(email)}</strong>
              <p>Se ha generado una instrucción simulada de restablecimiento. Para la demostración escolar puedes ingresar con la contraseña <code>admin123</code> o usar el botón de acceso rápido.</p>
            </div>
          `;
        }
        mostrarToast('Instrucciones simuladas enviadas al correo', 'success');
      });
    }

    // Triggers de Header y Sidebar
    if (headerSubscriptionPill) {
      headerSubscriptionPill.addEventListener('click', () => {
        if (usuarioActual && usuarioActual.plan === 'pro') {
          abrirModalPerfil();
        } else {
          abrirModalPlanes();
        }
      });
    }

    if (btnHeaderUpgradePro) {
      btnHeaderUpgradePro.addEventListener('click', (e) => {
        e.stopPropagation();
        if (usuarioActual && usuarioActual.plan === 'pro') {
          abrirModalPerfil();
        } else {
          abrirModalPlanes();
        }
      });
    }

    if (sidebarUserProfileBadge) {
      sidebarUserProfileBadge.addEventListener('click', abrirModalPerfil);
    }

    // Menú de usuario en topbar
    if (btnUserProfile && userDropdownMenu) {
      btnUserProfile.addEventListener('click', (e) => {
        e.stopPropagation();
        const estaAbierto = userDropdownMenu.style.display === 'block';
        if (estaAbierto) {
          userDropdownMenu.style.display = 'none';
          if (userProfileWrapper) userProfileWrapper.classList.remove('is-open');
          btnUserProfile.setAttribute('aria-expanded', 'false');
        } else {
          userDropdownMenu.style.display = 'block';
          if (userProfileWrapper) userProfileWrapper.classList.add('is-open');
          btnUserProfile.setAttribute('aria-expanded', 'true');
          if (notificationsPopover) notificationsPopover.style.display = 'none';
        }
      });

      document.addEventListener('click', (e) => {
        if (userProfileWrapper && !userProfileWrapper.contains(e.target)) {
          userDropdownMenu.style.display = 'none';
          userProfileWrapper.classList.remove('is-open');
          if (btnUserProfile) btnUserProfile.setAttribute('aria-expanded', 'false');
        }
      });
    }

    if (menuItemProfile) {
      menuItemProfile.addEventListener('click', () => {
        if (userDropdownMenu) userDropdownMenu.style.display = 'none';
        if (userProfileWrapper) userProfileWrapper.classList.remove('is-open');
        if (btnUserProfile) btnUserProfile.setAttribute('aria-expanded', 'false');
        abrirModalPerfil();
      });
    }

    if (menuItemPlanes) {
      menuItemPlanes.addEventListener('click', () => {
        if (userDropdownMenu) userDropdownMenu.style.display = 'none';
        if (userProfileWrapper) userProfileWrapper.classList.remove('is-open');
        if (btnUserProfile) btnUserProfile.setAttribute('aria-expanded', 'false');
        abrirModalPlanes();
      });
    }

    if (menuItemSettings) {
      menuItemSettings.addEventListener('click', () => {
        if (userDropdownMenu) userDropdownMenu.style.display = 'none';
        if (userProfileWrapper) userProfileWrapper.classList.remove('is-open');
        if (btnUserProfile) btnUserProfile.setAttribute('aria-expanded', 'false');
        cambiarVista('sistema');
        mostrarToast('Configuración: Parámetros del sistema y base de datos SQLite', 'success');
      });
    }

    if (menuItemLogout) {
      menuItemLogout.addEventListener('click', () => {
        if (userDropdownMenu) userDropdownMenu.style.display = 'none';
        if (userProfileWrapper) userProfileWrapper.classList.remove('is-open');
        if (btnUserProfile) btnUserProfile.setAttribute('aria-expanded', 'false');
        cerrarSesionUsuario();
      });
    }

    if (btnModalLogout) {
      btnModalLogout.addEventListener('click', cerrarSesionUsuario);
    }

    // Modal de Planes
    if (btnCerrarPlanes) btnCerrarPlanes.addEventListener('click', cerrarModalPlanes);
    if (btnCerrarPlanesFooter) btnCerrarPlanesFooter.addEventListener('click', cerrarModalPlanes);
    if (btnAbrirCheckout) {
      btnAbrirCheckout.addEventListener('click', () => {
        if (usuarioActual && usuarioActual.plan === 'pro') {
          mostrarToast('Ya tienes activo el plan StockFlow Pro ($5.99/mes)', 'success');
        } else {
          abrirModalPago();
        }
      });
    }

    // Modal de Pago Simulado
    if (btnCerrarPago) btnCerrarPago.addEventListener('click', cerrarModalPago);
    if (btnCancelarPago) btnCancelarPago.addEventListener('click', cerrarModalPago);

    // Selector de métodos de pago
    paymentMethodCards.forEach(card => {
      card.addEventListener('click', () => {
        paymentMethodCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;

        const val = radio ? radio.value : 'credit';
        if (val === 'paypal') {
          if (fieldsCardPayment) fieldsCardPayment.style.display = 'none';
          if (fieldsPaypalPayment) fieldsPaypalPayment.style.display = 'block';
        } else {
          if (fieldsCardPayment) fieldsCardPayment.style.display = 'block';
          if (fieldsPaypalPayment) fieldsPaypalPayment.style.display = 'none';
        }
      });
    });

    // Autollenar tarjeta de prueba
    if (btnAutollenarTarjeta) {
      btnAutollenarTarjeta.addEventListener('click', (e) => {
        e.preventDefault();
        if (cardNumberInput) cardNumberInput.value = '4242 4242 4242 4242';
        if (cardHolderInput) cardHolderInput.value = (usuarioActual && usuarioActual.name) ? usuarioActual.name : 'Carlos Acereto';
        if (cardExpiryInput) cardExpiryInput.value = '12/28';
        if (cardCvvInput) cardCvvInput.value = '123';
        mostrarToast('Datos de tarjeta simulada cargados correctamente', 'success');
      });
    }

    // Máscaras de formateo en inputs de tarjeta
    if (cardNumberInput) {
      cardNumberInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '').substring(0, 16);
        val = val.match(/.{1,4}/g)?.join(' ') || val;
        e.target.value = val;
      });
    }
    if (cardExpiryInput) {
      cardExpiryInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '').substring(0, 4);
        if (val.length >= 2) {
          val = val.substring(0, 2) + '/' + val.substring(2);
        }
        e.target.value = val;
      });
    }
    if (cardCvvInput) {
      cardCvvInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
      });
    }

    // Submit del pago simulado
    if (formPagoSimulado) {
      formPagoSimulado.addEventListener('submit', (e) => {
        e.preventDefault();
        const radioSeleccionado = document.querySelector('input[name="payment_method"]:checked');
        const metodo = radioSeleccionado ? radioSeleccionado.value : 'credit';

        let metodoTexto = '';

        if (metodo === 'paypal') {
          const emailPaypal = paypalEmailInput ? paypalEmailInput.value.trim() : '';
          if (!emailPaypal || !/\S+@\S+\.\S+/.test(emailPaypal)) {
            mostrarToast('Ingresa un correo electrónico de PayPal válido', 'error');
            paypalEmailInput?.focus();
            return;
          }
          metodoTexto = `PayPal (${emailPaypal})`;
        } else {
          const numTarjeta = cardNumberInput ? cardNumberInput.value.replace(/\s+/g, '') : '';
          const titular = cardHolderInput ? cardHolderInput.value.trim() : '';
          const exp = cardExpiryInput ? cardExpiryInput.value.trim() : '';
          const cvv = cardCvvInput ? cardCvvInput.value.trim() : '';

          if (!numTarjeta || numTarjeta.length < 15) {
            mostrarToast('Ingresa un número de tarjeta de 16 dígitos', 'error');
            cardNumberInput?.focus();
            return;
          }
          if (!titular) {
            mostrarToast('Ingresa el nombre del titular de la tarjeta', 'error');
            cardHolderInput?.focus();
            return;
          }
          if (!exp || exp.length < 5) {
            mostrarToast('Ingresa la fecha de expiración en formato MM/AA', 'error');
            cardExpiryInput?.focus();
            return;
          }
          if (!cvv || cvv.length < 3) {
            mostrarToast('Ingresa el código CVV de 3 o 4 dígitos', 'error');
            cardCvvInput?.focus();
            return;
          }

          const ultimos4 = numTarjeta.slice(-4);
          const tipoTarj = metodo === 'debit' ? 'Tarjeta de Débito' : 'Tarjeta de Crédito';
          metodoTexto = `${tipoTarj} (•••• ${ultimos4})`;
        }

        // Simulación de procesamiento
        if (btnConfirmarPago) btnConfirmarPago.disabled = true;
        if (paymentSpinner) paymentSpinner.style.display = 'inline-block';

        setTimeout(() => {
          if (btnConfirmarPago) btnConfirmarPago.disabled = false;
          if (paymentSpinner) paymentSpinner.style.display = 'none';

          if (usuarioActual) {
            usuarioActual.plan = 'pro';
            usuarioActual.subMethod = metodoTexto;
            usuarioActual.subPrice = '$5.99 / mes';
            usuarioActual.subStatus = 'Suscripción Activa';
            usuarioActual.subDate = new Date().toLocaleDateString('es-ES');
            guardarSesionUsuario();
            actualizarVisualesUsuarioYPlan();
          }

          cerrarModalPago();
          abrirModalPagoExito();
          mostrarToast('¡Felicidades! Tu cuenta se ha cambiado al plan StockFlow Pro ($5.99 / mes).', 'success');
        }, 750);
      });
    }

    // Modal de Celebración
    if (btnCerrarExitoPago) btnCerrarExitoPago.addEventListener('click', cerrarModalPagoExito);

    // Modal de Perfil
    if (btnCerrarPerfil) btnCerrarPerfil.addEventListener('click', cerrarModalPerfil);
    if (btnCerrarPerfilFooter) btnCerrarPerfilFooter.addEventListener('click', cerrarModalPerfil);
    if (btnProfileUpgradeAction) {
      btnProfileUpgradeAction.addEventListener('click', () => {
        if (usuarioActual && usuarioActual.plan === 'trial') {
          cerrarModalPerfil();
          abrirModalPago();
        } else {
          mostrarToast('Tu suscripción a StockFlow Pro está activa por $5.99/mes', 'success');
        }
      });
    }
    if (btnProfileResetDemo) {
      btnProfileResetDemo.addEventListener('click', () => {
        if (usuarioActual) {
          usuarioActual.plan = 'trial';
          usuarioActual.subMethod = null;
          usuarioActual.subPrice = '$0.00 / mes';
          usuarioActual.subStatus = 'Prueba Activa';
          usuarioActual.subDate = null;
          usuarioActual.trialDays = 30;
          guardarSesionUsuario();
          actualizarVisualesUsuarioYPlan();
          mostrarToast('Simulación restablecida: Modo prueba gratuita de 30 días activado.', 'success');
        }
      });
    }

    // Cierre de modal al hacer clic en el backdrop oscuro
    const modalesApp = [
      modalProducto,
      modalAjusteStock,
      modalEliminar,
      modalPlanes,
      modalPago,
      modalPagoExito,
      modalPerfil,
      document.getElementById('modal-config-soporte')
    ];

    modalesApp.forEach(m => {
      if (m) {
        m.addEventListener('click', (e) => {
          if (e.target === m) {
            cerrarModalProducto();
            cerrarModalAjusteStock();
            cerrarModalEliminar();
            cerrarModalPlanes();
            cerrarModalPago();
            cerrarModalPagoExito();
            cerrarModalPerfil();
            if (typeof cerrarModalConfigSoporte === 'function') cerrarModalConfigSoporte();
          }
        });
      }
    });
  }

  function inicializarAuthYSuscripcion() {
    let sesionGuardada = null;
    try {
      sesionGuardada = localStorage.getItem(STORAGE_KEY_AUTH_USER) || sessionStorage.getItem(STORAGE_KEY_AUTH_USER);
      if (sesionGuardada) {
        usuarioActual = JSON.parse(sesionGuardada);
      }
    } catch (e) {
      usuarioActual = null;
    }

    inicializarEventosAuthYPro();

    if (usuarioActual) {
      if (authScreen) authScreen.style.display = 'none';
      actualizarVisualesUsuarioYPlan();
    } else {
      if (authScreen) authScreen.style.display = 'flex';
      mostrarPanelAuth('panel-login');
    }
  }

  // ==========================================================================
  // MÓDULO DE SOPORTE TÉCNICO, DIAGNÓSTICO & CANALES DE ASISTENCIA
  // ==========================================================================

  const STORAGE_KEY_SOPORTE_CONFIG = 'stockflow_support_config';
  const STORAGE_KEY_SOPORTE_LOGS = 'stockflow_error_logs';

  let soporteConfig = {
    whatsapp: '+52 55 1234 5678',
    email: 'soporte@stockflow.dev'
  };

  let registroErroresSistema = [];
  let filtroLogActual = 'todos';
  let ultimoDiagnostico = null;

  // Elementos DOM de Soporte
  const soporteWhatsappNumeroText = document.getElementById('soporte-whatsapp-numero-text');
  const soporteEmailText = document.getElementById('soporte-email-text');
  const btnAbrirWhatsapp = document.getElementById('btn-abrir-whatsapp');
  const btnAbrirEmail = document.getElementById('btn-abrir-email');
  const btnCopiarWhatsapp = document.getElementById('btn-copiar-whatsapp');
  const btnCopiarEmail = document.getElementById('btn-copiar-email');

  const healthApiLatency = document.getElementById('health-api-latency');
  const healthDbStatus = document.getElementById('health-db-status');
  const healthErrorsCount = document.getElementById('health-errors-count');
  const badgeSystemHealthStatus = document.getElementById('badge-system-health-status');
  const badgeSystemHealthText = document.getElementById('badge-system-health-text');
  const btnEjecutarTestRapido = document.getElementById('btn-ejecutar-test-rapido');
  const btnTestText = document.getElementById('btn-test-text');
  const btnEjecutarDiagnosticoHeader = document.getElementById('btn-ejecutar-diagnostico-header');

  const checkApiDesc = document.getElementById('check-api-desc');
  const checkDbDesc = document.getElementById('check-db-desc');
  const checkNetworkDesc = document.getElementById('check-network-desc');
  const checkStorageDesc = document.getElementById('check-storage-desc');
  const checkApiIcon = document.getElementById('check-api-icon');
  const checkDbIcon = document.getElementById('check-db-icon');
  const checkNetworkIcon = document.getElementById('check-network-icon');
  const checkStorageIcon = document.getElementById('check-storage-icon');

  const errorLogList = document.getElementById('error-log-list');
  const badgeTotalErroresLog = document.getElementById('badge-total-errores-log');
  const logChips = document.querySelectorAll('.log-chip');
  const btnSimularError = document.getElementById('btn-simular-error');
  const btnLimpiarRegistroErrores = document.getElementById('btn-limpiar-registro-errores');

  const ticketTipo = document.getElementById('ticket-tipo');
  const ticketUrgencia = document.getElementById('ticket-urgencia');
  const ticketDescripcion = document.getElementById('ticket-descripcion');
  const ticketIncluirDiagnostico = document.getElementById('ticket-incluir-diagnostico');
  const errorTicketDesc = document.getElementById('error-ticket-desc');
  const charCountTicket = document.getElementById('char-count-ticket');
  const btnEnviarTicketWhatsapp = document.getElementById('btn-enviar-ticket-whatsapp');
  const btnEnviarTicketEmail = document.getElementById('btn-enviar-ticket-email');
  const btnCopiarTicketCompleto = document.getElementById('btn-copiar-ticket-completo');

  const faqSearchInput = document.getElementById('faq-search-input');
  const faqItems = document.querySelectorAll('.faq-item');

  const btnHeaderSupport = document.getElementById('btn-header-support');
  const menuItemSupport = document.getElementById('menu-item-support');
  const btnFloatingSupport = document.getElementById('btn-floating-support');
  const navSupportBadge = document.getElementById('nav-support-badge');

  const modalConfigSoporte = document.getElementById('modal-config-soporte');
  const btnAbrirConfigSoporte = document.getElementById('btn-abrir-config-soporte');
  const btnCerrarConfigSoporte = document.getElementById('btn-cerrar-config-soporte');
  const btnCancelarConfigSoporte = document.getElementById('btn-cancelar-config-soporte');
  const formConfigSoporte = document.getElementById('form-config-soporte');
  const cfgWhatsappNumero = document.getElementById('cfg-whatsapp-numero');
  const cfgEmailSoporte = document.getElementById('cfg-email-soporte');

  // Carga inicial de configuración
  function cargarConfiguracionSoporte() {
    try {
      const guardado = localStorage.getItem(STORAGE_KEY_SOPORTE_CONFIG);
      if (guardado) {
        const parsed = JSON.parse(guardado);
        if (parsed.whatsapp) soporteConfig.whatsapp = parsed.whatsapp;
        if (parsed.email) soporteConfig.email = parsed.email;
      }
    } catch (e) {
      console.warn('No se pudo cargar la configuración de soporte desde localStorage:', e);
    }

    try {
      const logsGuardados = sessionStorage.getItem(STORAGE_KEY_SOPORTE_LOGS);
      if (logsGuardados) {
        registroErroresSistema = JSON.parse(logsGuardados);
      }
    } catch (e) {
      registroErroresSistema = [];
    }

    actualizarVisualesConfigSoporte();
    renderizarListaErrores(filtroLogActual);
  }

  function actualizarVisualesConfigSoporte() {
    if (soporteWhatsappNumeroText) soporteWhatsappNumeroText.textContent = soporteConfig.whatsapp;
    if (soporteEmailText) soporteEmailText.textContent = soporteConfig.email;

    const numLimpio = soporteConfig.whatsapp.replace(/\D/g, '');
    const msgPre = encodeURIComponent('Hola equipo de Soporte StockFlow, requiero asistencia técnica con la plataforma.');
    if (btnAbrirWhatsapp) {
      btnAbrirWhatsapp.href = `https://wa.me/${numLimpio}?text=${msgPre}`;
    }

    if (btnAbrirEmail) {
      const asunto = encodeURIComponent('[StockFlow] Consulta / Soporte Técnico');
      const cuerpo = encodeURIComponent('Hola equipo técnico,\n\nSolicito apoyo con la plataforma StockFlow con el siguiente detalle:\n\n');
      btnAbrirEmail.href = `mailto:${soporteConfig.email}?subject=${asunto}&body=${cuerpo}`;
    }

    actualizarContadoresErrores();
  }

  function actualizarContadoresErrores() {
    const total = registroErroresSistema.length;
    if (healthErrorsCount) healthErrorsCount.textContent = total;
    if (badgeTotalErroresLog) badgeTotalErroresLog.textContent = `${total} ${total === 1 ? 'evento' : 'eventos'}`;

    if (navSupportBadge) {
      if (total > 0) {
        navSupportBadge.textContent = `${total} ${total === 1 ? 'error' : 'errores'}`;
        navSupportBadge.style.background = 'rgba(239, 68, 68, 0.18)';
        navSupportBadge.style.color = '#F87171';
        navSupportBadge.style.borderColor = 'rgba(239, 68, 68, 0.35)';
      } else {
        navSupportBadge.textContent = '24/7';
        navSupportBadge.style.background = 'rgba(16, 185, 129, 0.16)';
        navSupportBadge.style.color = '#34D399';
        navSupportBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      }
    }
  }

  function guardarConfigSoporte(e) {
    if (e) e.preventDefault();
    const tel = cfgWhatsappNumero ? cfgWhatsappNumero.value.trim() : '';
    const mail = cfgEmailSoporte ? cfgEmailSoporte.value.trim() : '';

    if (!tel || !mail) {
      mostrarToast('Por favor completa tanto el teléfono como el correo.', 'error');
      return;
    }

    soporteConfig.whatsapp = tel;
    soporteConfig.email = mail;

    try {
      localStorage.setItem(STORAGE_KEY_SOPORTE_CONFIG, JSON.stringify(soporteConfig));
      mostrarToast('Configuración de soporte guardada correctamente', 'success');
    } catch (err) {
      console.error('Error al guardar configuración de soporte:', err);
    }

    actualizarVisualesConfigSoporte();
    cerrarModalConfigSoporte();
  }

  function abrirModalConfigSoporte() {
    if (!modalConfigSoporte) return;
    if (cfgWhatsappNumero) cfgWhatsappNumero.value = soporteConfig.whatsapp;
    if (cfgEmailSoporte) cfgEmailSoporte.value = soporteConfig.email;
    modalConfigSoporte.classList.add('active');
    modalConfigSoporte.setAttribute('aria-hidden', 'false');
  }

  function cerrarModalConfigSoporte() {
    if (!modalConfigSoporte) return;
    modalConfigSoporte.classList.remove('active');
    modalConfigSoporte.setAttribute('aria-hidden', 'true');
  }

  // Registro y Consulta de Errores de la Web
  function registrarErrorSistema(tipo, codigo, endpoint, mensaje, detalle = '') {
    const ahora = new Date();
    const horaFormateada = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const nuevoError = {
      id: 'err_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      tipo: tipo || 'red',
      codigo: codigo || 'ERROR',
      endpoint: endpoint || '/api',
      mensaje: mensaje || 'Error no especificado',
      detalle: detalle || '',
      hora: horaFormateada,
      timestamp: ahora.toISOString()
    };

    // Prevenir duplicados idénticos inmediatos en menos de 2 segundos
    const ultimo = registroErroresSistema[0];
    if (ultimo && ultimo.codigo === nuevoError.codigo && ultimo.mensaje === nuevoError.mensaje && (Date.now() - new Date(ultimo.timestamp).getTime()) < 2000) {
      return;
    }

    registroErroresSistema.unshift(nuevoError);
    if (registroErroresSistema.length > 50) {
      registroErroresSistema.pop();
    }

    try {
      sessionStorage.setItem(STORAGE_KEY_SOPORTE_LOGS, JSON.stringify(registroErroresSistema));
    } catch (e) {
      // Ignorar si sessionStorage no está disponible
    }

    actualizarContadoresErrores();
    renderizarListaErrores(filtroLogActual);
  }

  function limpiarRegistroErrores() {
    registroErroresSistema = [];
    try {
      sessionStorage.removeItem(STORAGE_KEY_SOPORTE_LOGS);
    } catch (e) {}
    actualizarContadoresErrores();
    renderizarListaErrores('todos');
    mostrarToast('Registro de incidencias vaciado.', 'success');
  }

  function simularErrorPrueba() {
    const tiposPrueba = [
      {
        tipo: 'validacion',
        codigo: 'HTTP 422',
        endpoint: '/api/v1/productos',
        mensaje: 'Error de validación simulado: El precio unitario debe ser estrictamente mayor a $0.00'
      },
      {
        tipo: 'red',
        codigo: 'HTTP 500',
        endpoint: '/api/v1/productos/999',
        mensaje: 'Fallo simulado de conexión con el microservicio de persistencia SQLite'
      },
      {
        tipo: 'excepcion',
        codigo: 'JS_TYPE_ERROR',
        endpoint: 'app.js:142',
        mensaje: 'Excepción simulada: Cannot read properties of undefined (reading "calcularValorStock")'
      }
    ];

    const muestra = tiposPrueba[Math.floor(Math.random() * tiposPrueba.length)];
    registrarErrorSistema(muestra.tipo, muestra.codigo, muestra.endpoint, muestra.mensaje);
    mostrarToast('Error de prueba registrado en la consola de soporte.', 'success');

    // Desplazar suavemente a la consola de soporte
    const consola = document.querySelector('.support-console-wrapper');
    if (consola && vistaActual === 'soporte') {
      consola.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function renderizarListaErrores(filtro = 'todos') {
    if (!errorLogList) return;

    filtroLogActual = filtro;
    const items = registroErroresSistema.filter(err => {
      if (filtro === 'todos') return true;
      return err.tipo === filtro;
    });

    if (items.length === 0) {
      errorLogList.innerHTML = `
        <div class="error-log-empty" id="error-log-empty">
          <div class="empty-shield-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <polyline points="9 12 11 14 15 10"></polyline>
            </svg>
          </div>
          <h4 class="empty-title">Sin errores ni caídas registradas</h4>
          <p class="empty-desc">
            La plataforma no ha detectado fallos en esta sesión. Todo el tráfico hacia la API y la interfaz está funcionando con normalidad. Si deseas probar cómo se reporta una falla, pulsa el botón "Simular Error de Prueba".
          </p>
        </div>
      `;
      return;
    }

    errorLogList.innerHTML = items.map(err => {
      const claseTipo = err.tipo === 'validacion' ? 'item-type-validacion' : (err.tipo === 'info' ? 'item-type-info' : '');
      return `
        <div class="error-log-item ${claseTipo}" data-error-id="${err.id}">
          <div class="log-item-header">
            <div class="log-item-meta">
              <span class="log-code-badge">${escaparHTML(err.codigo)}</span>
              <span class="log-time-stamp">${escaparHTML(err.hora)}</span>
              <span class="log-endpoint-badge">${escaparHTML(err.endpoint)}</span>
            </div>
          </div>
          <div class="log-item-body">
            <span>${escaparHTML(err.mensaje)}</span>
            ${err.detalle ? `<br><code>${escaparHTML(err.detalle)}</code>` : ''}
          </div>
          <div class="log-item-actions">
            <button class="btn-log-action btn-log-whatsapp" data-action="whatsapp" data-id="${err.id}" title="Consultar este error vía WhatsApp">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
              <span>Consultar en WhatsApp</span>
            </button>
            <button class="btn-log-action btn-log-email" data-action="email" data-id="${err.id}" title="Consultar este error vía Correo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <span>Consultar por Correo</span>
            </button>
            <button class="btn-log-action" data-action="copiar" data-id="${err.id}" title="Copiar detalle del error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copiar</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Event listeners para acciones de cada error
    errorLogList.querySelectorAll('.btn-log-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const accion = btn.getAttribute('data-action');
        const errObj = registroErroresSistema.find(x => x.id === id);
        if (!errObj) return;

        if (accion === 'whatsapp') {
          consultarErrorEnWhatsApp(errObj);
        } else if (accion === 'email') {
          consultarErrorEnEmail(errObj);
        } else if (accion === 'copiar') {
          const texto = `[StockFlow Error] ${errObj.codigo} en ${errObj.endpoint} (${errObj.hora}): ${errObj.mensaje}`;
          navigator.clipboard.writeText(texto).then(() => {
            mostrarToast('Detalle del error copiado al portapapeles', 'success');
          });
        }
      });
    });
  }

  function consultarErrorEnWhatsApp(err) {
    const numLimpio = soporteConfig.whatsapp.replace(/\D/g, '');
    const mensaje = `🚨 *StockFlow | Consulta de Error en la Web*
📅 *Hora:* ${err.hora}
🏷️ *Código:* ${err.codigo}
🔗 *Endpoint / Origen:* ${err.endpoint}
📝 *Mensaje:* ${err.mensaje}

⚙️ *Telemetría:*
- Navegador: ${navigator.userAgent.split(' ')[0]}
- Plataforma: ${navigator.platform || 'Web'}
- Latencia API: ${healthApiLatency ? healthApiLatency.textContent : 'N/A'}

_Solicito soporte técnico para solucionar este problema._`;

    const url = `https://wa.me/${numLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function consultarErrorEnEmail(err) {
    const asunto = `[StockFlow Error] ${err.codigo} en ${err.endpoint}`;
    const cuerpo = `Hola equipo de soporte técnico,

He detectado el siguiente error en la plataforma StockFlow y requiero asistencia:

- Código: ${err.codigo}
- Hora de detección: ${err.hora}
- Endpoint / Componente: ${err.endpoint}
- Mensaje del sistema: ${err.mensaje}
${err.detalle ? `- Detalle técnico: ${err.detalle}\n` : ''}
Información de entorno:
- Navegador: ${navigator.userAgent}
- URL actual: ${window.location.href}

Saludos cordiales,
Admin Inventario`;

    const mailto = `mailto:${soporteConfig.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    window.location.href = mailto;
  }

  // Diagnóstico en Tiempo Real
  async function ejecutarDiagnosticoSistema(mostrarFeedback = true) {
    if (btnTestText) btnTestText.textContent = 'Diagnosticando...';
    if (btnEjecutarTestRapido) btnEjecutarTestRapido.disabled = true;

    const tInicio = performance.now();
    let apiOk = false;
    let latenciaMs = 0;
    let infoData = null;

    try {
      const res = await fetch(`${API_BASE}/sistema/diagnostico`, { cache: 'no-store' });
      const tFin = performance.now();
      latenciaMs = Math.round(tFin - tInicio);

      if (res.ok) {
        apiOk = true;
        infoData = await res.json();
      }
    } catch (err) {
      apiOk = false;
    }

    ultimoDiagnostico = {
      apiOk,
      latenciaMs,
      infoData,
      networkOnline: navigator.onLine,
      storageOk: true,
      fecha: new Date().toLocaleTimeString('es-ES')
    };

    // Actualizar Checklist UI
    if (checkApiDesc && checkApiIcon) {
      if (apiOk) {
        checkApiDesc.textContent = `Operativo (${latenciaMs} ms) • FastAPI v0.111+`;
        checkApiIcon.className = 'check-icon-circle check-success';
        checkApiIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      } else {
        checkApiDesc.textContent = 'Sin respuesta en http://127.0.0.1:8000';
        checkApiIcon.className = 'check-icon-circle check-danger';
        checkApiIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
      }
    }

    if (checkDbDesc && checkDbIcon) {
      if (apiOk && infoData && infoData.base_datos === 'conectada') {
        checkDbDesc.textContent = `SQLite activa • ${infoData.total_productos} productos registrados (${infoData.latencia_db_ms} ms)`;
        checkDbIcon.className = 'check-icon-circle check-success';
        checkDbIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        if (healthDbStatus) healthDbStatus.textContent = 'Conectada';
      } else {
        checkDbDesc.textContent = 'Estado de base de datos no accesible';
        checkDbIcon.className = 'check-icon-circle check-warning';
        checkDbIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
        if (healthDbStatus) healthDbStatus.textContent = 'Alerta';
      }
    }

    if (checkNetworkDesc && checkNetworkIcon) {
      const online = navigator.onLine;
      checkNetworkDesc.textContent = online ? 'Conexión activa a internet' : 'Modo fuera de línea (Offline)';
      checkNetworkIcon.className = online ? 'check-icon-circle check-success' : 'check-icon-circle check-danger';
    }

    if (checkStorageDesc && checkStorageIcon) {
      try {
        localStorage.setItem('__sf_test__', '1');
        localStorage.removeItem('__sf_test__');
        checkStorageDesc.textContent = 'LocalStorage y SessionStorage activos';
        checkStorageIcon.className = 'check-icon-circle check-success';
      } catch (e) {
        checkStorageDesc.textContent = 'Almacenamiento local restringido';
        checkStorageIcon.className = 'check-icon-circle check-warning';
      }
    }

    if (healthApiLatency) {
      healthApiLatency.textContent = apiOk ? `${latenciaMs} ms` : 'Inaccesible';
      healthApiLatency.className = apiOk ? 'kpi-val text-emerald' : 'kpi-val text-danger';
    }

    if (badgeSystemHealthStatus && badgeSystemHealthText) {
      if (apiOk && navigator.onLine) {
        badgeSystemHealthText.textContent = 'Sistema Estable';
        badgeSystemHealthStatus.className = 'channel-meta-badge badge-health';
      } else {
        badgeSystemHealthText.textContent = 'Alerta de Conexión';
        badgeSystemHealthStatus.className = 'channel-meta-badge badge-warning';
      }
    }

    if (btnTestText) btnTestText.textContent = 'Probar Conectividad';
    if (btnEjecutarTestRapido) btnEjecutarTestRapido.disabled = false;

    if (mostrarFeedback) {
      if (apiOk) {
        mostrarToast(`Diagnóstico completado: Backend FastAPI respondiendo en ${latenciaMs} ms`, 'success');
      } else {
        mostrarToast('Alerta: No se pudo contactar con el backend FastAPI.', 'error');
        registrarErrorSistema('red', 'ERR_HEALTH_CHECK', `${API_BASE}/sistema/diagnostico`, 'Fallo en la prueba de conectividad con la API');
      }
    }
  }

  // Generador de Ticket / Consulta Técnica
  function construirReporteTexto() {
    const tipo = ticketTipo ? ticketTipo.value : 'Problema general';
    const urgencia = ticketUrgencia ? ticketUrgencia.value : 'Normal';
    const desc = ticketDescripcion ? ticketDescripcion.value.trim() : '';
    const conDiag = ticketIncluirDiagnostico ? ticketIncluirDiagnostico.checked : true;

    let reporte = `*🚨 STOCKFLOW | REPORTE TÉCNICO & CONSULTA*\n`;
    reporte += `📅 *Fecha:* ${new Date().toLocaleString('es-ES')}\n`;
    reporte += `👤 *Usuario:* Admin Inventario\n`;
    reporte += `🏷️ *Categoría:* ${tipo}\n`;
    reporte += `⚠️ *Prioridad:* ${urgencia}\n\n`;
    reporte += `📝 *Descripción del problema:*\n${desc || '(Sin descripción provista)'}\n`;

    if (conDiag) {
      const ultimoError = registroErroresSistema[0];
      reporte += `\n⚙️ *Telemetría y Diagnóstico Técnico:*\n`;
      reporte += `- Navegador: ${navigator.userAgent.split(' ')[0]}\n`;
      reporte += `- Resolución: ${window.innerWidth}x${window.innerHeight}\n`;
      reporte += `- Conectividad: ${navigator.onLine ? 'En línea' : 'Desconectado'}\n`;
      reporte += `- Latencia API: ${healthApiLatency ? healthApiLatency.textContent : 'N/A'}\n`;
      reporte += `- Base SQLite: ${healthDbStatus ? healthDbStatus.textContent : 'N/A'}\n`;
      if (ultimoError) {
        reporte += `- Último Error Detectado: [${ultimoError.codigo}] ${ultimoError.mensaje} (${ultimoError.hora})\n`;
      } else {
        reporte += `- Estado de Errores: 0 incidencias registradas en la sesión\n`;
      }
    }

    return reporte;
  }

  function enviarTicketPorWhatsApp() {
    const desc = ticketDescripcion ? ticketDescripcion.value.trim() : '';
    if (!desc) {
      if (errorTicketDesc) errorTicketDesc.textContent = 'Por favor escribe una breve descripción del problema.';
      if (ticketDescripcion) ticketDescripcion.focus();
      return;
    }
    if (errorTicketDesc) errorTicketDesc.textContent = '';

    const numLimpio = soporteConfig.whatsapp.replace(/\D/g, '');
    const reporte = construirReporteTexto();
    const url = `https://wa.me/${numLimpio}?text=${encodeURIComponent(reporte)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    mostrarToast('Abriendo WhatsApp con tu consulta técnica...', 'success');
  }

  function enviarTicketPorEmail() {
    const desc = ticketDescripcion ? ticketDescripcion.value.trim() : '';
    if (!desc) {
      if (errorTicketDesc) errorTicketDesc.textContent = 'Por favor escribe una breve descripción del problema.';
      if (ticketDescripcion) ticketDescripcion.focus();
      return;
    }
    if (errorTicketDesc) errorTicketDesc.textContent = '';

    const tipo = ticketTipo ? ticketTipo.value : 'Consulta';
    const asunto = `[StockFlow Soporte] ${tipo}`;
    const cuerpo = construirReporteTexto().replace(/\*/g, '');
    const mailto = `mailto:${soporteConfig.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    window.location.href = mailto;
    mostrarToast('Abriendo tu gestor de correo con el reporte...', 'success');
  }

  function copiarTicketCompleto() {
    const desc = ticketDescripcion ? ticketDescripcion.value.trim() : '';
    if (!desc) {
      if (errorTicketDesc) errorTicketDesc.textContent = 'Por favor escribe una breve descripción antes de copiar.';
      return;
    }
    if (errorTicketDesc) errorTicketDesc.textContent = '';

    const reporte = construirReporteTexto();
    navigator.clipboard.writeText(reporte).then(() => {
      mostrarToast('Reporte técnico copiado al portapapeles', 'success');
    }).catch(() => {
      mostrarToast('No se pudo copiar al portapapeles', 'error');
    });
  }

  // Inicialización de la vista de soporte
  function inicializarModuloSoporte() {
    actualizarVisualesConfigSoporte();
    ejecutarDiagnosticoSistema(false);
  }

  // Event Listeners del Módulo de Soporte
  function inicializarEventosSoporte() {
    // Copiar contactos directos
    if (btnCopiarWhatsapp) {
      btnCopiarWhatsapp.addEventListener('click', (e) => {
        e.preventDefault();
        navigator.clipboard.writeText(soporteConfig.whatsapp).then(() => {
          mostrarToast('Número de WhatsApp copiado al portapapeles', 'success');
        });
      });
    }

    if (btnCopiarEmail) {
      btnCopiarEmail.addEventListener('click', (e) => {
        e.preventDefault();
        navigator.clipboard.writeText(soporteConfig.email).then(() => {
          mostrarToast('Correo de soporte copiado al portapapeles', 'success');
        });
      });
    }

    // Modal Configuración
    if (btnAbrirConfigSoporte) btnAbrirConfigSoporte.addEventListener('click', abrirModalConfigSoporte);
    if (btnCerrarConfigSoporte) btnCerrarConfigSoporte.addEventListener('click', cerrarModalConfigSoporte);
    if (btnCancelarConfigSoporte) btnCancelarConfigSoporte.addEventListener('click', cerrarModalConfigSoporte);
    if (formConfigSoporte) formConfigSoporte.addEventListener('submit', guardarConfigSoporte);

    // Diagnósticos
    if (btnEjecutarTestRapido) btnEjecutarTestRapido.addEventListener('click', () => ejecutarDiagnosticoSistema(true));
    if (btnEjecutarDiagnosticoHeader) btnEjecutarDiagnosticoHeader.addEventListener('click', () => ejecutarDiagnosticoSistema(true));

    // Consola de Errores
    if (btnSimularError) btnSimularError.addEventListener('click', simularErrorPrueba);
    if (btnLimpiarRegistroErrores) btnLimpiarRegistroErrores.addEventListener('click', limpiarRegistroErrores);

    // Filtros de chips
    logChips.forEach(chip => {
      chip.addEventListener('click', () => {
        logChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filtro = chip.getAttribute('data-filter') || 'todos';
        renderizarListaErrores(filtro);
      });
    });

    // Formulario Ticket
    if (ticketDescripcion) {
      ticketDescripcion.addEventListener('input', () => {
        if (errorTicketDesc) errorTicketDesc.textContent = '';
        if (charCountTicket) charCountTicket.textContent = `${ticketDescripcion.value.length} caracteres`;
      });
    }

    if (btnEnviarTicketWhatsapp) btnEnviarTicketWhatsapp.addEventListener('click', enviarTicketPorWhatsApp);
    if (btnEnviarTicketEmail) btnEnviarTicketEmail.addEventListener('click', enviarTicketPorEmail);
    if (btnCopiarTicketCompleto) btnCopiarTicketCompleto.addEventListener('click', copiarTicketCompleto);

    // Botones de Navegación Rápida a Soporte
    if (btnHeaderSupport) {
      btnHeaderSupport.addEventListener('click', () => cambiarVista('soporte'));
    }

    if (menuItemSupport) {
      menuItemSupport.addEventListener('click', () => {
        if (userDropdownMenu) userDropdownMenu.style.display = 'none';
        if (userProfileWrapper) userProfileWrapper.classList.remove('is-open');
        cambiarVista('soporte');
      });
    }

    if (btnFloatingSupport) {
      btnFloatingSupport.addEventListener('click', () => cambiarVista('soporte'));
    }

    // FAQ Acordeón y Búsqueda
    faqItems.forEach(item => {
      const btn = item.querySelector('.faq-question');
      if (btn) {
        btn.addEventListener('click', () => {
          const abierto = item.classList.contains('is-open');
          faqItems.forEach(i => {
            i.classList.remove('is-open');
            const q = i.querySelector('.faq-question');
            if (q) q.setAttribute('aria-expanded', 'false');
          });
          if (!abierto) {
            item.classList.add('is-open');
            btn.setAttribute('aria-expanded', 'true');
          }
        });
      }
    });

    if (faqSearchInput) {
      faqSearchInput.addEventListener('input', (e) => {
        const query = (e.target.value || '').toLowerCase().trim();
        faqItems.forEach(item => {
          const texto = item.textContent.toLowerCase();
          const keywords = (item.getAttribute('data-keywords') || '').toLowerCase();
          if (!query || texto.includes(query) || keywords.includes(query)) {
            item.style.display = 'block';
          } else {
            item.style.display = 'none';
          }
        });
      });
    }

    // Capturadores globales de errores no controlados
    window.addEventListener('error', (event) => {
      if (event.message && !event.message.includes('ResizeObserver')) {
        registrarErrorSistema(
          'excepcion',
          'JS_ERROR',
          event.filename ? `${event.filename.split('/').pop()}:${event.lineno}` : 'Script',
          event.message,
          event.error ? event.error.stack : ''
        );
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      const razon = event.reason ? (event.reason.message || String(event.reason)) : 'Promesa asíncrona rechazada';
      registrarErrorSistema(
        'red',
        'PROMISE_ERR',
        'API / Async',
        razon
      );
    });
  }

  // ==========================================================================
  // INICIALIZACIÓN
  // ==========================================================================
  cargarConfiguracionSoporte();
  inicializarEventosSoporte();
  inicializarAuthYSuscripcion();
  refrescarTodo();
  ejecutarDiagnosticoSistema(false);
});


