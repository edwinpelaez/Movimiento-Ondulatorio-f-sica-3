// mindmap.js - Mapa Mental Interactivo del Movimiento Ondulatorio

export const MINDMAP_DATA = {
  id: "root",
  label: "Movimiento Ondulatorio",
  category: "central",
  summary: "Transporte de energía y momento lineal en el espacio-tiempo sin transporte neto de masa.",
  unitId: "unidad-1",
  children: [
    {
      id: "fundamentos",
      label: "Fundamentos y Magnitudes",
      category: "teoria",
      summary: "Amplitud (A), Longitud de onda (λ), Período (T), Frecuencia (f), Velocidad de fase (v), Número de onda (k) y Frecuencia angular (ω).",
      unitId: "unidad-1",
      children: [
        { id: "amplitud", label: "Amplitud (A)", category: "parametro", summary: "Excursión máxima respecto al equilibrio. Dicta la energía.", unitId: "unidad-1" },
        { id: "longitud", label: "Longitud de onda (λ)", category: "parametro", summary: "Periodicidad espacial mínima entre crestas o puntos en fase.", unitId: "unidad-1" },
        { id: "frecuencia", label: "Frecuencia (f) y Período (T)", category: "parametro", summary: "Periodicidad temporal del oscilador fuente: T = 1/f.", unitId: "unidad-1" }
      ]
    },
    {
      id: "clasificacion",
      label: "Clasificación de Ondas",
      category: "taxonomia",
      summary: "Mecánicas vs Electromagnéticas; Transversales vs Longitudinales; 1D, 2D y 3D.",
      unitId: "unidad-2",
      children: [
        { id: "mecanicas", label: "Ondas Mecánicas", category: "medio", summary: "Requieren medio material elástico deformable (cuerdas, sonido, sísmicas).", unitId: "unidad-2" },
        { id: "em", label: "Ondas Electromagnéticas", category: "medio", summary: "Campos E y B oscilantes acoplados. Se propagan en el vacío a c = 3×10⁸ m/s.", unitId: "unidad-2" },
        { id: "geom", label: "Transversales vs Longitudinales", category: "geometria", summary: "Transversal: oscilación ⊥ propagación. Longitudinal: oscilación ∥ propagación.", unitId: "unidad-2" }
      ]
    },
    {
      id: "matematica",
      label: "Descripción Matemática",
      category: "ecuaciones",
      summary: "Función de onda y(x,t) = A sin(kx ∓ ωt + φ) y Ecuación diferencial clásica de d'Alembert.",
      unitId: "unidad-3",
      children: [
        { id: "eq-dalembert", label: "Ecuación de Onda 1D", category: "ecuacion", summary: "∂²y/∂t² = v² ∂²y/∂x². Ecuación fundamental en derivadas parciales.", unitId: "unidad-3" },
        { id: "dispersion", label: "Relación v = λf = ω/k", category: "ecuacion", summary: "Conexión cinemática entre escalas espaciales y temporales.", unitId: "unidad-3" }
      ]
    },
    {
      id: "energia",
      label: "Energía y Potencia",
      category: "dinamica",
      summary: "P_med = (1/2) μ v ω² A². Proporcional al cuadrado de la amplitud y la frecuencia.",
      unitId: "unidad-4",
      children: [
        { id: "tension", label: "Velocidad en Cuerda", category: "dinamica", summary: "v = √(T/μ). Determinada por la tensión y la inercia lineal.", unitId: "unidad-4" },
        { id: "intensidad", label: "Intensidad I = P/A", category: "dinamica", summary: "Flujo de energía superficial. Ley del inverso del cuadrado (1/r²).", unitId: "unidad-4" }
      ]
    },
    {
      id: "superposicion",
      label: "Superposición e Interferencia",
      category: "interferencia",
      summary: "Suma lineal y_res = y₁ + y₂. Interferencia constructiva, destructiva y batidos.",
      unitId: "unidad-5",
      children: [
        { id: "constructiva", label: "Constructiva / Destructiva", category: "interferencia", summary: "Δφ = 2mπ (refuerzo) vs Δφ = (2m+1)π (cancelación mutua).", unitId: "unidad-5" },
        { id: "batidos", label: "Batidos Acústicos", category: "interferencia", summary: "Modulación de amplitud por frecuencias cercanas: f_bat = |f₁ - f₂|.", unitId: "unidad-5" }
      ]
    },
    {
      id: "fenomenos",
      label: "Reflexión y Refracción",
      category: "frontera",
      summary: "Condiciones de frontera fija/libre, inversión de fase, ley de Snell y principio de Huygens.",
      unitId: "unidad-6",
      children: [
        { id: "snell", label: "Ley de Refracción", category: "frontera", summary: "sin(θ₁)/v₁ = sin(θ₂)/v₂. Cambio de longitud de onda entre medios.", unitId: "unidad-6" },
        { id: "difraccion", label: "Difracción de Huygens", category: "frontera", summary: "Dispersión de frentes de onda en aberturas y bordes con a ≲ λ.", unitId: "unidad-6" }
      ]
    },
    {
      id: "estacionarias",
      label: "Ondas Estacionarias",
      category: "modos",
      summary: "y_est = 2A sin(kx) cos(ωt). Nodos fijos, antinodos y cuantización de modos normales f_n.",
      unitId: "unidad-7",
      children: [
        { id: "armonicos-cuerda", label: "Cuerdas Tensas", category: "modos", summary: "f_n = n v / (2L). Todos los armónicos enteros presentes.", unitId: "unidad-7" },
        { id: "nodos", label: "Nodos y Antinodos", category: "modos", summary: "Distancia entre nodos consecutivos = λ/2.", unitId: "unidad-7" }
      ]
    },
    {
      id: "acustica",
      label: "Acústica y Sonido",
      category: "acustica",
      summary: "Ondas mecánicas de presión ΔP y desplazamiento s. Escala de decibelios β = 10 log(I/I₀).",
      unitId: "unidad-8",
      children: [
        { id: "decibelios", label: "Nivel Sonoro (dB)", category: "acustica", summary: "Escala logarítmica de audición humana: I₀ = 10⁻¹² W/m².", unitId: "unidad-8" },
        { id: "tubos", label: "Tubos y Resonancia", category: "acustica", summary: "Abiertos (todos los armónicos) vs Cerrados en un extremo (solo impares).", unitId: "unidad-9" }
      ]
    },
    {
      id: "doppler",
      label: "Efecto Doppler",
      category: "cinematica",
      summary: "f' = f (v ± v_o) / (v ∓ v_s). Corrimiento de frecuencia por velocidad relativa.",
      unitId: "unidad-10",
      children: [
        { id: "acercamiento", label: "Compresión y Agudeza", category: "cinematica", summary: "Al aproximarse la fuente o el receptor, la frecuencia percibida se eleva.", unitId: "unidad-10" }
      ]
    },
    {
      id: "optica-em",
      label: "Óptica Ondulatoria y Ondas EM",
      category: "optica",
      summary: "Experimento de Young de la doble rendija, franjas y = m λ L / d y difracción de la luz.",
      unitId: "unidad-11",
      children: [
        { id: "young", label: "Doble Rendija de Young", category: "optica", summary: "Prueba definitiva de la naturaleza ondulatoria de la luz en 1801.", unitId: "unidad-11" }
      ]
    },
    {
      id: "aplicaciones",
      label: "Aplicaciones en Ingeniería",
      category: "tecnologia",
      summary: "Ecografía Doppler, telecomunicaciones por fibra óptica, sonar, sismología y acústica de recintos.",
      unitId: "unidad-12",
      children: [
        { id: "fibra", label: "Fibra Óptica", category: "tecnologia", summary: "Guía dieléctrica por reflexión interna total con ángulo crítico θ_c.", unitId: "unidad-12" },
        { id: "sismos", label: "Sismología (P y S)", category: "tecnologia", summary: "Triangulación hipocentral mediante el desfase temporal Δt = t_S - t_P.", unitId: "unidad-12" }
      ]
    }
  ]
};

