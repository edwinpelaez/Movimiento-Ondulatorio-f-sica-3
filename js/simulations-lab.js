// simulations-lab.js - Colección de 9 Laboratorios Virtuales de Física de Ondas (Simulaciones A a I)
// Con soporte para Ventana Modal Grande Colapsable

export class SimulationsLab {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.activeSimId = 'sim-a';
    this.animationFrameId = null;
    this.modalAnimationFrameId = null;
    this.audioContext = null;
    this.audioOsc1 = null;
    this.audioOsc2 = null;
    this.audioGain = null;
    this.isPlayingAudio = false;

    // Simulation states
    this.states = {
      'sim-a': { isRunning: true, t: 0, A: 1.5, f: 1.0, v: 3.0, phi: 0 },
      'sim-b': { isRunning: true, t: 0, mode: 'both', A: 1.2, f: 1.0, v: 2.5 },
      'sim-c': { isRunning: true, t: 0, A1: 1.2, f1: 1.0, phi1: 0, A2: 1.2, f2: 1.0, phi2: Math.PI },
      'sim-d': { isRunning: true, t: 0, n: 3, L: 2.0, T: 40.0, mu: 0.01, A: 1.0 },
      'sim-e': { isRunning: true, t: 0, f1: 440, f2: 444, A: 1.0 },
      'sim-f': { isRunning: true, t: 0, type: 'open-closed', modeN: 1, L: 1.0, v: 343 },
      'sim-g': { isRunning: true, t: 0, vs: 0.5, vo: 0, c: 2.0, f0: 1.0, waves: [] },
      'sim-h': { isRunning: true, t: 0, v1: 3.0, v2: 1.5, theta1: 35 },
      'sim-i': { isRunning: true, t: 0, lambdaNm: 632.8, dMm: 0.25, LM: 1.5 }
    };

    this.setupModalControls();
    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="sim-lab-wrapper">
        <div class="sim-lab-tabs-bar">
          <button type="button" class="sim-tab-btn active" data-sim="sim-a">Sim A: Propagación 1D</button>
          <button type="button" class="sim-tab-btn" data-sim="sim-b">Sim B: Transversal vs Longitudinal</button>
          <button type="button" class="sim-tab-btn" data-sim="sim-c">Sim C: Interferencia y Suma</button>
          <button type="button" class="sim-tab-btn" data-sim="sim-d">Sim D: Ondas Estacionarias</button>
          <button type="button" class="sim-tab-btn" data-sim="sim-e">Sim E: Batidos Acústicos</button>
          <button type="button" class="sim-tab-btn" data-sim="sim-f">Sim F: Tubos Resonantes</button>
          <button type="button" class="sim-tab-btn" data-sim="sim-g">Sim G: Efecto Doppler</button>
          <button type="button" class="sim-tab-btn" data-sim="sim-h">Sim H: Reflexión y Refracción</button>
          <button type="button" class="sim-tab-btn" data-sim="sim-i">Sim I: Doble Rendija (Young)</button>
        </div>

        <div class="sim-stage-container" id="sim-stage-container">
          <!-- Renderizado dinámicamente -->
        </div>
      </div>
    `;

    this.attachTabEvents();
    this.mountCurrentSim();
  }

  attachTabEvents() {
    const tabs = this.container.querySelectorAll('.sim-tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.stopCurrentLoop();
        this.activeSimId = tab.getAttribute('data-sim');
        this.mountCurrentSim();
      });
    });
  }

  stopCurrentLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.modalAnimationFrameId) {
      cancelAnimationFrame(this.modalAnimationFrameId);
      this.modalAnimationFrameId = null;
    }
    if (this.isPlayingAudio) {
      this.stopBeatAudio();
    }
  }

  mountCurrentSim() {
    const stage = document.getElementById('sim-stage-container');
    if (!stage) return;

    switch (this.activeSimId) {
      case 'sim-a': this.mountSimA(stage); break;
      case 'sim-b': this.mountSimB(stage); break;
      case 'sim-c': this.mountSimC(stage); break;
      case 'sim-d': this.mountSimD(stage); break;
      case 'sim-e': this.mountSimE(stage); break;
      case 'sim-f': this.mountSimF(stage); break;
      case 'sim-g': this.mountSimG(stage); break;
      case 'sim-h': this.mountSimH(stage); break;
      case 'sim-i': this.mountSimI(stage); break;
    }
  }

  // ================= VENTANA MODAL GRANDE COLAPSABLE =================
  setupModalControls() {
    const modal = document.getElementById('expanded-modal');
    const windowEl = document.getElementById('expanded-modal-window');
    const btnMin = document.getElementById('btn-minimize-modal');
    const btnMax = document.getElementById('btn-maximize-modal');
    const btnFull = document.getElementById('btn-fullscreen-modal');
    const btnClose = document.getElementById('btn-close-modal');

    if (!modal) return;

    if (btnMin && windowEl) {
      btnMin.onclick = () => {
        windowEl.classList.toggle('is-minimized');
      };
    }

    if (btnMax && windowEl) {
      btnMax.onclick = () => {
        windowEl.classList.toggle('is-maximized');
      };
    }

    if (btnFull && windowEl) {
      btnFull.onclick = () => {
        if (!document.fullscreenElement) {
          windowEl.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
      };
    }

    if (btnClose) {
      btnClose.onclick = () => {
        modal.classList.add('hidden');
        if (this.modalAnimationFrameId) {
          cancelAnimationFrame(this.modalAnimationFrameId);
          this.modalAnimationFrameId = null;
        }
      };
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
      }
    });
  }

  openExpandedModal(title, renderModalCallback) {
    const modal = document.getElementById('expanded-modal');
    const titleEl = document.getElementById('modal-title');
    const modalCanvas = document.getElementById('modal-canvas');

    if (!modal || !modalCanvas) return;

    modal.classList.remove('hidden');
    if (titleEl) titleEl.textContent = title;

    // Redimensionar canvas del modal
    const rect = modalCanvas.parentElement.getBoundingClientRect();
    modalCanvas.width = rect.width || 1100;
    modalCanvas.height = rect.height || 620;

    if (typeof renderModalCallback === 'function') {
      renderModalCallback(modalCanvas);
    }
  }

  // ================= SIM A: PROPAGACIÓN DE ONDA VIAJERA =================
  mountSimA(stage) {
    const s = this.states['sim-a'];
    stage.innerHTML = `
      <div class="sim-grid">
        <div class="sim-canvas-box">
          <div class="sim-header-actions-bar">
            <div class="sim-header-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/></svg>
              <span>Simulación A: Onda Sinusoidal Viajera</span>
            </div>
            <button type="button" class="btn-open-expanded-modal-trigger" id="btn-expand-a" title="Abrir en ventana modal grande colapsable">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              <span>Ver en Ventana Modal Grande</span>
            </button>
          </div>
          <canvas id="sim-canvas-a" width="800" height="400"></canvas>
          <div class="sim-floating-hud">
            <span>Ecuación: <strong id="sim-a-eq">y(x,t) = 1.50 sin(2.09 x - 6.28 t)</strong></span>
          </div>
        </div>
        <div class="sim-controls-panel">
          <h4>Parámetros de la Onda Viajera</h4>
          <p class="sim-desc">Ajusta las magnitudes cinemáticas y observa la propagación continua y la relación $v = \\lambda f$.</p>
          
