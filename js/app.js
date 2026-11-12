/**
 * Aplicación Principal de Movimiento Ondulatorio y Principio de Superposición
 * Controla el ciclo de animación, estado, sincronización entre vistas,
 * eventos de UI, paleta de estilos, experiencia didáctica y teclado virtual.
 */

import { MathEngine } from './math-engine.js';
import { WaveComponent, WaveStore } from './wave-model.js';
import { GraphRenderer } from './graph-renderer.js';
import { VirtualKeyboard } from './virtual-keyboard.js';
import { DIDACTIC_PRESETS } from './didactic-presets.js';

export class WaveApp {
  constructor() {
    this.waveStore = new WaveStore();
    this.time = 0;
    this.isPlaying = false;
    this.playbackSpeed = 1.0;
    this.lastFrameTime = performance.now();

    // Referencias DOM principales
    this.mainCanvas = null;
    this.modalCanvas = null;
    this.expandedModal = null;
    this.styleModal = null;
    this.didacticDrawer = null;

    // Inicializar renderizadores gráficos
    this.mainRenderer = null;
    this.modalRenderer = null;

    // Teclado virtual
    this.virtualKeyboard = new VirtualKeyboard({
      onInputChange: (input) => {
        this.handleEquationInputChange(input);
      }
    });

    // Estado del modal ampliado
    this.modalState = 'normal'; // 'normal' | 'maximized' | 'minimized'

    if (document.getElementById('main-canvas')) {
      this.mount();
    }
    this.initDefaultWaves();
  }

  mount() {
    this.mainCanvas = document.getElementById('main-canvas');
    this.modalCanvas = document.getElementById('modal-canvas');
    this.expandedModal = document.getElementById('expanded-modal');
    this.styleModal = document.getElementById('style-modal');
    this.didacticDrawer = document.getElementById('didactic-drawer');

    if (!this.mainCanvas) return;

    // Crear nuevos renderers apuntando al canvas actual del DOM
    this.mainRenderer = new GraphRenderer(this.mainCanvas);
    if (this.modalCanvas) {
      this.modalRenderer = new GraphRenderer(this.modalCanvas);
    }

    this.setupUIListeners();
    this.setupDropdown();

    // Reiniciar el loop para que apunte al canvas nuevo (evita canvas muertos)
    this._renderLoopRunning = false;
    this.setupRenderLoop();

    this.renderWaveCards();
    this.populatePresets();
    this.updateTimeDisplay();

    // Render inicial con reintentos para garantizar dimensiones reales del canvas
    const tryInitialRender = (attempts) => {
      if (!this.mainRenderer) return;
      this.mainRenderer.resize();
      const b = this.mainRenderer.getBounds();
      if (b.width === 0 && attempts > 0) {
        // Canvas aún sin dimensiones — reintentar después de otro frame de layout
        requestAnimationFrame(() => tryInitialRender(attempts - 1));
        return;
      }
      this.mainRenderer.autoFit(this.waveStore.waves);
      if (this.modalRenderer) this.modalRenderer.resize();
      this.render();
    };

    // Doble rAF: primer frame = layout, segundo frame = pintado con dimensiones reales
    requestAnimationFrame(() => requestAnimationFrame(() => tryInitialRender(5)));
  }

  initDefaultWaves() {
    // Escenario inicial predeterminado: Interferencia Constructiva de 2 pulsos
    const preset = DIDACTIC_PRESETS[0];
    this.loadPreset(preset, false);
  }

  // ================= ANIMACIÓN Y TIEMPO =================