export class MindMapRenderer {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = options;
    this.activeNode = null;
    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="mindmap-wrapper">
        <div class="mindmap-header">
          <div class="mindmap-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/><path d="M3 12h6m6 0h6M12 3v6m0 6v6"/>
            </svg>
            <strong>Mapa Mental Interactivo: Red Conceptual del Movimiento Ondulatorio</strong>
          </div>
          <span class="mindmap-hint">Haz clic en cualquier nodo para explorar su definición y acceder a la unidad</span>
        </div>

        <div class="mindmap-body">
          <div class="mindmap-canvas-container" id="mindmap-graph-container"></div>
          
          <div class="mindmap-inspector" id="mindmap-inspector">
            <div class="inspector-empty" id="mindmap-inspector-empty">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
              </svg>
              <p>Selecciona un nodo del mapa para ver los fundamentos físicos, fórmulas asociadas y navegar a la unidad correspondiente.</p>
            </div>
            <div class="inspector-card hidden" id="mindmap-inspector-card">
              <div class="card-badge" id="mm-badge">Concepto</div>
              <h4 id="mm-title">Título</h4>
              <p id="mm-summary">Resumen</p>
              <button type="button" class="btn-sm btn-primary" id="mm-goto-btn">
                Ir a la Unidad del Cuaderno
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.buildInteractiveGraph();
  }

  buildInteractiveGraph() {
    const graphContainer = document.getElementById('mindmap-graph-container');
    if (!graphContainer) return;

    // Render tree with modern cards & connected branches
    const root = MINDMAP_DATA;
    let html = `
      <div class="mm-tree">
        <div class="mm-root-card" data-node-id="${root.id}">
          <div class="mm-node-dot pulse"></div>
          <strong>${root.label}</strong>
          <span class="mm-node-sub">Eje Central</span>
        </div>
        <div class="mm-branches-grid">
    `;

    root.children.forEach(branch => {
      html += `
        <div class="mm-branch-col">
          <div class="mm-branch-card" data-node-id="${branch.id}" data-unit-id="${branch.unitId}">
            <div class="mm-branch-header">
              <span class="mm-badge">${branch.category.toUpperCase()}</span>
              <h5>${branch.label}</h5>
            </div>
            <p class="mm-branch-desc">${branch.summary}</p>
            <div class="mm-subnodes-list">
              ${branch.children ? branch.children.map(ch => `
                <button type="button" class="mm-subnode-pill" data-node-id="${ch.id}" data-unit-id="${ch.unitId}">
                  ${ch.label}
                </button>
              `).join('') : ''}
            </div>
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
    graphContainer.innerHTML = html;

    // Attach click events
    this.attachNodeListeners();
  }

  findNode(nodeId, current = MINDMAP_DATA) {
    if (current.id === nodeId) return current;
    if (current.children) {
      for (const child of current.children) {
        const found = this.findNode(nodeId, child);
        if (found) return found;
      }
    }
    return null;
  }

  attachNodeListeners() {
    const allClickables = this.container.querySelectorAll('[data-node-id]');
    allClickables.forEach(elem => {
      elem.addEventListener('click', (e) => {
        e.stopPropagation();
        const nodeId = elem.getAttribute('data-node-id');
        this.selectNode(nodeId, elem);
      });
    });
  }

  selectNode(nodeId, elem) {
    const node = this.findNode(nodeId);
    if (!node) return;

    // Highlight
    this.container.querySelectorAll('.is-selected').forEach(el => el.classList.remove('is-selected'));
    elem.classList.add('is-selected');

    // Update inspector
    const emptyView = document.getElementById('mindmap-inspector-empty');
    const cardView = document.getElementById('mindmap-inspector-card');
    const badge = document.getElementById('mm-badge');
    const title = document.getElementById('mm-title');
    const summary = document.getElementById('mm-summary');
    const gotoBtn = document.getElementById('mm-goto-btn');

    if (emptyView) emptyView.classList.add('hidden');
    if (cardView) cardView.classList.remove('hidden');

    if (badge) badge.textContent = (node.category || 'CONCEPTO').toUpperCase();
    if (title) title.textContent = node.label;
    if (summary) summary.textContent = node.summary;

    if (gotoBtn) {
      gotoBtn.onclick = () => {
        if (node.unitId && typeof this.options.onNavigate === 'function') {
          this.options.onNavigate(node.unitId);
        }
      };
    }
  }
}