          <div class="sim-ctrl-group">
            <label>Amplitud A: <strong id="val-a-A">${s.A.toFixed(2)} m</strong></label>
            <input type="range" id="ctrl-a-A" min="0.2" max="2.5" step="0.1" value="${s.A}">
          </div>

          <div class="sim-ctrl-group">
            <label>Frecuencia f: <strong id="val-a-f">${s.f.toFixed(2)} Hz</strong></label>
            <input type="range" id="ctrl-a-f" min="0.2" max="3.0" step="0.1" value="${s.f}">
          </div>

          <div class="sim-ctrl-group">
            <label>Velocidad v: <strong id="val-a-v">${s.v.toFixed(2)} m/s</strong></label>
            <input type="range" id="ctrl-a-v" min="0.5" max="6.0" step="0.2" value="${s.v}">
          </div>

          <div class="sim-metrics-box" id="metrics-sim-a"></div>

          <div class="sim-btn-row">
            <button type="button" class="btn-sm btn-primary" id="btn-a-playpause">${s.isRunning ? 'Pausar' : 'Reanudar'}</button>
            <button type="button" class="btn-sm btn-secondary" id="btn-a-reset">Reiniciar t=0</button>
          </div>
        </div>
      </div>
    `;

    const canvas = document.getElementById('sim-canvas-a');
    const ctx = canvas.getContext('2d');

    const updateControls = () => {
      const lambda = s.v / s.f;
      const k = (2 * Math.PI) / lambda;
      const omega = 2 * Math.PI * s.f;
      const T = 1 / s.f;

      document.getElementById('val-a-A').textContent = `${s.A.toFixed(2)} m`;
      document.getElementById('val-a-f').textContent = `${s.f.toFixed(2)} Hz`;
      document.getElementById('val-a-v').textContent = `${s.v.toFixed(2)} m/s`;
      document.getElementById('sim-a-eq').textContent = `y(x,t) = ${s.A.toFixed(2)} sin(${k.toFixed(2)} x - ${omega.toFixed(2)} t)`;

      document.getElementById('metrics-sim-a').innerHTML = `
        <div class="metric-chip">λ = <strong>${lambda.toFixed(2)} m</strong></div>
        <div class="metric-chip">T = <strong>${T.toFixed(3)} s</strong></div>
        <div class="metric-chip">k = <strong>${k.toFixed(2)} rad/m</strong></div>
        <div class="metric-chip">ω = <strong>${omega.toFixed(2)} rad/s</strong></div>
      `;
    };

    document.getElementById('ctrl-a-A').oninput = (e) => { s.A = parseFloat(e.target.value); updateControls(); };
    document.getElementById('ctrl-a-f').oninput = (e) => { s.f = parseFloat(e.target.value); updateControls(); };
    document.getElementById('ctrl-a-v').oninput = (e) => { s.v = parseFloat(e.target.value); updateControls(); };

    const btnPlay = document.getElementById('btn-a-playpause');
    btnPlay.onclick = () => {
      s.isRunning = !s.isRunning;
      btnPlay.textContent = s.isRunning ? 'Pausar' : 'Reanudar';
    };
    document.getElementById('btn-a-reset').onclick = () => { s.t = 0; };
    updateControls();

    // Modal grande trigger
    document.getElementById('btn-expand-a').onclick = () => {
      this.openExpandedModal("Simulación A: Propagación de Onda Viajera 1D (Vista Ampliada)", (mCanvas) => {
        const mCtx = mCanvas.getContext('2d');
        const modalLoop = () => {
          this.drawSimAFrame(mCtx, mCanvas.width, mCanvas.height, s);
          this.modalAnimationFrameId = requestAnimationFrame(modalLoop);
        };
        modalLoop();
      });
    };

    let lastTime = performance.now();
    const loop = (now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      if (s.isRunning) s.t += dt;

      this.drawSimAFrame(ctx, canvas.width, canvas.height, s);
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  drawSimAFrame(ctx, w, h, s) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    const cy = h / 2;
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();

    const scaleX = w / 11;
    const scaleY = h / 6.5;
    const lambda = s.v / s.f;
    const k = (2 * Math.PI) / lambda;
    const omega = 2 * Math.PI * s.f;

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let px = 0; px < w; px++) {
      const xm = px / scaleX;
      const y = s.A * Math.sin(k * xm - omega * s.t);
      const py = cy - y * scaleY;
      if (px === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    const crestX = (((omega * s.t + Math.PI / 2) / k) % (w / scaleX)) * scaleX;
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(crestX, cy - s.A * scaleY, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // ================= SIM B: TRANSVERSAL VS LONGITUDINAL =================
  mountSimB(stage) {
    const s = this.states['sim-b'];
    stage.innerHTML = `
      <div class="sim-grid">
        <div class="sim-canvas-box">
          <div class="sim-header-actions-bar">
            <div class="sim-header-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/></svg>
              <span>Simulación B: Ondas Transversales vs Longitudinales</span>
            </div>
            <button type="button" class="btn-open-expanded-modal-trigger" id="btn-expand-b" title="Abrir en ventana modal grande colapsable">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              <span>Ver en Ventana Modal Grande</span>
            </button>
          </div>
          <canvas id="sim-canvas-b" width="800" height="420"></canvas>
        </div>
        <div class="sim-controls-panel">
          <h4>Ondas Transversales vs Longitudinales</h4>
          <p class="sim-desc">Contrasta el movimiento de partículas: oscilación perpendicular en transversales vs axial con compresiones en longitudinales.</p>
          
          <div class="sim-ctrl-group">
            <label>Frecuencia de Oscilación: <strong id="val-b-f">${s.f.toFixed(2)} Hz</strong></label>
            <input type="range" id="ctrl-b-f" min="0.4" max="2.0" step="0.1" value="${s.f}">
          </div>

          <div class="sim-ctrl-group">
            <label>Amplitud de Partícula: <strong id="val-b-A">${s.A.toFixed(2)}</strong></label>
            <input type="range" id="ctrl-b-A" min="0.4" max="2.0" step="0.1" value="${s.A}">
          </div>