  setupRenderLoop() {
    if (this._renderLoopRunning) return;
    this._renderLoopRunning = true;

    const loop = (now) => {
      if (!this._renderLoopRunning) return; // Permite cancelar cuando se re-monta
      const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
      this.lastFrameTime = now;

      if (this.isPlaying) {
        this.time += dt * this.playbackSpeed;
        this.updateTimeDisplay();
        this.updateInspectorReadout();
      }

      this.render();
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  render() {
    if (!this.mainCanvas || !document.contains(this.mainCanvas) || !this.mainRenderer) return;

    // Renderiza el lienzo principal
    this.mainRenderer.render(this.waveStore, this.time);

    // Si el modal está abierto, sincroniza la vista y renderiza el modal
    if (this.isModalOpen && this.modalState !== 'minimized' && this.modalRenderer) {
      this.modalRenderer.render(this.waveStore, this.time);
    }
  }

  pause() {
    this.isPlaying = false;
    this.updatePlayPauseButtons();
  }

  play() {
    this.isPlaying = true;
    this.updatePlayPauseButtons();
  }

  pause() {
    this.isPlaying = false;
    this.updatePlayPauseButtons();
  }

  togglePlay() {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  resetTime() {
    this.time = 0;
    this.updateTimeDisplay();
    this.updateInspectorReadout();
    this.render();
  }

  step(direction = 1) {
    this.pause();
    const dt = 0.05;
    this.time = Math.max(0, this.time + direction * dt);
    this.updateTimeDisplay();
    this.updateInspectorReadout();
    this.render();
  }

  setTime(newTime) {
    this.time = Math.max(0, newTime);
    this.updateTimeDisplay();
    this.updateInspectorReadout();
    this.render();
  }

  updateTimeDisplay() {
    const formatted = this.time.toFixed(2);
    document.querySelectorAll('.time-value-display').forEach(el => {
      el.textContent = `${formatted} s`;
    });
    const scrubber = document.getElementById('time-scrubber');
    if (scrubber && document.activeElement !== scrubber) {
      scrubber.value = this.time % 20; // Rango circular de 0 a 20s
    }
    const modalScrubber = document.getElementById('modal-time-scrubber');
    if (modalScrubber && document.activeElement !== modalScrubber) {
      modalScrubber.value = this.time % 20;
    }
  }

  updatePlayPauseButtons() {
    const iconPlay = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      <span>Reproducir</span>
    `;
    const iconPause = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
      <span>Pausar</span>
    `;

    document.querySelectorAll('.btn-play-toggle').forEach(btn => {
      btn.innerHTML = this.isPlaying ? iconPause : iconPlay;
      btn.setAttribute('aria-label', this.isPlaying ? 'Pausar simulación' : 'Reproducir simulación');
    });
  }

  // ================= SINCRONIZACIÓN DE LA VENTANA MODAL =================

  openExpandedModal() {
    this.isModalOpen = true;
    this.modalState = 'normal';
    this.expandedModal.classList.remove('hidden', 'minimized', 'maximized');
    document.body.classList.add('modal-open');

    // Sincronizar parámetros geométricos de vista
    this.modalRenderer.scaleX = this.mainRenderer.scaleX;
    this.modalRenderer.scaleY = this.mainRenderer.scaleY;
    this.modalRenderer.originX = this.mainRenderer.originX;
    this.modalRenderer.originY = this.mainRenderer.originY;
    this.modalRenderer.style = { ...this.mainRenderer.style };
    this.modalRenderer.inspectorActive = this.mainRenderer.inspectorActive;

    setTimeout(() => {
      this.modalRenderer.resize();
      this.render();
      const closeBtn = document.getElementById('btn-close-modal');
      if (closeBtn) closeBtn.focus();
    }, 50);
  }

  closeExpandedModal() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    this.isModalOpen = false;
    this.modalState = 'normal';
    this.expandedModal.classList.add('hidden');
    document.body.classList.remove('modal-open');

    // Sincronizar de vuelta al visor principal
    this.mainRenderer.scaleX = this.modalRenderer.scaleX;
    this.mainRenderer.scaleY = this.modalRenderer.scaleY;
    this.mainRenderer.originX = this.modalRenderer.originX;
    this.mainRenderer.originY = this.modalRenderer.originY;

    // Devolver foco al botón de apertura
    const openBtn = document.getElementById('btn-open-expanded-modal');
    if (openBtn) openBtn.focus();

    this.mainRenderer.resize();
    this.render();
  }

  maximizeModal() {
    if (this.modalState === 'maximized') {
      this.modalState = 'normal';
      this.expandedModal.classList.remove('maximized');
    } else {
      this.modalState = 'maximized';
      this.expandedModal.classList.remove('minimized');
      this.expandedModal.classList.add('maximized');
    }
    setTimeout(() => {
      this.modalRenderer.resize();
      this.render();
    }, 60);
  }

  minimizeModal() {
    if (this.modalState === 'minimized') {
      this.modalState = 'normal';
      this.expandedModal.classList.remove('minimized');
    } else {
      this.modalState = 'minimized';
      this.expandedModal.classList.remove('maximized');
      this.expandedModal.classList.add('minimized');
    }
    setTimeout(() => {
      this.modalRenderer.resize();
      this.render();
    }, 60);
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.expandedModal.requestFullscreen().catch(err => {
        console.warn('Error solicitando pantalla completa:', err);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  // ================= GESTIÓN DE ONDAS Y TARJETAS UI =================

  renderWaveCards() {
    const listEl = document.getElementById('waves-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    this.updateWavesCountBadge();

    this.waveStore.waves.forEach((wave, idx) => {
      const card = document.createElement('div');
      card.className = 'wave-card';
      card.id = `wave-card-${wave.id}`;
      card.style.borderLeftColor = wave.color;

      const isValid = wave.compiled && wave.compiled.valid;

      card.innerHTML = `
        <div class="wave-card-header">
          <div class="wave-card-title-group">
            <span class="wave-color-indicator" style="background-color: ${wave.color};"></span>
            <input type="text" class="wave-title-input" value="${wave.name}" data-id="${wave.id}" aria-label="Nombre de la onda">
          </div>
          <div class="wave-card-quick-actions">
            <!-- Botón Teclado Virtual para esta onda -->
            <button type="button" class="btn-icon btn-open-vk" data-id="${wave.id}" title="Abrir teclado matemático para esta onda">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/>
              </svg>
            </button>
            <!-- Botón Eliminar onda -->
            <button type="button" class="btn-icon btn-delete-wave" data-id="${wave.id}" title="Eliminar onda">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="wave-equation-row">
          <label class="input-label" for="expr-input-${wave.id}">Ecuación y(x, t):</label>
          <div class="input-with-tools">
            <input type="text" id="expr-input-${wave.id}" class="wave-expr-input ${!isValid ? 'has-error' : ''}" 
                   value="${wave.rawExpr}" data-id="${wave.id}" placeholder="ej: 2 * sen(x - v*t)" autocomplete="off" spellcheck="false">
          </div>
          ${!isValid ? `<div class="equation-error-msg">${wave.compiled?.error || 'Sintaxis inválida'}</div>` : ''}
          <div class="katex-preview" id="katex-preview-${wave.id}"></div>
        </div>

        <div class="wave-params-grid">
          <!-- Velocidad v con indicador de sentido -->
          <div class="param-item">
            <label class="param-label" for="v-input-${wave.id}">
              <span>Velocidad v (m/s):</span>
              <span class="v-dir-badge">${wave.v > 0 ? '&rarr; Derecha' : (wave.v < 0 ? '&larr; Izquierda' : 'Estacionaria')}</span>
            </label>
            <div class="v-control-group">
              <input type="number" id="v-input-${wave.id}" class="v-number-input" step="0.5" value="${wave.v}" data-id="${wave.id}">
              <button type="button" class="btn-invert-v" data-id="${wave.id}" title="Invertir dirección de propagación">
                &rlarr; Invertir
              </button>
            </div>
          </div>
        </div>

        <!-- INTERRUPTORES TOGGLE CLAVE -->
        <div class="wave-toggles-row">
          <!-- Toggle 1: Visible en gráfico -->
          <label class="toggle-control" title="Mostrar u ocultar la curva de esta onda en el plano">
            <input type="checkbox" class="toggle-visible" data-id="${wave.id}" ${wave.visible ? 'checked' : ''}>
            <span class="toggle-switch"></span>
            <span class="toggle-label-text">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Ver Curva
            </span>
          </label>

          <!-- Toggle 2: Incluir en Suma de Superposición (∑) -->
          <label class="toggle-control" title="Incluir o excluir esta onda de la suma de superposición resultante">
            <input type="checkbox" class="toggle-insum" data-id="${wave.id}" ${wave.inSum ? 'checked' : ''}>
            <span class="toggle-switch sum-switch"></span>
            <span class="toggle-label-text">
              <strong style="font-size: 1.1em;">&sum;</strong>
              Sumar a Resultante
            </span>
          </label>
        </div>
      `;

      listEl.appendChild(card);
      // Renderizar KaTeX con retry si la librería carga diferido
      this.renderKaTeXForWave(wave);
    });

    this.bindCardEvents();
    this.updateInspectorReadout();
    this.updateWavesCountBadge();

    // Si KaTeX no estaba listo, reintentar después de cargarse
    if (!window.katex) {
      const retryKatex = () => {
        if (window.katex) {
          this.waveStore.waves.forEach(w => this.renderKaTeXForWave(w));
        } else {
          setTimeout(retryKatex, 200);
        }
      };
      setTimeout(retryKatex, 300);
    }
  }

  renderKaTeXForWave(wave) {
    const el = document.getElementById(`katex-preview-${wave.id}`);
    if (!el) return;

    if (window.katex) {
      try {
        // Nombre limpio para subscript: usar número de índice
        const idx = this.waveStore.waves.indexOf(wave) + 1;
        const latex = `y_{${idx}}(x,\\,t) = ${wave.compiled?.latex || wave.rawExpr}`;
        el.innerHTML = '';
        window.katex.render(latex, el, {
          throwOnError: false,
          displayMode: false,
          strict: false
        });
      } catch (err) {
        el.textContent = `y(x,t) = ${wave.rawExpr}`;
      }
    } else {
      el.textContent = `y(x,t) = ${wave.rawExpr}`;
    }
  }

  updateWavesCountBadge() {
    const badge = document.getElementById('waves-count-badge');
    if (!badge) return;
    const n = this.waveStore.waves.length;
    badge.textContent = `${n} onda${n !== 1 ? 's' : ''}`;
  }

  bindCardEvents() {
    // Inputs de expresión
    document.querySelectorAll('.wave-expr-input').forEach(input => {
      input.addEventListener('input', (e) => {
        this.handleEquationInputChange(e.target);
      });
      input.addEventListener('focus', (e) => {
        const waveId = e.target.getAttribute('data-id');
        const wave = this.waveStore.getWave(waveId);
        if (wave) {
          this.virtualKeyboard.attachTo(e.target, `Editando ${wave.name}`);
        }
      });
    });

    // Abrir teclado virtual con botón dedicado
    document.querySelectorAll('.btn-open-vk').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const waveId = btn.getAttribute('data-id');
        const input = document.getElementById(`expr-input-${waveId}`);
        const wave = this.waveStore.getWave(waveId);
        if (input && wave) {
          this.virtualKeyboard.attachTo(input, `Editando ${wave.name}`);
          input.focus();
        }
      });
    });

    // Eliminar onda
    document.querySelectorAll('.btn-delete-wave').forEach(btn => {
      btn.addEventListener('click', () => {
        const waveId = btn.getAttribute('data-id');
        if (this.waveStore.waves.length <= 1) {
          alert('Debe existir al menos una onda en la simulación.');
          return;
        }
        this.waveStore.removeWave(waveId);
        this.renderWaveCards();
        this.render();
      });
    });

    // Nombres de onda
    document.querySelectorAll('.wave-title-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const waveId = e.target.getAttribute('data-id');
        const wave = this.waveStore.getWave(waveId);
        if (wave) {
          wave.name = e.target.value.trim() || 'Onda';
          this.renderKaTeXForWave(wave);
          this.updateInspectorReadout();
        }
      });
    });

