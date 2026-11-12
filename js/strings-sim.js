/**
 * FÍSICA 3: MOVIMIENTO ONDULATORIO
 * SIMULADOR INTERACTIVO DE CUERDAS TENSAS (PÁGINA 20)
 * Modos normales de vibración, ondas estacionarias, superposición de ondas viajeras
 * componentes incidente y reflejada, velocidad v = sqrt(T/mu), armónicos n=1..6.
 */

class StringsLab {
  constructor(canvasId = 'stringsCanvas') {
    this.canvasId = canvasId;
    this.canvas = null;
    this.ctx = null;

    // Parámetros físicos
    this.L = 1.0;            // Longitud de la cuerda en metros [0.4 - 3.0]
    this.T = 100.0;          // Tensión en Newtons [10 - 400]
    this.mu = 0.004;         // Densidad lineal en kg/m (4 g/m) [0.001 - 0.050]
    this.A = 0.05;           // Amplitud de oscilación en metros [0.01 - 0.12]
    this.harmonic = 1;       // Número de armónico n [1, 2, 3, 4, 5, 6]

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
    this.time = 0;
    this.isPlaying = false;
    this.timeScale = 0.5;    // 0.5x como velocidad recomendada inicial
    this._animLoopRunning = false;
    this._rafId = null;
    this._lastTimestamp = 0;

    // Toggles de visualización
    this.showEnvelope = true;
    this.showNodes = true;
    this.showComponents = false; // Ondas incidente y reflejada

    // Enlazar métodos
    this._loop = this._loop.bind(this);
    this._onResize = this._onResize.bind(this);
  }

  // ================= RELACIONES MATEMÁTICAS =================
  get waveSpeed() {
    // v = sqrt(T / mu)
    return Math.sqrt(this.T / this.mu);
  }

  get wavelength() {
    // lambda_n = 2L / n
    return (2 * this.L) / this.harmonic;
  }

  get fundamentalFrequency() {
    // f1 = v / (2L)
    return this.waveSpeed / (2 * this.L);
  }

  get frequency() {
    // fn = n * f1 = n * v / (2L)
    return this.harmonic * this.fundamentalFrequency;
  }

  get angularFrequency() {
    // omega_n = 2 * pi * fn
    return 2 * Math.PI * this.frequency;
  }

  /**
   * Perfil vertical de la onda estacionaria: y(x,t) = A * sin(n*pi*x/L) * cos(omega_visual * t)
   */
  getDisplacement(x, t = this.time) {
    const k = (this.harmonic * Math.PI) / this.L;
    const baseVisualFreq = 0.75;
    const harmonicScale = Math.min(2.5, 1 + (this.harmonic - 1) * 0.35);
    const omegaVisual = 2 * Math.PI * baseVisualFreq * harmonicScale;
    return this.A * Math.sin(k * x) * Math.cos(omegaVisual * t);
  }

  /**
   * Envolvente espacial superior: +A * |sin(n*pi*x/L)|
   */
  getEnvelope(x) {
    const k = (this.harmonic * Math.PI) / this.L;
    return this.A * Math.abs(Math.sin(k * x));
  }

  /**
   * Onda viajera incidente hacia la derecha: y_inc = (A/2) * sin(k*x - omega_visual*t)
   */
  getIncidentWave(x, t = this.time) {
    const k = (this.harmonic * Math.PI) / this.L;
    const baseVisualFreq = 0.75;
    const harmonicScale = Math.min(2.5, 1 + (this.harmonic - 1) * 0.35);
    const omegaVisual = 2 * Math.PI * baseVisualFreq * harmonicScale;
    return (this.A / 2) * Math.sin(k * x - omegaVisual * t);
  }

  /**
   * Onda viajera reflejada hacia la izquierda: y_ref = (A/2) * sin(k*x + omega_visual*t)
   */
  getReflectedWave(x, t = this.time) {
    const k = (this.harmonic * Math.PI) / this.L;
    const baseVisualFreq = 0.75;
    const harmonicScale = Math.min(2.5, 1 + (this.harmonic - 1) * 0.35);
    const omegaVisual = 2 * Math.PI * baseVisualFreq * harmonicScale;
    return (this.A / 2) * Math.sin(k * x + omegaVisual * t);
  }