          <div class="sim-btn-row">
            <button type="button" class="btn-sm btn-primary" id="btn-b-playpause">${s.isRunning ? 'Pausar' : 'Reanudar'}</button>
            <button type="button" class="btn-sm btn-secondary" id="btn-b-reset">Reiniciar</button>
          </div>
        </div>
      </div>
    `;

    const canvas = document.getElementById('sim-canvas-b');
    const ctx = canvas.getContext('2d');

    document.getElementById('ctrl-b-f').oninput = (e) => {
      s.f = parseFloat(e.target.value);
      document.getElementById('val-b-f').textContent = `${s.f.toFixed(2)} Hz`;
    };
    document.getElementById('ctrl-b-A').oninput = (e) => {
      s.A = parseFloat(e.target.value);
      document.getElementById('val-b-A').textContent = `${s.A.toFixed(2)}`;
    };
    document.getElementById('btn-b-playpause').onclick = () => {
      s.isRunning = !s.isRunning;
      document.getElementById('btn-b-playpause').textContent = s.isRunning ? 'Pausar' : 'Reanudar';
    };
    document.getElementById('btn-b-reset').onclick = () => { s.t = 0; };

    // Modal grande trigger
    document.getElementById('btn-expand-b').onclick = () => {
      this.openExpandedModal("Simulación B: Ondas Transversales vs Longitudinales (Vista Ampliada)", (mCanvas) => {
        const mCtx = mCanvas.getContext('2d');
        const modalLoop = () => {
          this.drawSimBFrame(mCtx, mCanvas.width, mCanvas.height, s);
          this.modalAnimationFrameId = requestAnimationFrame(modalLoop);
        };
        modalLoop();
      });
    };

    let lastTime = performance.now();
    const loop = (now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      if (s.isRunning) s.t += dt;

      this.drawSimBFrame(ctx, canvas.width, canvas.height, s);
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  drawSimBFrame(ctx, w, h, s) {
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, w, h);

    const k = 0.02;
    const omega = 2 * Math.PI * s.f;

    // Transverse
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px Inter, sans-serif';
    ctx.fillText('1. ONDA TRANSVERSAL (Oscilación ⊥ Propagación)', 20, 30);

    const cyTrans = h * 0.28;
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath(); ctx.moveTo(20, cyTrans); ctx.lineTo(w - 20, cyTrans); ctx.stroke();

    const numParticles = 45;
    const stepX = (w - 60) / numParticles;
    for (let i = 0; i < numParticles; i++) {
      const x0 = 30 + i * stepX;
      const dy = s.A * 30 * Math.sin(k * x0 - omega * s.t);
      const y = cyTrans + dy;

      ctx.fillStyle = i === 15 ? '#f43f5e' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(x0, y, i === 15 ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();

      if (i > 0) {
        const prevX = 30 + (i - 1) * stepX;
        const prevY = cyTrans + s.A * 30 * Math.sin(k * prevX - omega * s.t);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(x0, y); ctx.stroke();
      }
    }

    // Longitudinal
    const cyLong = h * 0.68;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('2. ONDA LONGITUDINAL (Oscilación ∥ Propagación - Compresiones y Rarefacciones)', 20, h * 0.52);

    ctx.strokeStyle = '#1e293b';
    ctx.beginPath(); ctx.moveTo(20, cyLong); ctx.lineTo(w - 20, cyLong); ctx.stroke();

    for (let i = 0; i < 55; i++) {
      const x0 = 30 + i * ((w - 60) / 55);
      const dx = s.A * 22 * Math.sin(k * x0 - omega * s.t);
      const x = x0 + dx;

      for (let row = -2; row <= 2; row++) {
        const y = cyLong + row * 18;
        ctx.fillStyle = i === 18 ? '#f43f5e' : '#34d399';
        ctx.beginPath();
        ctx.arc(x, y, i === 18 ? 5.5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#f43f5e';
    ctx.beginPath(); ctx.arc(30, h - 25, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('Partícula testigo marcada: oscilación puramente local en torno al equilibrio', 45, h - 21);
  }

  // ================= SIM C: SUPERPOSICIÓN E INTERFERENCIA =================
  mountSimC(stage) {
    const s = this.states['sim-c'];
    stage.innerHTML = `
      <div class="sim-grid">
        <div class="sim-canvas-box">
          <div class="sim-header-actions-bar">
            <div class="sim-header-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/></svg>
              <span>Simulación C: Superposición e Interferencia</span>
            </div>
            <button type="button" class="btn-open-expanded-modal-trigger" id="btn-expand-c" title="Abrir en ventana modal grande colapsable">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              <span>Ver en Ventana Modal Grande</span>
            </button>
          </div>
          <canvas id="sim-canvas-c" width="800" height="420"></canvas>
          <div class="sim-floating-hud">
            <span>Interferencia: <strong id="sim-c-type">Constructiva / Destructiva</strong></span>
          </div>
        </div>
        <div class="sim-controls-panel">
          <h4>Superposición de Dos Ondas Coherentes</h4>
          <p class="sim-desc">Modifica el desfase $\\Delta\\phi$ y comprueba la transición desde constructiva total ($2A$) hasta destructiva ($0$).</p>
          
          <div class="sim-ctrl-group">
            <label>Desfase Onda 2 (Δφ): <strong id="val-c-phi2">π rad (180°)</strong></label>
            <input type="range" id="ctrl-c-phi2" min="0" max="6.283" step="0.05" value="${s.phi2}">
          </div>

          <div class="sim-ctrl-group">
            <label>Amplitud A₁: <strong id="val-c-A1">${s.A1.toFixed(1)} m</strong></label>
            <input type="range" id="ctrl-c-A1" min="0.2" max="1.8" step="0.1" value="${s.A1}">
          </div>

          <div class="sim-ctrl-group">
            <label>Amplitud A₂: <strong id="val-c-A2">${s.A2.toFixed(1)} m</strong></label>
            <input type="range" id="ctrl-c-A2" min="0.2" max="1.8" step="0.1" value="${s.A2}">
          </div>

