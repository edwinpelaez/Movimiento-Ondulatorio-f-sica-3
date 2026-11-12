/**
 * doppler-physics.js
 * Motor físico y matemático del Efecto Doppler Clásico.
 * Medio homogéneo, isotrópico y en reposo (acústico).
 *
 * Especialidades integradas:
 * - Física de ondas y acústica.
 * - Geometría vectorial y cálculo retardado exacto.
 * - Análisis de frentes de onda y cono de Mach.
 */

export class DopplerPhysics {
  constructor(config = {}) {
    this.c = config.c ?? 340.0;          // Rapidez de propagación en el medio (m/s)
    this.f = config.f ?? 2.0;            // Frecuencia emitida (Hz)
    this.vfx = config.vfx ?? 0.0;        // Velocidad fuente X (m/s)
    this.vfy = config.vfy ?? 0.0;        // Velocidad fuente Y (m/s)
    this.vox = config.vox ?? 0.0;        // Velocidad observador X (m/s)
    this.voy = config.voy ?? 0.0;        // Velocidad observador Y (m/s)
    this.x0f = config.x0f ?? -170.0;     // Posición inicial fuente X (m)
    this.y0f = config.y0f ?? 0.0;        // Posición inicial fuente Y (m)
    this.x0o = config.x0o ?? 170.0;      // Posición inicial observador X (m)
    this.y0o = config.y0o ?? 0.0;        // Posición inicial observador Y (m)
    this.t = 0.0;                        // Tiempo simulado (s)
    this.duration = config.duration ?? 10.0; // Duración total (s)

    // Historial y eventos
    this.wavefronts = []; // Frentes emitidos
    this.arrivals = [];   // Eventos de llegada al observador
    this.machCrossings = []; // Eventos de cruce del frente de Mach

    // Generar estado inicial en t = 0
    this.stepTo(0);
  }

  // Reiniciar estado
  reset() {
    this.t = 0.0;
    this.wavefronts = [];
    this.arrivals = [];
    this.machCrossings = [];
    this.stepTo(0);
  }

  // Parámetros derivados fundamentales
  get period() {
    return this.f > 0 ? 1.0 / this.f : Infinity;
  }

  get lambda0() {
    return this.f > 0 ? this.c / this.f : Infinity;
  }

  get machNumber() {
    const vf = Math.hypot(this.vfx, this.vfy);
    return this.c > 0 ? vf / this.c : 0;
  }

  get machAngleRad() {
    const M = this.machNumber;
    return M >= 1.0 ? Math.asin(1.0 / M) : null;
  }

  get machAngleDeg() {
    const rad = this.machAngleRad;
    return rad !== null ? (rad * 180.0) / Math.PI : null;
  }

  // Longitudes de onda espaciales colineales (delante y detrás) para fuente en movimiento X
  get lambdaAhead() {
    if (this.f <= 0) return Infinity;
    return (this.c - this.vfx) / this.f;
  }

  get lambdaBehind() {
    if (this.f <= 0) return Infinity;
    return (this.c + this.vfx) / this.f;
  }

  // Posición instantánea de la fuente en tiempo t
  getSourcePos(t = this.t) {
    return {
      x: this.x0f + this.vfx * t,
      y: this.y0f + this.vfy * t
    };
  }

  getSourcePosition(t = this.t) {
    return this.getSourcePos(t);
  }

  // Posición instantánea del observador en tiempo t
  getObserverPos(t = this.t) {
    return {
      x: this.x0o + this.vox * t,
      y: this.y0o + this.voy * t
    };
  }

  getObserverPosition(t = this.t) {
    return this.getObserverPos(t);
  }

  // Distancia actual euclidiana entre fuente y observador
  getDistance(t = this.t) {
    const s = this.getSourcePos(t);
    const o = this.getObserverPos(t);
    return Math.hypot(o.x - s.x, o.y - s.y);
  }

