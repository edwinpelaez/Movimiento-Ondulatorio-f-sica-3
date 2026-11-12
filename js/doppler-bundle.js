/**
 * SIMULADOR AVANZADO DEL EFECTO DOPPLER ACÚSTICO — BUNDLE STANDALONE
 * Compatible con ejecución local directa (file://) y HTTP.
 */
(function(global) {
  'use strict';


/* ======================== doppler-physics.js ======================== */
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

class DopplerPhysics {
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

  // Posición instantánea del observador en tiempo t
  getObserverPos(t = this.t) {
    return {
      x: this.x0o + this.vox * t,
      y: this.y0o + this.voy * t
    };
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


/* ======================== doppler-audio.js ======================== */
/**
 * doppler-audio.js
 * Módulo de Sonificación Acústica Avanzada con Web Audio API.
 * 
 * Implementa:
 * 1. Pulsos de llegada (Clicks / Beeps en cada recepción de frente de onda).
 * 2. Comparación tonal (Tono continuo modulado por el corrimiento Doppler fo/fe).
 * 3. Sonificación ilustrativa del estampido sónico (envolvente Mach).
 * 4. Control de volumen, silencio y cancelación inmediata al pausar/buscar.
 */

class DopplerAudio {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.isEnabled = false;
    this.volume = 0.5;
    this.mode = 'pulses'; // 'pulses' | 'continuous'
    
    // Tono continuo
    this.continuousOsc = null;
    this.continuousGain = null;
    this.basePitch = 440; // Frecuencia audible base (Hz) - Tono La4
    this.isPlayingContinuous = false;
  }

  // Inicialización bajo gesto de usuario (política de navegadores)
  ensureContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('Web Audio API no soportada en este navegador.');
        return false;
      }
      this.audioCtx = new AudioContextClass();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
      this.masterGain.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return true;
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (enabled) {
      this.ensureContext();
      if (this.mode === 'continuous') {
        this.startContinuousTone();
      }
    } else {
      this.stopAll();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.audioCtx.currentTime, 0.03);
    }
  }

  setMode(mode) {
    if (this.mode === mode) return;
    this.stopAll();
    this.mode = mode;
    if (this.isEnabled && this.mode === 'continuous') {
      this.startContinuousTone();
    }
  }

  // Disparo de pulso breve al recibir un frente
  triggerArrivalPulse(freqRatio = 1.0) {
    if (!this.isEnabled || this.mode !== 'pulses') return;
    if (!this.ensureContext()) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      // Frecuencia del beep didáctico adaptada a la tasa de compresión
      const pitch = Math.max(200, Math.min(2500, 880 * Math.pow(freqRatio, 0.5)));
      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, now);

      // Envolvente suave para evitar clicks espurios
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.4, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      // Ignorar errores transitorios de audio
    }
  }

  // Inicio de tono continuo
  startContinuousTone() {
    if (!this.isEnabled || this.isPlayingContinuous) return;
    if (!this.ensureContext()) return;

    try {
      const now = this.audioCtx.currentTime;
      this.continuousOsc = this.audioCtx.createOscillator();
      this.continuousGain = this.audioCtx.createGain();

      this.continuousOsc.type = 'triangle';
      this.continuousOsc.frequency.setValueAtTime(this.basePitch, now);

      this.continuousGain.gain.setValueAtTime(0.0001, now);
      this.continuousGain.gain.exponentialRampToValueAtTime(0.3, now + 0.05);

      this.continuousOsc.connect(this.continuousGain);
      this.continuousGain.connect(this.masterGain);

      this.continuousOsc.start(now);
      this.isPlayingContinuous = true;
    } catch (e) {
      console.warn('Error al iniciar tono continuo:', e);
    }
  }

  // Modulación en tiempo real del tono continuo
  updateContinuousPitch(freqRatio) {
    if (!this.isPlayingContinuous || !this.continuousOsc || !this.audioCtx) return;
    if (!Number.isFinite(freqRatio) || freqRatio <= 0) return;

    // Limitar tono audible a rango cómodo y seguro [60 Hz, 3500 Hz]
    const targetFreq = Math.max(60, Math.min(3500, this.basePitch * freqRatio));
    this.continuousOsc.frequency.setTargetAtTime(targetFreq, this.audioCtx.currentTime, 0.04);
  }

  // Sonificación ilustrativa del frente de choque Mach
  triggerSonicBoom() {
    if (!this.isEnabled) return;
    if (!this.ensureContext()) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      // Golpe grave con caída de frecuencia
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.6, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {}
  }

  // Detener toda reproducción de audio de forma segura
  stopAll() {
    if (this.continuousOsc) {
      try {
        if (this.audioCtx) {
          const now = this.audioCtx.currentTime;
          this.continuousGain?.gain.setTargetAtTime(0.0001, now, 0.02);
          this.continuousOsc.stop(now + 0.03);
        } else {
          this.continuousOsc.stop();
        }
      } catch (e) {}
      this.continuousOsc = null;
      this.continuousGain = null;
      this.isPlayingContinuous = false;
    }
  }
}


/* ======================== doppler-canvas.js ======================== */
/**
 * doppler-canvas.js
 * Renderizador de Lienzo 2D de Alta Precisión para la Simulación del Efecto Doppler.
 * 
 * Especialidades integradas:
 * - Canvas 2D, coordenadas físicas (m) <-> pantalla (px), soporte Retina (devicePixelRatio).
 * - Detección automática y continua de dimensiones mediante ResizeObserver.
 * - Frentes de onda circulares fijos en el medio acústico homogéneo en reposo.
 * - Visualización de alta claridad: Fuente, Observador, Ejes graduados, Cinta métrica, Cono de Mach.
 * - Ajuste inteligente de encuadre (fitScene) y centrado de vista.
 */

class DopplerCanvas {
  constructor(canvasElement, physics, audio) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.physics = physics;
    this.audio = audio;

    // Sistema de cámara y coordenadas
    this.scale = 1.0; // Píxeles por metro
    this.panX = 0;    // Desplazamiento X en píxeles
    this.panY = 0;    // Desplazamiento Y en píxeles
    this.followSource = false;
    this.width = 0;
    this.height = 0;
    this.dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    this.hasFittedScene = false;

    // Configuración visual
    this.sourceAvatar = 'point'; // 'point' | 'car' | 'plane'
    this.waveStyle = 'solid';    // 'solid' | 'dashed' | 'dotted'
    this.waveColor = '#38bdf8';   // Celeste eléctrico
    this.fadeWaves = true;       // Atenuación gráfica visual
    this.showVectors = true;     // Mostrar vectores de velocidad
    this.showLineOfSight = true; // Mostrar línea de mira (n)
    this.showMachCone = true;    // Mostrar cono de Mach en supersónico
    this.showGrid = true;        // Mostrar cuadrícula métrica

    // Herramienta de medición (Cinta métrica)
    this.rulerActive = false;
    this.rulerStart = null; // {x, y} en metros
    this.rulerCurrent = null;

    // Frente seleccionado para inspección
    this.selectedWaveId = null;

    // Efecto de pulso en observador
    this.observerPingRadius = 0;
    this.observerPingAlpha = 0;