          <div class="sim-btn-row">
            <button type="button" class="btn-sm btn-secondary" id="btn-c-preset-const">Constructiva (Δφ = 0)</button>
            <button type="button" class="btn-sm btn-secondary" id="btn-c-preset-dest">Destructiva (Δφ = π)</button>
          </div>
        </div>
      </div>
    `;

    const canvas = document.getElementById('sim-canvas-c');
    const ctx = canvas.getContext('2d');

    const updateLabel = () => {
      const deg = ((s.phi2 * 180) / Math.PI).toFixed(0);
      document.getElementById('val-c-phi2').textContent = `${(s.phi2 / Math.PI).toFixed(2)} π rad (${deg}°)`;
      document.getElementById('val-c-A1').textContent = `${s.A1.toFixed(1)} m`;
      document.getElementById('val-c-A2').textContent = `${s.A2.toFixed(1)} m`;

      const cosHalf = Math.abs(Math.cos(s.phi2 / 2));
      const typeLabel = cosHalf > 0.95 ? 'Constructiva Total (2A)' : cosHalf < 0.08 ? 'Destructiva Total (A=0)' : `Parcial (A_res = ${(2 * s.A1 * cosHalf).toFixed(2)} m)`;
      document.getElementById('sim-c-type').textContent = typeLabel;
    };

    document.getElementById('ctrl-c-phi2').oninput = (e) => { s.phi2 = parseFloat(e.target.value); updateLabel(); };
    document.getElementById('ctrl-c-A1').oninput = (e) => { s.A1 = parseFloat(e.target.value); updateLabel(); };
    document.getElementById('ctrl-c-A2').oninput = (e) => { s.A2 = parseFloat(e.target.value); updateLabel(); };
    document.getElementById('btn-c-preset-const').onclick = () => { s.phi2 = 0; document.getElementById('ctrl-c-phi2').value = 0; updateLabel(); };
    document.getElementById('btn-c-preset-dest').onclick = () => { s.phi2 = Math.PI; document.getElementById('ctrl-c-phi2').value = Math.PI; updateLabel(); };
    updateLabel();

    // Modal grande trigger
    document.getElementById('btn-expand-c').onclick = () => {
      this.openExpandedModal("Simulación C: Superposición e Interferencia de Ondas (Vista Ampliada)", (mCanvas) => {
        const mCtx = mCanvas.getContext('2d');
        const modalLoop = () => {
          this.drawSimCFrame(mCtx, mCanvas.width, mCanvas.height, s);
          this.modalAnimationFrameId = requestAnimationFrame(modalLoop);
        };
        modalLoop();
      });
    };

    let lastTime = performance.now();
    const loop = (now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      if (s.isRunning) s.t += dt;

      this.drawSimCFrame(ctx, canvas.width, canvas.height, s);
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  drawSimCFrame(ctx, w, h, s) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const k = 0.035;
    const omega = 4.0;
    const cy1 = h * 0.19;
    const cy2 = h * 0.46;
    const cyRes = h * 0.78;
    const scaleY = h * 0.08;

    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.32); ctx.lineTo(w, h * 0.32);
    ctx.moveTo(0, h * 0.60); ctx.lineTo(w, h * 0.60);
    ctx.stroke();

    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`Onda 1: y₁(x,t) = ${s.A1.toFixed(1)} sin(kx - ωt)`, 20, 25);
    ctx.fillStyle = '#a855f7';
    ctx.fillText(`Onda 2: y₂(x,t) = ${s.A2.toFixed(1)} sin(kx - ωt + ${(s.phi2 / Math.PI).toFixed(2)}π)`, 20, h * 0.36);
    ctx.fillStyle = '#f43f5e';
    ctx.fillText('Onda Resultante (Superposición): y_total = y₁ + y₂', 20, h * 0.64);

    // Wave 1
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let px = 0; px < w; px++) {
      const y = s.A1 * Math.sin(k * px - omega * s.t);
      if (px === 0) ctx.moveTo(px, cy1 - y * scaleY); else ctx.lineTo(px, cy1 - y * scaleY);
    }
    ctx.stroke();

    // Wave 2
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let px = 0; px < w; px++) {
      const y = s.A2 * Math.sin(k * px - omega * s.t + s.phi2);
      if (px === 0) ctx.moveTo(px, cy2 - y * scaleY); else ctx.lineTo(px, cy2 - y * scaleY);
    }
    ctx.stroke();

    // Resultant
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let px = 0; px < w; px++) {
      const y1 = s.A1 * Math.sin(k * px - omega * s.t);
      const y2 = s.A2 * Math.sin(k * px - omega * s.t + s.phi2);
      const yRes = y1 + y2;
      if (px === 0) ctx.moveTo(px, cyRes - yRes * scaleY); else ctx.lineTo(px, cyRes - yRes * scaleY);
    }
    ctx.stroke();
  }

  // ================= SIM D: ONDAS ESTACIONARIAS =================
  mountSimD(stage) {
    const s = this.states['sim-d'];
    stage.innerHTML = `
      <div class="sim-grid">
        <div class="sim-canvas-box">
          <div class="sim-header-actions-bar">
            <div class="sim-header-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/></svg>
              <span>Simulación D: Ondas Estacionarias y Modos Normales</span>
            </div>
            <button type="button" class="btn-open-expanded-modal-trigger" id="btn-expand-d" title="Abrir en ventana modal grande colapsable">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              <span>Ver en Ventana Modal Grande</span>
            </button>
          </div>
          <canvas id="sim-canvas-d" width="800" height="400"></canvas>
          <div class="sim-floating-hud">
            <span>Modo Normal: <strong id="sim-d-mode">n = 3 (Tercer Armónico)</strong></span>
          </div>
        </div>
        <div class="sim-controls-panel">
          <h4>Modos Normales de Vibración</h4>
          <p class="sim-desc">Selecciona el armónico $n$ y varía la tensión $T$ y densidad $\\mu$. Observa los nodos inmóviles y antinodos.</p>
          
          <div class="sim-ctrl-group">
            <label>Número de Armónico (n): <strong id="val-d-n">${s.n}</strong></label>
            <input type="range" id="ctrl-d-n" min="1" max="6" step="1" value="${s.n}">
          </div>

          <div class="sim-ctrl-group">
            <label>Tensión T: <strong id="val-d-T">${s.T.toFixed(1)} N</strong></label>
            <input type="range" id="ctrl-d-T" min="10" max="150" step="5" value="${s.T}">
          </div>

          <div class="sim-ctrl-group">
            <label>Longitud Cuerda L: <strong id="val-d-L">${s.L.toFixed(2)} m</strong></label>
            <input type="range" id="ctrl-d-L" min="1.0" max="4.0" step="0.2" value="${s.L}">
          </div>

          <div class="sim-metrics-box" id="metrics-sim-d"></div>
        </div>
      </div>
    `;

    const canvas = document.getElementById('sim-canvas-d');
    const ctx = canvas.getContext('2d');

    const updateCalc = () => {
      const v = Math.sqrt(s.T / s.mu);
      const lambdaN = (2 * s.L) / s.n;
      const fn = s.n * (v / (2 * s.L));

      document.getElementById('val-d-n').textContent = `${s.n}`;
      document.getElementById('val-d-T').textContent = `${s.T.toFixed(1)} N`;
      document.getElementById('val-d-L').textContent = `${s.L.toFixed(2)} m`;
      document.getElementById('sim-d-mode').textContent = `n = ${s.n} (${s.n === 1 ? 'Fundamental' : s.n + '.º Armónico'})`;

      document.getElementById('metrics-sim-d').innerHTML = `
        <div class="metric-chip">Velocidad v = <strong>${v.toFixed(1)} m/s</strong></div>
        <div class="metric-chip">Frecuencia f_${s.n} = <strong>${fn.toFixed(1)} Hz</strong></div>
        <div class="metric-chip">λ_${s.n} = <strong>${lambdaN.toFixed(2)} m</strong></div>
        <div class="metric-chip">Nodos = <strong>${s.n + 1}</strong> | Vientres = <strong>${s.n}</strong></div>
      `;
    };

    document.getElementById('ctrl-d-n').oninput = (e) => { s.n = parseInt(e.target.value, 10); updateCalc(); };
    document.getElementById('ctrl-d-T').oninput = (e) => { s.T = parseFloat(e.target.value); updateCalc(); };
    document.getElementById('ctrl-d-L').oninput = (e) => { s.L = parseFloat(e.target.value); updateCalc(); };
    updateCalc();

    document.getElementById('btn-expand-d').onclick = () => {
      this.openExpandedModal("Simulación D: Ondas Estacionarias y Modos Normales (Vista Ampliada)", (mCanvas) => {
        const mCtx = mCanvas.getContext('2d');
        const modalLoop = () => {
          this.drawSimDFrame(mCtx, mCanvas.width, mCanvas.height, s);
          this.modalAnimationFrameId = requestAnimationFrame(modalLoop);
        };
        modalLoop();
      });
    };

    let lastTime = performance.now();
    const loop = (now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      if (s.isRunning) s.t += dt;

      this.drawSimDFrame(ctx, canvas.width, canvas.height, s);
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  drawSimDFrame(ctx, w, h, s) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const cy = h / 2;
    const margin = w * 0.1;
    const spanX = w - margin * 2;

    // Supports
    ctx.fillStyle = '#475569';
    ctx.fillRect(margin - 12, cy - 60, 12, 120);
    ctx.fillRect(margin + spanX, cy - 60, 12, 120);

    const v = Math.sqrt(s.T / s.mu);
    const fn = s.n * (v / (2 * s.L));
    const omega = 2 * Math.PI * fn;
    const timeFactor = Math.cos(omega * s.t);
    const ampMaxPx = h * 0.22;

    // Envelope
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let px = 0; px <= spanX; px++) {
      const normX = px / spanX;
      const env = ampMaxPx * Math.sin(s.n * Math.PI * normX);
      if (px === 0) ctx.moveTo(margin + px, cy - env); else ctx.lineTo(margin + px, cy - env);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let px = 0; px <= spanX; px++) {
      const normX = px / spanX;
      const env = ampMaxPx * Math.sin(s.n * Math.PI * normX);
      if (px === 0) ctx.moveTo(margin + px, cy + env); else ctx.lineTo(margin + px, cy + env);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // String
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let px = 0; px <= spanX; px++) {
      const normX = px / spanX;
      const y = ampMaxPx * Math.sin(s.n * Math.PI * normX) * timeFactor;
      if (px === 0) ctx.moveTo(margin + px, cy - y); else ctx.lineTo(margin + px, cy - y);
    }
    ctx.stroke();

    for (let i = 0; i <= s.n; i++) {
      const nx = margin + (i / s.n) * spanX;
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath(); ctx.arc(nx, cy, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fca5a5';
      ctx.font = '12px Outfit, sans-serif';
      ctx.fillText(`Nodo ${i}`, nx - 18, cy + 24);
    }
  }

  // ================= SIM E: BATIDOS ACÚSTICOS =================
  mountSimE(stage) {
    const s = this.states['sim-e'];
    stage.innerHTML = `
      <div class="sim-grid">
        <div class="sim-canvas-box">
          <div class="sim-header-actions-bar">
            <div class="sim-header-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/></svg>
              <span>Simulación E: Fenómeno de Batidos Acústicos</span>
            </div>
            <button type="button" class="btn-open-expanded-modal-trigger" id="btn-expand-e" title="Abrir en ventana modal grande colapsable">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              <span>Ver en Ventana Modal Grande</span>
            </button>
          </div>
          <canvas id="sim-canvas-e" width="800" height="400"></canvas>
          <div class="sim-floating-hud">
            <span>Frecuencia de Batido: <strong id="sim-e-fbat">4.0 Hz</strong></span>
          </div>
        </div>
        <div class="sim-controls-panel">
          <h4>Fenómeno de Batidos y Envolvente</h4>
          <p class="sim-desc">Superpón dos frecuencias cercanas y visualiza la modulación. Activa el audio para escuchar las pulsaciones en tiempo real.</p>
          