  /**
   * Posiciones exactas de Nodos (y=0) y Antinodos (|y|=A)
   */
  getNodesAndAntinodes() {
    const n = this.harmonic;
    const nodes = [];
    const antinodes = [];

    // Nodos: x_k = k * L / n  (k = 0, 1, ... n) -> Total n + 1 nodos
    for (let k = 0; k <= n; k++) {
      nodes.push((k * this.L) / n);
    }

    // Antinodos: x_k = (k - 0.5) * L / n  (k = 1, ... n) -> Total n antinodos
    for (let k = 1; k <= n; k++) {
      antinodes.push(((k - 0.5) * this.L) / n);
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
      // Acumulación continua de tiempo visual sin saltos
      this.time += dt * this.timeScale;
    }

    this.render();
    this._rafId = requestAnimationFrame(this._loop);
  }

  // ================= RENDERIZADO CANVAS 2D =================
  render() {
    if (!this.ctx || !this.canvas) return;
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    // Fondo GeoGebra oscuro
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, width, height);

    const padX = 48;
    const padTop = 32;
    const spanW = width - 2 * padX;
    const spanH = height - padTop - 45;
    const midY = padTop + spanH / 2;

    // Cuadrícula y ejes cartesianos
    this.drawGrid(ctx, padX, padTop, spanW, spanH, midY);

    // Envolvente de vibración (líneas punteadas brillantes)
    if (this.showEnvelope) {
      this.drawEnvelope(ctx, padX, midY, spanW, spanH);
    }

    // Ondas componentes viajeras (incidente y reflejada)
    if (this.showComponents) {
      this.drawComponents(ctx, padX, midY, spanW, spanH);
    }

    // Cuerda en vibración (trazo luminoso continuo neón)
    this.drawVibratingString(ctx, padX, midY, spanW, spanH);

    // Soportes rígidos fijos en x=0 y x=L
    this.drawSupports(ctx, padX, midY, spanW);

    // Marcadores de Nodos y Antinodos
    if (this.showNodes) {
      this.drawNodesAndAntinodes(ctx, padX, midY, spanW, spanH);
    }