    // Velocidad v
    document.querySelectorAll('.v-number-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const waveId = e.target.getAttribute('data-id');
        const wave = this.waveStore.getWave(waveId);
        if (wave) {
          wave.v = parseFloat(e.target.value) || 0;
          this.updateVBadge(waveId, wave.v);
          this.render();
        }
      });
    });

    // Invertir sentido de propagación
    document.querySelectorAll('.btn-invert-v').forEach(btn => {
      btn.addEventListener('click', () => {
        const waveId = btn.getAttribute('data-id');
        const wave = this.waveStore.getWave(waveId);
        if (wave) {
          wave.v = -wave.v;
          const input = document.getElementById(`v-input-${waveId}`);
          if (input) input.value = wave.v;
          this.updateVBadge(waveId, wave.v);
          this.render();
        }
      });
    });

    // Toggles de Visibilidad
    document.querySelectorAll('.toggle-visible').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const waveId = e.target.getAttribute('data-id');
        const wave = this.waveStore.getWave(waveId);
        if (wave) {
          wave.visible = e.target.checked;
          this.render();
          this.updateInspectorReadout();
        }
      });
    });

    // Toggles de Inclusión en la Suma (∑)
    document.querySelectorAll('.toggle-insum').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const waveId = e.target.getAttribute('data-id');
        const wave = this.waveStore.getWave(waveId);
        if (wave) {
          wave.inSum = e.target.checked;
          this.render();
          this.updateInspectorReadout();
        }
      });
    });
  }

  updateVBadge(waveId, v) {
    const card = document.getElementById(`wave-card-${waveId}`);
    if (!card) return;
    const badge = card.querySelector('.v-dir-badge');
    if (badge) {
      badge.innerHTML = v > 0 ? '&rarr; Derecha' : (v < 0 ? '&larr; Izquierda' : 'Estacionaria');
    }
  }

  handleEquationInputChange(input) {
    const waveId = input.getAttribute('data-id');
    const wave = this.waveStore.getWave(waveId);
    if (!wave) return;

    wave.setExpression(input.value);

    const card = document.getElementById(`wave-card-${waveId}`);
    const errorEl = card ? card.querySelector('.equation-error-msg') : null;

    if (wave.compiled.valid) {
      input.classList.remove('has-error');
      if (errorEl) errorEl.remove();
    } else {
      input.classList.add('has-error');
      if (!errorEl && card) {
        const msg = document.createElement('div');
        msg.className = 'equation-error-msg';
        msg.textContent = wave.compiled.error || 'Error matemático';
        input.parentElement.after(msg);
      } else if (errorEl) {
        errorEl.textContent = wave.compiled.error || 'Error matemático';
      }
    }

    this.renderKaTeXForWave(wave);
    this.render();
    this.updateInspectorReadout();
  }

  addNewWave() {
    const count = this.waveStore.waves.length + 1;
    const wave = this.waveStore.addWave({
      name: `Onda ${count}`,
      rawExpr: '2 * sen(x - v*t)',
      v: 2.0,
      lineWidth: 2.5,
      visible: true,
      inSum: true,
      showVector: true
    });

    this.renderWaveCards();
    this.render();

    // Enfocar y abrir teclado en la nueva onda
    setTimeout(() => {
      const input = document.getElementById(`expr-input-${wave.id}`);
      if (input) {
        input.focus();
        this.virtualKeyboard.attachTo(input, `Editando ${wave.name}`);
        input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 50);
  }

  // ================= EXPERIENCIA DIDÁCTICA Y PRESETS =================

  populatePresets() {
    const container = document.getElementById('presets-cards-container');
    if (!container) return;

    container.innerHTML = '';

    DIDACTIC_PRESETS.forEach((preset, index) => {
      const card = document.createElement('div');
      card.className = 'preset-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');

      card.innerHTML = `
        <div class="preset-card-header">
          <span class="preset-badge ${preset.badgeClass}">${preset.badge}</span>
          <h4 class="preset-title">${preset.title}</h4>
        </div>
        <p class="preset-desc">${preset.subtitle}</p>
      `;

      card.addEventListener('click', () => {
        this.loadPreset(preset, true);
        // Resaltar preset activo
        container.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });

      container.appendChild(card);
    });
  }

  loadPreset(preset, animateTransition = true) {
    this.waveStore.clear();

    preset.waves.forEach(w => {
      this.waveStore.addWave({ ...w });
    });

    this.time = preset.initialTime || 0;
    this.playbackSpeed = preset.timeScale || 1.0;
    const speedSelect = document.getElementById('playback-speed');
    if (speedSelect) speedSelect.value = String(this.playbackSpeed);

    // Actualizar Panel de Didáctica
    const infoTitle = document.getElementById('didactic-info-title');
    const infoText = document.getElementById('didactic-info-text');
    const questionsList = document.getElementById('didactic-questions-list');

    if (infoTitle) infoTitle.textContent = preset.title;
    if (infoText) infoText.textContent = preset.explanation;
    if (questionsList) {
      questionsList.innerHTML = preset.guidingQuestions
        .map(q => `<li><strong>Pregunta orientadora:</strong> ${q}</li>`)
        .join('');
    }

    this.renderWaveCards();
    this.updateTimeDisplay();
    if (this.mainRenderer) {
      this.mainRenderer.autoFit(this.waveStore.waves);
    }
    if (this.isModalOpen && this.modalRenderer) {
      this.modalRenderer.autoFit(this.waveStore.waves);
    }
    this.render();
  }

  // ================= SONDA DE INSPECCIÓN PUNTO A PUNTO =================

  toggleInspector() {
    if (!this.mainRenderer) return;
    const nextState = !this.mainRenderer.inspectorActive;
    this.mainRenderer.inspectorActive = nextState;
    if (this.modalRenderer) {
      this.modalRenderer.inspectorActive = nextState;
    }

    document.querySelectorAll('.btn-toggle-inspector').forEach(btn => {
      btn.classList.toggle('active', nextState);
    });

    const overlay = document.getElementById('inspector-floating-overlay');
    if (overlay) {
      overlay.classList.toggle('hidden', !nextState);
    }

    this.updateInspectorReadout();
    this.render();
  }

  updateInspectorReadout() {
    if (!this.mainRenderer || !this.mainRenderer.inspectorActive) return;

    const x0 = this.mainRenderer.inspectorX !== null ? this.mainRenderer.inspectorX : 0;
    const data = this.waveStore.inspectAt(x0, this.time);

    const xLabel = document.getElementById('inspector-x-val');
    const tLabel = document.getElementById('inspector-t-val');
    const resLabel = document.getElementById('inspector-res-val');
    const compsList = document.getElementById('inspector-components-table');

    if (xLabel) xLabel.textContent = x0.toFixed(2);
    if (tLabel) tLabel.textContent = this.time.toFixed(2);
    if (resLabel) resLabel.textContent = data.resultantValue.toFixed(3);

    if (compsList) {
      compsList.innerHTML = data.components.map(c => `
        <div class="inspector-comp-row ${!c.inSum ? 'excluded-sum' : ''}">
          <span class="inspector-dot" style="background-color: ${c.color};"></span>
          <span class="inspector-name">${c.name}:</span>
          <span class="inspector-val">${c.value.toFixed(3)} m</span>
          ${!c.inSum ? '<span class="tag-excluded">Excluida de ∑</span>' : ''}
        </div>
      `).join('');
    }
  }

  // ================= EXPORTACIÓN E IMPORTACIÓN =================

  exportJSON() {
    const data = this.waveStore.toJSON();
    data.time = this.time;
    data.playbackSpeed = this.playbackSpeed;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulacion_ondas_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importJSON() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const json = JSON.parse(ev.target.result);
          this.waveStore.loadJSON(json);
          if (json.time !== undefined) this.time = json.time;
          if (json.playbackSpeed !== undefined) this.playbackSpeed = json.playbackSpeed;
          this.renderWaveCards();
          this.updateTimeDisplay();
          this.render();
        } catch (err) {
          alert('Error al importar archivo: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    fileInput.click();
  }

  exportPNG() {
    const renderer = this.isModalOpen ? this.modalRenderer : this.mainRenderer;
    const dataURL = renderer.exportImage('image/png');
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `grafico_superposicion_ondas_${Date.now()}.png`;
    a.click();
  }

  // ================= LISTENERS DE UI GENERALES =================

  setupUIListeners() {
    // Botones de Play / Pausa
    document.querySelectorAll('.btn-play-toggle').forEach(btn => {
      btn.addEventListener('click', () => this.togglePlay());
    });

    // Botones de Reset
    document.querySelectorAll('.btn-reset-time').forEach(btn => {
      btn.addEventListener('click', () => this.resetTime());
    });

    // Botones de Paso a Paso
    document.querySelectorAll('.btn-step-prev').forEach(btn => {
      btn.addEventListener('click', () => this.step(-1));
    });
    document.querySelectorAll('.btn-step-next').forEach(btn => {
      btn.addEventListener('click', () => this.step(1));
    });

    // Scrubber de tiempo
    const scrubber = document.getElementById('time-scrubber');
    if (scrubber) {
      scrubber.addEventListener('input', (e) => {
        this.setTime(parseFloat(e.target.value));
      });
    }
    const modalScrubber = document.getElementById('modal-time-scrubber');
    if (modalScrubber) {
      modalScrubber.addEventListener('input', (e) => {
        this.setTime(parseFloat(e.target.value));
      });
    }

    // Selector de velocidad
    const speedSelect = document.getElementById('playback-speed');
    if (speedSelect) {
      speedSelect.addEventListener('change', (e) => {
        this.playbackSpeed = parseFloat(e.target.value) || 1.0;
      });
    }

    // Botón Agregar Onda
    const addWaveBtn = document.getElementById('btn-add-wave');
    if (addWaveBtn) {
      addWaveBtn.addEventListener('click', () => this.addNewWave());
    }

    // Botón Abrir Teclado Virtual flotante
    const openVkBtn = document.getElementById('btn-toggle-keyboard');
    if (openVkBtn) {
      openVkBtn.addEventListener('click', () => this.virtualKeyboard.toggle());
    }

    // HUD GeoGebra: Zoom In, Zoom Out, Reset View, Auto Fit
    document.querySelectorAll('.btn-hud-zoom-in').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = this.isModalOpen ? this.modalRenderer : this.mainRenderer;
        r.zoomIn();
        this.render();
      });
    });

    document.querySelectorAll('.btn-hud-zoom-out').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = this.isModalOpen ? this.modalRenderer : this.mainRenderer;
        r.zoomOut();
        this.render();
      });
    });

    document.querySelectorAll('.btn-hud-reset-view').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = this.isModalOpen ? this.modalRenderer : this.mainRenderer;
        r.resetView();
        this.render();
      });
    });

    document.querySelectorAll('.btn-hud-autofit').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = this.isModalOpen ? this.modalRenderer : this.mainRenderer;
        r.autoFit(this.waveStore.waves);
        this.render();
      });
    });

    // Inspector Sonda
    document.querySelectorAll('.btn-toggle-inspector').forEach(btn => {
      btn.addEventListener('click', () => this.toggleInspector());
    });

    // Modal Ampliado
    const openModalBtn = document.getElementById('btn-open-expanded-modal');
    if (openModalBtn) {
      openModalBtn.addEventListener('click', () => this.openExpandedModal());
    }

    const closeModalBtn = document.getElementById('btn-close-modal');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => this.closeExpandedModal());
    }

    const maxModalBtn = document.getElementById('btn-maximize-modal');
    if (maxModalBtn) {
      maxModalBtn.addEventListener('click', () => this.maximizeModal());
    }

    const minModalBtn = document.getElementById('btn-minimize-modal');
    if (minModalBtn) {
      minModalBtn.addEventListener('click', () => this.minimizeModal());
    }

    const fsModalBtn = document.getElementById('btn-fullscreen-modal');
    if (fsModalBtn) {
      fsModalBtn.addEventListener('click', () => this.toggleFullscreen());
    }

    // Modal de Estilos
    const openStyleBtn = document.getElementById('btn-open-styles');
    if (openStyleBtn) {
      openStyleBtn.addEventListener('click', () => {
        this.syncStyleForm();
        this.styleModal.classList.remove('hidden');
      });
    }

    const closeStyleBtn = document.getElementById('btn-close-styles');
    if (closeStyleBtn) {
      closeStyleBtn.addEventListener('click', () => {
        this.styleModal.classList.add('hidden');
      });
    }

    // Paleta de Estilos Inputs
    this.setupStyleInputs();

    // Exportar / Importar
    const exportJsonBtn = document.getElementById('btn-export-json');
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', () => this.exportJSON());

    const importJsonBtn = document.getElementById('btn-import-json');
    if (importJsonBtn) importJsonBtn.addEventListener('click', () => this.importJSON());

    const exportPngBtn = document.getElementById('btn-export-png');
    if (exportPngBtn) exportPngBtn.addEventListener('click', () => this.exportPNG());

    // Tecla Escape para cerrar modales y teclado
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!this.styleModal.classList.contains('hidden')) {
          this.styleModal.classList.add('hidden');
        } else if (this.virtualKeyboard.visible) {
          this.virtualKeyboard.hide();
        } else if (this.isModalOpen) {
          this.closeExpandedModal();
        }
      } else if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        this.togglePlay();
      } else if ((e.key === 'i' || e.key === 'I') && e.target.tagName !== 'INPUT') {
        this.toggleInspector();
      }
    });

    // Resize de ventana para ambos lienzos
    window.addEventListener('resize', () => {
      this.mainRenderer.resize();
      if (this.isModalOpen) this.modalRenderer.resize();
      this.render();
    });

    // Clic fuera del modal de estilos para cerrarlo
    this.styleModal.addEventListener('click', (e) => {
      if (e.target === this.styleModal) {
        this.styleModal.classList.add('hidden');
      }
    });

    // Clic fuera del modal ampliado para cerrarlo (solo en el backdrop)
    this.expandedModal.addEventListener('click', (e) => {
      if (e.target === this.expandedModal) {
        this.closeExpandedModal();
      }
    });
  }

  // ================= DROPDOWN DE MENÚ ARCHIVOS =================
  setupDropdown() {
    const menuBtn = document.getElementById('btn-menu-io');
    const dropdownMenu = document.getElementById('dropdown-io');
    if (!menuBtn || !dropdownMenu) return;

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdownMenu.style.display === 'flex';
      dropdownMenu.style.display = isOpen ? 'none' : 'flex';
      menuBtn.setAttribute('aria-expanded', String(!isOpen));
    });

    // Cerrar al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!menuBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.style.display = 'none';
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Cerrar al seleccionar una opción
    dropdownMenu.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        dropdownMenu.style.display = 'none';
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ================= CONFIGURACIÓN DE LA PALETA DE ESTILOS =================

  syncStyleForm() {
    const s = this.mainRenderer.style;
    const res = this.waveStore.resultantStyle;

    const bgSelect = document.getElementById('style-bg-preset');
    if (bgSelect) bgSelect.value = s.theme;

    const axisColor = document.getElementById('style-axis-color');
    if (axisColor) axisColor.value = s.axisColor;

    const axisWidth = document.getElementById('style-axis-width');
    if (axisWidth) axisWidth.value = s.axisWidth;

    const showMajor = document.getElementById('style-show-major-grid');
    if (showMajor) showMajor.checked = s.showMajorGrid;

    const showMinor = document.getElementById('style-show-minor-grid');
    if (showMinor) showMinor.checked = s.showMinorGrid;

    const majorColor = document.getElementById('style-major-grid-color');
    if (majorColor) majorColor.value = s.majorGridColor;

    const minorColor = document.getElementById('style-minor-grid-color');
    if (minorColor) minorColor.value = s.minorGridColor;

    const fontSize = document.getElementById('style-font-size');
    if (fontSize) fontSize.value = s.fontSize;

    const showVectors = document.getElementById('style-show-vectors');
    if (showVectors) showVectors.checked = s.showVectors;

    // Estilo de la Resultante
    const resColor = document.getElementById('style-res-color');
    if (resColor) resColor.value = res.color;

    const resWidth = document.getElementById('style-res-width');
    if (resWidth) resWidth.value = res.lineWidth;

    const resGlow = document.getElementById('style-res-glow');
    if (resGlow) resGlow.checked = res.glow;
  }

  setupStyleInputs() {
    const applyToBoth = (fn) => {
      fn(this.mainRenderer.style);
      fn(this.modalRenderer.style);
      this.render();
    };

    const bgPreset = document.getElementById('style-bg-preset');
    if (bgPreset) {
      bgPreset.addEventListener('change', (e) => {
        const theme = e.target.value;
        applyToBoth(s => {
          s.theme = theme;
          if (theme === 'dark') {
            s.bgColor = '#0b0f19';
            s.axisColor = '#94a3b8';
            s.textColor = '#cbd5e1';
            s.majorGridColor = '#334155';
            s.minorGridColor = '#1e293b';
          } else if (theme === 'light') {
            s.bgColor = '#f8fafc';
            s.axisColor = '#475569';
            s.textColor = '#1e293b';
            s.majorGridColor = '#cbd5e1';
            s.minorGridColor = '#e2e8f0';
          } else if (theme === 'millimeter') {
            s.bgColor = '#fbfbf7';
            s.axisColor = '#0284c7';
            s.textColor = '#0369a1';
            s.majorGridColor = '#7dd3fc';
            s.minorGridColor = '#bae6fd';
          }
        });
        document.body.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
        this.syncStyleForm();
      });
    }

    const axisColor = document.getElementById('style-axis-color');
    if (axisColor) {
      axisColor.addEventListener('input', (e) => {
        applyToBoth(s => s.axisColor = e.target.value);
      });
    }

    const axisWidth = document.getElementById('style-axis-width');
    if (axisWidth) {
      axisWidth.addEventListener('input', (e) => {
        applyToBoth(s => s.axisWidth = parseFloat(e.target.value));
      });
    }

    const showMajor = document.getElementById('style-show-major-grid');
    if (showMajor) {
      showMajor.addEventListener('change', (e) => {
        applyToBoth(s => s.showMajorGrid = e.target.checked);
      });
    }

    const showMinor = document.getElementById('style-show-minor-grid');
    if (showMinor) {
      showMinor.addEventListener('change', (e) => {
        applyToBoth(s => s.showMinorGrid = e.target.checked);
      });
    }

    const majorColor = document.getElementById('style-major-grid-color');
    if (majorColor) {
      majorColor.addEventListener('input', (e) => {
        applyToBoth(s => s.majorGridColor = e.target.value);
      });
    }

    const minorColor = document.getElementById('style-minor-grid-color');
    if (minorColor) {
      minorColor.addEventListener('input', (e) => {
        applyToBoth(s => s.minorGridColor = e.target.value);
      });
    }

    const fontSize = document.getElementById('style-font-size');
    if (fontSize) {
      fontSize.addEventListener('input', (e) => {
        applyToBoth(s => s.fontSize = parseInt(e.target.value, 10));
      });
    }

    const showVectors = document.getElementById('style-show-vectors');
    if (showVectors) {
      showVectors.addEventListener('change', (e) => {
        applyToBoth(s => s.showVectors = e.target.checked);
      });
    }

    // Estilo de la resultante
    const resColor = document.getElementById('style-res-color');
    if (resColor) {
      resColor.addEventListener('input', (e) => {
        this.waveStore.resultantStyle.color = e.target.value;
        this.waveStore.resultantStyle.glowColor = e.target.value;
        this.render();
      });
    }

    const resWidth = document.getElementById('style-res-width');
    if (resWidth) {
      resWidth.addEventListener('input', (e) => {
        this.waveStore.resultantStyle.lineWidth = parseFloat(e.target.value);
        this.render();
      });
    }

    const resGlow = document.getElementById('style-res-glow');
    if (resGlow) {
      resGlow.addEventListener('change', (e) => {
        this.waveStore.resultantStyle.glow = e.target.checked;
        this.render();
      });
    }
  }
}

// Inicialización de la aplicación cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', () => {
  window.app = new WaveApp();
});