  /**
   * Cálculo de todos los frentes emitidos hasta el tiempo t
   * Instantes exactos t_{e,n} = n / f (n = 0, 1, 2, ...)
   */
  computeEmissionsUpTo(targetTime) {
    if (this.f <= 0) return;
    const T = this.period;
    const maxIndex = Math.floor(targetTime / T);

    for (let n = this.wavefronts.length; n <= maxIndex; n++) {
      const te = n * T;
      if (te > targetTime) break;

      const pos = this.getSourcePos(te);
      const wf = {
        id: n,
        te: te,
        xc: pos.x, // Centro FIJO en el medio acústico
        yc: pos.y,
        vfAtTe: { x: this.vfx, y: this.vfy },
        // Cálculo analítico previo del instante de llegada al observador
        tr: this.calculateArrivalAnalytical(n, te, pos.x, pos.y),
        notifiedArrival: false
      };
      this.wavefronts.push(wf);
    }
  }

  /**
   * Resolución analítica exacta de la condición de llegada:
   * |x_o(tr) - x_c| = c * (tr - te), con tr >= te
   *
   * Sean d0 = x_o(0) - x_c = (x0o - xc, y0o - yc)
   * x_o(tr) - x_c = d0 + v_o * tr
   * |d0 + v_o * tr|^2 = c^2 * (tr - te)^2
   *
   * Forma estándar A * tr^2 + B * tr + C = 0:
   * A = |v_o|^2 - c^2
   * B = 2 * (d0 · v_o + c^2 * te)
   * C = |d0|^2 - c^2 * te^2
   */
  calculateArrivalAnalytical(n, te, xc, yc) {
    const d0x = this.x0o - xc;
    const d0y = this.y0o - yc;
    const vo2 = this.vox * this.vox + this.voy * this.voy;
    const c2 = this.c * this.c;

    // Caso 1: Observador inmóvil (v_o = 0)
    if (vo2 === 0) {
      const dist = Math.hypot(this.x0o - xc, this.y0o - yc);
      return te + dist / this.c;
    }

    // Caso 2: Observador en movimiento
    const A = vo2 - c2;
    const B = 2.0 * (d0x * this.vox + d0y * this.voy + c2 * te);
    const C = (d0x * d0x + d0y * d0y) - c2 * te * te;

    const disc = B * B - 4.0 * A * C;
    if (disc < 0) return null; // No hay intersección física

    const sqrtDisc = Math.sqrt(disc);
    const r1 = (-B + sqrtDisc) / (2.0 * A);
    const r2 = (-B - sqrtDisc) / (2.0 * A);

    // Filtrar raíces válidas con tr >= te
    const valid = [r1, r2].filter(r => r >= te - 1e-9);
    if (valid.length === 0) return null;

    // La primera llegada física hacia el futuro
    return Math.min(...valid);
  }

  /**
   * Cálculo de la frecuencia teórica instantánea retardada:
   * f_o = f_e * (c - n · v_o) / (c - n · v_f)
   * Evaluada en el instante retardado correspondiente al frente que llega en tiempo t,
   * o proyectada según la línea de mira en tiempo t si no hay frente coincidente.
   */
  getTheoreticalFrequency(targetTime = this.t) {
    const s = this.getSourcePos(targetTime);
    const o = this.getObserverPos(targetTime);

    const dx = o.x - s.x;
    const dy = o.y - s.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 1e-6) {
      // Coincidencia espacial
      return this.f;
    }

    // Vector unitario línea de mira desde fuente hacia observador: n = (o - s) / |o - s|
    const nx = dx / dist;
    const ny = dy / dist;

    // Componentes radiales en la dirección de la onda
    const v_o_radial = nx * this.vox + ny * this.voy;
    const v_f_radial = nx * this.vfx + ny * this.vfy;

    const num = this.c - v_o_radial;
    const den = this.c - v_f_radial;

    // Protección ante Mach 1 y singularidades físicas
    if (Math.abs(den) < 1e-4) {
      return Infinity; // Barrera acústica / Mach 1
    }