    // Regla de distancia en metros
    this.drawRuler(ctx, padX, midY + spanH / 2 + 10, spanW);
  }

  drawGrid(ctx, x0, y0, w, h, midY) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    // Líneas verticales (10 divisiones)
    for (let i = 0; i <= 10; i++) {
      const x = x0 + (i / 10) * w;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y0 + h);
      ctx.stroke();
    }

    // Líneas horizontales
    for (let i = 0; i <= 6; i++) {
      const y = y0 + (i / 6) * h;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + w, y);
      ctx.stroke();
    }

    // Eje de equilibrio horizontal
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x0 - 15, midY);
    ctx.lineTo(x0 + w + 15, midY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawEnvelope(ctx, x0, midY, w, h) {
    const steps = 180;
    const ampPx = (h / 2) * 0.75;

    ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    // Envolvente superior (+A)
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const xReal = u * this.L;
      const env = this.getEnvelope(xReal);
      const y = midY - (env / this.A) * ampPx;
      const x = x0 + u * w;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Envolvente inferior (-A)
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const xReal = u * this.L;
      const env = this.getEnvelope(xReal);
      const y = midY + (env / this.A) * ampPx;
      const x = x0 + u * w;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawComponents(ctx, x0, midY, w, h) {
    const steps = 150;
    const ampPx = (h / 2) * 0.75;

    // Onda incidente (roja, desplazándose hacia la derecha)
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const xReal = u * this.L;
      const yInc = this.getIncidentWave(xReal, this.time);
      const y = midY - (yInc / this.A) * ampPx;
      const x = x0 + u * w;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Onda reflejada (verde, desplazándose hacia la izquierda)
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.75)';
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const xReal = u * this.L;
      const yRef = this.getReflectedWave(xReal, this.time);
      const y = midY - (yRef / this.A) * ampPx;
      const x = x0 + u * w;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Leyendas
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#ef4444';
    ctx.fillText('→ Onda Incidente (y_inc)', x0 + 10, midY - (h / 2) * 0.85);
    ctx.fillStyle = '#22c55e';
    ctx.fillText('← Onda Reflejada (y_ref)', x0 + 190, midY - (h / 2) * 0.85);
  }

  drawVibratingString(ctx, x0, midY, w, h) {
    const steps = 200;
    const ampPx = (h / 2) * 0.75;

    // Grosor de cuerda dependiente de la densidad lineal mu (1.8px a 5px)
    const strThickness = Math.max(2, Math.min(6, Math.sqrt(this.mu / 0.001) * 1.5));

    // Resplandor neón exterior
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
    ctx.lineWidth = strThickness + 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const xReal = u * this.L;
      const yVal = this.getDisplacement(xReal, this.time);
      const y = midY - (yVal / this.A) * ampPx;
      const x = x0 + u * w;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Cuerda central luminosa cian-blanco
    const grad = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    grad.addColorStop(0, '#38bdf8');
    grad.addColorStop(0.5, '#a7f3d0');
    grad.addColorStop(1, '#818cf8');

    ctx.strokeStyle = grad;
    ctx.lineWidth = strThickness;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const xReal = u * this.L;
      const yVal = this.getDisplacement(xReal, this.time);
      const y = midY - (yVal / this.A) * ampPx;
      const x = x0 + u * w;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  drawSupports(ctx, x0, midY, w) {
    const blockW = 12;
    const blockH = 34;

    // Soporte mecánico izquierdo (x=0)
    ctx.fillStyle = '#475569';
    ctx.fillRect(x0 - blockW, midY - blockH / 2, blockW, blockH);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0 - blockW, midY - blockH / 2, blockW, blockH);

    // Tornillo / perno mecánico
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(x0 - blockW / 2, midY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Soporte mecánico derecho (x=L)
    ctx.fillStyle = '#475569';
    ctx.fillRect(x0 + w, midY - blockH / 2, blockW, blockH);
    ctx.strokeRect(x0 + w, midY - blockH / 2, blockW, blockH);

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(x0 + w + blockW / 2, midY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  drawNodesAndAntinodes(ctx, x0, midY, w, h) {
    const { nodes, antinodes } = this.getNodesAndAntinodes();
    const ampPx = (h / 2) * 0.75;

    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';

    // Nodos N (puntos fijos en y=0)
    nodes.forEach((xReal, idx) => {
      const u = xReal / this.L;
      const px = x0 + u * w;

      // Píldora de Nodo fija
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(px, midY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(`N`, px, midY + 3);

      // Etiqueta posición
      ctx.fillStyle = '#f87171';
      ctx.font = '8px monospace';
      ctx.fillText(`${xReal.toFixed(2)}m`, px, midY - 10);
      ctx.font = 'bold 9px sans-serif';
    });

    // Antinodos A (crestas / valles)
    antinodes.forEach((xReal, idx) => {
      const u = xReal / this.L;
      const px = x0 + u * w;

      // Posición instantánea de la cresta
      const yVal = this.getDisplacement(xReal, this.time);
      const py = midY - (yVal / this.A) * ampPx;

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(`A`, px, py + 3);
    });
  }

  drawRuler(ctx, x0, y, w) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + w, y);
    ctx.stroke();

    const marks = 5;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';

    for (let i = 0; i <= marks; i++) {
      const x = x0 + (i / marks) * w;
      const val = (i / marks) * this.L;
      ctx.beginPath();
      ctx.moveTo(x, y - 3);
      ctx.lineTo(x, y + 3);
      ctx.stroke();
      ctx.fillText(`${val.toFixed(2)} m`, x, y + 12);
    }
  }

  // ================= ENLACE DE EVENTOS UI =================
  bindEvents() {
    // Sliders
    const sliderL = document.getElementById('strings-slider-l');
    const valL = document.getElementById('strings-val-l');
    if (sliderL) {
      sliderL.value = String(this.L);
      sliderL.oninput = (e) => {
        this.L = parseFloat(e.target.value);
        if (valL) valL.textContent = `${this.L.toFixed(2)} m`;
        this.updateUI();
      };
    }

    const sliderT = document.getElementById('strings-slider-t');
    const valT = document.getElementById('strings-val-t');
    if (sliderT) {
      sliderT.value = String(this.T);
      sliderT.oninput = (e) => {
        this.T = parseFloat(e.target.value);
        if (valT) valT.textContent = `${this.T.toFixed(0)} N`;
        this.updateUI();
      };
    }

    const sliderMu = document.getElementById('strings-slider-mu');
    const valMu = document.getElementById('strings-val-mu');
    if (sliderMu) {
      sliderMu.value = String(this.mu);
      sliderMu.oninput = (e) => {
        this.mu = parseFloat(e.target.value);
        if (valMu) valMu.textContent = `${(this.mu * 1000).toFixed(1)} g/m (${this.mu.toFixed(4)} kg/m)`;
        this.updateUI();
      };
    }

    const sliderA = document.getElementById('strings-slider-a');
    if (sliderA) {
      sliderA.value = String(this.A);
      sliderA.oninput = (e) => {
        this.A = parseFloat(e.target.value);
      };
    }

    // Botones de Play / Pause / Reset
    const btnPlay = document.getElementById('strings-btn-play');
    if (btnPlay) {
      btnPlay.onclick = () => this.togglePlay();
    }

    const btnReset = document.getElementById('strings-btn-reset');
    if (btnReset) {
      btnReset.onclick = () => this.reset();
    }

    // Deslizador interactivo de Velocidad de Animación (0.1x a 2.0x)
    const sliderSpeed = document.getElementById('strings-slider-speed');
    const valSpeed = document.getElementById('strings-val-speed');
    if (sliderSpeed) {
      sliderSpeed.value = '2'; // 0.5x como velocidad recomendada inicial
      const handleSpeed = () => {
        const idx = Math.max(0, Math.min(5, parseInt(sliderSpeed.value, 10)));
        this.timeScale = this.speedPresets[idx];
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

    // Toggles
    const chkEnv = document.getElementById('strings-chk-envelope');
    if (chkEnv) {
      chkEnv.checked = this.showEnvelope;
      chkEnv.onchange = (e) => { this.showEnvelope = e.target.checked; };
    }

    const chkNodes = document.getElementById('strings-chk-nodes');
    if (chkNodes) {
      chkNodes.checked = this.showNodes;
      chkNodes.onchange = (e) => { this.showNodes = e.target.checked; };
    }

    const chkComp = document.getElementById('strings-chk-components');
    if (chkComp) {
      chkComp.checked = this.showComponents;
      chkComp.onchange = (e) => { this.showComponents = e.target.checked; };
    }

    this.bindHarmonicPills();
  }

  bindHarmonicPills() {
    const pills = document.querySelectorAll('.strings-mode-pill');
    pills.forEach(pill => {
      pill.onclick = () => {
        const mode = parseInt(pill.getAttribute('data-harmonic'), 10);
        if (!isNaN(mode)) {
          this.harmonic = mode;
          this.updateHarmonicPills();
          this.updateUI();
        }
      };
    });
  }

  updateHarmonicPills() {
    const pills = document.querySelectorAll('.strings-mode-pill');
    pills.forEach(pill => {
      const mode = parseInt(pill.getAttribute('data-harmonic'), 10);
      pill.classList.toggle('active', mode === this.harmonic);
    });
  }

  // ================= ACTUALIZACIÓN TELEMETRÍA Y TABLA =================
  updateUI() {
    const v = this.waveSpeed;
    const f1 = this.fundamentalFrequency;
    const fn = this.frequency;
    const lambda = this.wavelength;
    const { nodes, antinodes } = this.getNodesAndAntinodes();

    const setT = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setT('strings-readout-v', `${v.toFixed(1)} m/s`);
    setT('strings-readout-f1', `${f1.toFixed(2)} Hz`);
    setT('strings-readout-fn', `${fn.toFixed(2)} Hz`);
    setT('strings-readout-lambda', `${lambda.toFixed(3)} m`);
    setT('strings-readout-nodes', `${nodes.length} nodos (incluye extremos)`);
    setT('strings-readout-antinodes', `${antinodes.length} antinodos`);
    setT('strings-readout-t', `${this.T.toFixed(0)} N`);
    setT('strings-readout-mu', `${(this.mu * 1000).toFixed(1)} g/m`);

    this.renderModesTable();
  }

  renderModesTable() {
    const container = document.getElementById('strings-table-modes-body');
    if (!container) return;

    let html = '';
    const v = this.waveSpeed;

    for (let n = 1; n <= 5; n++) {
      const lambdaN = (2 * this.L) / n;
      const fn = (n * v) / (2 * this.L);
      const isSelected = n === this.harmonic;

      html += `
        <tr class="${isSelected ? 'active-row' : ''}" style="cursor: pointer;" onclick="window.stringsLabInstance.setHarmonic(${n})">
          <td><span class="badge-harmonic">n = ${n}</span></td>
          <td>${n === 1 ? 'Fundamental (1.° armónico)' : `${n}.° armónico`}</td>
          <td><strong>${fn.toFixed(2)} Hz</strong></td>
          <td>${lambdaN.toFixed(3)} m</td>
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
    const btnPlay = document.getElementById('strings-btn-play');
    const badge = document.getElementById('strings-status-badge');

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

  setHarmonic(n) {
    this.harmonic = n;
    this.updateHarmonicPills();
    this.updateUI();
    this.render();
  }

  // Preconfiguración de experimentos virtuales guiados
  loadExperiment(expNum) {
    switch (expNum) {
      case 1: // Exp 1: Efecto de la tensión (Cuadruplicar tensión: 100 N -> 400 N => velocidad se duplica)
        this.L = 1.0;
        this.mu = 0.004;
        this.T = 400.0;
        this.harmonic = 1;
        break;
      case 2: // Exp 2: Efecto de la densidad lineal (Cuadruplicar mu: 0.004 -> 0.016 kg/m => velocidad se reduce a la mitad)
        this.L = 1.0;
        this.T = 100.0;
        this.mu = 0.016;
        this.harmonic = 1;
        break;
      case 3: // Exp 3: Efecto de la longitud (Reducir L a la mitad: 1.0 m -> 0.5 m => frecuencias se duplican)
        this.L = 0.5;
        this.T = 100.0;
        this.mu = 0.004;
        this.harmonic = 1;
        break;
      case 4: // Exp 4: Armónicos (Observar armónico superior n=4 con 5 nodos y 4 antinodos)
        this.L = 1.0;
        this.T = 100.0;
        this.mu = 0.004;
        this.harmonic = 4;
        break;
    }

    // Actualizar sliders en UI
    const sL = document.getElementById('strings-slider-l');
    if (sL) sL.value = String(this.L);
    const vL = document.getElementById('strings-val-l');
    if (vL) vL.textContent = `${this.L.toFixed(2)} m`;

    const sT = document.getElementById('strings-slider-t');
    if (sT) sT.value = String(this.T);
    const vT = document.getElementById('strings-val-t');
    if (vT) vT.textContent = `${this.T.toFixed(0)} N`;

    const sMu = document.getElementById('strings-slider-mu');
    if (sMu) sMu.value = String(this.mu);
    const vMu = document.getElementById('strings-val-mu');
    if (vMu) vMu.textContent = `${(this.mu * 1000).toFixed(1)} g/m (${this.mu.toFixed(4)} kg/m)`;

    this.updateHarmonicPills();
    this.updateUI();
    this.render();
  }
}