          <div class="sim-ctrl-group">
            <label>Frecuencia 1: <strong id="val-e-f1">${s.f1} Hz</strong></label>
            <input type="range" id="ctrl-e-f1" min="400" max="480" step="1" value="${s.f1}">
          </div>

          <div class="sim-ctrl-group">
            <label>Frecuencia 2: <strong id="val-e-f2">${s.f2} Hz</strong></label>
            <input type="range" id="ctrl-e-f2" min="400" max="480" step="1" value="${s.f2}">
          </div>

          <div class="sim-btn-row">
            <button type="button" class="btn-sm btn-accent" id="btn-e-audio">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>
              Escuchar Audio de Batidos
            </button>
          </div>
        </div>
      </div>
    `;

    const canvas = document.getElementById('sim-canvas-e');
    const ctx = canvas.getContext('2d');

    const updateBat = () => {
      const fbat = Math.abs(s.f1 - s.f2);
      document.getElementById('val-e-f1').textContent = `${s.f1} Hz`;
      document.getElementById('val-e-f2').textContent = `${s.f2} Hz`;
      document.getElementById('sim-e-fbat').textContent = `${fbat.toFixed(1)} Hz (${fbat.toFixed(1)} pulsaciones/s)`;

      if (this.audioOsc1 && this.audioOsc2) {
        this.audioOsc1.frequency.setValueAtTime(s.f1, this.audioContext.currentTime);
        this.audioOsc2.frequency.setValueAtTime(s.f2, this.audioContext.currentTime);
      }
    };

    document.getElementById('ctrl-e-f1').oninput = (e) => { s.f1 = parseFloat(e.target.value); updateBat(); };
    document.getElementById('ctrl-e-f2').oninput = (e) => { s.f2 = parseFloat(e.target.value); updateBat(); };

    const btnAudio = document.getElementById('btn-e-audio');
    btnAudio.onclick = () => {
      if (!this.isPlayingAudio) {
        this.startBeatAudio(s.f1, s.f2);
        btnAudio.textContent = 'Detener Audio';
      } else {
        this.stopBeatAudio();
        btnAudio.textContent = 'Escuchar Audio de Batidos';
      }
    };
    updateBat();

    document.getElementById('btn-expand-e').onclick = () => {
      this.openExpandedModal("Simulación E: Batidos Acústicos y Envolvente (Vista Ampliada)", (mCanvas) => {
        const mCtx = mCanvas.getContext('2d');
        const modalLoop = () => {
          this.drawSimEFrame(mCtx, mCanvas.width, mCanvas.height, s);
          this.modalAnimationFrameId = requestAnimationFrame(modalLoop);
        };
        modalLoop();
      });
    };

    let lastTime = performance.now();
    const loop = (now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      if (s.isRunning) s.t += dt;

      this.drawSimEFrame(ctx, canvas.width, canvas.height, s);
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  drawSimEFrame(ctx, w, h, s) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const cy = h / 2;
    const fDiff = Math.abs(s.f1 - s.f2);
    const ampPx = h * 0.28;
    const tWindow = 1.0;

    ctx.strokeStyle = '#334155';
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();

    // Envelope
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    for (let px = 0; px < w; px++) {
      const tau = s.t + (px / w) * tWindow;
      const env = ampPx * Math.abs(Math.cos(Math.PI * fDiff * tau));
      if (px === 0) ctx.moveTo(px, cy - env); else ctx.lineTo(px, cy - env);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let px = 0; px < w; px++) {
      const tau = s.t + (px / w) * tWindow;
      const env = ampPx * Math.abs(Math.cos(Math.PI * fDiff * tau));
      if (px === 0) ctx.moveTo(px, cy + env); else ctx.lineTo(px, cy + env);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Composite
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const avgF = 18;
    for (let px = 0; px < w; px++) {
      const tau = s.t + (px / w) * tWindow;
      const env = ampPx * Math.cos(Math.PI * fDiff * tau);
      const y = env * Math.sin(2 * Math.PI * avgF * tau);
      if (px === 0) ctx.moveTo(px, cy - y); else ctx.lineTo(px, cy - y);
    }
    ctx.stroke();
  }

  startBeatAudio(f1, f2) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.audioGain = this.audioContext.createGain();
      this.audioGain.gain.setValueAtTime(0.15, this.audioContext.currentTime);

      this.audioOsc1 = this.audioContext.createOscillator();
      this.audioOsc1.type = 'sine';
      this.audioOsc1.frequency.setValueAtTime(f1, this.audioContext.currentTime);

      this.audioOsc2 = this.audioContext.createOscillator();
      this.audioOsc2.type = 'sine';
      this.audioOsc2.frequency.setValueAtTime(f2, this.audioContext.currentTime);

      this.audioOsc1.connect(this.audioGain);
      this.audioOsc2.connect(this.audioGain);
      this.audioGain.connect(this.audioContext.destination);

      this.audioOsc1.start();
      this.audioOsc2.start();
      this.isPlayingAudio = true;
    } catch (e) {
      console.warn('Web Audio no disponible:', e);
    }
  }

  stopBeatAudio() {
    if (this.audioOsc1) { try { this.audioOsc1.stop(); } catch (e) {} this.audioOsc1 = null; }
    if (this.audioOsc2) { try { this.audioOsc2.stop(); } catch (e) {} this.audioOsc2 = null; }
    if (this.audioContext) { try { this.audioContext.close(); } catch (e) {} this.audioContext = null; }
    this.isPlayingAudio = false;
  }

  // ================= SIM F: TUBOS RESONANTES =================
  mountSimF(stage) {
    const s = this.states['sim-f'];
    stage.innerHTML = `
      <div class="sim-grid">
        <div class="sim-canvas-box">
          <div class="sim-header-actions-bar">
            <div class="sim-header-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/></svg>
              <span>Simulación F: Resonancia en Columnas de Aire</span>
            </div>
            <button type="button" class="btn-open-expanded-modal-trigger" id="btn-expand-f" title="Abrir en ventana modal grande colapsable">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              <span>Ver en Ventana Modal Grande</span>
            </button>
          </div>
          <canvas id="sim-canvas-f" width="800" height="400"></canvas>
          <div class="sim-floating-hud">
            <span>Tubo: <strong id="sim-f-title">Cerrado en un Extremo</strong></span>
          </div>
        </div>
        <div class="sim-controls-panel">
          <h4>Resonancia en Columnas de Aire</h4>
          <p class="sim-desc">Alterna tubo abierto-abierto vs cerrado. Observa los perfiles desfasados de <strong>desplazamiento</strong> y <strong>presión</strong>.</p>
          