    const fo = this.f * (num / den);
    return fo;
  }

  /**
   * Frecuencia instantánea de recepción para un frente específico 'n'
   */
  getArrivalTheoreticalFrequency(wf) {
    if (!wf || wf.tr === null) return null;
    const tr = wf.tr;
    const te = wf.te;
    const oAtTr = this.getObserverPos(tr);
    const dx = oAtTr.x - wf.xc;
    const dy = oAtTr.y - wf.yc;
    const dist = Math.hypot(dx, dy);
    if (dist < 1e-6) return this.f;

    const nx = dx / dist;
    const ny = dy / dist;

    const num = this.c - (nx * this.vox + ny * this.voy);
    const den = this.c - (nx * wf.vfAtTe.x + ny * wf.vfAtTe.y);

    if (Math.abs(den) < 1e-4) return Infinity;
    return this.f * (num / den);
  }

  /**
   * Detección y registro de eventos de llegada hasta el tiempo t
   */
  updateArrivals(currentTime) {
    this.computeEmissionsUpTo(currentTime);

    for (const wf of this.wavefronts) {
      if (wf.tr !== null && wf.tr <= currentTime && !wf.notifiedArrival) {
        wf.notifiedArrival = true;
        const foTh = this.getArrivalTheoreticalFrequency(wf);

        const arrivalEvent = {
          id: wf.id,
          te: wf.te,
          tr: wf.tr,
          travelTime: wf.tr - wf.te,
          xc: wf.xc,
          yc: wf.yc,
          foTheoretical: foTh,
          deltaTr: null,
          fMeasured: null
        };

        // Medición experimental mediante intervalos de llegadas sucesivas:
        // f_medida = 1 / (t_{r, k} - t_{r, k-1})
        if (this.arrivals.length > 0) {
          const prev = this.arrivals[this.arrivals.length - 1];
          const dt = arrivalEvent.tr - prev.tr;
          if (dt > 1e-6) {
            arrivalEvent.deltaTr = dt;
            arrivalEvent.fMeasured = 1.0 / dt;
          }
        }

        this.arrivals.push(arrivalEvent);
      }
    }
  }

  /**
   * Detección geométrica del cruce del cono de Mach (estampido sónico)
   * Ocurre cuando el cono tangente envolvente barre la posición del observador.
   */
  checkMachConeImpact(currentTime) {
    if (this.machNumber < 1.0) return false;
    const mu = this.machAngleRad;
    if (!mu) return false;

    // Fuente moviéndose en X principalmente
    const s = this.getSourcePos(currentTime);
    const o = this.getObserverPos(currentTime);

    // Eje de avance de la fuente
    const vMag = Math.hypot(this.vfx, this.vfy);
    if (vMag < 1e-4) return false;

    // Vector unitario de movimiento de la fuente
    const ux = this.vfx / vMag;
    const uy = this.vfy / vMag;

    // Vector desde la fuente hacia el observador
    const relX = o.x - s.x;
    const relY = o.y - s.y;

    // Proyección a lo largo del avance (atrás de la fuente: u · (o - s) < 0)
    const along = relX * ux + relY * uy;
    const perp = Math.abs(-relX * uy + relY * ux);

    if (along >= 0) return false; // El observador está delante de la fuente

    // Distancia al cono: d_cono = -along * tan(mu)
    const coneRadiusAtX = -along * Math.tan(mu);
    const distanceToShock = Math.abs(perp - coneRadiusAtX);

    // Comprobar si cruza en esta ventana temporal
    return distanceToShock < (this.c * 0.05);
  }

  /**
   * Avance determinista del tiempo
   */
  stepTo(targetTime) {
    this.t = Math.max(0, targetTime);
    this.updateArrivals(this.t);
  }

  /**
   * Obtener radio actual de cada frente de onda activo en tiempo t
   */
  getActiveWavefronts(t = this.t) {
    const list = [];
    for (const wf of this.wavefronts) {
      if (t >= wf.te) {
        const radius = this.c * (t - wf.te);
        list.push({
          id: wf.id,
          te: wf.te,
          xc: wf.xc,
          yc: wf.yc,
          radius: radius,
          arrived: wf.tr !== null && t >= wf.tr
        });
      }
    }
    return list;
  }
}
