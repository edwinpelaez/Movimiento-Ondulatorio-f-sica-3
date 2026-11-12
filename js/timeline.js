// timeline.js - Línea de Tiempo Histórica Interactiva del Movimiento Ondulatorio

export const TIMELINE_EVENTS = [
  {
    year: "c. 530 a. C.",
    era: "antiguedad",
    eraLabel: "Antigüedad Clásica",
    scientist: "Pitágoras de Samos",
    title: "Descubrimiento de la Armonía y Proporciones en Cuerdas Sonoras",
    desc: "Descubrió con el monocordio que cuerdas de igual tensión cuyas longitudes guardan razones de números enteros simples (2:1 para octavas, 3:2 para quintas, 4:3 para cuartas) emiten intervalos musicales consonantes.",
    impact: "Primer vínculo cuantitativo entre las matemáticas y la fenomenología acústica en la historia occidental."
  },
  {
    year: "1638",
    era: "siglo17",
    eraLabel: "Revolución Científica",
    scientist: "Galileo Galilei",
    title: "Frecuencia, Tono y Vibración de Cuerdas",
    desc: "En 'Discorsi e dimostrazioni matematiche intorno a due nuove scienze', demostró formalmente que el tono o altura del sonido está gobernado por el número de vibraciones por unidad de tiempo (frecuencia).",
    impact: "Estableció el método experimental moderno para relacionar la percepción auditiva con la cinemática periódica."
  },
  {
    year: "1678",
    era: "siglo17",
    eraLabel: "Revolución Científica",
    scientist: "Christiaan Huygens",
    title: "Principio de Ondículas Secundarias y Tratado de la Luz",
    desc: "Formuló el principio geométrico de Huygens: cada punto de un frente de onda se comporta como foco emisor de ondículas esféricas secundarias. Explicó rigurosamente la reflexión y la refracción óptica.",
    impact: "Nacimiento de la teoría ondulatoria de la luz como alternativa formal a la óptica corpuscular."
  },
  {
    year: "1747",
    era: "ilustracion",
    eraLabel: "Siglo XVIII",
    scientist: "Jean le Rond d'Alembert",
    title: "Deducción de la Ecuación Diferencial Clásica de Onda",
    desc: "Aplicó por primera vez el cálculo diferencial e integral y las leyes de Newton a una cuerda vibrante continua, obteniendo la ecuación en derivadas parciales ∂²y/∂t² = v² ∂²y/∂x² y su solución general y(x,t) = f(x - vt) + g(x + vt).",
    impact: "Piedra angular de la física matemática y del análisis de ondas en medios continuos."
  },
  {
    year: "1753",
    era: "ilustracion",
    eraLabel: "Siglo XVIII",
    scientist: "Leonhard Euler y Daniel Bernoulli",
    title: "Superposición de Modos Normales y Series Trigonométricas",
    desc: "Demostraron que las oscilaciones de una cuerda fija pueden expresarse mediante la superposición infinita de modos sinusoidales discretos (armónicos), anticipando el análisis de Fourier.",
    impact: "Fundamento del principio de superposición lineal y del análisis armónico en física teórica."
  },
  {
    year: "1801",
    era: "siglo19",
    eraLabel: "Siglo XIX",
    scientist: "Thomas Young",
    title: "Experimento de la Doble Rendija y Principio de Interferencia",
    desc: "Hizo pasar luz solar a través de dos aberturas paralelas contiguas, proyectando en la pantalla franjas alternadas de luz y sombra explicadas por la superposición constructiva y destructiva de ondas coherentes.",
    impact: "Demostración experimental irrebatible del carácter ondulatorio de la luz, refutando el modelo corpuscular de Newton."
  },
  {
    year: "1818",
    era: "siglo19",
    eraLabel: "Siglo XIX",
    scientist: "Augustin-Jean Fresnel",
    title: "Teoría Matemática de la Difracción y Ondas Transversales",
    desc: "Integró el principio de Huygens con la interferencia de Young (principio de Huygens-Fresnel) para formular la teoría ondulatoria de la difracción. Junto con Arago, demostró que la luz es una onda transversal para explicar la polarización.",
    impact: "Triunfo definitivo de la óptica ondulatoria en la Academia de Ciencias de París (con la predicción de la mancha de Poisson)."
  },
  {
    year: "1842",
    era: "siglo19",
    eraLabel: "Siglo XIX",
    scientist: "Christian Doppler",
    title: "Descubrimiento del Efecto Doppler",
    desc: "Presentó su memoria 'Über das farbige Licht der Doppelsterne' proponiendo que el tono del sonido o el color de la luz se modifica cuando la fuente se desplaza en relación con el observador.",
    impact: "Base del radar, la astrofísica del desplazamiento hacia el rojo y la ecografía diagnóstica contemporánea."
  },
  {
    year: "1865",
    era: "siglo19",
    eraLabel: "Siglo XIX",
    scientist: "James Clerk Maxwell",
    title: "Teoría Dinámica del Campo Electromagnético",
    desc: "Sintetizó las leyes del electromagnetismo en sus célebres cuatro ecuaciones y predijo que los campos eléctrico y magnético oscilantes se propagan en el vacío como ondas transversales a la velocidad de la luz c = 1/√(μ₀ε₀).",
    impact: "Unificación histórica de la electricidad, el magnetismo y la óptica bajo la teoría electromagnética."
  },
  {
    year: "1888",
    era: "siglo19",
    eraLabel: "Siglo XIX",
    scientist: "Heinrich Hertz",
    title: "Confirmación Experimental de las Ondas Electromagnéticas",
    desc: "Generó y detectó ondas de radio en el laboratorio mediante un oscilador de chispa y un resonador de bucle abierto, verificando su reflexión, refracción, difracción, polarización y velocidad idéntica a la luz.",
    impact: "Confirmación experimental de la teoría de Maxwell y nacimiento de las telecomunicaciones y la radio moderna."
  },
  {
    year: "1924",
    era: "siglo20",
    eraLabel: "Física Moderna",
    scientist: "Louis de Broglie",
    title: "Dualidad Onda-Partícula de la Materia",
    desc: "Postuló que toda partícula material con momento p posee asociada una longitud de onda cuántica λ = h/p, extendiendo la naturaleza ondulatoria a toda la materia física.",
    impact: "Nacimiento de la mecánica cuántica ondulatoria y de la ecuación de Schrödinger."
  }
];