          <div class="sim-ctrl-group">
            <label>Tipo de Tubo:</label>
            <select id="ctrl-f-type" class="select-clean">
              <option value="open-closed" selected>Cerrado en un Extremo (Semiabierto)</option>
              <option value="open-open">Abierto en Ambos Extremos</option>
            </select>
          </div>

          <div class="sim-ctrl-group">
            <label>Modo de Resonancia (n): <strong id="val-f-n">1</strong></label>
            <input type="range" id="ctrl-f-n" min="1" max="4" step="1" value="1">
          </div>

          <div class="sim-metrics-box" id="metrics-sim-f"></div>
        </div>
      </div>
    `;

    const canvas = document.getElementById('sim-canvas-f');
    const ctx = canvas.getContext('2d');

    const updateTubos = () => {
      const isClosed = s.type === 'open-closed';
      const n = s.modeN;
      let fn = 0, lambda = 0;
      if (isClosed) {
        fn = ((2 * n - 1) * s.v) / (4 * s.L);
        lambda = (4 * s.L) / (2 * n - 1);
      } else {
        fn = (n * s.v) / (2 * s.L);
        lambda = (2 * s.L) / n;
      }

      document.getElementById('sim-f-title').textContent = isClosed ? 'Cerrado en un Extremo' : 'Abierto en Ambos Extremos';
      document.getElementById('val-f-n').textContent = `${n} (${isClosed ? (2 * n - 1) + '.º Armónico' : n + '.º Armónico'})`;

      document.getElementById('metrics-sim-f').innerHTML = `
        <div class="metric-chip">Frecuencia = <strong>${fn.toFixed(1)} Hz</strong></div>
        <div class="metric-chip">Longitud de Onda = <strong>${lambda.toFixed(2)} m</strong></div>
        <div class="metric-chip">${isClosed ? 'Solo armónicos impares (1, 3, 5...)' : 'Todos los armónicos (1, 2, 3...)'}</div>
      `;
    };

    document.getElementById('ctrl-f-type').onchange = (e) => { s.type = e.target.value; updateTubos(); };
    document.getElementById('ctrl-f-n').oninput = (e) => { s.modeN = parseInt(e.target.value, 10); updateTubos(); };
    updateTubos();

    document.getElementById('btn-expand-f').onclick = () => {
      this.openExpandedModal("Simulación F: Tubos Acústicos Resonantes (Vista Ampliada)", (mCanvas) => {
        const mCtx = mCanvas.getContext('2d');
        const modalLoop = () => {
          this.drawSimFFrame(mCtx, mCanvas.width, mCanvas.height, s);
          this.modalAnimationFrameId = requestAnimationFrame(modalLoop);
        };
        modalLoop();
      });
    };

    let lastTime = performance.now();
    const loop = (now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      if (s.isRunning) s.t += dt;

      this.drawSimFFrame(ctx, canvas.width, canvas.height, s);
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  drawSimFFrame(ctx, w, h, s) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const margin = w * 0.12;
    const spanX = w - margin * 2;
    const pipeH = h * 0.35;
    const cy = h / 2;

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(margin, cy - pipeH / 2);
    ctx.lineTo(margin + spanX, cy - pipeH / 2);
    ctx.moveTo(margin, cy + pipeH / 2);
    ctx.lineTo(margin + spanX, cy + pipeH / 2);
    ctx.stroke();

    if (s.type === 'open-closed') {
      ctx.fillStyle = '#475569';
      ctx.fillRect(margin - 12, cy - pipeH / 2, 12, pipeH);
    }

    const omega = 4.0;
    const cosT = Math.cos(omega * s.t);
    const ampPx = pipeH / 2 - 15;

    // Displacement
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let px = 0; px <= spanX; px++) {
      const frac = px / spanX;
      let val = 0;
      if (s.type === 'open-closed') {
        val = ampPx * Math.sin(((2 * s.modeN - 1) * Math.PI * frac) / 2) * cosT;
      } else {
        val = ampPx * Math.cos(s.modeN * Math.PI * frac) * cosT;
      }
      if (px === 0) ctx.moveTo(margin + px, cy - val); else ctx.lineTo(margin + px, cy - val);
    }
    ctx.stroke();

    // Pressure
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let px = 0; px <= spanX; px++) {
      const frac = px / spanX;
      let val = 0;
      if (s.type === 'open-closed') {
        val = ampPx * Math.cos(((2 * s.modeN - 1) * Math.PI * frac) / 2) * cosT;
      } else {
        val = ampPx * Math.sin(s.modeN * Math.PI * frac) * cosT;
      }
      if (px === 0) ctx.moveTo(margin + px, cy - val); else ctx.lineTo(margin + px, cy - val);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#38bdf8';
    ctx.fillText('— Desplazamiento Molecular s(x,t)', margin, cy - pipeH / 2 - 15);
    ctx.fillStyle = '#f97316';
    ctx.fillText('- - Variación de Presión ΔP(x,t)', margin + 260, cy - pipeH / 2 - 15);
  }

  // ================= SIM G: EFECTO DOPPLER =================
  mountSimG(stage) {
    const s = this.states['sim-g'];
    stage.innerHTML = `
      <div class="sim-grid">
        <div class="sim-canvas-box">
          <div class="sim-header-actions-bar">
            <div class="sim-header-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/></svg>
              <span>Simulación G: Efecto Doppler y Frentes de Onda</span>
            </div>
            <button type="button" class="btn-open-expanded-modal-trigger" id="btn-expand-g" title="Abrir en ventana modal grande colapsable">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              <span>Ver en Ventana Modal Grande</span>
            </button>
          </div>
          <canvas id="sim-canvas-g" width="800" height="420"></canvas>
          <div class="sim-floating-hud">
            <span>Frecuencia Percibida f': <strong id="sim-g-fprime">1.33 Hz</strong></span>
          </div>
        </div>
        <div class="sim-controls-panel">
          <h4>Efecto Doppler Acústico</h4>
          <p class="sim-desc">Observa los frentes circulares emitidos por una fuente hacia la derecha. Delante se comprimen y detrás se dilatan.</p>
          