    // Estados de interacción con ratón
    this.isDragging = false;
    this.dragTarget = null; // 'pan' | 'source' | 'observer' | 'ruler'
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this.bindEvents();
    this.resize();
  }

  // Conversión: Metros a Píxeles
  worldToScreen(x, y) {
    const cx = (this.width / 2) + this.panX;
    const cy = (this.height / 2) + this.panY;
    return {
      x: cx + x * this.scale,
      y: cy - y * this.scale // Inversión eje Y estándar (arriba es positivo)
    };
  }

  // Conversión: Píxeles a Metros
  screenToWorld(px, py) {
    const cx = (this.width / 2) + this.panX;
    const cy = (this.height / 2) + this.panY;
    return {
      x: (px - cx) / this.scale,
      y: (cy - py) / this.scale
    };
  }

  resize() {
    this.dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const rect = this.canvas.getBoundingClientRect();
    
    // Si aún no está visible en el DOM, usar dimensiones del padre o fallback
    const w = rect.width > 0 ? rect.width : (this.canvas.parentElement?.clientWidth || 800);
    const h = rect.height > 0 ? rect.height : (this.canvas.parentElement?.clientHeight || 500);

    this.width = w;
    this.height = h;

    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);

    if (!this.hasFittedScene && this.width > 100 && this.height > 100) {
      this.fitScene();
      this.hasFittedScene = true;
    }
  }

  // Ajustar cámara para que todo el experimento quepa centrado
  fitScene() {
    if (this.width <= 0 || this.height <= 0) {
      this.resize();
    }
    const sPos = this.physics.getSourcePos();
    const oPos = this.physics.getObserverPos();

    // Rango horizontal y vertical a cubrir con margen generoso
    let minX = Math.min(sPos.x, oPos.x) - 60;
    let maxX = Math.max(sPos.x, oPos.x) + 60;
    let minY = Math.min(sPos.y, oPos.y) - 60;
    let maxY = Math.max(sPos.y, oPos.y) + 60;

    const list = this.physics.getActiveWavefronts();
    for (const wf of list) {
      minX = Math.min(minX, wf.xc - wf.radius);
      maxX = Math.max(maxX, wf.xc + wf.radius);
      minY = Math.min(minY, wf.yc - wf.radius);
      maxY = Math.max(maxY, wf.yc + wf.radius);
    }

    const spanX = Math.max(120, maxX - minX);
    const spanY = Math.max(120, maxY - minY);

    const scaleX = (this.width * 0.82) / spanX;
    const scaleY = (this.height * 0.82) / spanY;
    this.scale = Math.max(0.15, Math.min(2.5, Math.min(scaleX, scaleY)));

    // Centrar en el punto medio geométrico
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    this.panX = -midX * this.scale;
    this.panY = midY * this.scale;
    this.followSource = false;
  }

  resetView() {
    this.fitScene();
  }

  bindEvents() {
    // Observador de cambio de tamaño dinámico
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => this.resize());
      ro.observe(this.canvas);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.resize());
    }

    // Zoom centrado en cursor mediante rueda del ratón
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldBefore = this.screenToWorld(mouseX, mouseY);
      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      const newScale = Math.max(0.1, Math.min(10.0, this.scale * factor));

      this.scale = newScale;
      const worldAfter = this.screenToWorld(mouseX, mouseY);

      // Desplazamiento para mantener fijo el punto bajo el cursor
      this.panX += (worldAfter.x - worldBefore.x) * this.scale;
      this.panY -= (worldAfter.y - worldBefore.y) * this.scale;
    }, { passive: false });

    // Ratón Abajo
    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const world = this.screenToWorld(mx, my);

      this.lastMouseX = mx;
      this.lastMouseY = my;

      if (this.rulerActive) {
        this.rulerStart = world;
        this.rulerCurrent = world;
        this.isDragging = true;
        this.dragTarget = 'ruler';
        return;
      }

      // Comprobar si clic en fuente o en observador (radio de interacción 28 px)
      const sPos = this.physics.getSourcePos();
      const oPos = this.physics.getObserverPos();
      const sScreen = this.worldToScreen(sPos.x, sPos.y);
      const oScreen = this.worldToScreen(oPos.x, oPos.y);

      if (Math.hypot(mx - sScreen.x, my - sScreen.y) <= 28) {
        this.isDragging = true;
        this.dragTarget = 'source';
      } else if (Math.hypot(mx - oScreen.x, my - oScreen.y) <= 28) {
        this.isDragging = true;
        this.dragTarget = 'observer';
      } else {
        // Clic en frente de onda para inspeccionar
        const clickedWave = this.findClickedWavefront(world.x, world.y);
        if (clickedWave) {
          this.selectedWaveId = clickedWave.id;
        } else {
          this.selectedWaveId = null;
          this.isDragging = true;
          this.dragTarget = 'pan';
        }
      }
    });

    // Ratón Mover
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const world = this.screenToWorld(mx, my);

      if (!this.isDragging) {
        const sPos = this.physics.getSourcePos();
        const oPos = this.physics.getObserverPos();
        const sScreen = this.worldToScreen(sPos.x, sPos.y);
        const oScreen = this.worldToScreen(oPos.x, oPos.y);

        if (this.rulerActive) {
          this.canvas.style.cursor = 'crosshair';
        } else if (Math.hypot(mx - sScreen.x, my - sScreen.y) <= 28 || Math.hypot(mx - oScreen.x, my - oScreen.y) <= 28) {
          this.canvas.style.cursor = 'grab';
        } else {
          this.canvas.style.cursor = 'default';
        }
        return;
      }

      const dxPx = mx - this.lastMouseX;
      const dyPx = my - this.lastMouseY;
      this.lastMouseX = mx;
      this.lastMouseY = my;

      if (this.dragTarget === 'pan') {
        this.panX += dxPx;
        this.panY += dyPx;
      } else if (this.dragTarget === 'source') {
        // Recolocar posición en pausa
        this.physics.x0f = world.x - this.physics.vfx * this.physics.t;
        this.physics.y0f = world.y - this.physics.vfy * this.physics.t;
      } else if (this.dragTarget === 'observer') {
        this.physics.x0o = world.x - this.physics.vox * this.physics.t;
        this.physics.y0o = world.y - this.physics.voy * this.physics.t;
      } else if (this.dragTarget === 'ruler') {
        this.rulerCurrent = world;
      }
    });

    // Ratón Arriba
    if (typeof window !== 'undefined') {
      window.addEventListener('mouseup', () => {
        this.isDragging = false;
        this.dragTarget = null;
      });
    }
  }

  // Buscar frente de onda cercano al clic
  findClickedWavefront(wx, wy) {
    const list = this.physics.getActiveWavefronts();
    let best = null;
    let minDiff = 18 / this.scale; // Tolerancia 18 píxeles

    for (const wf of list) {
      const distToCenter = Math.hypot(wx - wf.xc, wy - wf.yc);
      const diff = Math.abs(distToCenter - wf.radius);
      if (diff < minDiff) {
        minDiff = diff;
        best = wf;
      }
    }
    return best;
  }

  // Notificar llegada de frente para animación en observador (soportando ambos nombres)
  triggerArrivalPing() {
    this.observerPingRadius = 6;
    this.observerPingAlpha = 1.0;
  }

  triggerObserverPing() {
    this.triggerArrivalPing();
  }

  // Utilidad de trazado de rectángulos redondeados con fallback
  drawRoundRect(ctx, x, y, w, h, r = 6) {
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.beginPath();
      ctx.rect(x, y, w, h);
    }
  }

  // Dibujado principal de la escena
  render() {
    const ctx = this.ctx;
    if (!ctx) return;

    // Verificar si las dimensiones del canvas cambiaron en el layout
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width > 0 && (rect.width !== this.width || rect.height !== this.height)) {
      this.resize();
    }

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // Seguimiento de cámara
    if (this.followSource) {
      const sPos = this.physics.getSourcePos();
      this.panX = -sPos.x * this.scale;
      this.panY = sPos.y * this.scale;
    }

    // 1. Fondo oscuro con sutil gradiente radial
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Cuadrícula métrica y ejes graduados
    if (this.showGrid) {
      this.drawGrid(ctx);
    }

    // 3. Frentes de onda circulares fijos en el medio
    this.drawWavefronts(ctx);

    // 4. Cono de Mach (para M >= 1)
    if (this.showMachCone && this.physics.machNumber >= 1.0) {
      this.drawMachCone(ctx);
    }

    // 5. Línea de mira retardada y separación
    if (this.showLineOfSight) {
      this.drawLineOfSight(ctx);
    }

    // 6. Línea de separación inicial entre Fuente y Observador
    this.drawBaselineDistance(ctx);

    // 7. Dibujar Fuente
    this.drawSource(ctx);

    // 8. Dibujar Observador
    this.drawObserver(ctx);

    // 9. Dibujar Cinta métrica interactiva
    if (this.rulerActive && this.rulerStart && this.rulerCurrent) {
      this.drawRuler(ctx);
    }

    // 10. Inspección de frente seleccionado
    if (this.selectedWaveId !== null) {
      this.drawWaveInspectionTooltip(ctx);
    }

    // 11. Escala gráfica métrica de referencia
    this.drawScaleBar(ctx);

    // 12. Indicador interactivo inicial si t = 0 y está en reposo
    if (this.physics.t === 0 && !this.followSource) {
      this.drawInitialInvitation(ctx);
    }

    ctx.restore();
  }

  // Cuadrícula métrica clara con marcas numéricas
  drawGrid(ctx) {
    const targetPx = 80;
    const rawStep = targetPx / this.scale;
    const power = Math.pow(10, Math.floor(Math.log10(rawStep)));
    let step = power;
    if (rawStep / power > 5) step = 5 * power;
    else if (rawStep / power > 2) step = 2 * power;

    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(this.width, this.height);

    const startX = Math.floor(topLeft.x / step) * step;
    const endX = Math.ceil(bottomRight.x / step) * step;
    const startY = Math.floor(bottomRight.y / step) * step;
    const endY = Math.ceil(topLeft.y / step) * step;

    // Líneas secundarias de la cuadrícula
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    for (let x = startX; x <= endX; x += step) {
      const p1 = this.worldToScreen(x, startY);
      const p2 = this.worldToScreen(x, endY);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    for (let y = startY; y <= endY; y += step) {
      const p1 = this.worldToScreen(startX, y);
      const p2 = this.worldToScreen(endX, y);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Ejes principales X e Y (Cyan suave)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1.5;

    const pYTop = this.worldToScreen(0, endY);
    const pYBottom = this.worldToScreen(0, startY);
    ctx.beginPath();
    ctx.moveTo(pYTop.x, pYTop.y);
    ctx.lineTo(pYBottom.x, pYBottom.y);
    ctx.stroke();

    const pXLeft = this.worldToScreen(startX, 0);
    const pXRight = this.worldToScreen(endX, 0);
    ctx.beginPath();
    ctx.moveTo(pXLeft.x, pXLeft.y);
    ctx.lineTo(pXRight.x, pXRight.y);
    ctx.stroke();

    // Marcas métricas en el eje X
    ctx.fillStyle = 'rgba(148, 163, 184, 0.65)';
    ctx.font = '500 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (let x = startX; x <= endX; x += step) {
      if (Math.abs(x) < 1e-4) continue;
      const pt = this.worldToScreen(x, 0);
      ctx.fillText(`${x > 0 ? '+' : ''}${Math.round(x)} m`, pt.x, pt.y + 14);
    }
  }

  // Frentes de onda circulares fijos en el medio
  drawWavefronts(ctx) {
    const list = this.physics.getActiveWavefronts();
    ctx.save();

    if (this.waveStyle === 'dashed') ctx.setLineDash([8, 6]);
    else if (this.waveStyle === 'dotted') ctx.setLineDash([3, 4]);
    else ctx.setLineDash([]);

    for (const wf of list) {
      const centerScreen = this.worldToScreen(wf.xc, wf.yc);
      const radiusPx = wf.radius * this.scale;

      if (radiusPx <= 0) continue;

      // Descartar frentes que sobrepasen excesivamente la pantalla
      const maxScreenDist = Math.hypot(this.width, this.height);
      const distToCenter = Math.hypot(centerScreen.x - this.width / 2, centerScreen.y - this.height / 2);
      if (radiusPx - distToCenter > maxScreenDist * 1.5) continue;

      let alpha = 0.9;
      if (this.fadeWaves) {
        alpha = Math.max(0.15, 1.0 / (1.0 + wf.radius * 0.002));
      }

      const isSelected = wf.id === this.selectedWaveId;
      ctx.strokeStyle = isSelected ? '#fbbf24' : this.waveColor;
      ctx.globalAlpha = isSelected ? 1.0 : alpha;
      ctx.lineWidth = isSelected ? 3.0 : 1.8;

      ctx.beginPath();
      ctx.arc(centerScreen.x, centerScreen.y, radiusPx, 0, 2 * Math.PI);
      ctx.stroke();

      // Centro emisor del frente fijado permanentemente en el medio acústico
      ctx.fillStyle = isSelected ? '#fbbf24' : 'rgba(56, 189, 248, 0.5)';
      ctx.beginPath();
      ctx.arc(centerScreen.x, centerScreen.y, isSelected ? 3.5 : 2, 0, 2 * Math.PI);
      ctx.fill();
    }

    ctx.restore();
  }

  // Cono de Mach (envolvente tangencial supersónica para M >= 1)
  drawMachCone(ctx) {
    const s = this.physics.getSourcePos();
    const sScreen = this.worldToScreen(s.x, s.y);
    const mu = this.physics.machAngleRad;
    if (!mu) return;

    ctx.save();
    const angleV = Math.atan2(-this.physics.vfy, this.physics.vfx);
    const lengthPx = Math.max(1200, this.width * 1.5);
    const leftAngle = angleV + Math.PI - mu;
    const rightAngle = angleV + Math.PI + mu;

    const x1 = sScreen.x + lengthPx * Math.cos(leftAngle);
    const y1 = sScreen.y + lengthPx * Math.sin(leftAngle);
    const x2 = sScreen.x + lengthPx * Math.cos(rightAngle);
    const y2 = sScreen.y + lengthPx * Math.sin(rightAngle);

    // Sombra del cono (zona perturbada)
    ctx.fillStyle = 'rgba(244, 63, 94, 0.08)';
    ctx.beginPath();
    ctx.moveTo(sScreen.x, sScreen.y);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.fill();

    // Líneas de choque envolventes
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([6, 4]);

    ctx.beginPath();
    ctx.moveTo(sScreen.x, sScreen.y);
    ctx.lineTo(x1, y1);
    ctx.moveTo(sScreen.x, sScreen.y);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = '#f43f5e';
    ctx.font = '700 12px Inter, sans-serif';
    ctx.fillText(`μ = ${this.physics.machAngleDeg.toFixed(1)}°`, sScreen.x - 70, sScreen.y - 14);

    ctx.restore();
  }

  // Línea de mira retardada hacia el observador
  drawLineOfSight(ctx) {
    const s = this.physics.getSourcePos();
    const o = this.physics.getObserverPos();
    const sScreen = this.worldToScreen(s.x, s.y);
    const oScreen = this.worldToScreen(o.x, o.y);

    ctx.save();
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(sScreen.x, sScreen.y);
    ctx.lineTo(oScreen.x, oScreen.y);
    ctx.stroke();
    ctx.restore();
  }

  // Distancia inicial de separación entre Fuente y Observador
  drawBaselineDistance(ctx) {
    const s = this.physics.getSourcePos();
    const o = this.physics.getObserverPos();
    const p1 = this.worldToScreen(s.x, s.y);
    const p2 = this.worldToScreen(o.x, o.y);
    const dist = Math.hypot(o.x - s.x, o.y - s.y);

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);

    const yOffset = -35;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y + yOffset);
    ctx.lineTo(p2.x, p2.y + yOffset);
    ctx.stroke();

    // Pequeños topes verticales
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y + yOffset - 4);
    ctx.lineTo(p1.x, p1.y + yOffset + 4);
    ctx.moveTo(p2.x, p2.y + yOffset - 4);
    ctx.lineTo(p2.x, p2.y + yOffset + 4);
    ctx.stroke();

    // Insignia con la distancia métrica
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2 + yOffset;
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    this.drawRoundRect(ctx, midX - 42, midY - 10, 84, 20, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`d = ${dist.toFixed(1)} m`, midX, midY);

    ctx.restore();
  }

  // Dibujar Fuente (Punto Emisor Didáctico, Ambulancia o Avión)
  drawSource(ctx) {
    const s = this.physics.getSourcePos();
    const p = this.worldToScreen(s.x, s.y);
    ctx.save();

    const angle = Math.atan2(-this.physics.vfy, this.physics.vfx);

    if (this.sourceAvatar === 'car') {
      // Ambulancia / Vehículo
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);

      ctx.fillStyle = '#f8fafc';
      this.drawRoundRect(ctx, -22, -12, 44, 24, 4);
      ctx.fill();
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Cruz
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(-4, -8, 8, 16);
      ctx.fillRect(-9, -3, 18, 6);

      // Sirena
      const flash = (Math.sin(this.physics.t * 18) + 1) / 2;
      ctx.fillStyle = flash > 0.5 ? '#38bdf8' : '#f43f5e';
      ctx.beginPath();
      ctx.arc(0, -14, 4, 0, 2 * Math.PI);
      ctx.fill();

    } else if (this.sourceAvatar === 'plane') {
      // Avión Caza
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);

      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(24, 0);
      ctx.lineTo(-14, -14);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-14, 14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

    } else {
      // Punto Emisor vibrante con aura
      const auraGrad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 22);
      auraGrad.addColorStop(0, 'rgba(244, 63, 94, 0.9)');
      auraGrad.addColorStop(0.5, 'rgba(244, 63, 94, 0.3)');
      auraGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 22, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
      ctx.fill();
    }

    ctx.restore();

    // Vector de velocidad
    if (this.showVectors && (this.physics.vfx !== 0 || this.physics.vfy !== 0)) {
      this.drawVelocityVector(ctx, p.x, p.y, this.physics.vfx, this.physics.vfy, '#f43f5e', 'v_f');
    }

    // Etiqueta destacada
    ctx.fillStyle = '#f43f5e';
    ctx.font = '700 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Fuente Emisora (S)', p.x, p.y + 30);
    ctx.font = '500 10px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`(${s.x.toFixed(0)}, ${s.y.toFixed(0)}) m`, p.x, p.y + 44);
  }

  // Dibujar Observador (Micrófono / Radar con diana de recepción exacta)
  drawObserver(ctx) {
    const o = this.physics.getObserverPos();
    const p = this.worldToScreen(o.x, o.y);
    ctx.save();

    // Pulso animado al recibir onda
    if (this.observerPingAlpha > 0) {
      ctx.strokeStyle = `rgba(16, 185, 129, ${this.observerPingAlpha})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.observerPingRadius, 0, 2 * Math.PI);
      ctx.stroke();

      this.observerPingRadius += 1.2;
      this.observerPingAlpha -= 0.04;
    }

    // Diana de recepción verde esmeralda
    const auraObs = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 20);
    auraObs.addColorStop(0, 'rgba(16, 185, 129, 0.8)');
    auraObs.addColorStop(0.5, 'rgba(16, 185, 129, 0.25)');
    auraObs.addColorStop(1, 'transparent');

    ctx.fillStyle = auraObs;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 20, 0, 2 * Math.PI);
    ctx.fill();

    // Cruz y punto de recepción exacto
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 11, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(p.x - 15, p.y);
    ctx.lineTo(p.x + 15, p.y);
    ctx.moveTo(p.x, p.y - 15);
    ctx.lineTo(p.x, p.y + 15);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, 2 * Math.PI);
    ctx.fill();

    ctx.restore();

    // Vector de velocidad
    if (this.showVectors && (this.physics.vox !== 0 || this.physics.voy !== 0)) {
      this.drawVelocityVector(ctx, p.x, p.y, this.physics.vox, this.physics.voy, '#10b981', 'v_o');
    }

    // Etiqueta destacada
    ctx.fillStyle = '#10b981';
    ctx.font = '700 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Observador (O)', p.x, p.y + 30);
    ctx.font = '500 10px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`(${o.x.toFixed(0)}, ${o.y.toFixed(0)}) m`, p.x, p.y + 44);
  }

  // Flecha del vector de velocidad
  drawVelocityVector(ctx, px, py, vx, vy, color, label) {
    const scaleFactor = 0.45;
    const targetX = px + vx * scaleFactor;
    const targetY = py - vy * scaleFactor;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(targetX, targetY);
    ctx.stroke();

    const angle = Math.atan2(targetY - py, targetX - px);
    const arrowLen = 9;
    ctx.beginPath();
    ctx.moveTo(targetX, targetY);
    ctx.lineTo(targetX - arrowLen * Math.cos(angle - Math.PI / 6), targetY - arrowLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(targetX - arrowLen * Math.cos(angle + Math.PI / 6), targetY - arrowLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillText(`${label} = ${Math.hypot(vx, vy).toFixed(0)} m/s`, targetX + 6, targetY - 6);
    ctx.restore();
  }

  // Cinta métrica interactiva
  drawRuler(ctx) {
    const p1 = this.worldToScreen(this.rulerStart.x, this.rulerStart.y);
    const p2 = this.worldToScreen(this.rulerCurrent.x, this.rulerCurrent.y);
    const distMeters = Math.hypot(this.rulerCurrent.x - this.rulerStart.x, this.rulerCurrent.y - this.rulerStart.y);

    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(p1.x - 4, p1.y - 4, 8, 8);
    ctx.fillRect(p2.x - 4, p2.y - 4, 8, 8);

    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    this.drawRoundRect(ctx, midX - 45, midY - 12, 90, 24, 4);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${distMeters.toFixed(1)} m`, midX, midY);
    ctx.restore();
  }

  // Tooltip de inspección de frente de onda seleccionado
  drawWaveInspectionTooltip(ctx) {
    const list = this.physics.getActiveWavefronts();
    const wf = list.find(w => w.id === this.selectedWaveId);
    if (!wf) return;

    const topP = this.worldToScreen(wf.xc, wf.yc + wf.radius);
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;

    const bx = topP.x - 90;
    const by = topP.y - 65;
    this.drawRoundRect(ctx, bx, by, 180, 56, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Frente #${wf.id + 1} (t_e = ${wf.te.toFixed(2)} s)`, bx + 10, by + 18);
    ctx.font = '500 11px Inter, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`Radio: ${wf.radius.toFixed(1)} m | Origen: (${wf.xc.toFixed(0)}, ${wf.yc.toFixed(0)})`, bx + 10, by + 34);
    ctx.fillStyle = wf.arrived ? '#10b981' : '#f59e0b';
    ctx.fillText(wf.arrived ? '✓ Recibido por observador' : '⏳ En propagación...', bx + 10, by + 48);

    ctx.restore();
  }

  // Barra de escala métrica en la esquina inferior izquierda
  drawScaleBar(ctx) {
    const barPx = 120;
    const barMeters = barPx / this.scale;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.drawRoundRect(ctx, 16, this.height - 40, barPx + 24, 28, 6);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(28, this.height - 24);
    ctx.lineTo(28 + barPx, this.height - 24);
    ctx.moveTo(28, this.height - 28);
    ctx.lineTo(28, this.height - 20);
    ctx.moveTo(28 + barPx, this.height - 28);
    ctx.lineTo(28 + barPx, this.height - 20);
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${barMeters.toFixed(0)} m`, 28 + barPx / 2, this.height - 29);
    ctx.restore();
  }

  // Invitación inicial cuando t = 0
  drawInitialInvitation(ctx) {
    ctx.save();
    const cx = this.width / 2;
    const cy = Math.max(70, this.height * 0.18);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1;
    this.drawRoundRect(ctx, cx - 180, cy - 20, 360, 40, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▶ Pulsa Iniciar abajo (o Espacio) para emitir ondas a 2 Hz', cx, cy);
    ctx.restore();
  }
}


/* ======================== doppler-ui.js ======================== */
/**
 * doppler-ui.js
 * Controlador de Interfaz de Usuario, Gráficas, Telemetría,
 * Matemáticas (KaTeX/LaTeX) y Escenarios Didácticos del Efecto Doppler.
 */




class DopplerUI {
  constructor() {
    // 1. Instancias del núcleo
    this.physics = new DopplerPhysics({
      c: 340.0,
      f: 2.0,
      vfx: 0.0,
      vfy: 0.0,
      vox: 0.0,
      voy: 0.0,
      x0f: -170.0,
      y0f: 0.0,
      x0o: 170.0,
      y0o: 0.0,
      duration: 10.0
    });

    this.audio = new DopplerAudio();
    this.canvas = null; // Inicializado en init()

    // 2. Control de tiempo y animación
    this.isPlaying = false;
    this.playSpeed = 1.0;
    this.subdivisionsPerPeriod = 100;
    this.durationMode = 'fixed'; // 'fixed' | 'periods'
    this.numPeriods = 20;
    this.lastFrameTime = 0;
    this.animFrameId = null;

    // 3. Estado de la interfaz
    this.mode = 'exploration'; // 'exploration' | 'lab'
    this.is2D = false;
    this.activeTab = 'controls';
    this.currentScenarioIndex = 0;

    // 4. Catálogo de los 8 Escenarios Guiados
    this.scenarios = [
      {
        id: 'stationary',
        title: '1. Fuente y observador inmóviles',
        desc: 'Referencia basal sin corrimiento Doppler (f_o = f_e).',
        config: { f: 2.0, c: 340.0, vfx: 0.0, vox: 0.0, x0f: -170.0, x0o: 170.0, duration: 10.0, is2D: false },
        objective: 'Comprobar que en reposo la longitud de onda en el medio es constante en todas las direcciones y la frecuencia percibida es exactamente igual a la emitida.',
        prediction: 'Si ninguno se mueve, ¿a qué frecuencia recibirá el observador los frentes de onda?',
        procedure: 'Inicia la simulación y observa la llegada regular de los frentes de onda al micrófono en x = +170 m.',
        explanation: 'Las ondas se propagan a c = 340 m/s concéntricas respecto a la fuente fija. El período de llegada es idéntico al de emisión (T = 0.5 s), por lo que f_medida = 2.0 Hz = f_e.',
        quiz: {
          question: '¿Por qué la primera llegada ocurre a t = 1.0 s y no a t = 0 s?',
          options: [
            'Porque el observador tarda 1 s en reaccionar.',
            'Porque la distancia es 340 m y la rapidez del sonido es 340 m/s (t = d / c = 1 s).',
            'Porque la frecuencia es 2 Hz y 2 / 2 = 1 s.'
          ],
          correct: 1,
          feedback: '¡Exacto! El sonido tiene una rapidez de propagación finita en el medio (c = 340 m/s). La primera perturbación tarda exactamente d/c = 1.0 segundo en viajar 340 metros.'
        }
      },
      {
        id: 'source_approach',
        title: '2. Fuente que se aproxima',
        desc: 'Compresión espacial de frentes delante de la fuente en movimiento.',
        config: { f: 2.0, c: 340.0, vfx: 68.0, vox: 0.0, x0f: -200.0, x0o: 200.0, duration: 6.0, is2D: false },
        objective: 'Entender por qué la longitud de onda delante se acorta (λ = (c - vf)/f) y la frecuencia observada aumenta (fo > fe).',
        prediction: 'Al moverse la fuente hacia el observador a 68 m/s (0.2c), ¿cómo será la frecuencia medida?',
        procedure: 'Reproduce la simulación y compara el espaciado entre frentes delante y detrás de la fuente.',
        explanation: 'La fuente persigue parcialmente sus propias ondas. Delante, λ_delante = (340 - 68)/2 = 136 m (menor que λ0 = 170 m). La frecuencia medida sube a fo = 2 × 340 / (340 - 68) = 2.5 Hz.',
        quiz: {
          question: '¿La rapidez con que viajan los frentes en el aire aumenta porque la fuente se mueve a 68 m/s?',
          options: [
            'Sí, ahora las ondas viajan a 340 + 68 = 408 m/s.',
            'No, la rapidez c depende exclusivamente de las propiedades del medio acústico, no de la velocidad de la fuente.',
            'Depende de si la fuente acelera o no.'
          ],
          correct: 1,
          feedback: '¡Correcto! Principio fundamental: la velocidad de propagación c está anclada al medio elástico (aire en reposo). El movimiento de la fuente no añade velocidad a la onda, solo cambia la distancia entre emisiones sucesivas.'
        }
      },
      {
        id: 'source_recede',
        title: '3. Fuente que se aleja',
        desc: 'Dilatación espacial de frentes detrás de la fuente.',
        config: { f: 2.0, c: 340.0, vfx: -68.0, vox: 0.0, x0f: 0.0, x0o: 250.0, duration: 8.0, is2D: false },
        objective: 'Verificar la dilatación de frentes (λ = (c + vf)/f) y la reducción en la frecuencia percibida (fo < fe).',
        prediction: 'Si la fuente se aleja a 68 m/s, ¿la frecuencia percibida será menor o mayor que 2 Hz?',
        procedure: 'Inicia la simulación y observa la separación entre anillos que viajan hacia la derecha.',
        explanation: 'Cada nuevo frente se emite más lejos del observador. λ_detrás = (340 + 68)/2 = 204 m. La frecuencia recibida desciende a fo = 2 × 340 / (340 + 68) = 1.667 Hz.',
        quiz: {
          question: '¿Qué sucede con el tono audible cuando un vehículo emisor se aleja de ti?',
          options: [
            'Se percibe más agudo (mayor frecuencia).',
            'Se percibe más grave (menor frecuencia).',
            'Permanece idéntico pero con menor volumen.'
          ],
          correct: 1,
          feedback: '¡Muy bien! Una frecuencia observada menor corresponde a un tono más grave (corrimiento al rojo en acústica).'
        }
      },
      {
        id: 'observer_approach',
        title: '4. Observador que se aproxima',
        desc: 'El observador intercepta frentes a mayor ritmo en el medio.',
        config: { f: 2.0, c: 340.0, vfx: 0.0, vox: -68.0, x0f: -200.0, x0o: 200.0, duration: 5.0, is2D: false },
        objective: 'Comprender que la longitud de onda espacial en el medio NO cambia, pero el observador barre los frentes con mayor rapidez relativa (c + vo).',
        prediction: '¿Cambia la distancia física entre frentes en el aire cuando es el observador quien se mueve hacia una fuente fija?',
        procedure: 'Observa la cuadrícula métrica. Mide la distancia entre círculos con la herramienta de cinta métrica.',
        explanation: 'En el aire, la longitud de onda sigue siendo λ0 = c / f = 170 m. Pero la velocidad de encuentro relativo es c + |vo| = 340 + 68 = 408 m/s. Por tanto, fo = (340 + 68)/170 = 2.4 Hz.',
        quiz: {
          question: 'Para la misma velocidad v = 68 m/s, ¿por qué fo(fuente móvil) = 2.5 Hz es diferente de fo(observador móvil) = 2.4 Hz?',
          options: [
            'Es un error de redondeo de la simulación.',
            'Porque el medio rompe la simetría: en un caso se comprime la onda en el aire, en el otro el observador cruza frentes no modificados.',
            'Porque el observador absorbe energía de las ondas.'
          ],
          correct: 1,
          feedback: '¡Excelente discernimiento físico! En física clásica acústica, el medio establece un marco de referencia absoluto para la propagación. Fuente móvil y observador móvil no son físicamente simétricos.'
        }
      },
      {
        id: 'observer_recede',
        title: '5. Observador que se aleja',
        desc: 'El observador huye de los frentes de onda.',
        config: { f: 2.0, c: 340.0, vfx: 0.0, vox: 68.0, x0f: -200.0, x0o: 0.0, duration: 8.0, is2D: false },
        objective: 'Analizar la reducción de frecuencia debida a la evasión de frentes por parte del receptor.',
        prediction: '¿Qué ocurriría si el observador se alejara a la velocidad exacta del sonido (vo = c = 340 m/s)?',
        procedure: 'Observa el ritmo de cruce del punto del observador con los anillos que lo persiguen.',
        explanation: 'Con vo = 68 m/s huyendo, la velocidad de alcance relativa es c - vo = 272 m/s. La frecuencia es fo = 2 × (340 - 68)/340 = 1.6 Hz. Si vo = c, las ondas nunca lo alcanzarían (fo = 0 Hz).',
        quiz: {
          question: '¿Qué fórmula describe el caso de un observador que se aleja de una fuente en reposo?',
          options: [
            'fo = fe * (c - vo) / c',
            'fo = fe * c / (c - vf)',
            'fo = fe * (c + vo) / (c + vf)'
          ],
          correct: 0,
          feedback: '¡Correcto! fo = fe * (c - vo) / c, con vo > 0 en alejamiento.'
        }
      },
      {
        id: 'equal_velocity',
        title: '6. Ambos con igual velocidad (Colineal)',
        desc: 'Fuente y observador se desplazan juntos a velocidad constante.',
        config: { f: 2.0, c: 340.0, vfx: 68.0, vox: 68.0, x0f: -200.0, x0o: 100.0, duration: 8.0, is2D: false },
        objective: 'Demostrar que cuando ambos viajan con la misma velocidad en la misma dirección, la frecuencia observada es idéntica a la emitida.',
        prediction: 'Si ambos viajan hacia la derecha a 68 m/s conservando 300 m de separación fija, ¿cambiará la frecuencia recibida?',
        procedure: 'Observa las ondas comprimidas delante de la fuente y cómo el observador se aleja de ellas al mismo ritmo.',
        explanation: 'fo = fe * (c - vo) / (c - vf) = 2.0 * (340 - 68) / (340 - 68) = 2.0 Hz. La compresión espacial del frente es exactamente compensada por la velocidad con la que el observador huye de él.',
        quiz: {
          question: '¿Significa esto que el medio no influye en este escenario?',
          options: [
            'Sí, el efecto del medio se anula completamente.',
            'No, la longitud de onda en el aire sigue siendo 136 m delante, y el tiempo de vuelo sigue dependiendo de c.',
            'El sonido viaja instantáneamente entre ellos.'
          ],
          correct: 1,
          feedback: '¡Exacto! La física en el medio sigue siendo asimétrica: la onda viaja comprimida en el aire, pero el detector se mueve cancelando la diferencia de ritmo de encuentro.'
        }
      },
      {
        id: 'lateral_pass_2d',
        title: '7. Paso lateral bidimensional (2D)',
        desc: 'Fuente que pasa rozando al observador a una distancia lateral fija.',
        config: { f: 2.0, c: 340.0, vfx: 100.0, vfy: 0.0, vox: 0.0, voy: 0.0, x0f: -300.0, y0f: 80.0, x0o: 0.0, y0o: 0.0, duration: 8.0, is2D: true },
        objective: 'Estudiar la variación continua del corrimiento Doppler dependiente del ángulo del vector de mira (fo(t)).',
        prediction: '¿La frecuencia cambia de golpe o evoluciona continuamente durante el paso lateral?',
        procedure: 'Observa la gráfica de frecuencia observada en el tiempo y el vector de línea de mira n.',
        explanation: 'El corrimiento depende del producto escalar n · vf = vf * cos(θ). Lejos en aproximación, θ ≈ 0 y fo es alta; en el punto de mínima aproximación, θ = 90° (cos θ = 0) y fo = fe; al alejarse, θ ≈ 180° y fo desciende suavemente.',
        quiz: {
          question: 'En el instante de mínima distancia (paso perpendicular θ = 90°), ¿cuánto vale el corrimiento Doppler clásico?',
          options: [
            'Es máximo positivo.',
            'Es cero: fo = fe (ya que el vector velocidad es perpendicular a la línea de mira).',
            'Es infinito.'
          ],
          correct: 1,
          feedback: '¡Brillante! En acústica clásica, cuando n · v = 0, no hay componente radial de velocidad relativa, por lo que fo = fe.'
        }
      },
      {
        id: 'mach_supersonic',
        title: '8. Régimen sónico y supersónico',
        desc: 'Transición a Mach 1.5 y formación del cono y onda de choque de Mach.',
        config: { f: 3.0, c: 340.0, vfx: 510.0, vfy: 0.0, vox: 0.0, voy: 0.0, x0f: -400.0, y0f: 120.0, x0o: 0.0, y0o: 0.0, duration: 4.0, is2D: true },
        objective: 'Observar la envolvente de interferencia constructiva de Mach y comprobar el semiángulo μ = arcsin(1/M).',
        prediction: 'Para M = 1.5 (vf = 510 m/s), ¿cuánto medirá el semiángulo del cono de Mach?',
        procedure: 'Visualiza las líneas amarillas tangentes a los frentes circulares y el momento de llegada de la envolvente al observador.',
        explanation: 'Con M = 1.5, el semiángulo es μ = arcsin(1 / 1.5) = arcsin(0.6667) ≈ 41.81°. Delante del cono reina el silencio (zona de silencio); al cruzar la envolvente, el observador percibe el estampido sónico concentrado.',
        quiz: {
          question: '¿Puede un observador escuchar el avión supersónico antes de que la envolvente de Mach lo alcance?',
          options: [
            'Sí, si tiene un micrófono muy sensible.',
            'No, porque el avión viaja más rápido que las propias ondas sonoras que emite.',
            'Solo si el avión vuela en línea recta.'
          ],
          correct: 1,
          feedback: '¡Correcto! En régimen supersónico, todos los frentes quedan confinados dentro del cono de Mach. El observador está en la "zona de silencio" hasta el instante en que el cono lo cruza.'
        }
      }
    ];
  }

  // Inicialización de la aplicación
  init() {
    this.mount();
  }

  mount() {
    const canvasEl = document.getElementById('dopplerCanvas');
    if (!canvasEl) {
      return;
    }

    this.canvas = new DopplerCanvas(canvasEl, this.physics, this.audio);

    this.bindDomElements();
    this.bindTransportControls();
    this.bindSlidersAndInputs();
    this.bindScenarioDialog();
    this.bindChartCanvas();
    this.bindExportTools();

    // Generar estado inicial exacto
    this.physics.stepTo(0);
    this.canvas.resize();
    this.canvas.fitScene();

    // Actualización inicial
    this.updateUIFromPhysics();
    this.renderMathPanel();
    this.renderCharts();

    // Clic en el canvas para iniciar fácilmente si está en reposo
    canvasEl.addEventListener('click', () => {
      if (!this.canvas.isDragging && this.physics.t === 0 && !this.isPlaying) {
        this.play();
      }
    });

    // Iniciar loop de animación independiente del paso físico
    if (!this._animLoopStarted) {
      this.startAnimationLoop();
      this._animLoopStarted = true;
    }

    console.log('DopplerUI inicializado con éxito. Listo para experimentación.');
  }

  // Vinculación de elementos del DOM
  bindDomElements() {
    // Selector de modo Exploración / Laboratorio
    const btnExploration = document.getElementById('btnModeExploration');
    const btnLab = document.getElementById('btnModeLab');
    if (btnExploration && btnLab) {
      btnExploration.addEventListener('click', () => this.setMode('exploration'));
      btnLab.addEventListener('click', () => this.setMode('lab'));
    }

    // Botones de presets rápidos de velocidad
    document.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pKey = btn.getAttribute('data-preset');
        document.querySelectorAll('[data-preset]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.applyPreset(pKey);
      });
    });

    // Toggle de Audio
    const btnAudioToggle = document.getElementById('btnAudioToggle');
    if (btnAudioToggle) {
      btnAudioToggle.addEventListener('click', () => {
        const nextState = !this.audio.isEnabled;
        this.audio.setEnabled(nextState);
        btnAudioToggle.classList.toggle('active', nextState);
        btnAudioToggle.setAttribute('aria-pressed', nextState ? 'true' : 'false');
        btnAudioToggle.innerHTML = nextState
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
      });
    }

    // Modal de Escenarios Didácticos
    const btnOpenScenarios = document.getElementById('btnOpenScenarios');
    const modalScenarios = document.getElementById('modalScenarios');
    const btnCloseScenarios = document.getElementById('btnCloseScenarios');
    if (btnOpenScenarios && modalScenarios) {
      btnOpenScenarios.addEventListener('click', () => modalScenarios.classList.add('open'));
    }
    if (btnCloseScenarios && modalScenarios) {
      btnCloseScenarios.addEventListener('click', () => modalScenarios.classList.remove('open'));
    }

    // Modal de Ayuda Teórica
    const btnOpenHelp = document.getElementById('btnOpenHelp');
    const modalHelp = document.getElementById('modalHelp');
    const btnCloseHelp = document.getElementById('btnCloseHelp');
    if (btnOpenHelp && modalHelp) {
      btnOpenHelp.addEventListener('click', () => modalHelp.classList.add('open'));
    }
    if (btnCloseHelp && modalHelp) {
      btnCloseHelp.addEventListener('click', () => modalHelp.classList.remove('open'));
    }

    // Cambio de tema Claro / Oscuro
    const btnThemeToggle = document.getElementById('btnThemeToggle');
    if (btnThemeToggle) {
      btnThemeToggle.addEventListener('click', () => {
        document.body.classList.toggle('theme-light');
      });
    }

    // Pestañas del Sidebar
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTab = btn.getAttribute('data-tab');

        document.querySelectorAll('.tab-pane').forEach(pane => {
          pane.style.display = pane.id === `tab-${this.activeTab}` ? 'flex' : 'none';
        });
      });
    });

    // Herramientas de Canvas Toolbar
    const btnResetView = document.getElementById('btnResetView');
    if (btnResetView) {
      btnResetView.addEventListener('click', () => this.canvas.resetView());
    }
    const btnFitScene = document.getElementById('btnFitScene');
    if (btnFitScene) {
      btnFitScene.addEventListener('click', () => this.canvas.fitScene());
    }
    const btnToggleRuler = document.getElementById('btnToggleRuler');
    if (btnToggleRuler) {
      btnToggleRuler.addEventListener('click', () => {
        this.canvas.rulerActive = !this.canvas.rulerActive;
        btnToggleRuler.classList.toggle('active', this.canvas.rulerActive);
      });
    }
    const btnFollowSource = document.getElementById('btnFollowSource');
    if (btnFollowSource) {
      btnFollowSource.addEventListener('click', () => {
        this.canvas.followSource = !this.canvas.followSource;
        btnFollowSource.classList.toggle('active', this.canvas.followSource);
      });
    }
  }

  // Configuración de modo: Exploración vs Laboratorio
  setMode(mode) {
    this.mode = mode;
    document.body.classList.toggle('mode-exploration', mode === 'exploration');
    document.getElementById('btnModeExploration')?.classList.toggle('active', mode === 'exploration');
    document.getElementById('btnModeLab')?.classList.toggle('active', mode === 'lab');
  }

  // Presets rápidos de 1 clic para exploración inmediata
  applyPreset(presetKey) {
    switch (presetKey) {
      case 'rest':
        this.setSpeedValues(0, 0);
        break;
      case 'src-approach':
        this.setSpeedValues(68, 0);
        break;
      case 'src-recede':
        this.setSpeedValues(-68, 0);
        break;
      case 'obs-approach':
        this.setSpeedValues(0, -68);
        break;
      case 'obs-recede':
        this.setSpeedValues(0, 68);
        break;
      case 'both-moving':
        this.setSpeedValues(68, 68);
        break;
      case 'mach-1':
        this.setSpeedValues(340, 0);
        break;
      case 'supersonic':
        this.setSpeedValues(510, 0);
        break;
    }
    this.resetSimulation();
    this.canvas.fitScene();
  }

  setSpeedValues(vf, vo) {
    this.physics.vfx = vf;
    this.physics.vox = vo;
    const sync = (sliderId, inputId, badgeId, val) => {
      const sl = document.getElementById(sliderId);
      const inp = document.getElementById(inputId);
      const bg = document.getElementById(badgeId);
      if (sl) sl.value = val;
      if (inp) inp.value = val;
      if (bg) bg.textContent = val;
    };
    sync('sliderVfx', 'inputVfx', 'badgeVfx', vf);
    sync('sliderVox', 'inputVox', 'badgeVox', vo);
  }

  // Controles de transporte temporal (Play, Pausa, Reset, Pasos, Scrubber)
  bindTransportControls() {
    const playBtn = document.getElementById('btnPlayPause');
    const resetBtn = document.getElementById('btnReset');
    const stepBackBtn = document.getElementById('btnStepBack');
    const stepFwdBtn = document.getElementById('btnStepForward');
    const stepPeriodBtn = document.getElementById('btnStepPeriod');
    const scrubber = document.getElementById('scrubberSlider');
    const speedSelect = document.getElementById('speedSelect');
    const subdivSelect = document.getElementById('subdivSelect');

    if (playBtn) {
      playBtn.addEventListener('click', () => this.togglePlay());
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetSimulation());
    }

    if (stepBackBtn) {
      stepBackBtn.addEventListener('click', () => {
        this.pause();
        const dt = 1.0 / (this.subdivisionsPerPeriod * this.physics.f);
        this.seekTo(Math.max(0, this.physics.t - dt));
      });
    }

    if (stepFwdBtn) {
      stepFwdBtn.addEventListener('click', () => {
        this.pause();
        const dt = 1.0 / (this.subdivisionsPerPeriod * this.physics.f);
        this.seekTo(Math.min(this.physics.duration, this.physics.t + dt));
      });
    }

    if (stepPeriodBtn) {
      stepPeriodBtn.addEventListener('click', () => {
        this.pause();
        const T = this.physics.period;
        this.seekTo(Math.min(this.physics.duration, this.physics.t + T));
      });
    }

    if (scrubber) {
      scrubber.addEventListener('input', (e) => {
        this.pause();
        const targetTime = parseFloat(e.target.value);
        this.seekTo(targetTime);
      });
    }

    if (speedSelect) {
      speedSelect.addEventListener('change', (e) => {
        this.playSpeed = parseFloat(e.target.value);
      });
    }

    if (subdivSelect) {
      subdivSelect.addEventListener('change', (e) => {
        this.subdivisionsPerPeriod = parseInt(e.target.value, 10);
      });
    }

    // Teclas de acceso directo accesibles
    window.addEventListener('keydown', (e) => {
      // Evitar capturar si el usuario está escribiendo en un input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (e.code === 'KeyR' && document.getElementById('dopplerCanvas')) {
        this.resetSimulation();
      }
    });
  }

  // Sincronización bidireccional de Sliders y Cuadros Numéricos
  bindSlidersAndInputs() {
    const bindPair = (sliderId, inputId, badgeId, onChange) => {
      const slider = document.getElementById(sliderId);
      const input = document.getElementById(inputId);
      const badge = document.getElementById(badgeId);

      const updateVal = (val, fromSlider = true) => {
        const num = parseFloat(val);
        if (Number.isFinite(num)) {
          if (fromSlider && input) input.value = num;
          if (!fromSlider && slider) slider.value = num;
          if (badge) badge.textContent = num;
          onChange(num);
        }
      };

      if (slider) {
        slider.addEventListener('input', (e) => updateVal(e.target.value, true));
      }
      if (input) {
        input.addEventListener('change', (e) => updateVal(e.target.value, false));
      }
    };

    // 1. Frecuencia emitida (f)
    bindPair('sliderFreq', 'inputFreq', 'badgeFreq', (val) => {
      if (val > 0) {
        this.physics.f = val;
        this.applyParameterChange();
      }
    });

    // 2. Rapidez del sonido (c)
    bindPair('sliderC', 'inputC', 'badgeC', (val) => {
      if (val > 0) {
        this.physics.c = val;
        this.applyParameterChange();
      }
    });

    // 3. Velocidad fuente X (vfx)
    bindPair('sliderVfx', 'inputVfx', 'badgeVfx', (val) => {
      this.physics.vfx = val;
      this.applyParameterChange();
    });

    // 4. Velocidad observador X (vox)
    bindPair('sliderVox', 'inputVox', 'badgeVox', (val) => {
      this.physics.vox = val;
      this.applyParameterChange();
    });

    // 5. Duración de la simulación
    bindPair('sliderDuration', 'inputDuration', 'badgeDuration', (val) => {
      if (val > 0) {
        this.physics.duration = val;
        const scrubber = document.getElementById('scrubberSlider');
        if (scrubber) scrubber.max = val;
        this.applyParameterChange();
      }
    });

    // Selector de Avatar de fuente
    const avatarSelect = document.getElementById('selectAvatar');
    if (avatarSelect) {
      avatarSelect.addEventListener('change', (e) => {
        this.canvas.sourceAvatar = e.target.value;
      });
    }

    // Selector de Estilo de frente de onda
    const waveStyleSelect = document.getElementById('selectWaveStyle');
    if (waveStyleSelect) {
      waveStyleSelect.addEventListener('change', (e) => {
        this.canvas.waveStyle = e.target.value;
      });
    }

    // Toggle de Atenuación visual
    const checkFade = document.getElementById('checkFadeWaves');
    if (checkFade) {
      checkFade.addEventListener('change', (e) => {
        this.canvas.fadeWaves = e.target.checked;
      });
    }

    // Toggle de Vectores de velocidad
    const checkVectors = document.getElementById('checkShowVectors');
    if (checkVectors) {
      checkVectors.addEventListener('change', (e) => {
        this.canvas.showVectors = e.target.checked;
      });
    }

    // Toggle de Modo 2D
    const check2D = document.getElementById('checkMode2D');
    if (check2D) {
      check2D.addEventListener('change', (e) => {
        this.is2D = e.target.checked;
        document.querySelectorAll('.input-2d-only').forEach(el => {
          el.style.display = this.is2D ? 'flex' : 'none';
        });
      });
    }

    // Modalidad de Audio (Pulsos vs Continuo)
    const audioModeSelect = document.getElementById('selectAudioMode');
    if (audioModeSelect) {
      audioModeSelect.addEventListener('change', (e) => {
        this.audio.setMode(e.target.value);
      });
    }

    // Volumen de Audio
    const sliderVolume = document.getElementById('sliderVolume');
    if (sliderVolume) {
      sliderVolume.addEventListener('input', (e) => {
        this.audio.setVolume(parseFloat(e.target.value));
      });
    }
  }

  // Política limpia de cambio de parámetros: reconstruir estado sin artefactos retrospectivos
  applyParameterChange() {
    const curTime = this.physics.t;
    this.physics.reset();
    if (curTime > 0) {
      this.physics.stepTo(curTime);
    }
    this.updateTelemetry();
    this.renderMathPanel();
    this.renderCharts();
  }

  // Reproducción y Pausa
  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    if (this.physics.t >= this.physics.duration) {
      this.seekTo(0);
    }
    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    this.updatePlayBtnUI();
    if (this.audio.isEnabled && this.audio.mode === 'continuous') {
      this.audio.startContinuousTone(this.physics.getTheoreticalFrequency(this.physics.t), this.physics.f);
    }
  }

  pause() {
    this.isPlaying = false;
    this.updatePlayBtnUI();
    this.audio.stopAll();
  }

  updatePlayBtnUI() {
    const btn = document.getElementById('btnPlayPause');
    if (!btn) return;
    btn.innerHTML = this.isPlaying
      ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`
      : `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    btn.setAttribute('aria-label', this.isPlaying ? 'Pausar simulación' : 'Iniciar simulación');
  }

  resetSimulation() {
    this.pause();
    this.seekTo(0);
  }

  seekTo(targetTime) {
    const clampedTime = Math.max(0, Math.min(this.physics.duration, targetTime));
    this.audio.stopAll(); // Detener sonidos pendientes al buscar
    this.physics.reset();
    this.physics.stepTo(clampedTime);
    this.updateUIFromPhysics();
    this.renderMathPanel();
    this.renderCharts();
  }

  // Bucle de animación con requestAnimationFrame (desacoplado de la física)
  startAnimationLoop() {
    const loop = (currentTime) => {
      this.animFrameId = requestAnimationFrame(loop);

      const canvasEl = document.getElementById('dopplerCanvas');
      if (!canvasEl || !document.contains(canvasEl) || !this.canvas) return;

      if (this.isPlaying) {
        const deltaSeconds = (currentTime - this.lastFrameTime) / 1000.0;
        this.lastFrameTime = currentTime;

        // Limitar salto temporal ante pausas de pestaña
        const safeDelta = Math.min(deltaSeconds, 0.1);
        const nextTime = this.physics.t + safeDelta * this.playSpeed;

        if (nextTime >= this.physics.duration) {
          this.physics.stepTo(this.physics.duration);
          this.pause();
        } else {
          // El método stepTo de DopplerPhysics detecta analíticamente cada llegada intermedia
          const prevArrivalCount = this.physics.arrivals.length;
          this.physics.stepTo(nextTime);
          const newArrivalCount = this.physics.arrivals.length;

          // Si hubo recepciones en este intervalo, emitir pulso de audio y visual
          if (newArrivalCount > prevArrivalCount) {
            for (let i = prevArrivalCount; i < newArrivalCount; i++) {
              const arrival = this.physics.arrivals[i];
              this.canvas.triggerObserverPing();
              this.audio.playArrivalPulse(arrival.waveId);
            }
          }

          // Si el audio continuo está activo, modular el tono en tiempo real
          if (this.audio.isEnabled && this.audio.mode === 'continuous') {
            const fo = this.physics.getTheoreticalFrequency(this.physics.t);
            this.audio.updateContinuousPitch(fo, this.physics.f);
          }
        }

        this.updateUIFromPhysics();
        this.renderCharts();
      }

      // Dibujar canvas de simulación
      this.canvas.render();
    };

    this.lastFrameTime = performance.now();
    this.animFrameId = requestAnimationFrame(loop);
  }

  // Actualización de la telemetría e indicadores del DOM
  updateUIFromPhysics() {
    const t = this.physics.t;
    const dur = this.physics.duration;

    // 1. Scrubber y display de tiempo
    const scrubber = document.getElementById('scrubberSlider');
    if (scrubber) scrubber.value = t;

    const timeDisplay = document.getElementById('timeDisplay');
    if (timeDisplay) {
      timeDisplay.textContent = `${t.toFixed(2)} s / ${dur.toFixed(1)} s`;
    }

    this.updateTelemetry();
  }

  updateTelemetry() {
    const t = this.physics.t;
    const posF = this.physics.getSourcePosition(t);
    const posO = this.physics.getObserverPosition(t);
    const dist = Math.hypot(posO.x - posF.x, posO.y - posF.y);
    const M = this.physics.machNumber;
    const mu = this.physics.machAngleDeg;

    // Frecuencias: emitida, teórica instantánea, y experimental por llegadas
    const fe = this.physics.f;
    const foTheoretical = this.physics.getTheoreticalFrequency(t);

    const validArrivals = this.physics.arrivals.filter(a => a.fMeasured !== null);
    const lastArrival = validArrivals.length > 0 ? validArrivals[validArrivals.length - 1] : null;
    const fMeasured = lastArrival ? lastArrival.fMeasured : null;

    // Indicadores numéricos
    const setElem = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setElem('telemetryDist', `${dist.toFixed(1)} m`);
    setElem('telemetryMach', M.toFixed(2));
    setElem('telemetryMachAngle', mu !== null ? `${mu.toFixed(1)}°` : 'N/A (Subsónico)');
    setElem('telemetryLambda0', `${this.physics.lambda0.toFixed(2)} m`);
    setElem('telemetryLambdaAhead', `${this.physics.lambdaAhead.toFixed(2)} m`);
    setElem('telemetryLambdaBehind', `${this.physics.lambdaBehind.toFixed(2)} m`);
    setElem('telemetryWaveCount', `${this.physics.wavefronts.length} emitidos`);
    setElem('telemetryArrivalCount', `${this.physics.arrivals.length} recibidos`);

    // Frecuencia teórica con formateo especial de singularidad
    if (!Number.isFinite(foTheoretical) || foTheoretical === Infinity) {
      setElem('telemetryFoTheory', 'Mach 1 (Singular)');
    } else {
      setElem('telemetryFoTheory', `${foTheoretical.toFixed(2)} Hz`);
    }

    // Frecuencia experimental por intervalo de llegadas
    if (fMeasured !== null) {
      setElem('telemetryFoMeasured', `${fMeasured.toFixed(2)} Hz`);
      setElem('telemetryDeltaTr', `Δtr = ${lastArrival.deltaTr.toFixed(3)} s`);
    } else {
      setElem('telemetryFoMeasured', 'Esperando 2 llegadas...');
      setElem('telemetryDeltaTr', 'N/A');
    }

    // Régimen en HUD superior
    const regimeHud = document.getElementById('hudRegimeBadge');
    if (regimeHud) {
      if (M < 0.98) {
        regimeHud.textContent = 'Subsónico';
        regimeHud.className = 'hud-chip';
      } else if (M <= 1.02) {
        regimeHud.textContent = 'Barrera Sónica (Mach 1)';
        regimeHud.className = 'hud-chip warning';
      } else {
        regimeHud.textContent = `Supersónico (M = ${M.toFixed(2)})`;
        regimeHud.className = 'hud-chip supersonic';
      }
    }
  }

  // Panel Matemático y LaTeX dinámico con KaTeX / MathJax
  renderMathPanel() {
    const mathContainer = document.getElementById('mathDynamicSubstitution');
    if (!mathContainer) return;

    const t = this.physics.t;
    const fe = this.physics.f;
    const c = this.physics.c;
    const vfx = this.physics.vfx;
    const vox = this.physics.vox;
    const M = this.physics.machNumber;
    const foTh = this.physics.getTheoreticalFrequency(t);

    let formulaText = '';
    let validityNote = '';

    if (!this.is2D) {
      // Caso colineal escolar
      const approach = vfx > 0 || vox < 0;
      formulaText = `f_o = f_e \\cdot \\left( \\frac{c - v_o}{c - v_f} \\right) = ${fe.toFixed(1)} \\text{ Hz} \\cdot \\left( \\frac{${c.toFixed(0)} - (${vox.toFixed(0)})}{${c.toFixed(0)} - (${vfx.toFixed(0)})} \\right)`;
      if (M >= 1.0) {
        validityNote = '⚠ Advertencia: El modelo lineal acústico presenta una divergencia al cruzar Mach 1. En régimen supersónico existen múltiples frentes retardados o inversión de orden de llegada.';
      } else {
        validityNote = '✔ Régimen subsónico colineal regular. Signos de velocidad medidos hacia +X.';
      }
    } else {
      // Caso 2D vectorial retardado
      formulaText = `f_o = f_e \\cdot \\frac{c - \\mathbf{n}\\cdot\\mathbf{v}_o}{c - \\mathbf{n}\\cdot\\mathbf{v}_f}`;
      validityNote = '✔ Vector n evaluado en la dirección retardada exacta entre la posición de emisión de la fuente y de recepción del observador.';
    }

    // Renderizar con KaTeX si está disponible localmente, sino texto estructurado
    const mathFormulaBox = document.getElementById('mathFormulaKaTeX');
    if (mathFormulaBox && window.katex) {
      try {
        window.katex.render(formulaText, mathFormulaBox, { displayMode: true, throwOnError: false });
      } catch (err) {
        mathFormulaBox.textContent = formulaText;
      }
    } else if (mathFormulaBox) {
      mathFormulaBox.textContent = formulaText;
    }

    mathContainer.innerHTML = `
      <strong>Sustitución Numérica en t = ${t.toFixed(2)} s:</strong><br>
      • c = ${c.toFixed(1)} m/s, f_e = ${fe.toFixed(2)} Hz<br>
      • v_f = [${this.physics.vfx.toFixed(1)}, ${this.physics.vfy.toFixed(1)}] m/s (M = ${M.toFixed(2)})<br>
      • v_o = [${this.physics.vox.toFixed(1)}, ${this.physics.voy.toFixed(1)}] m/s<br>
      • f_o (teórico) = <strong>${Number.isFinite(foTh) ? foTh.toFixed(3) + ' Hz' : 'Singular / Mach 1'}</strong><br>
      <small style="color: var(--text-muted); margin-top: 4px; display: block;">${validityNote}</small>
    `;
  }

  // Gráficas en tiempo real (Canvas 2D para Gráficos Sincronizados)
  bindChartCanvas() {
    this.chartCanvas = document.getElementById('chartCanvas');
    if (this.chartCanvas) {
      this.chartCtx = this.chartCanvas.getContext('2d');
    }
  }

  renderCharts() {
    if (!this.chartCtx || !this.chartCanvas) return;
    const ctx = this.chartCtx;
    const w = this.chartCanvas.width;
    const h = this.chartCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Fondo y ejes
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    // Eje horizontal t: 0 a duration
    const dur = this.physics.duration;
    const curT = this.physics.t;
    const margin = { left: 45, right: 15, top: 15, bottom: 25 };
    const plotW = w - margin.left - margin.right;
    const plotH = h - margin.top - margin.bottom;

    // Rango de frecuencia en Y: de 0 a 2.5 * fe
    const maxFreq = Math.max(5.0, this.physics.f * 2.5);

    // Líneas de cuadrícula
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, h - margin.bottom);
    ctx.lineTo(w - margin.right, h - margin.bottom);
    ctx.stroke();

    // Etiqueta Ejes
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.fillText('f (Hz)', 10, margin.top + 10);
    ctx.fillText('0', margin.left - 15, h - margin.bottom);
    ctx.fillText(`${maxFreq.toFixed(0)}`, margin.left - 25, margin.top + 8);
    ctx.fillText('t (s)', w - margin.right - 20, h - 5);
    ctx.fillText(`${dur.toFixed(0)}s`, w - margin.right - 10, h - margin.bottom + 15);

    // Línea de referencia: Frecuencia emitida fe
    const yFe = h - margin.bottom - (this.physics.f / maxFreq) * plotH;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(margin.left, yFe);
    ctx.lineTo(w - margin.right, yFe);
    ctx.stroke();
    ctx.setLineDash([]);

    // Puntos de Frecuencia Medida experimental por llegadas
    const validArrivals = this.physics.arrivals.filter(a => a.fMeasured !== null);
    ctx.fillStyle = '#10b981'; // Verde esmeralda
    for (const arr of validArrivals) {
      if (arr.tr <= curT) {
        const px = margin.left + (arr.tr / dur) * plotW;
        const py = h - margin.bottom - (Math.min(arr.fMeasured, maxFreq) / maxFreq) * plotH;
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Curva de Frecuencia Teórica hasta el tiempo actual
    ctx.strokeStyle = '#38bdf8'; // Celeste
    ctx.lineWidth = 2;
    ctx.beginPath();
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const evalT = (i / steps) * curT;
      const fo = this.physics.getTheoreticalFrequency(evalT);
      if (Number.isFinite(fo)) {
        const px = margin.left + (evalT / dur) * plotW;
        const py = h - margin.bottom - (Math.min(fo, maxFreq) / maxFreq) * plotH;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    }
    ctx.stroke();

    // Cursor vertical del tiempo actual
    const curX = margin.left + (curT / dur) * plotW;
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(curX, margin.top);
    ctx.lineTo(curX, h - margin.bottom);
    ctx.stroke();
  }

  // Sistema de Escenarios Didácticos Guiados
  bindScenarioDialog() {
    const listEl = document.getElementById('scenariosList');
    if (!listEl) return;

    listEl.innerHTML = '';
    this.scenarios.forEach((sc, idx) => {
      const item = document.createElement('div');
      item.className = `scenario-item-btn ${idx === this.currentScenarioIndex ? 'active' : ''}`;
      item.innerHTML = `
        <div class="scenario-item-title">${sc.title}</div>
        <div class="scenario-item-desc">${sc.desc}</div>
      `;
      item.addEventListener('click', () => {
        this.loadScenario(idx);
        document.getElementById('modalScenarios')?.classList.remove('open');
      });
      listEl.appendChild(item);
    });
  }

  loadScenario(index) {
    this.currentScenarioIndex = index;
    const sc = this.scenarios[index];
    if (!sc) return;

    // Aplicar configuración
    this.physics.f = sc.config.f;
    this.physics.c = sc.config.c;
    this.physics.vfx = sc.config.vfx;
    this.physics.vfy = sc.config.vfy ?? 0;
    this.physics.vox = sc.config.vox;
    this.physics.voy = sc.config.voy ?? 0;
    this.physics.x0f = sc.config.x0f;
    this.physics.y0f = sc.config.y0f ?? 0;
    this.physics.x0o = sc.config.x0o;
    this.physics.y0o = sc.config.y0o ?? 0;
    this.physics.duration = sc.config.duration;
    this.is2D = sc.config.is2D;

    // Sincronizar inputs
    const syncElem = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    syncElem('sliderFreq', sc.config.f);
    syncElem('inputFreq', sc.config.f);
    syncElem('badgeFreq', sc.config.f);
    syncElem('sliderC', sc.config.c);
    syncElem('inputC', sc.config.c);
    syncElem('badgeC', sc.config.c);
    syncElem('sliderVfx', sc.config.vfx);
    syncElem('inputVfx', sc.config.vfx);
    syncElem('badgeVfx', sc.config.vfx);
    syncElem('sliderVox', sc.config.vox);
    syncElem('inputVox', sc.config.vox);
    syncElem('badgeVox', sc.config.vox);
    syncElem('sliderDuration', sc.config.duration);
    syncElem('inputDuration', sc.config.duration);
    syncElem('badgeDuration', sc.config.duration);

    const check2D = document.getElementById('checkMode2D');
    if (check2D) check2D.checked = this.is2D;
    document.querySelectorAll('.input-2d-only').forEach(el => {
      el.style.display = this.is2D ? 'flex' : 'none';
    });

    // Actualizar caja de orientación didáctica
    const boxTitle = document.getElementById('activeScenarioTitle');
    const boxObj = document.getElementById('activeScenarioObjective');
    const boxProc = document.getElementById('activeScenarioProcedure');
    const boxQuiz = document.getElementById('activeScenarioQuiz');

    if (boxTitle) boxTitle.textContent = sc.title;
    if (boxObj) boxObj.textContent = sc.objective;
    if (boxProc) boxProc.textContent = sc.procedure;

    if (boxQuiz && sc.quiz) {
      boxQuiz.innerHTML = `
        <div style="margin-top: 8px; font-weight: 600; color: var(--text-primary);">${sc.quiz.question}</div>
        <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px;">
          ${sc.quiz.options.map((opt, i) => `
            <button class="preset-chip-btn quiz-opt-btn" data-opt="${i}" style="text-align: left; padding: 6px 10px;">${opt}</button>
          `).join('')}
        </div>
        <div id="quizFeedback" style="margin-top: 8px; font-size: 0.82rem; display: none;"></div>
      `;

      boxQuiz.querySelectorAll('.quiz-opt-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const optIdx = parseInt(btn.getAttribute('data-opt'), 10);
          const feedbackEl = document.getElementById('quizFeedback');
          if (feedbackEl) {
            feedbackEl.style.display = 'block';
            if (optIdx === sc.quiz.correct) {
              feedbackEl.style.color = 'var(--accent-success)';
              feedbackEl.innerHTML = `✔ ${sc.quiz.feedback}`;
            } else {
              feedbackEl.style.color = 'var(--accent-warning)';
              feedbackEl.innerHTML = `✖ Intenta de nuevo. Revisa la fundamentación teórica de la velocidad relativa y el medio de propagación.`;
            }
          }
        });
      });
    }

    // Reiniciar simulación y centrar vista
    this.resetSimulation();
    this.canvas.fitScene();
  }

  // Herramientas de Exportación (CSV y PNG)
  bindExportTools() {
    const btnExportCSV = document.getElementById('btnExportCSV');
    if (btnExportCSV) {
      btnExportCSV.addEventListener('click', () => this.exportCSV());
    }

    const btnExportPNG = document.getElementById('btnExportPNG');
    if (btnExportPNG) {
      btnExportPNG.addEventListener('click', () => this.exportPNG());
    }
  }

  exportCSV() {
    const arrivals = this.physics.arrivals;
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Frente_ID,Tiempo_Emision_te_s,Tiempo_Recepcion_tr_s,Tiempo_Vuelo_s,Delta_tr_s,Frecuencia_Medida_Hz,Frecuencia_Teorica_Hz\n';

    arrivals.forEach(a => {
      const row = [
        a.waveId,
        a.te.toFixed(4),
        a.tr.toFixed(4),
        a.travelTime.toFixed(4),
        a.deltaTr !== null ? a.deltaTr.toFixed(4) : '',
        a.fMeasured !== null ? a.fMeasured.toFixed(4) : '',
        Number.isFinite(a.foTheoretical) ? a.foTheoretical.toFixed(4) : 'Singular'
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `doppler_datos_t${this.physics.t.toFixed(1)}s.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportPNG() {
    const link = document.createElement('a');
    link.download = `doppler_escena_t${this.physics.t.toFixed(1)}s.png`;
    link.href = this.canvas.canvas.toDataURL('image/png');
    link.click();
  }
}


  // Exponer clases globalmente
  global.DopplerPhysics = DopplerPhysics;
  global.DopplerAudio = DopplerAudio;
  global.DopplerCanvas = DopplerCanvas;
  global.DopplerUI = DopplerUI;

  // Auto-inicialización robusta en DOMContentLoaded o inmediata si ya cargó
  function startDopplerApp() {
    if (global.__dopplerApp) return;
    try {
      const app = new DopplerUI();
      app.init();
      global.__dopplerApp = app;
      console.log('Simulador Doppler inicializado exitosamente.');
    } catch (err) {
      console.error('Error al inicializar DopplerUI:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startDopplerApp);
  } else {
    startDopplerApp();
  }
})(typeof window !== 'undefined' ? window : globalThis);
