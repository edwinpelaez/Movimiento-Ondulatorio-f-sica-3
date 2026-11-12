/**
 * FÍSICA 3: MOVIMIENTO ONDULATORIO
 * SIMULADOR INTERACTIVO DE TUBOS SONOROS (PÁGINA 19)
 * Resonancia acústica, ondas estacionarias longitudinales, partículas de aire,
 * distribución de presión acústica Delta P(x,t) y desplazamiento xi(x,t).
 */

class TubesLab {
  constructor(canvasId = 'tubesCanvas') {
    this.canvasId = canvasId;
    this.canvas = null;
    this.ctx = null;

    // Parámetros físicos
    this.tubeType = 'open-open'; // 'open-open' | 'open-closed'
    this.L = 1.0;               // Longitud del tubo en metros [0.4 - 3.0]
    this.v = 340.0;             // Velocidad del sonido en m/s [300 - 400]
    this.modeIndex = 1;         // 1, 2, 3, 4, 5 (1 = fundamental)
    this.amplitude = 0.04;      // Amplitud de oscilación normalizada
    this.time = 0;              // Tiempo de simulación (s)
    this.timeSpeed = 0.5;       // Escala de velocidad visual (0.5x recomendada por defecto)

    // Valores discretos del slider de velocidad de animación
    this.speedPresets = [0.1, 0.25, 0.5, 1.0, 1.5, 2.0];
    this.speedLabels = ['0.1x', '0.25x', '0.5x', '1.0x', '1.5x', '2.0x'];
    this.speedTitles = [
      '0.1x: Extremadamente lento',
      '0.25x: Muy lento',
      '0.5x: Lento (Recomendado)',
      '1.0x: Velocidad normal',
      '1.5x: Rápido',
      '2.0x: Muy rápido'
    ];

    // Estado de animación: INICIA SIEMPRE PAUSADO
    this.isPlaying = false;
    this._animLoopRunning = false;
    this._rafId = null;
    this._lastTimestamp = 0;

    // Opciones visuales
    this.showParticles = true;
    this.showDisplacement = true;
    this.showPressure = true;
    this.showNodes = true;

    // Malla de partículas de aire estáticas iniciales (60 x 14)
    this.numCols = 70;
    this.numRows = 12;
    this.particles = [];
    this.initParticles();

    // Enlazar métodos
    this._loop = this._loop.bind(this);
    this._onResize = this._onResize.bind(this);
  }