          <div class="sim-ctrl-group">
            <label>Velocidad Fuente (v_s / c): <strong id="val-g-vs">${(s.vs / s.c).toFixed(2)} Mach</strong></label>
            <input type="range" id="ctrl-g-vs" min="0" max="1.6" step="0.1" value="${s.vs}">
          </div>

          <div class="sim-metrics-box" id="metrics-sim-g"></div>

          <div class="sim-btn-row">
            <button type="button" class="btn-sm btn-secondary" id="btn-g-reset">Reiniciar Frentes</button>
          </div>
        </div>
      </div>
    `;

    const canvas = document.getElementById('sim-canvas-g');
    const ctx = canvas.getContext('2d');
    s.waves = [];
    s.xSource = 150;

    const updateDoppler = () => {
      const mach = s.vs / s.c;
      const fPrimeAhead = s.f0 / (1 - mach);
      const fPrimeBehind = s.f0 / (1 + mach);

      document.getElementById('val-g-vs').textContent = `${mach.toFixed(2)} (v_s = ${s.vs.toFixed(1)})`;
      document.getElementById('sim-g-fprime').textContent = mach < 1 ? `${fPrimeAhead.toFixed(2)} Hz` : 'Onda de Choque (Mach ≥ 1)';

      document.getElementById('metrics-sim-g').innerHTML = `
        <div class="metric-chip">Frecuencia Delante = <strong>${mach < 1 ? fPrimeAhead.toFixed(2) + ' Hz' : 'Infinita/Choque'}</strong></div>
        <div class="metric-chip">Frecuencia Detrás = <strong>${fPrimeBehind.toFixed(2)} Hz</strong></div>
      `;
    };

    document.getElementById('ctrl-g-vs').oninput = (e) => { s.vs = parseFloat(e.target.value); updateDoppler(); };
    document.getElementById('btn-g-reset').onclick = () => { s.waves = []; s.xSource = 150; };
    updateDoppler();

    document.getElementById('btn-expand-g').onclick = () => {
      this.openExpandedModal("Simulación G: Efecto Doppler y Frentes de Onda (Vista Ampliada)", (mCanvas) => {
        const mCtx = mCanvas.getContext('2d');
        const modalLoop = () => {
          this.drawSimGFrame(mCtx, mCanvas.width, mCanvas.height, s);
          this.modalAnimationFrameId = requestAnimationFrame(modalLoop);
        };
        modalLoop();
      });
    };

    let lastEmit = 0;
    let lastTime = performance.now();
    const loop = (now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      if (s.isRunning) {
        s.t += dt;
        s.xSource += s.vs * 50 * dt;
        if (s.xSource > canvas.width + 50) s.xSource = -50;

        if (now - lastEmit > 350) {
          s.waves.push({ x: s.xSource, y: canvas.height / 2, r: 0 });
          lastEmit = now;
        }

        for (let i = s.waves.length - 1; i >= 0; i--) {
          s.waves[i].r += s.c * 50 * dt;
          if (s.waves[i].r > 600) s.waves.splice(i, 1);
        }
      }

      this.drawSimGFrame(ctx, canvas.width, canvas.height, s);
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  drawSimGFrame(ctx, w, h, s) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    ctx.lineWidth = 1.8;
    s.waves.forEach((wave) => {
      const alpha = Math.max(0.1, 1 - wave.r / 500);
      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.r, 0, Math.PI * 2);
      ctx.stroke();
    });

    const cy = h / 2;
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath(); ctx.arc(s.xSource, cy, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fca5a5';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText('Fuente (v_s →)', s.xSource - 30, cy - 14);

    const xObs = w - 80;
    ctx.fillStyle = '#34d399';
    ctx.beginPath(); ctx.arc(xObs, cy, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a7f3d0';
    ctx.fillText('Observador', xObs - 28, cy - 14);
  }

  // ================= SIM H: REFLEXIÓN Y REFRACCIÓN =================
  mountSimH(stage) {
    const s = this.states['sim-h'];
    stage.innerHTML = `
      <div class="sim-grid">
        <div class="sim-canvas-box">
          <div class="sim-header-actions-bar">
            <div class="sim-header-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/></svg>
              <span>Simulación H: Reflexión y Refracción (Ley de Snell)</span>
            </div>
            <button type="button" class="btn-open-expanded-modal-trigger" id="btn-expand-h" title="Abrir en ventana modal grande colapsable">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              <span>Ver en Ventana Modal Grande</span>
            </button>
          </div>
          <canvas id="sim-canvas-h" width="800" height="400"></canvas>
          <div class="sim-floating-hud">
            <span>Ley de Snell: <strong id="sim-h-snell">θ₂ = 16.7°</strong></span>
          </div>
        </div>
        <div class="sim-controls-panel">
          <h4>Refracción y Reflexión de Frentes de Onda</h4>
          <p class="sim-desc">Al pasar de medio rápido a lento ($v_1 > v_2$), los frentes se comprimen y el rayo se desvía hacia la normal.</p>
          
          <div class="sim-ctrl-group">
            <label>Ángulo de Incidencia θ₁: <strong id="val-h-th1">${s.theta1}°</strong></label>
            <input type="range" id="ctrl-h-th1" min="10" max="75" step="1" value="${s.theta1}">
          </div>

          <div class="sim-ctrl-group">
            <label>Velocidad Medio 2 (v₂): <strong id="val-h-v2">${s.v2.toFixed(1)} m/s</strong></label>
            <input type="range" id="ctrl-h-v2" min="1.0" max="4.0" step="0.2" value="${s.v2}">
          </div>