export class TimelineRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentEraFilter = 'all';
    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="timeline-component-wrapper">
        <div class="timeline-controls-bar">
          <div class="timeline-title-row">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <strong>Línea de Tiempo Histórica de la Teoría Ondulatoria</strong>
          </div>
          <div class="timeline-filters">
            <button type="button" class="tl-filter-btn active" data-filter="all">Todos los Hitos</button>
            <button type="button" class="tl-filter-btn" data-filter="antiguedad">Antigüedad</button>
            <button type="button" class="tl-filter-btn" data-filter="siglo17">Siglo XVII</button>
            <button type="button" class="tl-filter-btn" data-filter="ilustracion">Ilustración (S. XVIII)</button>
            <button type="button" class="tl-filter-btn" data-filter="siglo19">Siglo XIX</button>
            <button type="button" class="tl-filter-btn" data-filter="siglo20">Siglo XX</button>
          </div>
        </div>

        <div class="timeline-track-container" id="timeline-events-track">
          <!-- Renderizado dinámicamente -->
        </div>
      </div>
    `;

    this.renderEvents();
    this.attachFilterEvents();
  }

  renderEvents() {
    const track = document.getElementById('timeline-events-track');
    if (!track) return;

    const filtered = this.currentEraFilter === 'all'
      ? TIMELINE_EVENTS
      : TIMELINE_EVENTS.filter(ev => ev.era === this.currentEraFilter);

    track.innerHTML = filtered.map((ev, idx) => `
      <article class="timeline-event-card" data-era="${ev.era}">
        <div class="tl-node-marker">
          <span class="tl-bullet"></span>
          <span class="tl-year">${ev.year}</span>
        </div>
        <div class="tl-content-card">
          <div class="tl-header">
            <span class="tl-era-badge">${ev.eraLabel}</span>
            <span class="tl-scientist"><strong>${ev.scientist}</strong></span>
          </div>
          <h4 class="tl-title">${ev.title}</h4>
          <p class="tl-desc">${ev.desc}</p>
          <div class="tl-impact-box">
            <strong>Impacto Epistémico:</strong> ${ev.impact}
          </div>
        </div>
      </article>
    `).join('');
  }

  attachFilterEvents() {
    const btns = this.container.querySelectorAll('.tl-filter-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentEraFilter = btn.getAttribute('data-filter');
        this.renderEvents();
      });
    });
  }
}