  // ================= INICIALIZACIÓN DE PARTÍCULAS =================
  initParticles() {
    this.particles = [];
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        // Fracción x en [0, 1] con pequeña perturbación aleatoria para realismo fluido
        const u = (c + 0.5 + (Math.random() - 0.5) * 0.35) / this.numCols;
        const v = (r + 0.5 + (Math.random() - 0.5) * 0.35) / this.numRows;
        this.particles.push({ u0: u, v0: v });
      }
    }
  }

  // ================= CÁLCULOS MATEMÁTICOS DE RESONANCIA =================
  get harmonicNumber() {
    if (this.tubeType === 'open-open') {
      return this.modeIndex; // n = 1, 2, 3, 4, 5...
    } else {
      return 2 * this.modeIndex - 1; // n = 1, 3, 5, 7, 9... (solo impares)
    }
  }

  get wavelength() {
    const n = this.harmonicNumber;
    if (this.tubeType === 'open-open') {
      return (2 * this.L) / n;
    } else {
      return (4 * this.L) / n;
    }
  }

  get frequency() {
    return this.v / this.wavelength;
  }

  get fundamentalFrequency() {
    if (this.tubeType === 'open-open') {
      return this.v / (2 * this.L);
    } else {
      return this.v / (4 * this.L);
    }
  }

  /**
   * Desplazamiento xi(x, t) de las partículas de aire en posición x en [0, L]
   * Tubo Abierto-Abierto: Antinodo de xi en x=0 y x=L -> cos(n*pi*x/L)
   * Tubo Cerrado-Abierto (Cerrado en x=0): Nodo de xi en x=0 -> sin(n*pi*x / (2L))
   */
  getDisplacement(x, t = this.time) {
    const k = (2 * Math.PI) / this.wavelength;
    const baseVisualFreq = 0.75;
    const harmonicScale = Math.min(2.5, 1 + (this.modeIndex - 1) * 0.35);
    const omegaVisual = 2 * Math.PI * baseVisualFreq * harmonicScale;

    if (this.tubeType === 'open-open') {
      // xi(x,t) = A * cos(k * x) * cos(omegaVisual * t)
      return this.amplitude * Math.cos(k * x) * Math.cos(omegaVisual * t);
    } else {
      // Cerrado en x=0: xi(0) = 0
      return this.amplitude * Math.sin(k * x) * Math.cos(omegaVisual * t);
    }
  }

  /**
   * Variación de presión acústica Delta P(x, t) proporcional a -d(xi)/dx
   * Tubo Abierto-Abierto: Nodo de presión en x=0 y x=L -> sin(k*x)
   * Tubo Cerrado-Abierto: Antinodo de presión en x=0 (cerrado), Nodo en x=L -> cos(k*x)
   */
  getPressure(x, t = this.time) {
    const k = (2 * Math.PI) / this.wavelength;
    const baseVisualFreq = 0.75;
    const harmonicScale = Math.min(2.5, 1 + (this.modeIndex - 1) * 0.35);
    const omegaVisual = 2 * Math.PI * baseVisualFreq * harmonicScale;

    if (this.tubeType === 'open-open') {
      // d/dx [cos(k*x)] = -k*sin(k*x) => Delta P = A * sin(k*x) * cos(omegaVisual * t)
      return this.amplitude * Math.sin(k * x) * Math.cos(omegaVisual * t);
    } else {
      // d/dx [sin(k*x)] = k*cos(k*x) => Delta P = A * cos(k*x) * cos(omegaVisual * t)
      return this.amplitude * Math.cos(k * x) * Math.cos(omegaVisual * t);
    }
  }

  /**
   * Obtener las posiciones x de los Nodos y Antinodos de desplazamiento
   */
  getNodesAndAntinodes() {
    const n = this.harmonicNumber;
    const nodes = [];
    const antinodes = [];

    if (this.tubeType === 'open-open') {
      // Desplazamiento xi ~ cos(n*pi*x/L)
      // Nodos xi: cos(n*pi*x/L) = 0 => n*pi*x/L = (2m+1)*pi/2 => x = (2m+1)*L / (2n)
      for (let m = 0; m < n; m++) {
        nodes.push(((2 * m + 1) * this.L) / (2 * n));
      }
      // Antinodos xi: cos = +-1 => n*pi*x/L = m*pi => x = m*L / n
      for (let m = 0; m <= n; m++) {
        antinodes.push((m * this.L) / n);
      }
    } else {
      // Cerrado en x=0: xi ~ sin(n*pi*x / (2L)) con n impar
      // Nodos xi: sin = 0 => x = m*2L / n (m entero par/impar <= n/2)
      for (let m = 0; ; m++) {
        const x = (2 * m * this.L) / n;
        if (x > this.L + 1e-6) break;
        nodes.push(x);
      }
      // Antinodos xi: sin = +-1 => n*pi*x / (2L) = (2m+1)*pi/2 => x = (2m+1)*L / n
      for (let m = 0; ; m++) {
        const x = ((2 * m + 1) * this.L) / n;
        if (x > this.L + 1e-6) break;
        antinodes.push(x);
      }
    }

    return { nodes, antinodes };
  }

  // ================= MONTAJE Y CICLO DE VIDA =================
  mount() {
    this.canvas = document.getElementById(this.canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.resize();
    this.bindEvents();
    this.updateUI();

    // Resetear loop
    this._animLoopRunning = false;
    this.startAnimationLoop();

    window.addEventListener('resize', this._onResize);
  }

  destroy() {
    this.isPlaying = false;
    this._animLoopRunning = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    window.removeEventListener('resize', this._onResize);
  }

  resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    let w = 800;
    let h = 270;

    if (parent) {
      const rect = parent.getBoundingClientRect();
      w = rect.width > 0 ? rect.width : (parent.clientWidth || 800);
      h = rect.height > 0 ? rect.height : (parent.clientHeight || 270);
    }

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(300, Math.floor(w * dpr));
    this.canvas.height = Math.max(180, Math.floor(h * dpr));
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';

    if (this.ctx) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    this.render();
  }

  _onResize() {
    this.resize();
  }

  startAnimationLoop() {
    if (this._animLoopRunning) return;
    this._animLoopRunning = true;
    this._lastTimestamp = performance.now();
    this._rafId = requestAnimationFrame(this._loop);
  }

  _loop(timestamp) {
    if (!this._animLoopRunning) return;

    if (!this._lastTimestamp) this._lastTimestamp = timestamp;
    const dt = Math.min(0.06, (timestamp - this._lastTimestamp) / 1000);
    this._lastTimestamp = timestamp;

    if (this.isPlaying) {
      // Acumulación continua de tiempo visual sin saltos (dt * factor de velocidad)
      this.time += dt * this.timeSpeed;
    }

    this.render();
    this._rafId = requestAnimationFrame(this._loop);
  }

  // ================= RENDERIZADO GRÁFICO (CANVAS 2D) =================
  render() {
    if (!this.ctx || !this.canvas) return;
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);

    // Fondo oscuro GeoGebra
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, width, height);

    // Márgenes y áreas
    const padX = 40;
    const padTop = 22;
    const tubeH = 75;
    const tubeW = width - 2 * padX;
    const tubeX = padX;
    const tubeY = padTop;

    const graphTop = tubeY + tubeH + 28;
    const graphH = height - graphTop - 26;
    const graphMidY = graphTop + graphH / 2;

    // Cuadrícula cartesiana
    this.drawGrid(ctx, tubeX, graphTop, tubeW, graphH);

    // 1. Dibujar Tubo Físico y Partículas
    this.drawTubeStructure(ctx, tubeX, tubeY, tubeW, tubeH);
    if (this.showParticles) {
      this.drawAirParticles(ctx, tubeX, tubeY, tubeW, tubeH);
    }

    // 2. Gráficas de Desplazamiento y Presión
    this.drawWaveCurves(ctx, tubeX, graphTop, tubeW, graphH, graphMidY);

    // 3. Marcadores de Nodos y Antinodos
    if (this.showNodes) {
      this.drawNodesAndAntinodes(ctx, tubeX, tubeY, tubeW, tubeH, graphTop, graphH);
    }

    // 4. Regla y Escala en Metros
    this.drawScaleRuler(ctx, tubeX, tubeY + tubeH + 6, tubeW);
  }

  drawGrid(ctx, x0, y0, w, h) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;

    const cols = 10;
    const rows = 4;
    for (let c = 0; c <= cols; c++) {
      const x = x0 + (c / cols) * w;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y0 + h);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      const y = y0 + (r / rows) * h;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + w, y);
      ctx.stroke();
    }
  }

  drawTubeStructure(ctx, x0, y0, w, h) {
    // Fondo translúcido del interior del tubo
    const grad = ctx.createLinearGradient(0, y0, 0, y0 + h);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.85)');
    grad.addColorStop(0.5, 'rgba(30, 41, 59, 0.4)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(x0, y0, w, h);

    // Paredes del tubo (superior e inferior)
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#64748b';
    ctx.lineCap = 'round';

    // Pared superior
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + w, y0);
    ctx.stroke();

    // Pared inferior
    ctx.beginPath();
    ctx.moveTo(x0, y0 + h);
    ctx.lineTo(x0 + w, y0 + h);
    ctx.stroke();

    // Extremo izquierdo: ¿Abierto o Cerrado?
    if (this.tubeType === 'open-closed') {
      // Tapón mecánico cerrado
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x0 - 6, y0 - 2, 8, h + 4);
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 2;
      ctx.strokeRect(x0 - 6, y0 - 2, 8, h + 4);

      // Etiqueta cerrado
      ctx.fillStyle = '#fca5a5';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CERRADO', x0 - 18, y0 + h / 2 + 3);
    } else {
      // Campana acústica abierta izquierda
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x0, y0 + h / 2, h / 2, Math.PI / 2, (3 * Math.PI) / 2);
      ctx.stroke();
    }

    // Extremo derecho: Siempre abierto en ambos modelos
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x0 + w, y0 + h / 2, h / 2, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();

    // Etiqueta abierto
    ctx.fillStyle = '#7dd3fc';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ABIERTO', x0 + w + 10, y0 + h / 2 + 3);
  }

  drawAirParticles(ctx, x0, y0, w, h) {
    const k = (2 * Math.PI) / this.wavelength;
    const omega = 2 * Math.PI * this.frequency;
    const maxShift = 22 * (this.amplitude / 0.04);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const realX = p.u0 * this.L;

      // Calcular desplazamiento instantáneo en píxeles
      let dispFrac = 0;
      let pressureVal = 0;

      if (this.tubeType === 'open-open') {
        dispFrac = Math.cos(k * realX) * Math.cos(omega * this.time);
        pressureVal = Math.sin(k * realX) * Math.cos(omega * this.time);
      } else {
        dispFrac = Math.sin(k * realX) * Math.cos(omega * this.time);
        pressureVal = Math.cos(k * realX) * Math.cos(omega * this.time);
      }

      const px = x0 + p.u0 * w + dispFrac * maxShift;
      const py = y0 + p.v0 * h;

      // Asegurar confinamiento dentro de las paredes
      if (px >= x0 && px <= x0 + w) {
        // Color dependiente de la compresión/rarefacción (presión)
        // Alta presión (compresión) = tinte cálido; baja presión = cian frío
        const tVal = Math.max(-1, Math.min(1, pressureVal));
        if (tVal > 0) {
          ctx.fillStyle = `rgba(244, 63, 94, ${0.4 + 0.5 * tVal})`;
        } else {
          ctx.fillStyle = `rgba(56, 189, 248, ${0.4 + 0.5 * Math.abs(tVal)})`;
        }
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawWaveCurves(ctx, x0, y0, w, h, midY) {
    const steps = 180;
    const ampPx = (h / 2) * 0.82;

    // Eje horizontal de equilibrio
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x0, midY);
    ctx.lineTo(x0 + w, midY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 1. Curva de Desplazamiento xi(x, t) — Azul / Cian brillante
    if (this.showDisplacement) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let s = 0; s <= steps; s++) {
        const u = s / steps;
        const xReal = u * this.L;
        const xi = this.getDisplacement(xReal, this.time);
        const y = midY - (xi / this.amplitude) * ampPx;
        const x = x0 + u * w;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 2. Curva de Presión Delta P(x, t) — Ámbar / Rojo brillante
    if (this.showPressure) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let s = 0; s <= steps; s++) {
        const u = s / steps;
        const xReal = u * this.L;
        const dp = this.getPressure(xReal, this.time);
        const y = midY - (dp / this.amplitude) * ampPx;
        const x = x0 + u * w;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Leyendas de curvas en la esquina de la gráfica
    ctx.font = 'bold 10px monospace';
    if (this.showDisplacement) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('— Desplazamiento ξ(x,t)', x0 + 10, y0 + 14);
    }
    if (this.showPressure) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('— Presión ΔP(x,t)', x0 + 180, y0 + 14);
    }
  }

  drawNodesAndAntinodes(ctx, tubeX, tubeY, tubeW, tubeH, graphTop, graphH) {
    const { nodes, antinodes } = this.getNodesAndAntinodes();
    const totalH = (graphTop + graphH) - tubeY;

    // Nodos de desplazamiento (N): Puntos azules fijos
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';

    nodes.forEach(xReal => {
      const u = xReal / this.L;
      const xPx = tubeX + u * tubeW;

      // Línea guía vertical punteada
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xPx, tubeY);
      ctx.lineTo(xPx, graphTop + graphH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Píldora de Nodo
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(xPx, tubeY - 9, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText('N', xPx, tubeY - 6);
    });

    // Antinodos de desplazamiento (A): Puntos dorados
    antinodes.forEach(xReal => {
      const u = xReal / this.L;
      const xPx = tubeX + u * tubeW;

      ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xPx, tubeY);
      ctx.lineTo(xPx, graphTop + graphH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Píldora de Antinodo
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(xPx, tubeY - 9, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText('A', xPx, tubeY - 6);
    });
  }

  drawScaleRuler(ctx, x0, y, w) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + w, y);
    ctx.stroke();

    // Marcas de división
    const nMarks = 5;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';

    for (let i = 0; i <= nMarks; i++) {
      const x = x0 + (i / nMarks) * w;
      const dist = (i / nMarks) * this.L;
      ctx.beginPath();
      ctx.moveTo(x, y - 3);
      ctx.lineTo(x, y + 3);
      ctx.stroke();
      ctx.fillText(`${dist.toFixed(2)} m`, x, y + 13);
    }
  }

  // ================= ENLACE DE EVENTOS UI =================
  bindEvents() {
    // Tipo de tubo
    const selectType = document.getElementById('tubes-type-select');
    if (selectType) {
      selectType.value = this.tubeType;
      selectType.onchange = (e) => {
        this.tubeType = e.target.value;
        this.updateHarmonicPills();
        this.updateUI();
      };
    }

    // Longitud L
    const sliderL = document.getElementById('tubes-slider-l');
    const valL = document.getElementById('tubes-val-l');
    if (sliderL) {
      sliderL.value = String(this.L);
      sliderL.oninput = (e) => {
        this.L = parseFloat(e.target.value);
        if (valL) valL.textContent = `${this.L.toFixed(2)} m`;
        this.updateUI();
      };
    }

    // Velocidad del sonido v
    const sliderV = document.getElementById('tubes-slider-v');
    const valV = document.getElementById('tubes-val-v');
    if (sliderV) {
      sliderV.value = String(this.v);
      sliderV.oninput = (e) => {
        this.v = parseFloat(e.target.value);
        if (valV) valV.textContent = `${this.v.toFixed(0)} m/s`;
        this.updateUI();
      };
    }

    // Amplitud A
    const sliderA = document.getElementById('tubes-slider-a');
    if (sliderA) {
      sliderA.value = String(this.amplitude);
      sliderA.oninput = (e) => {
        this.amplitude = parseFloat(e.target.value);
      };
    }

    // Botones de Play / Pause / Reset
    const btnPlay = document.getElementById('tubes-btn-play');
    if (btnPlay) {
      btnPlay.onclick = () => this.togglePlay();
    }

    const btnReset = document.getElementById('tubes-btn-reset');
    if (btnReset) {
      btnReset.onclick = () => this.reset();
    }

    // Deslizador interactivo de Velocidad de Animación (0.1x a 2.0x)
    const sliderSpeed = document.getElementById('tubes-slider-speed');
    const valSpeed = document.getElementById('tubes-val-speed');
    if (sliderSpeed) {
      sliderSpeed.value = '2'; // 0.5x como velocidad inicial recomendada
      const handleSpeed = () => {
        const idx = Math.max(0, Math.min(5, parseInt(sliderSpeed.value, 10)));
        this.timeSpeed = this.speedPresets[idx];
        if (valSpeed) {
          valSpeed.textContent = this.speedLabels[idx];
          valSpeed.title = this.speedTitles[idx];
        }
      };
      sliderSpeed.oninput = handleSpeed;
      handleSpeed();
    }

    // Sincronizar estado visual inicial de los controles de transporte
    this.updateTransportUI();

    // Toggles visuales
    const chkPart = document.getElementById('tubes-chk-particles');
    if (chkPart) {
      chkPart.checked = this.showParticles;
      chkPart.onchange = (e) => { this.showParticles = e.target.checked; };
    }

    const chkDisp = document.getElementById('tubes-chk-disp');
    if (chkDisp) {
      chkDisp.checked = this.showDisplacement;
      chkDisp.onchange = (e) => { this.showDisplacement = e.target.checked; };
    }

    const chkPres = document.getElementById('tubes-chk-pres');
    if (chkPres) {
      chkPres.checked = this.showPressure;
      chkPres.onchange = (e) => { this.showPressure = e.target.checked; };
    }

    const chkNodes = document.getElementById('tubes-chk-nodes');
    if (chkNodes) {
      chkNodes.checked = this.showNodes;
      chkNodes.onchange = (e) => { this.showNodes = e.target.checked; };
    }

    this.bindHarmonicPills();
  }

  bindHarmonicPills() {
    const pills = document.querySelectorAll('.tubes-mode-pill');
    pills.forEach(pill => {
      pill.onclick = () => {
        const mode = parseInt(pill.getAttribute('data-mode'), 10);
        if (!isNaN(mode)) {
          this.modeIndex = mode;
          this.updateHarmonicPills();
          this.updateUI();
        }
      };
    });
  }

  updateHarmonicPills() {
    const pills = document.querySelectorAll('.tubes-mode-pill');
    pills.forEach(pill => {
      const mode = parseInt(pill.getAttribute('data-mode'), 10);
      const isActive = mode === this.modeIndex;
      pill.classList.toggle('active', isActive);

      // Actualizar etiqueta del armónico (n=1,2,3... o n=1,3,5...)
      const nActual = this.tubeType === 'open-open' ? mode : (2 * mode - 1);
      const label = pill.querySelector('.pill-harmonic-name');
      if (label) {
        label.textContent = `n = ${nActual}`;
      }
    });
  }

  // ================= ACTUALIZACIÓN DE TELEMETRÍA Y TABLA =================
  updateUI() {
    const n = this.harmonicNumber;
    const f = this.frequency;
    const f1 = this.fundamentalFrequency;
    const lambda = this.wavelength;
    const { nodes, antinodes } = this.getNodesAndAntinodes();

    const setT = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setT('tubes-readout-f1', `${f1.toFixed(1)} Hz`);
    setT('tubes-readout-fn', `${f.toFixed(1)} Hz`);
    setT('tubes-readout-lambda', `${lambda.toFixed(3)} m`);
    setT('tubes-readout-harmonic', `Armónico n = ${n}`);
    setT('tubes-readout-nodes-count', `${nodes.length} nodos / ${antinodes.length} antinodos`);
    setT('tubes-readout-v', `${this.v.toFixed(0)} m/s`);
    setT('tubes-readout-l', `${this.L.toFixed(2)} m`);

    // Actualizar tabla de los primeros 5 modos permitidos
    this.renderModesTable();
  }

  renderModesTable() {
    const container = document.getElementById('tubes-table-modes-body');
    if (!container) return;

    let html = '';
    for (let m = 1; m <= 5; m++) {
      const nMode = this.tubeType === 'open-open' ? m : (2 * m - 1);
      const lambdaM = this.tubeType === 'open-open' ? (2 * this.L) / nMode : (4 * this.L) / nMode;
      const fM = this.v / lambdaM;
      const isSelected = m === this.modeIndex;

      html += `
        <tr class="${isSelected ? 'active-row' : ''}" style="cursor: pointer;" onclick="window.tubesLabInstance.setMode(${m})">
          <td><span class="badge-harmonic">n = ${nMode}</span></td>
          <td>${m === 1 ? 'Fundamental' : `${m}.° modo (${nMode}.° armónico)`}</td>
          <td><strong>${fM.toFixed(1)} Hz</strong></td>
          <td>${lambdaM.toFixed(3)} m</td>
          <td>
            <button type="button" class="btn-table-apply ${isSelected ? 'applied' : ''}">
              ${isSelected ? 'Activo' : 'Cargar'}
            </button>
          </td>
        </tr>
      `;
    }
    container.innerHTML = html;
  }

  // ================= CONTROL DE TRANSPORTE Y REPRODUCCIÓN =================
  setPlaying(playing) {
    this.isPlaying = !!playing;
    this.updateTransportUI();
  }

  togglePlay() {
    this.setPlaying(!this.isPlaying);
  }

  reset() {
    this.time = 0;
    this.setPlaying(false);
    this.render();
  }

  updateTransportUI() {
    const btnPlay = document.getElementById('tubes-btn-play');
    const badge = document.getElementById('tubes-status-badge');

    if (btnPlay) {
      if (this.isPlaying) {
        btnPlay.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> <span>Pausar</span>`;
        btnPlay.title = 'Pausar simulación';
        btnPlay.style.background = '#d97706';
      } else {
        btnPlay.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> <span>Reproducir</span>`;
        btnPlay.title = 'Iniciar animación';
        btnPlay.style.background = '#059669';
      }
    }

    if (badge) {
      if (this.isPlaying) {
        badge.className = 'sim-status-badge playing';
        badge.innerHTML = '<span class="status-pulse-dot"></span> REPRODUCIENDO';
      } else {
        badge.className = 'sim-status-badge paused';
        badge.textContent = 'PAUSADO';
      }
    }
  }

  setMode(m) {
    this.modeIndex = m;
    this.updateHarmonicPills();
    this.updateUI();
    this.render();
  }

  // Preconfiguración para las actividades guiadas
  loadExploration(expId) {
    switch (expId) {
      case 'shorten-l':
        this.L = 0.5;
        this.modeIndex = 1;
        break;
      case 'double-l':
        this.L = 2.0;
        this.modeIndex = 1;
        break;
      case 'compare-closed':
        this.tubeType = 'open-closed';
        this.modeIndex = 1;
        break;
      case 'higher-harmonic':
        this.modeIndex = 3;
        break;
    }
    const sliderL = document.getElementById('tubes-slider-l');
    if (sliderL) sliderL.value = String(this.L);
    const valL = document.getElementById('tubes-val-l');
    if (valL) valL.textContent = `${this.L.toFixed(2)} m`;

    const selectType = document.getElementById('tubes-type-select');
    if (selectType) selectType.value = this.tubeType;

    this.updateHarmonicPills();
    this.updateUI();
    this.render();
  }
}