          <div class="sim-metrics-box" id="metrics-sim-h"></div>
        </div>
      </div>
    `;

    const canvas = document.getElementById('sim-canvas-h');
    const ctx = canvas.getContext('2d');

    const updateSnell = () => {
      const th1Rad = (s.theta1 * Math.PI) / 180;
      const sinTh2 = (s.v2 / s.v1) * Math.sin(th1Rad);
      let th2Deg = 0;
      if (sinTh2 <= 1) {
        th2Deg = (Math.asin(sinTh2) * 180) / Math.PI;
        document.getElementById('sim-h-snell').textContent = `θ₂ = ${th2Deg.toFixed(1)}°`;
      } else {
        document.getElementById('sim-h-snell').textContent = 'Reflexión Interna Total';
      }

      document.getElementById('val-h-th1').textContent = `${s.theta1}°`;
      document.getElementById('val-h-v2').textContent = `${s.v2.toFixed(1)} m/s`;

      document.getElementById('metrics-sim-h').innerHTML = `
        <div class="metric-chip">v₁ = <strong>${s.v1.toFixed(1)} m/s</strong> | v₂ = <strong>${s.v2.toFixed(1)} m/s</strong></div>
        <div class="metric-chip">Razón λ₂/λ₁ = <strong>${(s.v2 / s.v1).toFixed(2)}</strong></div>
      `;
    };

    document.getElementById('ctrl-h-th1').oninput = (e) => { s.theta1 = parseFloat(e.target.value); updateSnell(); };
    document.getElementById('ctrl-h-v2').oninput = (e) => { s.v2 = parseFloat(e.target.value); updateSnell(); };
    updateSnell();

    document.getElementById('btn-expand-h').onclick = () => {
      this.openExpandedModal("Simulación H: Reflexión y Refracción de Ondas (Vista Ampliada)", (mCanvas) => {
        const mCtx = mCanvas.getContext('2d');
        const modalLoop = () => {
          this.drawSimHFrame(mCtx, mCanvas.width, mCanvas.height, s);
          this.modalAnimationFrameId = requestAnimationFrame(modalLoop);
        };
        modalLoop();
      });
    };

    let lastTime = performance.now();
    const loop = (now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      if (s.isRunning) s.t += dt;

      this.drawSimHFrame(ctx, canvas.width, canvas.height, s);
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  drawSimHFrame(ctx, w, h, s) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();

    ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
    ctx.fillRect(0, 0, cx, h);
    ctx.fillStyle = 'rgba(168, 85, 247, 0.08)';
    ctx.fillRect(cx, 0, w - cx, h);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px Inter, sans-serif';
    ctx.fillText('Medio 1 (v₁ = 3.0 m/s)', 30, 30);
    ctx.fillText(`Medio 2 (v₂ = ${s.v2.toFixed(1)} m/s)`, cx + 30, 30);

    const cy = h / 2;
    ctx.strokeStyle = '#475569';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(cx - 120, cy); ctx.lineTo(cx + 120, cy); ctx.stroke();
    ctx.setLineDash([]);

    const th1Rad = (s.theta1 * Math.PI) / 180;
    const sinTh2 = (s.v2 / s.v1) * Math.sin(th1Rad);

    const rLen = h * 0.35;
    const inX = cx - rLen * Math.cos(th1Rad);
    const inY = cy - rLen * Math.sin(th1Rad);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(inX, inY); ctx.lineTo(cx, cy); ctx.stroke();

    const refX = cx - rLen * Math.cos(th1Rad);
    const refY = cy + rLen * Math.sin(th1Rad);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(refX, refY); ctx.stroke();

    if (sinTh2 <= 1) {
      const th2Rad = Math.asin(sinTh2);
      const outX = cx + rLen * Math.cos(th2Rad);
      const outY = cy + rLen * Math.sin(th2Rad);
      ctx.strokeStyle = '#34d399';
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(outX, outY); ctx.stroke();
    }
  }

  // ================= SIM I: EXPERIMENTO DE YOUNG =================
  mountSimI(stage) {
    const s = this.states['sim-i'];
    stage.innerHTML = `
      <div class="sim-grid">
        <div class="sim-canvas-box">
          <div class="sim-header-actions-bar">
            <div class="sim-header-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/></svg>
              <span>Simulación I: Doble Rendija de Young</span>
            </div>
            <button type="button" class="btn-open-expanded-modal-trigger" id="btn-expand-i" title="Abrir en ventana modal grande colapsable">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              <span>Ver en Ventana Modal Grande</span>
            </button>
          </div>
          <canvas id="sim-canvas-i" width="800" height="400"></canvas>
          <div class="sim-floating-hud">
            <span>Separación entre Franjas Δy: <strong id="sim-i-deltay">3.80 mm</strong></span>
          </div>
        </div>
        <div class="sim-controls-panel">
          <h4>Interferencia de la Doble Rendija de Young</h4>
          <p class="sim-desc">Ajusta la longitud de onda $\\lambda$, la separación de rendijas $d$ y la distancia a la pantalla $L$.</p>
          
          <div class="sim-ctrl-group">
            <label>Longitud de Onda λ: <strong id="val-i-lambda">${s.lambdaNm.toFixed(1)} nm</strong></label>
            <input type="range" id="ctrl-i-lambda" min="400" max="700" step="5" value="${s.lambdaNm}">
          </div>

          <div class="sim-ctrl-group">
            <label>Separación Rendijas d: <strong id="val-i-d">${s.dMm.toFixed(2)} mm</strong></label>
            <input type="range" id="ctrl-i-d" min="0.10" max="0.50" step="0.02" value="${s.dMm}">
          </div>

          <div class="sim-metrics-box" id="metrics-sim-i"></div>
        </div>
      </div>
    `;

    const canvas = document.getElementById('sim-canvas-i');
    const ctx = canvas.getContext('2d');

    const updateYoung = () => {
      const lambdaM = s.lambdaNm * 1e-9;
      const dM = s.dMm * 1e-3;
      const deltaYM = (lambdaM * s.LM) / dM;
      const deltaYMm = deltaYM * 1e3;

      document.getElementById('val-i-lambda').textContent = `${s.lambdaNm.toFixed(0)} nm`;
      document.getElementById('val-i-d').textContent = `${s.dMm.toFixed(2)} mm`;
      document.getElementById('sim-i-deltay').textContent = `${deltaYMm.toFixed(2)} mm`;

      document.getElementById('metrics-sim-i').innerHTML = `
        <div class="metric-chip">Δy = λL/d = <strong>${deltaYMm.toFixed(2)} mm</strong></div>
        <div class="metric-chip">Color: <strong>${s.lambdaNm > 620 ? 'Rojo' : s.lambdaNm > 520 ? 'Verde' : 'Azul'}</strong></div>
      `;
    };

    document.getElementById('ctrl-i-lambda').oninput = (e) => { s.lambdaNm = parseFloat(e.target.value); updateYoung(); };
    document.getElementById('ctrl-i-d').oninput = (e) => { s.dMm = parseFloat(e.target.value); updateYoung(); };
    updateYoung();

    document.getElementById('btn-expand-i').onclick = () => {
      this.openExpandedModal("Simulación I: Doble Rendija de Young (Vista Ampliada)", (mCanvas) => {
        const mCtx = mCanvas.getContext('2d');
        const modalLoop = () => {
          this.drawSimIFrame(mCtx, mCanvas.width, mCanvas.height, s);
          this.modalAnimationFrameId = requestAnimationFrame(modalLoop);
        };
        modalLoop();
      });
    };

    const loop = () => {
      this.drawSimIFrame(ctx, canvas.width, canvas.height, s);
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  drawSimIFrame(ctx, w, h, s) {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    const xSlit = w * 0.18;
    ctx.fillStyle = '#334155';
    ctx.fillRect(xSlit - 4, 0, 8, h);

    const cy = h / 2;
    const slitDistPx = s.dMm * 80;
    ctx.clearRect(xSlit - 4, cy - slitDistPx / 2 - 4, 8, 8);
    ctx.clearRect(xSlit - 4, cy + slitDistPx / 2 - 4, 8, 8);

    const xScreen = w - 60;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(xScreen, 20, 10, h - 40);

    let rayColor = '#f43f5e';
    if (s.lambdaNm < 490) rayColor = '#3b82f6';
    else if (s.lambdaNm < 580) rayColor = '#10b981';

    const scaleFringes = 6.0;
    for (let y = 20; y < h - 20; y++) {
      const distMm = (y - cy) / scaleFringes;
      const beta = (Math.PI * s.dMm * distMm) / (s.lambdaNm * 1e-6 * s.LM * 1e3);
      const intensity = Math.pow(Math.cos(beta), 2);

      ctx.fillStyle = rayColor;
      ctx.globalAlpha = intensity;
      ctx.fillRect(xScreen - 35, y, 32, 1);
    }
    ctx.globalAlpha = 1.0;

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText('Doble Rendija', xSlit - 40, cy - slitDistPx / 2 - 18);
    ctx.fillText('Pantalla de Interferencia', xScreen - 120, h - 10);
  }
}
