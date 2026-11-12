// notebook-app.js - Controlador del Cuaderno Virtual Universitario Argollado
// Implementa navegación de pliegos de páginas abiertas (Left Page + Anillos Espiral + Right Page)
// Efecto 3D Page Flip realista y motor de síntesis de sonido de papel Web Audio API

import { NOTEBOOK_METADATA, PRELIMINARY_SECTIONS, UNITS, GLOSSARY_TERMS, BIBLIOGRAPHY_APA7 } from './notebook-content.js';
import { MindMapRenderer } from './mindmap.js';
import { TimelineRenderer } from './timeline.js';
import { SimulationsLab } from './simulations-lab.js';

// ================= MOTOR DE SÍNTESIS DE SONIDO DE PAPEL REALISTA =================
export class PaperSoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem('fisica3_sound_enabled') !== 'false';
    const savedVol = parseFloat(localStorage.getItem('fisica3_sound_volume'));
    this.volume = !isNaN(savedVol) ? Math.min(1, Math.max(0, savedVol)) : 0.7;
    this.hasUserInteracted = false;
    this.setupListeners();
  }

  setupListeners() {
    const unlock = () => {
      this.hasUserInteracted = true;
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          try {
            this.ctx = new AudioCtx();
          } catch (e) {}
        }
      } else if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    };

    ['click', 'keydown', 'touchstart'].forEach(evt => {
      window.addEventListener(evt, unlock, { once: false, passive: true });
    });
  }

  bindUI() {
    const toggleBtn = document.getElementById('btn-sound-toggle');
    const volumeSlider = document.getElementById('sound-volume-slider');

    if (toggleBtn) {
      toggleBtn.onclick = (e) => {
        e.stopPropagation();
        this.hasUserInteracted = true;
        this.ensureContext();
        this.setEnabled(!this.enabled);
        if (this.enabled && this.volume === 0) {
          this.setVolume(0.7);
        }
      };
    }

    if (volumeSlider) {
      volumeSlider.value = Math.round(this.volume * 100);
      volumeSlider.oninput = (e) => {
        this.hasUserInteracted = true;
        this.ensureContext();
        const val = parseInt(e.target.value, 10);
        this.setVolume(val / 100);
      };
    }

    this.updateUI();
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch (e) {}
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setEnabled(val) {
    this.enabled = !!val;
    localStorage.setItem('fisica3_sound_enabled', this.enabled ? 'true' : 'false');
    this.updateUI();
  }

  setVolume(val) {
    this.volume = Math.min(1, Math.max(0, parseFloat(val) || 0));
    localStorage.setItem('fisica3_sound_volume', this.volume.toString());
    if (this.volume > 0 && !this.enabled) {
      this.enabled = true;
      localStorage.setItem('fisica3_sound_enabled', 'true');
    } else if (this.volume === 0 && this.enabled) {
      this.enabled = false;
      localStorage.setItem('fisica3_sound_enabled', 'false');
    }
    this.updateUI();
  }

  updateUI() {
    const toggleBtn = document.getElementById('btn-sound-toggle');
    const volumeSlider = document.getElementById('sound-volume-slider');
    const percentEl = document.getElementById('sound-volume-percent');

    if (volumeSlider) {
      volumeSlider.value = Math.round(this.volume * 100);
    }
    if (percentEl) {
      percentEl.textContent = `${Math.round(this.volume * 100)}%`;
    }
    if (toggleBtn) {
      const iconOn = toggleBtn.querySelector('.sound-icon-on');
      const iconOff = toggleBtn.querySelector('.sound-icon-off');
      if (this.enabled && this.volume > 0) {
        toggleBtn.classList.remove('is-muted');
        toggleBtn.title = `Efecto de sonido de papel: Activado (${Math.round(this.volume * 100)}%)`;
        toggleBtn.setAttribute('aria-label', `Efecto de sonido de papel activado al ${Math.round(this.volume * 100)} por ciento`);
        if (iconOn) iconOn.style.display = 'inline-block';
        if (iconOff) iconOff.style.display = 'none';
      } else {
        toggleBtn.classList.add('is-muted');
        toggleBtn.title = 'Efecto de sonido de papel: Silenciado';
        toggleBtn.setAttribute('aria-label', 'Efecto de sonido de papel silenciado');
        if (iconOn) iconOn.style.display = 'none';
        if (iconOff) iconOff.style.display = 'inline-block';
      }
    }
  }

  playPaperTurn(direction = 'next') {
    if (!this.enabled || this.volume <= 0 || !this.hasUserInteracted) return;

    try {
      const ctx = this.ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const duration = 0.45; // 450 ms orgánico

      // 1. Buffer de ruido rosa para la fricción de fibras de celulosa
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.12;
        b6 = white * 0.115926;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;

      // 2. Filtro paso banda dinámico con barrido suave
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.setValueAtTime(1.9, now);

      const startFreq = direction === 'next' ? 950 : 1150;
      const peakFreq = direction === 'next' ? 2250 : 2400;
      const endFreq = 720;

      filter.frequency.setValueAtTime(startFreq, now);
      filter.frequency.exponentialRampToValueAtTime(peakFreq, now + 0.14);
      filter.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

      // 3. Resonancia suave de baja frecuencia (cuerpo de la hoja de papel)
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(direction === 'next' ? 160 : 180, now);
      osc.frequency.exponentialRampToValueAtTime(105, now + duration * 0.65);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.exponentialRampToValueAtTime(0.035 * this.volume, now + 0.05);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.65);

      // 4. Envolvente de ganancia principal del roce de papel
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.26 * this.volume, now + 0.045);
      gainNode.gain.exponentialRampToValueAtTime(0.16 * this.volume, now + 0.20);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      // Conexiones de nodos de audio
      noiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);

      // Ejecución temporizada
      noiseSource.start(now);
      noiseSource.stop(now + duration);
      osc.start(now);
      osc.stop(now + duration * 0.65);

    } catch (e) {
      console.warn('[PaperSoundEngine] No fue posible reproducir audio:', e);
    }
  }
}

export class NotebookApp {
  constructor() {
    this.currentSpreadIndex = 0; // 0 a 10 pliegos dobles
    this.totalSpreads = 11;
    this.simLabInstance = null;
    this.mindMapInstance = null;
    this.timelineInstance = null;
    this.quizScores = JSON.parse(localStorage.getItem('fisica3_quiz_scores') || '{}');
    this.soundEngine = new PaperSoundEngine();
    this.isFlipping = false;
    this.isOpen = false;        // El cuaderno inicia CERRADO con su portada
    this.isOpening = false;
    this.isClosing = false;

    this.bindDOM();
    this.initClosedNotebookState();
  }

  // Establece la pantalla inicial con el cuaderno cerrado
  initClosedNotebookState() {
    const closedScreen = document.getElementById('closed-notebook-screen');
    const openContainer = document.getElementById('view-notebook-container');
    const btnClose = document.getElementById('btn-close-notebook');
    const headerPill = document.getElementById('header-page-indicator');

    if (closedScreen) {
      closedScreen.classList.remove('is-hidden', 'is-animating-open', 'is-animating-close');
    }
    if (openContainer) {
      openContainer.classList.add('is-hidden');
      openContainer.classList.remove('is-revealed');
    }
    if (btnClose) {
      btnClose.style.display = 'none';
    }
    if (headerPill) {
      headerPill.textContent = 'Portada';
    }

    // Pre-renderizar el contenido del cuaderno en segundo plano
    this.renderCurrentSpread();
  }

  // Animación 3D realista de apertura del cuaderno
  openNotebook(targetSpread = 0) {
    if (this.isOpening || this.isOpen) return;
    this.isOpening = true;

    // Desbloquear audio del navegador y reproducir sonido realista de hoja
    if (this.soundEngine) {
      this.soundEngine.hasUserInteracted = true;
      this.soundEngine.ensureContext();
      this.soundEngine.playPaperTurn('next');
    }

    const closedScreen = document.getElementById('closed-notebook-screen');
    const openContainer = document.getElementById('view-notebook-container');
    const btnClose = document.getElementById('btn-close-notebook');
    const headerPill = document.getElementById('header-page-indicator');

    if (closedScreen) {
      closedScreen.classList.add('is-animating-open');
    }

    // Duración de la animación: 1250ms (dentro del rango 1 - 1.5s)
    setTimeout(() => {
      if (closedScreen) {
        closedScreen.classList.remove('is-animating-open');
        closedScreen.classList.add('is-hidden');
      }
      if (openContainer) {
        openContainer.classList.remove('is-hidden');
        openContainer.classList.add('is-revealed');
      }
      if (btnClose) {
        btnClose.style.display = 'inline-flex';
      }

      this.isOpen = true;
      this.isOpening = false;

      if (targetSpread !== 0) {
        this.goToSpread(targetSpread, true);
      } else {
        this.currentSpreadIndex = 0;
        this.renderCurrentSpread();
      }

      if (headerPill) {
        headerPill.textContent = `Pág. ${this.currentSpreadIndex + 1} / ${this.totalSpreads}`;
      }
    }, 1250);
  }

  // Cierra el cuaderno y regresa a la portada 3D inicial
  closeNotebook() {
    if (this.isClosing || !this.isOpen) return;
    this.isClosing = true;

    // Detener simulaciones activas al cerrar el cuaderno
    if (this.currentSpreadIndex === 8) {
      if (window.waveApp && typeof window.waveApp.pause === 'function') {
        window.waveApp.pause();
      }
      if (window.__dopplerApp && typeof window.__dopplerApp.pause === 'function') {
        window.__dopplerApp.pause();
        if (window.__dopplerApp.audio) {
          window.__dopplerApp.audio.setEnabled(false);
        }
      }
    }
    if (this.currentSpreadIndex === 9) {
      this.destroySpread9Simulations();
    }

    if (this.soundEngine) {
      this.soundEngine.playPaperTurn('prev');
    }

    const closedScreen = document.getElementById('closed-notebook-screen');
    const openContainer = document.getElementById('view-notebook-container');
    const btnClose = document.getElementById('btn-close-notebook');
    const headerPill = document.getElementById('header-page-indicator');

    if (btnClose) {
      btnClose.style.display = 'none';
    }

    if (closedScreen) {
      closedScreen.classList.remove('is-hidden');
      closedScreen.classList.add('is-animating-close');
    }
    if (openContainer) {
      openContainer.classList.remove('is-revealed');
      openContainer.classList.add('is-hidden');
    }
    if (headerPill) {
      headerPill.textContent = 'Portada';
    }

    setTimeout(() => {
      if (closedScreen) {
        closedScreen.classList.remove('is-animating-close');
      }
      this.isOpen = false;
      this.isClosing = false;
      this.currentSpreadIndex = 0;
    }, 1100);
  }

  bindDOM() {
    // Inicializar controles de sonido en la cabecera
    this.soundEngine.bindUI();

    // Controles de Apertura y Cierre del Cuaderno
    const btnOpen = document.getElementById('btn-open-notebook');
    const closedCard = document.getElementById('closed-notebook-card');
    const btnClose = document.getElementById('btn-close-notebook');

    if (btnOpen) btnOpen.onclick = () => this.openNotebook(0);
    if (closedCard) {
      closedCard.onclick = () => this.openNotebook(0);
      closedCard.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.openNotebook(0);
        }
      };
    }
    if (btnClose) btnClose.onclick = () => this.closeNotebook();

    // Teclado: Flechas izquierda y derecha para pasar páginas (solo si está abierto)
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (!this.isOpen) {
        if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === ' ') {
          this.openNotebook(0);
        }
        return;
      }
      if (e.key === 'ArrowRight') {
        this.nextSpread();
      } else if (e.key === 'ArrowLeft') {
        this.prevSpread();
      } else if (e.key === 'Escape') {
        this.closeNotebook();
      }
    });

    // Botones de la barra de navegación desprendida (debajo del cuaderno)
    const btnPrev = document.getElementById('btn-nav-prev');
    const btnNext = document.getElementById('btn-nav-next');
    const btnHome = document.getElementById('btn-nav-home');
    const spreadSelect = document.getElementById('spread-select');
    const btnFullscreen = document.getElementById('btn-header-fullscreen');

    if (btnPrev) btnPrev.onclick = () => this.prevSpread();
    if (btnNext) btnNext.onclick = () => this.nextSpread();
    if (btnHome) {
      btnHome.onclick = () => {
        if (this.currentSpreadIndex === 0) {
          this.closeNotebook();
        } else {
          this.goToSpread(0);
        }
      };
    }

    if (spreadSelect) {
      spreadSelect.onchange = (e) => {
        const idx = parseInt(e.target.value, 10);
        if (!isNaN(idx)) this.goToSpread(idx);
      };
    }

    if (btnFullscreen) {
      btnFullscreen.onclick = () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      };
    }
  }

  nextSpread() {
    if (this.currentSpreadIndex < this.totalSpreads - 1) {
      this.goToSpread(this.currentSpreadIndex + 1);
    }
  }

  prevSpread() {
    if (this.currentSpreadIndex > 0) {
      this.goToSpread(this.currentSpreadIndex - 1);
    }
  }

  goToSpread(index, skipAnimation = false) {
    if (this.isFlipping) return;

    // Si el cuaderno está cerrado, abrirlo directamente en el pliego solicitado
    if (!this.isOpen) {
      this.openNotebook(index);
      return;
    }

    if (index === this.currentSpreadIndex) return;
    if (index < 0 || index >= this.totalSpreads) return;

    const fromIndex = this.currentSpreadIndex;
    const toIndex = index;
    const direction = toIndex > fromIndex ? 'next' : 'prev';

    // Detener simulaciones activas al salir del pliego
    if (fromIndex === 8) {
      if (window.waveApp && typeof window.waveApp.pause === 'function') {
        window.waveApp.pause();
      }
      if (window.__dopplerApp && typeof window.__dopplerApp.pause === 'function') {
        window.__dopplerApp.pause();
        if (window.__dopplerApp.audio) {
          window.__dopplerApp.audio.setEnabled(false);
          const btnAudio = document.getElementById('btnAudioToggle');
          if (btnAudio) {
            btnAudio.classList.remove('active');
            btnAudio.setAttribute('aria-pressed', 'false');
          }
        }
      }
    }
    if (fromIndex === 9) {
      this.destroySpread9Simulations();
    }

    // Reproducir sonido realista de papel pasando
    if (this.soundEngine) {
      this.soundEngine.playPaperTurn(direction);
    }

    // Comprobar si se ejecuta la transición 3D o cambio directo (en móviles)
    const isMobile = window.innerWidth <= 860;
    const book = document.querySelector('.spiral-notebook-book');

    if (skipAnimation || isMobile || !book) {
      this.currentSpreadIndex = toIndex;
      this.renderCurrentSpread();
      const pageLeft = document.getElementById('book-page-left');
      const pageRight = document.getElementById('book-page-right');
      if (pageLeft) pageLeft.scrollTop = 0;
      if (pageRight) pageRight.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Ejecutar transición 3D Page Flip
    this.executePageFlip(fromIndex, toIndex, direction);
  }

  // Ejecuta la animación física 3D con curvatura y sombras dinámicas
  executePageFlip(fromIndex, toIndex, direction) {
    const book = document.querySelector('.spiral-notebook-book');
    const container = document.getElementById('notebook-reader-content');
    if (!book || !container) {
      this.currentSpreadIndex = toIndex;
      this.renderCurrentSpread();
      return;
    }

    this.isFlipping = true;
    book.classList.add('is-page-flipping');

    const fromData = this.getSpreadData(fromIndex);
    const toData = this.getSpreadData(toIndex);

    // Actualizar barra inferior e indicador superior de inmediato para respuesta táctil
    this.updateBottomBar(toData.spreadTitle);

    const pageLeft = document.getElementById('book-page-left');
    const pageRight = document.getElementById('book-page-right');

    const leaf = document.createElement('div');
    const dropShadow = document.createElement('div');
    dropShadow.className = 'flip-drop-shadow-base';

    if (direction === 'next') {
      // Avanzar: la página izquierda base muestra el pliego actual.
      // La página derecha base ya contiene la página derecha del pliego destino (debajo de la hoja).
      if (pageRight) {
        pageRight.innerHTML = toData.rightHTML;
        this.renderFormulasInNode(pageRight);
      }
      leaf.className = 'page-flip-leaf leaf-next';
      leaf.innerHTML = `
        <div class="flip-face flip-face-front book-page page-right">
          <div class="flip-face-inner">${fromData.rightHTML}</div>
          <div class="flip-lighting-overlay overlay-front"></div>
        </div>
        <div class="flip-face flip-face-back book-page page-left ${toIndex === 0 ? 'page-portada-left' : ''}">
          <div class="flip-face-inner">${toData.leftHTML}</div>
          <div class="flip-lighting-overlay overlay-back"></div>
        </div>
      `;
    } else {
      // Retroceder: la página derecha base muestra el pliego actual.
      // La página izquierda base ya contiene la página izquierda del pliego destino.
      if (pageLeft) {
        if (toIndex === 0) {
          pageLeft.className = 'book-page page-left page-portada-left';
        } else {
          pageLeft.className = 'book-page page-left';
        }
        pageLeft.innerHTML = toData.leftHTML;
        this.renderFormulasInNode(pageLeft);
      }
      leaf.className = 'page-flip-leaf leaf-prev';
      leaf.innerHTML = `
        <div class="flip-face flip-face-front book-page page-left ${fromIndex === 0 ? 'page-portada-left' : ''}">
          <div class="flip-face-inner">${fromData.leftHTML}</div>
          <div class="flip-lighting-overlay overlay-front"></div>
        </div>
        <div class="flip-face flip-face-back book-page page-right">
          <div class="flip-face-inner">${toData.rightHTML}</div>
          <div class="flip-lighting-overlay overlay-back"></div>
        </div>
      `;
    }

    book.appendChild(leaf);
    book.appendChild(dropShadow);
    this.renderFormulasInNode(leaf);

    // Disparar animación física en el siguiente cuadro de animación
    requestAnimationFrame(() => {
      leaf.classList.add('is-flipping');
    });

    // Conclusión de la transición a los 620ms
    setTimeout(() => {
      if (leaf && leaf.parentNode) leaf.parentNode.removeChild(leaf);
      if (dropShadow && dropShadow.parentNode) dropShadow.parentNode.removeChild(dropShadow);
      if (book) book.classList.remove('is-page-flipping');

      this.currentSpreadIndex = toIndex;
      this.renderCurrentSpread();
      this.isFlipping = false;

      const pLeft = document.getElementById('book-page-left');
      const pRight = document.getElementById('book-page-right');
      if (pLeft) pLeft.scrollTop = 0;
      if (pRight) pRight.scrollTop = 0;
    }, 620);
  }

  // Permite saltar a una unidad temática específica
  goToUnit(unitNumber) {
    const spreadIndex = 1 + Math.floor((unitNumber - 1) / 2) + 1;
    this.goToSpread(spreadIndex);
  }

  // Generador puro del contenido HTML de cada pliego
  getSpreadData(index) {
    let leftHTML = '';
    let rightHTML = '';
    let spreadTitle = '';

    switch (index) {
      case 0:
        spreadTitle = "Páginas 01 y 02 &middot; Portada e Índice General";
        leftHTML = this.renderPage01Portada();
        rightHTML = this.renderPage02Indice();
        break;
      case 1:
        spreadTitle = "Páginas 03 y 04 &middot; Reseña Histórica y Mapa Mental";
        leftHTML = this.renderPage03Historia();
        rightHTML = this.renderPage04MapaMental();
        break;
      case 2:
        spreadTitle = "Páginas 05 y 06 &middot; Unidades 1 y 2";
        leftHTML = this.renderUnitPage(UNITS[0], 5);
        rightHTML = this.renderUnitPage(UNITS[1], 6);
        break;
      case 3:
        spreadTitle = "Páginas 07 y 08 &middot; Unidades 3 y 4";
        leftHTML = this.renderUnitPage(UNITS[2], 7);
        rightHTML = this.renderUnitPage(UNITS[3], 8);
        break;
      case 4:
        spreadTitle = "Páginas 09 y 10 &middot; Unidades 5 y 6";
        leftHTML = this.renderUnitPage(UNITS[4], 9);
        rightHTML = this.renderUnitPage(UNITS[5], 10);
        break;
      case 5:
        spreadTitle = "Páginas 11 y 12 &middot; Unidades 7 y 8";
        leftHTML = this.renderUnitPage(UNITS[6], 11);
        rightHTML = this.renderUnitPage(UNITS[7], 12);
        break;
      case 6:
        spreadTitle = "Páginas 13 y 14 &middot; Unidades 9 y 10";
        leftHTML = this.renderUnitPage(UNITS[8], 13);
        rightHTML = this.renderUnitPage(UNITS[9], 14);
        break;
      case 7:
        spreadTitle = "Páginas 15 y 16 &middot; Unidades 11 y 12";
        leftHTML = this.renderUnitPage(UNITS[10], 15);
        rightHTML = this.renderUnitPage(UNITS[11], 16);
        break;
      case 8:
        spreadTitle = "Páginas 17 y 18 &middot; Simulaciones de Ondas (Pág. 17) y Efecto Doppler (Pág. 18)";
        leftHTML = this.renderPage17Ondas();
        rightHTML = this.renderPage18Doppler();
        break;
      case 9:
        spreadTitle = "Páginas 19 y 20 &middot; Tubos Sonoros (Pág. 19) y Cuerdas Tensas (Pág. 20)";
        leftHTML = this.renderPage19Tubos();
        rightHTML = this.renderPage20Cuerdas();
        break;
      case 10:
        spreadTitle = "Páginas 21 y 22 &middot; Formulario, Glosario y Bibliografía APA 7";
        leftHTML = this.renderPage21Evaluacion();
        rightHTML = this.renderPage22GlosarioBiblio();
        break;
    }

    return { leftHTML, rightHTML, spreadTitle };
  }

  renderCurrentSpread() {
    const container = document.getElementById('notebook-reader-content');
    if (!container) return;

    const data = this.getSpreadData(this.currentSpreadIndex);
    const leftHTML = data.leftHTML;
    const rightHTML = data.rightHTML;
    const spreadTitle = data.spreadTitle;

    // Renderizar cuaderno con espiral central y flechas laterales flotantes
    container.innerHTML = `
      <div class="notebook-spread-container">
        <button type="button" class="notebook-side-nav-btn btn-side-prev" id="btn-side-prev" title="Pliego anterior (Flecha Izquierda)" aria-label="Pliego anterior">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>

        <div class="spiral-notebook-book">
          <!-- PÁGINA IZQUIERDA -->
          <article class="book-page page-left ${this.currentSpreadIndex === 0 ? 'page-portada-left' : ''}" id="book-page-left">
            ${leftHTML}
          </article>

          <!-- ESPIRAL CENTRAL CON ARGOLLAS METÁLICAS 3D -->
          <div class="spiral-binder-spine" aria-hidden="true">
            <div class="spiral-rings-list">
              ${Array.from({ length: 14 }).map(() => `
                <div class="spiral-ring-item">
                  <div class="hole-left"></div>
                  <div class="metal-ring-loop"></div>
                  <div class="hole-right"></div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- PÁGINA DERECHA -->
          <article class="book-page page-right" id="book-page-right">
            ${rightHTML}
          </article>
        </div>

        <button type="button" class="notebook-side-nav-btn btn-side-next" id="btn-side-next" title="Pliego siguiente (Flecha Derecha)" aria-label="Pliego siguiente">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    `;

    const sidePrev = document.getElementById('btn-side-prev');
    const sideNext = document.getElementById('btn-side-next');
    if (sidePrev) sidePrev.onclick = () => this.prevSpread();
    if (sideNext) sideNext.onclick = () => this.nextSpread();

    // Inicializar componentes dinámicos montados en este pliego
    if (this.currentSpreadIndex === 1) {
      this.timelineInstance = new TimelineRenderer('timeline-mount-point');
      this.mindMapInstance = new MindMapRenderer('mindmap-mount-point', {
        onNavigate: (unitId) => {
          const num = parseInt(unitId.replace('unidad-', ''), 10);
          if (!isNaN(num)) this.goToUnit(num);
        }
      });
    } else if (this.currentSpreadIndex === 8) {
      this.mountSpread8Simulations();
    } else if (this.currentSpreadIndex === 9) {
      this.mountSpread9Simulations();
    } else if (this.currentSpreadIndex === 10) {
      this.initGlossary();
      this.initFormulaSearch();
      this.initComprehensiveQuiz();
    }

    // Eventos de quiz en unidades
    this.attachUnitQuizEvents();

    // Actualizar barra de progreso inferior desprendida
    this.updateBottomBar(spreadTitle);

    // Renderizar KaTeX
    this.renderFormulasInNode(container);
  }

  // ================= PÁGINA 01: PORTADA =================
  renderPage01Portada() {
    return `
      <div class="portada-book-card" onclick="window.notebookApp.goToSpread(1);" style="cursor: pointer;" title="Haga clic para abrir el cuaderno interactivo">
        <div class="portada-image-frame">
          <img src="${NOTEBOOK_METADATA.coverImage}" alt="Portada Cuaderno de Física 3 UTP" onerror="this.style.display='none';">
        </div>
      </div>
    `;
  }

  // ================= PÁGINA 02: ÍNDICE GENERAL Y MAPA MENTAL (ESTILO CAPTURA) =================
  renderPage02Indice() {
    return `
      <div class="page-top-header">
        <div class="header-academic-label">Contenido Académico</div>
        <div class="page-number-pill">Pág. 02</div>
      </div>

      <h2 class="page-main-heading">Índice General y Mapa Mental</h2>
      <p class="page-lead-caption">Estructura curricular y conexiones conceptuales del estudio del Movimiento Ondulatorio.</p>

      <div class="index-cards-vertical-list">
        <div class="index-unit-link-card" onclick="window.notebookApp.goToSpread(1);">
          <span><strong>3.</strong> Reseña Histórica y Línea de Tiempo</span>
          <span class="index-arrow-icon">→</span>
        </div>
        <div class="index-unit-link-card" onclick="window.notebookApp.goToUnit(1);">
          <span><strong>4.</strong> Fundamentos del Movimiento Ondulatorio</span>
          <span class="index-arrow-icon">→</span>
        </div>
        <div class="index-unit-link-card" onclick="window.notebookApp.goToUnit(2);">
          <span><strong>5.</strong> Clasificación de Ondas (Mecánicas, Transv. y Sísmicas)</span>
          <span class="index-arrow-icon">→</span>
        </div>
        <div class="index-unit-link-card" onclick="window.notebookApp.goToUnit(3);">
          <span><strong>6.</strong> Descripción Matemática y Demostración EDO</span>
          <span class="index-arrow-icon">→</span>
        </div>
        <div class="index-unit-link-card" onclick="window.notebookApp.goToUnit(4);">
          <span><strong>7.</strong> Velocidad de Propagación y Energía</span>
          <span class="index-arrow-icon">→</span>
        </div>
        <div class="index-unit-link-card" onclick="window.notebookApp.goToUnit(5);">
          <span><strong>8.</strong> Superposición, Interferencia y Batidos</span>
          <span class="index-arrow-icon">→</span>
        </div>
        <div class="index-unit-link-card" onclick="window.notebookApp.goToSpread(8);">
          <span><strong>9.</strong> Simulaciones de Ondas (Pág. 17) y Efecto Doppler (Pág. 18)</span>
          <span class="index-arrow-icon">→</span>
        </div>
        <div class="index-unit-link-card" onclick="window.notebookApp.goToSpread(9);">
          <span><strong>10.</strong> Tubos Sonoros (Pág. 19) y Cuerdas Tensas (Pág. 20)</span>
          <span class="index-arrow-icon">→</span>
        </div>
        <div class="index-unit-link-card" onclick="window.notebookApp.goToSpread(10);">
          <span><strong>11.</strong> Formulario, Glosario Técnico &amp; Normas APA 7 (Págs. 21-22)</span>
          <span class="index-arrow-icon">→</span>
        </div>
      </div>

      <div class="index-mindmap-footer-trigger" onclick="window.notebookApp.goToSpread(1);">
        <div class="mindmap-trigger-label">
          <span>🧠 Mapa Mental Conceptual Interactivo</span>
        </div>
        <span class="mindmap-trigger-sub">(Haz clic para abrir el grafo conceptual)</span>
      </div>
    `;
  }

  // ================= PÁGINA 03: RESEÑA HISTÓRICA Y LÍNEA DE TIEMPO =================
  renderPage03Historia() {
    const p = PRELIMINARY_SECTIONS.find(x => x.id === 'resena-historica');
    return `
      <div class="page-top-header">
        <div class="header-academic-label">Epistemología e Historia</div>
        <div class="page-number-pill">Pág. 03</div>
      </div>
      <h2 class="page-main-heading">${p.title}</h2>
      <p class="page-lead-caption">${p.subtitle}</p>
      <div class="unit-text-p">${p.content}</div>
      <div id="timeline-mount-point" style="margin-top: 20px;"></div>
    `;
  }

  // ================= PÁGINA 04: MAPA MENTAL INTERACTIVO =================
  renderPage04MapaMental() {
    return `
      <div class="page-top-header">
        <div class="header-academic-label">Red Conceptual</div>
        <div class="page-number-pill">Pág. 04</div>
      </div>
      <h2 class="page-main-heading">Mapa Mental del Movimiento Ondulatorio</h2>
      <p class="page-lead-caption">Haz clic en cualquier nodo para explorar sus fundamentos y acceder al tema.</p>
      <div id="mindmap-mount-point"></div>
    `;
  }

  // ================= PÁGINA DE UNIDAD TEMÁTICA =================
  renderUnitPage(unit, pageNum) {
    if (!unit) return `<p>Unidad no disponible.</p>`;

    return `
      <div class="page-top-header">
        <div class="header-academic-label">Unidad Temática ${unit.number}</div>
        <div class="page-number-pill">Pág. ${String(pageNum).padStart(2, '0')}</div>
      </div>

      <h2 class="page-main-heading">${unit.title}</h2>
      <p class="page-lead-caption">${unit.summary}</p>

      <!-- Subtemas de la Unidad -->
      ${unit.sections.map(s => `
        <div class="unit-section-block">
          <h3 class="unit-subtitle-h3">${s.subtitle}</h3>
          <div class="unit-text-p">${s.html}</div>
        </div>
      `).join('')}

      <!-- Ejercicio Resuelto en 10 Pasos -->
      ${unit.exercise ? this.renderPaperExercise(unit.exercise, unit.number) : ''}

      <!-- Comprobación Formativa -->
      ${unit.quiz ? this.renderPaperQuiz(unit.quiz, unit.number) : ''}
    `;
  }

  renderPaperExercise(ex, unitNum) {
    return `
      <div class="paper-exercise-box" id="ex-u${unitNum}">
        <div class="paper-exercise-header">
          <h4 class="paper-exercise-title">${ex.title}</h4>
          <span class="ten-steps-badge">Metodología en 10 Pasos</span>
        </div>
        <div class="paper-statement">
          <strong>Enunciado:</strong> ${ex.statement}
        </div>
        <div class="paper-steps-container">
          ${ex.steps.map(st => `
            <div class="paper-step-item">
              <div class="step-item-title">
                <span class="step-num-badge">${st.num}</span>
                <span>${st.name}</span>
              </div>
              <div class="step-item-content">${st.content}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderPaperQuiz(quiz, unitNum) {
    const saved = this.quizScores[`unit_${unitNum}`];
    return `
      <div class="unit-quiz-card" data-quiz-unit="${unitNum}">
        <div class="quiz-card-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg>
          <strong style="color: #6d28d9;">Comprobación Conceptual:</strong>
        </div>
        <p class="quiz-question-text" style="color:#1e293b; font-weight:600;">${quiz.question}</p>
        <div class="quiz-options-list">
          ${quiz.options.map((opt, idx) => `
            <button type="button" class="quiz-opt-btn ${saved !== undefined ? (idx === quiz.correctIndex ? 'is-correct' : (saved === idx ? 'is-wrong' : '')) : ''}" data-opt-idx="${idx}" ${saved !== undefined ? 'disabled' : ''}>
              <span class="opt-letter">${String.fromCharCode(65 + idx)}</span>
              <span class="opt-text">${opt}</span>
            </button>
          `).join('')}
        </div>
        <div class="quiz-feedback-box ${saved !== undefined ? '' : 'hidden'}" id="quiz-feedback-${unitNum}">
          <div class="feedback-status">${saved === quiz.correctIndex ? '¡Correcto!' : (saved !== undefined ? 'Incorrecto.' : '')}</div>
          <p class="feedback-explanation">${quiz.explanation}</p>
        </div>
      </div>
    `;
  }

  // ================= PÁGINA 17 Y 18: SIMULACIONES DE ONDAS Y EFECTO DOPPLER =================

  // ================= PÁGINA 17: SIMULACIÓN DE ONDAS (LABORATORIO GEOGEBRA) =================
  renderPage17Ondas() {
    return `
      <div class="page-top-header">
        <div class="header-academic-label">Laboratorio GeoGebra &middot; Superposición</div>
        <div class="page-number-pill">Pág. 17</div>
      </div>

      <h2 class="page-main-heading">Simulación de Superposición de Ondas</h2>
      <p class="page-lead-caption">Plano cartesiano interactivo tipo GeoGebra para modelar ondas viajeras continuas y calcular la superposición lineal $\\sum y_i(x, t)$.</p>

      <!-- Viewport del Lienzo GeoGebra -->
      <div class="notebook-sim-viewport" id="canvas-container">
        <canvas id="main-canvas" aria-label="Plano cartesiano de ondas"></canvas>

        <!-- Barra flotante HUD estilo GeoGebra -->
        <div class="geogebra-hud-toolbar" role="toolbar" aria-label="Herramientas del plano cartesiano">
          <button type="button" class="hud-btn btn-hud-zoom-in" title="Acercar (Zoom In)" aria-label="Acercar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/></svg>
          </button>
          <button type="button" class="hud-btn btn-hud-zoom-out" title="Alejar (Zoom Out)" aria-label="Alejar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6"/></svg>
          </button>
          <button type="button" class="hud-btn btn-hud-reset-view" title="Restablecer vista centrada" aria-label="Restablecer vista">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/></svg>
          </button>
          <button type="button" class="hud-btn btn-hud-autofit" title="Ajuste óptimo de escala" aria-label="Ajuste automático">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>
          </button>
          <div class="hud-divider"></div>
          <button type="button" class="hud-btn btn-toggle-inspector" title="Sonda de Inspección (I)" aria-label="Sonda de inspección">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/></svg>
          </button>
          <button type="button" class="hud-btn" id="btn-hud-open-styles" title="Paleta de Estilos Gráficos">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 0 0 20M12 12h10"/></svg>
          </button>
          <button type="button" class="hud-btn" id="btn-open-expanded-modal" title="Ver en Ventana Modal Grande (⛶)" aria-label="Abrir modal ampliado">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          </button>
        </div>

        <!-- Tarjeta flotante de la Sonda Inspector -->
        <div class="inspector-floating-overlay hidden" id="inspector-floating-overlay">
          <div class="inspector-badge-header">
            <div class="inspector-coord">
              <span>x: <strong><span id="inspector-x-val">0.00</span> m</strong></span>
              <span>&middot;</span>
              <span>t: <strong><span id="inspector-t-val">0.00</span> s</strong></span>
            </div>
          </div>
          <div class="inspector-components-table" id="inspector-components-table"></div>
          <div class="inspector-resultant-row">
            <span>Resultante y<sub>total</sub>:</span>
            <strong class="res-num"><span id="inspector-res-val">0.000</span> m</strong>
          </div>
        </div>
      </div>

      <!-- Barra de reproducción temporal y Scrubber -->
      <div class="physics-scrubber-bar" role="region" aria-label="Barra de reproducción temporal">
        <div class="scrubber-controls">
          <button type="button" class="btn-ctrl-round btn-step-prev" title="Paso atrás (-0.05 s)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
          </button>
          <button type="button" class="btn-ctrl-round btn-ctrl-main btn-play-toggle" title="Reproducir / Pausar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <button type="button" class="btn-ctrl-round btn-step-next" title="Paso adelante (+0.05 s)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
          <button type="button" class="btn-ctrl-round btn-reset-time" title="Reiniciar tiempo a 0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
        </div>

        <div class="scrubber-slider-wrapper">
          <input type="range" id="time-scrubber" class="scrubber-range" min="0" max="20" step="0.02" value="0">
        </div>

        <div class="scrubber-time-badge">
          <span class="time-label">t =</span>
          <span class="time-value-display">0.00 s</span>
        </div>
      </div>

      <!-- Resumen de Onda Resultante -->
      <div class="resultant-summary-card">
        <div class="res-card-header">
          <div class="res-title-group">
            <span class="res-glow-dot"></span>
            <strong>Onda Resultante (Superposición)</strong>
          </div>
          <span class="math-symbol-sigma">&sum; y_i(x, t)</span>
        </div>
        <p class="res-card-caption">
          Suma vectorial lineal instantánea de todas las componentes activas.
        </p>
      </div>

      <!-- Editor de Ondas Componentes -->
      <div class="notebook-sim-card">
        <div class="notebook-sim-card-header">
          <div style="display:flex; align-items:center; gap:8px;">
            <h3 class="notebook-sim-card-title">Ondas Componentes</h3>
            <span class="badge-counter" id="waves-count-badge" style="background:#ede9fe; color:#6d28d9; padding:2px 7px; border-radius:10px; font-size:0.75rem; font-weight:700;">2 ondas</span>
          </div>
          <div style="display:flex; gap:6px;">
            <button type="button" class="btn-sm btn-primary" id="btn-add-wave" title="Añadir una nueva onda componente" style="padding:3px 8px; font-size:0.75rem;">
              + Nueva Onda
            </button>
            <button type="button" class="btn-sm btn-secondary" id="btn-toggle-keyboard" title="Abrir teclado matemático" style="padding:3px 8px; font-size:0.75rem;">
              Teclado
            </button>
          </div>
        </div>
        <div class="waves-list-container" id="waves-list" role="list"></div>
      </div>

      <!-- Presets Didácticos GeoGebra -->
      <div class="notebook-sim-card">
        <h3 class="notebook-sim-card-title" style="margin-bottom:8px;">Casos de Estudio Didácticos</h3>
        <div class="presets-cards-container" id="presets-cards-container"></div>

        <div style="margin-top:10px; padding:8px 10px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
          <h4 id="didactic-info-title" style="margin:0 0 4px; font-size:0.82rem; color:#6d28d9; font-weight:700;">Fundamento Físico</h4>
          <p id="didactic-info-text" style="font-size:0.78rem; color:#334155; margin:0 0 6px; line-height:1.4;">
            Selecciona un caso para modelar la ecuación de superposición analítica.
          </p>
          <strong style="font-size:0.74rem; color:#475569;">Preguntas Orientadoras:</strong>
          <ul id="didactic-questions-list" style="margin:4px 0 0; padding-left:16px; font-size:0.74rem; color:#334155; line-height:1.4;"></ul>
        </div>
      </div>

      <!-- Acceso a Mini-Laboratorios A a I (Desplegable) -->
      <details class="notebook-sim-card" style="cursor:pointer;">
        <summary style="font-size:0.8rem; font-weight:700; color:#6d28d9; user-select:none;">
          🔬 Ver también Colección de 9 Mini-Laboratorios (Simulaciones A a I)
        </summary>
        <div style="margin-top:10px;">
          <div id="simulations-mount-point"></div>
        </div>
      </details>
    `;
  }

  // ================= PÁGINA 18: SIMULADOR DEL EFECTO DOPPLER ACÚSTICO =================
  renderPage18Doppler() {
    return `
      <div class="page-top-header">
        <div class="header-academic-label">Acústica 2D &middot; Simulación Avanzada</div>
        <div class="page-number-pill">Pág. 18</div>
      </div>

      <h2 class="page-main-heading">Simulador del Efecto Doppler Acústico</h2>
      <p class="page-lead-caption">Propagación de ondas acústicas circulares en un medio homogéneo en reposo ($c = 340\\text{ m/s}$) con fuente y observador móviles.</p>

      <!-- Viewport del Lienzo Doppler -->
      <div class="notebook-doppler-viewport" id="doppler-container">
        <canvas id="dopplerCanvas" aria-label="Simulador de frentes de onda Doppler"></canvas>

        <!-- HUD flotante superior izquierda -->
        <div class="canvas-hud">
          <div id="hudRegimeBadge" class="hud-chip">
            <span class="hud-indicator"></span>
            <span>Subsónico</span>
          </div>
          <div class="hud-chip">
            <span>Separación: <strong id="telemetryDist">340.0 m</strong></span>
          </div>
          <div class="hud-chip">
            <span>f_o teórica: <strong id="telemetryFoTheory" style="color: #38bdf8;">2.00 Hz</strong></span>
          </div>
          <div class="hud-chip">
            <span>f_medida: <strong id="telemetryFoMeasured" style="color: #10b981;">Esperando 2 llegadas...</strong></span>
          </div>
        </div>

        <!-- Barra de herramientas flotante del lienzo -->
        <div class="canvas-toolbar" role="toolbar" aria-label="Herramientas de cámara y medición">
          <button type="button" id="btnFitScene" class="btn-icon" title="Ajustar escena a la pantalla" aria-label="Ajustar escena">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          </button>
          <button type="button" id="btnResetView" class="btn-icon" title="Restaurar vista por defecto" aria-label="Restaurar vista">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
          </button>
          <button type="button" id="btnToggleRuler" class="btn-icon" title="Cinta métrica / Regla de medición" aria-label="Activar regla métrica">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.3 8.7 8.7 21.3a1 1 0 0 1-1.4 0l-4.6-4.6a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4Z"/><path d="m7.5 10.5 2 2"/><path d="m10.5 7.5 2 2"/><path d="m13.5 4.5 2 2"/></svg>
          </button>
          <button type="button" id="btnFollowSource" class="btn-icon" title="Seguir a la fuente con la cámara" aria-label="Seguir fuente">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg>
          </button>
        </div>

        <div id="toastBanner" class="toast-event-banner" role="status" aria-live="polite">
          <span style="color: #10b981;">●</span>
          <span id="toastMessage">Frente de onda recibido por el observador</span>
        </div>
      </div>

      <!-- Barra de transporte temporal Doppler -->
      <div class="physics-scrubber-bar" role="region" aria-label="Barra de reproducción Doppler">
        <div class="scrubber-controls">
          <button type="button" id="btnReset" class="btn-ctrl-round" title="Reiniciar al instante t = 0 (R)" aria-label="Reiniciar simulación">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>
          <button type="button" id="btnStepBack" class="btn-ctrl-round" title="Retroceder una subdivisión" aria-label="Paso atrás">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="11 19 2 12 11 5 11 19"/><polygon points="22 19 13 12 22 5 22 19"/></svg>
          </button>
          <button type="button" id="btnPlayPause" class="btn-ctrl-round btn-ctrl-main" title="Iniciar / Pausar simulación" aria-label="Iniciar simulación">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </button>
          <button type="button" id="btnStepForward" class="btn-ctrl-round" title="Avanzar una subdivisión" aria-label="Paso adelante">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 19 22 12 13 5 13 19"/><polygon points="2 19 11 12 2 5 2 19"/></svg>
          </button>
          <button type="button" id="btnStepPeriod" class="btn-ctrl-round" title="Avanzar un período completo T = 1/f" aria-label="Avanzar un período" style="font-size:0.7rem; font-weight:700;">
            +T
          </button>
        </div>

        <div class="scrubber-slider-wrapper">
          <input type="range" id="scrubberSlider" class="scrubber-range" min="0" max="10" step="0.005" value="0">
        </div>

        <div class="scrubber-time-badge">
          <span id="timeDisplay" style="font-size:0.75rem;">0.00 s / 10.0 s</span>
        </div>
      </div>

      <!-- Barra de Modo, Audio y Ayuda -->
      <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; margin-bottom:10px;">
        <div style="display:flex; gap:4px;">
          <button type="button" id="btnModeExploration" class="btn-sm btn-primary active" style="padding:4px 8px; font-size:0.74rem;">Exploración</button>
          <button type="button" id="btnModeLab" class="btn-sm btn-secondary" style="padding:4px 8px; font-size:0.74rem;">Laboratorio</button>
        </div>
        <div style="display:flex; gap:5px; align-items:center;">
          <button type="button" id="btnAudioToggle" class="btn-sm btn-secondary" title="Activar/Desactivar Sonificación Acústica" style="padding:4px 8px; font-size:0.74rem;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
            <span>Audio</span>
          </button>
          <button type="button" id="btnOpenScenarios" class="btn-sm btn-secondary" title="Abrir 8 Escenarios Guiados" style="padding:4px 8px; font-size:0.74rem;">
            <span>Escenarios</span>
          </button>
          <button type="button" id="btnOpenHelp" class="btn-sm btn-secondary" title="Ver Fundamento Teórico" style="padding:4px 8px; font-size:0.74rem;">
            <span>Teoría</span>
          </button>
        </div>
      </div>

      <!-- Casos Preconfigurados (8 Escenarios Didácticos) -->
      <div class="notebook-sim-card">
        <div class="notebook-sim-card-header">
          <strong class="notebook-sim-card-title">Casos Preconfigurados (1 Clic)</strong>
          <span style="font-size:0.72rem; color:#0284c7; font-weight:600;">8 Escenarios</span>
        </div>
        <div class="doppler-presets-grid">
          <button type="button" class="preset-chip-btn active" data-preset="rest">1. Ambos en reposo</button>
          <button type="button" class="preset-chip-btn" data-preset="src-approach">2. Fuente se aproxima</button>
          <button type="button" class="preset-chip-btn" data-preset="src-recede">3. Fuente se aleja</button>
          <button type="button" class="preset-chip-btn" data-preset="obs-approach">4. Observador aproxima</button>
          <button type="button" class="preset-chip-btn" data-preset="obs-recede">5. Observador aleja</button>
          <button type="button" class="preset-chip-btn" data-preset="both-moving">6. Ambos en avance</button>
          <button type="button" class="preset-chip-btn" data-preset="mach-1">7. Mach 1 (Sónico)</button>
          <button type="button" class="preset-chip-btn" data-preset="supersonic">8. Supersónico (M=1.5)</button>
        </div>
      </div>

      <!-- Parámetros Físicos con Sliders y Valores -->
      <div class="notebook-sim-card">
        <strong class="notebook-sim-card-title" style="margin-bottom:8px; display:block;">Parámetros Físicos (SI)</strong>

        <!-- Frecuencia emitida (f) -->
        <div style="margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:600; margin-bottom:2px;">
            <label for="sliderFreq">Frecuencia emitida (f):</label>
            <span class="control-val-badge"><span id="badgeFreq">2.0</span> Hz</span>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <input type="range" id="sliderFreq" class="scrubber-range" min="0.5" max="5.0" step="0.1" value="2.0" style="flex:1;">
            <input type="number" id="inputFreq" class="form-number-input" min="0.1" max="20" step="0.1" value="2.0" style="width:50px; padding:2px 4px; font-size:0.75rem; border:1px solid #cbd5e1; border-radius:4px; text-align:center;">
          </div>
        </div>

        <!-- Rapidez del sonido (c) -->
        <div style="margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:600; margin-bottom:2px;">
            <label for="sliderC">Rapidez de propagación (c):</label>
            <span class="control-val-badge"><span id="badgeC">340</span> m/s</span>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <input type="range" id="sliderC" class="scrubber-range" min="100" max="500" step="10" value="340" style="flex:1;">
            <input type="number" id="inputC" class="form-number-input" min="50" max="1000" step="10" value="340" style="width:50px; padding:2px 4px; font-size:0.75rem; border:1px solid #cbd5e1; border-radius:4px; text-align:center;">
          </div>
        </div>

        <!-- Velocidad Fuente (vf) -->
        <div style="margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:600; color:#e11d48; margin-bottom:2px;">
            <label for="sliderVfx">Velocidad Fuente (v_f):</label>
            <span class="control-val-badge" style="color:#e11d48;"><span id="badgeVfx">0</span> m/s</span>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <input type="range" id="sliderVfx" class="scrubber-range" min="-680" max="680" step="10" value="0" style="flex:1;">
            <input type="number" id="inputVfx" class="form-number-input" min="-1000" max="1000" step="10" value="0" style="width:50px; padding:2px 4px; font-size:0.75rem; border:1px solid #cbd5e1; border-radius:4px; text-align:center;">
          </div>
        </div>

        <!-- Velocidad Observador (vo) -->
        <div style="margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:600; color:#0284c7; margin-bottom:2px;">
            <label for="sliderVox">Velocidad Observador (v_o):</label>
            <span class="control-val-badge" style="color:#0284c7;"><span id="badgeVox">0</span> m/s</span>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <input type="range" id="sliderVox" class="scrubber-range" min="-272" max="272" step="5" value="0" style="flex:1;">
            <input type="number" id="inputVox" class="form-number-input" min="-300" max="300" step="5" value="0" style="width:50px; padding:2px 4px; font-size:0.75rem; border:1px solid #cbd5e1; border-radius:4px; text-align:center;">
          </div>
        </div>

        <!-- Duración -->
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:600; margin-bottom:2px;">
            <label for="sliderDuration">Duración del experimento:</label>
            <span class="control-val-badge"><span id="badgeDuration">10</span> s</span>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <input type="range" id="sliderDuration" class="scrubber-range" min="2" max="30" step="1" value="10" style="flex:1;">
            <input type="number" id="inputDuration" class="form-number-input" min="1" max="60" step="1" value="10" style="width:50px; padding:2px 4px; font-size:0.75rem; border:1px solid #cbd5e1; border-radius:4px; text-align:center;">
          </div>
        </div>
      </div>

      <!-- Telemetría y Ecuación KaTeX Dinámica -->
      <div class="notebook-sim-card">
        <strong class="notebook-sim-card-title" style="margin-bottom:4px; display:block;">Ecuación Doppler Evaluada en Vivo</strong>
        <div id="mathFormulaKaTeX" style="text-align:center; padding:4px 0; font-size:0.88rem;">
          $$f_o = f_e \\cdot \\left( \\frac{c - v_o}{c - v_f} \\right)$$
        </div>
        <div id="mathDynamicSubstitution" style="font-family:var(--font-mono, monospace); font-size:0.75rem; color:#475569; text-align:center; background:#f8fafc; padding:3px 6px; border-radius:6px; border:1px solid #e2e8f0;">
          Cargando sustitución numérica...
        </div>

        <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:6px; margin-top:8px;">
          <div style="padding:6px 8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px;">
            <span style="font-size:0.68rem; color:#64748b; display:block;">Número de Mach (M)</span>
            <div id="telemetryMach" style="font-weight:700; font-size:0.92rem; color:#0f172a;">0.00</div>
            <span id="telemetryMachAngle" style="font-size:0.65rem; color:#94a3b8;">Subsónico</span>
          </div>
          <div style="padding:6px 8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px;">
            <span style="font-size:0.68rem; color:#64748b; display:block;">Longitud \\(\\lambda_0\\)</span>
            <div id="telemetryLambda0" style="font-weight:700; font-size:0.92rem; color:#0284c7;">170.0 m</div>
            <span style="font-size:0.65rem; color:#94a3b8;">Medio en reposo</span>
          </div>
          <div style="padding:6px 8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px;">
            <span style="font-size:0.68rem; color:#64748b; display:block;">\\(\\lambda\\) Delante</span>
            <div id="telemetryLambdaAhead" style="font-weight:700; font-size:0.92rem; color:#10b981;">170.0 m</div>
            <span style="font-size:0.65rem; color:#94a3b8;">Compresión</span>
          </div>
          <div style="padding:6px 8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px;">
            <span style="font-size:0.68rem; color:#64748b; display:block;">\\(\\lambda\\) Detrás</span>
            <div id="telemetryLambdaBehind" style="font-weight:700; font-size:0.92rem; color:#f59e0b;">170.0 m</div>
            <span style="font-size:0.65rem; color:#94a3b8;">Dilatación</span>
          </div>
        </div>
      </div>

      <!-- Escenario Didáctico Guiado Activo y Pregunta Conceptual -->
      <div class="notebook-sim-card">
        <strong id="activeScenarioTitle" style="font-size:0.82rem; color:#6d28d9; display:block; margin-bottom:4px;">
          1. Fuente y observador inmóviles
        </strong>
        <p id="activeScenarioObjective" style="font-size:0.75rem; color:#334155; margin:0 0 6px; line-height:1.4;">
          Comprobar que en reposo la longitud de onda en el medio es constante en todas las direcciones y la frecuencia percibida es exactamente igual a la emitida.
        </p>
        <p id="activeScenarioProcedure" style="display:none;"></p>
        <div id="activeScenarioQuiz"></div>
      </div>

      <!-- Canvas oculto para compatibilidad con módulo de gráficas fo(t) -->
      <canvas id="chartCanvas" width="300" height="100" style="display:none;"></canvas>
    `;
  }

  // ================= MONTAJE DE SIMULACIONES EN PLIEGO 8 (PÁGS. 17 Y 18) =================
  mountSpread8Simulations() {
    // Destruir instancias previas para evitar referencias a canvas eliminados del DOM
    if (window.waveApp) {
      try { window.waveApp._renderLoopRunning = false; } catch(e) {}
      window.waveApp = null;
      window.app = null;
    }
    if (window.__dopplerApp) {
      try {
        window.__dopplerApp._animLoopRunning = false;
        if (window.__dopplerApp.animFrameId) cancelAnimationFrame(window.__dopplerApp.animFrameId);
      } catch(e) {}
      window.__dopplerApp = null;
    }

    // Función de montaje real — se ejecuta tras doble rAF + timeout para garantizar layout
    const doMount = () => {
      // 1. Montar Simulación de Ondas en Pág. 17 (GeoGebra)
      try {
        const canvasOndas = document.getElementById('main-canvas');
        if (canvasOndas) {
          window.waveApp = new WaveApp();
          window.app = window.waveApp;
        }
      } catch (err) {
        console.error('[NotebookApp] Error montando WaveApp:', err);
      }

      // 2. Montar Simulador del Efecto Doppler en Pág. 18
      try {
        const canvasDoppler = document.getElementById('dopplerCanvas');
        if (canvasDoppler) {
          window.__dopplerApp = new DopplerUI();
          window.__dopplerApp.init();
        }
      } catch (err) {
        console.error('[NotebookApp] Error montando DopplerUI:', err);
      }

      // 3. Montar también la galería opcional de mini-simulaciones A a I si el contenedor existe
      try {
        const simContainer = document.getElementById('simulations-mount-point');
        if (simContainer) {
          this.simLabInstance = new SimulationsLab('simulations-mount-point');
        }
      } catch (err) {
        console.warn('[NotebookApp] SimLab no montado:', err);
      }
    };

    // Doble rAF + timeout garantiza que el browser terminó de calcular dimensiones del layout
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(doMount, 60);
      });
    });
  }

  // ================= MONTAJE DE SIMULADORES EN PLIEGO 9 (PÁGS. 19 Y 20) =================
  mountSpread9Simulations() {
    this.destroySpread9Simulations();

    const doMount = () => {
      // 1. Montar Laboratorio de Tubos Sonoros en Pág. 19
      try {
        if (typeof TubesLab === 'function' && document.getElementById('tubesCanvas')) {
          window.tubesLabInstance = new TubesLab('tubesCanvas');
          window.tubesLabInstance.mount();
        }
      } catch (err) {
        console.error('[NotebookApp] Error montando TubesLab:', err);
      }

      // 2. Montar Laboratorio de Cuerdas Tensas en Pág. 20
      try {
        if (typeof StringsLab === 'function' && document.getElementById('stringsCanvas')) {
          window.stringsLabInstance = new StringsLab('stringsCanvas');
          window.stringsLabInstance.mount();
        }
      } catch (err) {
        console.error('[NotebookApp] Error montando StringsLab:', err);
      }
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(doMount, 60);
      });
    });
  }

  destroySpread9Simulations() {
    if (window.tubesLabInstance && typeof window.tubesLabInstance.destroy === 'function') {
      window.tubesLabInstance.destroy();
      window.tubesLabInstance = null;
    }
    if (window.stringsLabInstance && typeof window.stringsLabInstance.destroy === 'function') {
      window.stringsLabInstance.destroy();
      window.stringsLabInstance = null;
    }
  }

  // ================= PÁGINA 19: SIMULADOR DE TUBOS SONOROS =================
  renderPage19Tubos() {
    return `
      <div class="page-top-header">
        <div class="header-academic-label">Laboratorio Virtual de Acústica</div>
        <div class="page-number-pill">Pág. 19</div>
      </div>
      <h2 class="page-main-heading">Resonancia en Tubos Sonoros</h2>
      <p class="page-lead-caption">Estudio de ondas estacionarias longitudinales en columnas de aire, distribución de nodos y antinodos de desplazamiento y presión acústica.</p>

      <!-- Selector de Tipo de Tubo y Armónicos -->
      <div class="sim-controls-card">
        <div class="sim-control-row">
          <label for="tubes-type-select" class="sim-control-label">Geometría del Tubo:</label>
          <select id="tubes-type-select" class="sim-select" style="flex:1; max-width:none;">
            <option value="open-open">Tubo Abierto en ambos extremos (λₙ = 2L/n, fₙ = nv/2L)</option>
            <option value="open-closed">Tubo Cerrado en un extremo (λₘ = 4L/(2m−1), fₘ = (2m−1)v/4L)</option>
          </select>
        </div>
        <div style="margin-top: 8px;">
          <div style="font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Modo de Resonancia / Armónico:</div>
          <div class="sim-mode-pills-row">
            <button type="button" class="tubes-mode-pill active" data-mode="1">Modo 1 &middot; <span class="pill-harmonic-name">n = 1</span></button>
            <button type="button" class="tubes-mode-pill" data-mode="2">Modo 2 &middot; <span class="pill-harmonic-name">n = 2</span></button>
            <button type="button" class="tubes-mode-pill" data-mode="3">Modo 3 &middot; <span class="pill-harmonic-name">n = 3</span></button>
            <button type="button" class="tubes-mode-pill" data-mode="4">Modo 4 &middot; <span class="pill-harmonic-name">n = 4</span></button>
            <button type="button" class="tubes-mode-pill" data-mode="5">Modo 5 &middot; <span class="pill-harmonic-name">n = 5</span></button>
          </div>
        </div>
      </div>

      <!-- VIEWPORT DEL LIENZO CANVAS 2D -->
      <div class="notebook-tubes-viewport">
        <canvas id="tubesCanvas"></canvas>
      </div>

      <!-- Barra de Transporte y Toggles Visuales -->
      <div class="physics-scrubber-bar">
        <div class="scrubber-controls">
          <span class="sim-status-badge paused" id="tubes-status-badge">PAUSADO</span>
          <button type="button" id="tubes-btn-play" class="btn-ctrl-primary" title="Iniciar animación" style="display:inline-flex; align-items:center; gap:5px; padding:5px 12px; font-size:0.8rem; font-weight:700; border-radius:8px; background:#059669; color:#fff; border:none; cursor:pointer;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span>Reproducir</span>
          </button>
          <button type="button" id="tubes-btn-reset" class="btn-ctrl-round" title="Reiniciar al estado inicial" style="width:28px; height:28px; border-radius:50%; border:1px solid #cbd5e1; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
          <div class="anim-speed-ctrl" title="Velocidad de reproducción de la animación (0.1x a 2.0x)">
            <span class="anim-speed-label">Velocidad:</span>
            <input type="range" id="tubes-slider-speed" class="anim-speed-slider" min="0" max="5" step="1" value="2" aria-label="Velocidad de animación">
            <span class="anim-speed-badge" id="tubes-val-speed">0.5x</span>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; font-size:0.75rem; color:#334155; font-weight:600;">
          <label style="display:inline-flex; align-items:center; gap:4px; cursor:pointer;"><input type="checkbox" id="tubes-chk-particles" checked> Partículas</label>
          <label style="display:inline-flex; align-items:center; gap:4px; cursor:pointer; color:#0284c7;"><input type="checkbox" id="tubes-chk-disp" checked> Desplazamiento ξ</label>
          <label style="display:inline-flex; align-items:center; gap:4px; cursor:pointer; color:#d97706;"><input type="checkbox" id="tubes-chk-pres" checked> Presión ΔP</label>
          <label style="display:inline-flex; align-items:center; gap:4px; cursor:pointer;"><input type="checkbox" id="tubes-chk-nodes" checked> Nodos / Antinodos</label>
        </div>
      </div>

      <!-- Sliders de Parámetros Físicos -->
      <div class="sim-controls-card">
        <div class="sim-control-row">
          <label for="tubes-slider-l" class="sim-control-label">Longitud del Tubo (L):</label>
          <input type="range" id="tubes-slider-l" class="sim-slider-input" min="0.4" max="3.0" step="0.05" value="1.0">
          <span class="sim-val-pill" id="tubes-val-l">1.00 m</span>
        </div>
        <div class="sim-control-row">
          <label for="tubes-slider-v" class="sim-control-label">Velocidad del Sonido (v):</label>
          <input type="range" id="tubes-slider-v" class="sim-slider-input" min="300" max="380" step="1" value="340">
          <span class="sim-val-pill" id="tubes-val-v">340 m/s</span>
        </div>
        <div class="sim-control-row">
          <label for="tubes-slider-a" class="sim-control-label">Amplitud de Excitación (A):</label>
          <input type="range" id="tubes-slider-a" class="sim-slider-input" min="0.01" max="0.08" step="0.005" value="0.04">
        </div>
      </div>

      <!-- Panel de Telemetría Numérica -->
      <div class="sim-telemetry-grid">
        <div class="sim-metric-card">
          <div class="sim-metric-label">Fundamental (f₁)</div>
          <div class="sim-metric-val" id="tubes-readout-f1" style="color:#7c3aed;">170.0 Hz</div>
        </div>
        <div class="sim-metric-card">
          <div class="sim-metric-label">Frecuencia Actual (fₙ)</div>
          <div class="sim-metric-val" id="tubes-readout-fn" style="color:#0284c7;">170.0 Hz</div>
        </div>
        <div class="sim-metric-card">
          <div class="sim-metric-label">Longitud de Onda (λ)</div>
          <div class="sim-metric-val" id="tubes-readout-lambda" style="color:#059669;">2.000 m</div>
        </div>
        <div class="sim-metric-card">
          <div class="sim-metric-label">Modo / Armónico</div>
          <div class="sim-metric-val" id="tubes-readout-harmonic" style="font-size:0.8rem;">n = 1</div>
        </div>
        <div class="sim-metric-card" style="grid-column: span 2;">
          <div class="sim-metric-label">Distribución Nodos/Antinodos (ξ)</div>
          <div class="sim-metric-val" id="tubes-readout-nodes-count" style="font-size:0.82rem; color:#475569;">1 nodos / 2 antinodos</div>
        </div>
      </div>

      <!-- Tabla de los 5 Modos Permitidos -->
      <h3 class="unit-subtitle-h3" style="font-size:0.92rem; margin:14px 0 6px;">Primeros 5 Modos Permitidos de Resonancia</h3>
      <div class="sim-modes-table-wrap">
        <table class="sim-modes-table">
          <thead>
            <tr>
              <th>Armónico</th>
              <th>Denominación</th>
              <th>Frecuencia (Hz)</th>
              <th>Longitud Onda (λ)</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody id="tubes-table-modes-body"></tbody>
        </table>
      </div>

      <!-- Sección Explora y Experimenta -->
      <h3 class="unit-subtitle-h3" style="font-size:0.92rem; margin:16px 0 8px;">🔬 Explora y Experimenta</h3>
      <div class="sim-activities-list">
        <div class="sim-activity-card">
          <div class="sim-activity-title">
            <span>1. Efecto de la longitud del tubo</span>
            <button type="button" class="sim-activity-btn" onclick="window.tubesLabInstance.loadExploration('shorten-l');">Probar L = 0.5 m</button>
          </div>
          <p class="sim-activity-desc"><strong>Pregunta:</strong> ¿Qué ocurre con la frecuencia fundamental al reducir la longitud a la mitad? <em>Observación:</em> Dado que f₁ = v/(2L), la frecuencia se duplica (relación inversamente proporcional).</p>
        </div>
        <div class="sim-activity-card">
          <div class="sim-activity-title">
            <span>2. Tubo abierto vs. Tubo cerrado</span>
            <button type="button" class="sim-activity-btn" onclick="window.tubesLabInstance.loadExploration('compare-closed');">Probar Tubo Cerrado</button>
          </div>
          <p class="sim-activity-desc"><strong>Pregunta:</strong> ¿Por qué un tubo cerrado-abierto suena una octava más grave que uno abierto de igual longitud? <em>Física:</em> f₁^(cerrado) = v/(4L) = ½ f₁^(abierto), produciendo un tono una octava más bajo.</p>
        </div>
        <div class="sim-activity-card">
          <div class="sim-activity-title">
            <span>3. ¿Por qué el tubo cerrado solo presenta armónicos impares?</span>
            <button type="button" class="sim-activity-btn" onclick="window.tubesLabInstance.loadExploration('higher-harmonic');">Ver Modo 3 (n = 5)</button>
          </div>
          <p class="sim-activity-desc"><strong>Condición de frontera:</strong> El fondo cerrado fuerza un nodo de desplazamiento (ξ=0) y la boca abierta un antinodo (|ξ|=A). Esta asimetría solo puede albergar un número impar de cuartos de onda: L = (2m−1)λ/4.</p>
        </div>
        <div class="sim-activity-card">
          <div class="sim-activity-title">
            <span>4. Nodos de Desplazamiento vs. Nodos de Presión</span>
          </div>
          <p class="sim-activity-desc"><strong>Diferenciación crucial:</strong> En los extremos abiertos las moléculas se mueven libremente (antinodo de ξ), pero la presión está fija a la atmosférica (nodo de ΔP). En la pared cerrada las moléculas chocan sin poder avanzar (nodo de ξ), produciendo las máximas oscilaciones de compresión (antinodo de ΔP).</p>
        </div>
      </div>
    `;
  }

  // ================= PÁGINA 20: SIMULADOR DE CUERDAS TENSAS =================
  renderPage20Cuerdas() {
    return `
      <div class="page-top-header">
        <div class="header-academic-label">Laboratorio de Ondas Estacionarias</div>
        <div class="page-number-pill">Pág. 20</div>
      </div>
      <h2 class="page-main-heading">Ondas Estacionarias en Cuerdas Tensas</h2>
      <p class="page-lead-caption">Modos normales de vibración, relación dinámica v = √(T/μ) y superposición de ondas viajeras incidentes y reflejadas.</p>

      <!-- Selector de Armónicos -->
      <div class="sim-controls-card">
        <div style="font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Modo Normal de Vibración (Armónico n):</div>
        <div class="sim-mode-pills-row">
          <button type="button" class="strings-mode-pill active" data-harmonic="1">n = 1 (Fundamental)</button>
          <button type="button" class="strings-mode-pill" data-harmonic="2">n = 2 (2.° armónico)</button>
          <button type="button" class="strings-mode-pill" data-harmonic="3">n = 3 (3.° armónico)</button>
          <button type="button" class="strings-mode-pill" data-harmonic="4">n = 4 (4.° armónico)</button>
          <button type="button" class="strings-mode-pill" data-harmonic="5">n = 5 (5.° armónico)</button>
          <button type="button" class="strings-mode-pill" data-harmonic="6">n = 6 (6.° armónico)</button>
        </div>
      </div>

      <!-- VIEWPORT DEL LIENZO CANVAS 2D -->
      <div class="notebook-strings-viewport">
        <canvas id="stringsCanvas"></canvas>
      </div>

      <!-- Barra de Transporte y Opciones Visuales -->
      <div class="physics-scrubber-bar">
        <div class="scrubber-controls">
          <span class="sim-status-badge paused" id="strings-status-badge">PAUSADO</span>
          <button type="button" id="strings-btn-play" class="btn-ctrl-primary" title="Iniciar animación" style="display:inline-flex; align-items:center; gap:5px; padding:5px 12px; font-size:0.8rem; font-weight:700; border-radius:8px; background:#059669; color:#fff; border:none; cursor:pointer;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span>Reproducir</span>
          </button>
          <button type="button" id="strings-btn-reset" class="btn-ctrl-round" title="Reiniciar al estado inicial" style="width:28px; height:28px; border-radius:50%; border:1px solid #cbd5e1; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
          <div class="anim-speed-ctrl" title="Velocidad de reproducción de la animación (0.1x a 2.0x)">
            <span class="anim-speed-label">Velocidad:</span>
            <input type="range" id="strings-slider-speed" class="anim-speed-slider" min="0" max="5" step="1" value="2" aria-label="Velocidad de animación">
            <span class="anim-speed-badge" id="strings-val-speed">0.5x</span>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; font-size:0.75rem; color:#334155; font-weight:600;">
          <label style="display:inline-flex; align-items:center; gap:4px; cursor:pointer; color:#9333ea;"><input type="checkbox" id="strings-chk-envelope" checked> Envolvente &plusmn;A</label>
          <label style="display:inline-flex; align-items:center; gap:4px; cursor:pointer;"><input type="checkbox" id="strings-chk-nodes" checked> Nodos/Antinodos</label>
          <label style="display:inline-flex; align-items:center; gap:4px; cursor:pointer; color:#ef4444;"><input type="checkbox" id="strings-chk-components"> Ondas componentes (y_inc, y_ref)</label>
        </div>
      </div>

      <!-- Sliders de Parámetros Físicos con Unidades -->
      <div class="sim-controls-card">
        <div class="sim-control-row">
          <label for="strings-slider-l" class="sim-control-label">Longitud de la Cuerda (L):</label>
          <input type="range" id="strings-slider-l" class="sim-slider-input" min="0.4" max="3.0" step="0.05" value="1.0">
          <span class="sim-val-pill" id="strings-val-l">1.00 m</span>
        </div>
        <div class="sim-control-row">
          <label for="strings-slider-t" class="sim-control-label">Tensión Aplicada (T):</label>
          <input type="range" id="strings-slider-t" class="sim-slider-input" min="10" max="400" step="5" value="100">
          <span class="sim-val-pill" id="strings-val-t">100 N</span>
        </div>
        <div class="sim-control-row">
          <label for="strings-slider-mu" class="sim-control-label">Densidad Lineal (μ):</label>
          <input type="range" id="strings-slider-mu" class="sim-slider-input" min="0.001" max="0.030" step="0.001" value="0.004">
          <span class="sim-val-pill" id="strings-val-mu">4.0 g/m (0.0040 kg/m)</span>
        </div>
        <div class="sim-control-row">
          <label for="strings-slider-a" class="sim-control-label">Amplitud Máxima (A):</label>
          <input type="range" id="strings-slider-a" class="sim-slider-input" min="0.01" max="0.12" step="0.005" value="0.05">
        </div>
      </div>

      <!-- Panel de Telemetría Dinámica -->
      <div class="sim-telemetry-grid">
        <div class="sim-metric-card">
          <div class="sim-metric-label">Rapidez de Onda (v)</div>
          <div class="sim-metric-val" id="strings-readout-v" style="color:#0284c7;">158.1 m/s</div>
        </div>
        <div class="sim-metric-card">
          <div class="sim-metric-label">Fundamental (f₁)</div>
          <div class="sim-metric-val" id="strings-readout-f1" style="color:#7c3aed;">79.06 Hz</div>
        </div>
        <div class="sim-metric-card">
          <div class="sim-metric-label">Frecuencia Modo (fₙ)</div>
          <div class="sim-metric-val" id="strings-readout-fn" style="color:#d97706;">79.06 Hz</div>
        </div>
        <div class="sim-metric-card">
          <div class="sim-metric-label">Longitud Onda (λₙ)</div>
          <div class="sim-metric-val" id="strings-readout-lambda" style="color:#059669;">2.000 m</div>
        </div>
        <div class="sim-metric-card">
          <div class="sim-metric-label">Nodos Totales (N)</div>
          <div class="sim-metric-val" id="strings-readout-nodes" style="font-size:0.8rem;">2 nodos (x=0, x=L)</div>
        </div>
        <div class="sim-metric-card">
          <div class="sim-metric-label">Antinodos (A)</div>
          <div class="sim-metric-val" id="strings-readout-antinodes" style="font-size:0.8rem; color:#10b981;">1 antinodo</div>
        </div>
      </div>

      <!-- Tabla de los 5 Primeros Armónicos -->
      <h3 class="unit-subtitle-h3" style="font-size:0.92rem; margin:14px 0 6px;">Tabla de Modos Normales y Frecuencias Resonantes</h3>
      <div class="sim-modes-table-wrap">
        <table class="sim-modes-table">
          <thead>
            <tr>
              <th>Armónico</th>
              <th>Descripción</th>
              <th>Frecuencia (Hz)</th>
              <th>Longitud Onda (λ)</th>
              <th>Seleccionar</th>
            </tr>
          </thead>
          <tbody id="strings-table-modes-body"></tbody>
        </table>
      </div>

      <!-- Laboratorio Experimental Guiado -->
      <h3 class="unit-subtitle-h3" style="font-size:0.92rem; margin:16px 0 8px;">🧪 Experimentos Virtuales Guiados</h3>
      <div class="sim-activities-list">
        <div class="sim-activity-card">
          <div class="sim-activity-title">
            <span>Experimento 1. Efecto de la tensión mecánica (T)</span>
            <button type="button" class="sim-activity-btn" onclick="window.stringsLabInstance.loadExperiment(1);">Cargar Exp 1 (T = 400 N)</button>
          </div>
          <p class="sim-activity-desc"><strong>Hipótesis:</strong> ¿Qué sucede con la velocidad v y la frecuencia f si cuadruplicamos la tensión manteniendo constantes L y μ? <em>Resultado:</em> v = √(400/0.004) = 316.2 m/s, exactamente el doble de 158.1 m/s (relación v ∝ √T).</p>
        </div>
        <div class="sim-activity-card">
          <div class="sim-activity-title">
            <span>Experimento 2. Efecto de la densidad lineal de masa (μ)</span>
            <button type="button" class="sim-activity-btn" onclick="window.stringsLabInstance.loadExperiment(2);">Cargar Exp 2 (μ = 16 g/m)</button>
          </div>
          <p class="sim-activity-desc"><strong>Hipótesis:</strong> Al cuatriplicar la densidad lineal a tensión constante, la inercia de la cuerda frena la propagación de perturbaciones. <em>Resultado:</em> v se reduce a la mitad (v ∝ 1/√μ) y la fundamental cae a 39.5 Hz.</p>
        </div>
        <div class="sim-activity-card">
          <div class="sim-activity-title">
            <span>Experimento 3. Efecto de la longitud de la cuerda (L)</span>
            <button type="button" class="sim-activity-btn" onclick="window.stringsLabInstance.loadExperiment(3);">Cargar Exp 3 (L = 0.5 m)</button>
          </div>
          <p class="sim-activity-desc"><strong>Principio de instrumentos de cuerda:</strong> Al pulsar un traste o pisar la cuerda reduciendo su longitud libre a la mitad, la velocidad v no cambia, pero λ se reduce a la mitad y la frecuencia se duplica (octava superior).</p>
        </div>
        <div class="sim-activity-card">
          <div class="sim-activity-title">
            <span>Experimento 4. Análisis de nodos y antinodos en armónicos</span>
            <button type="button" class="sim-activity-btn" onclick="window.stringsLabInstance.loadExperiment(4);">Cargar Exp 4 (Armónico n = 4)</button>
          </div>
          <p class="sim-activity-desc"><strong>Teoría de modos normales:</strong> Para el 4.° armónico se aprecian 5 nodos fijos (puntos de interferencia destructiva permanente) y 4 antinodos vibrando con amplitud 2A.</p>
        </div>
      </div>
    `;
  }

  // ================= PÁGINA 21 Y 22: EVALUACIÓN, GLOSARIO Y BIBLIOGRAFÍA =================
  renderPage21Evaluacion() {
    return `
      <div class="page-top-header">
        <div class="header-academic-label">Compendio y Evaluación</div>
        <div class="page-number-pill">Pág. 21</div>
      </div>
      <h2 class="page-main-heading">Formulario y Autoevaluación</h2>
      <p class="page-lead-caption">Consulta fórmulas fundamentales y evalúa tu dominio general del curso.</p>

      <div class="formula-search-bar">
        <input type="text" id="formula-search-input" class="search-input" placeholder="Buscar fórmula o variable..." style="background:#ffffff; color:#1e293b; border-color:#cbd5e1;">
      </div>
      <div class="formulas-table-container" id="formulas-cards-list" style="margin-bottom: 24px;"></div>

      <h3 class="unit-subtitle-h3">Banco General de Autoevaluación</h3>
      <div class="comprehensive-quiz-list" id="comp-quiz-mount"></div>
    `;
  }

  renderPage22GlosarioBiblio() {
    return `
      <div class="page-top-header">
        <div class="header-academic-label">Glosario y Bibliografía</div>
        <div class="page-number-pill">Pág. 22</div>
      </div>
      <h2 class="page-main-heading">Glosario Técnico &amp; Normas APA 7</h2>
      <p class="page-lead-caption">Términos científicos normativos y fuentes académicas universitarias.</p>

      <div class="glossary-controls-bar">
        <input type="text" id="glossary-search-input" class="search-input" placeholder="Buscar término..." style="background:#ffffff; color:#1e293b; border-color:#cbd5e1;">
      </div>
      <div class="glossary-cards-grid" id="glossary-cards-grid" style="margin-bottom: 24px;"></div>

      <h3 class="unit-subtitle-h3">Referencias Bibliográficas (APA 7)</h3>
      <div class="bibliography-list">
        ${BIBLIOGRAPHY_APA7.map((b, i) => `
          <div class="bib-item-card" style="background:#ffffff; border-color:#cbd5e1; color:#1e293b;">
            <div class="bib-index-tag">[${i + 1}]</div>
            <div class="bib-details">
              <p class="bib-citation" style="color:#1e293b;">${b.authors} (${b.year}). <em>${b.title}</em>. ${b.publisher}.</p>
              <p class="bib-notes" style="color:#64748b;">${b.notes}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ================= MÉTODOS AUXILIARES Y EVENTOS =================
  updateBottomBar(spreadTitle) {
    const btnPrev = document.getElementById('btn-nav-prev');
    const btnNext = document.getElementById('btn-nav-next');
    const sidePrev = document.getElementById('btn-side-prev');
    const sideNext = document.getElementById('btn-side-next');
    const spreadSelect = document.getElementById('spread-select');
    const headerPill = document.getElementById('header-page-indicator');

    if (spreadSelect) spreadSelect.value = String(this.currentSpreadIndex);
    if (headerPill) {
      if (this.isOpen) {
        headerPill.textContent = `Pág. ${this.currentSpreadIndex + 1} / ${this.totalSpreads}`;
      } else {
        headerPill.textContent = 'Portada';
      }
    }

    const isFirst = this.currentSpreadIndex === 0;
    const isLast = this.currentSpreadIndex === this.totalSpreads - 1;

    if (btnPrev) btnPrev.disabled = isFirst;
    if (btnNext) btnNext.disabled = isLast;
    if (sidePrev) sidePrev.disabled = isFirst;
    if (sideNext) sideNext.disabled = isLast;
  }

  attachUnitQuizEvents() {
    const quizContainers = document.querySelectorAll('.unit-quiz-card');
    quizContainers.forEach(container => {
      const unitNum = container.getAttribute('data-quiz-unit');
      const unit = UNITS.find(u => u.number === parseInt(unitNum, 10));
      if (!unit || !unit.quiz) return;

      const buttons = container.querySelectorAll('.quiz-opt-btn');
      buttons.forEach(btn => {
        btn.onclick = () => {
          const selectedIdx = parseInt(btn.getAttribute('data-opt-idx'), 10);
          this.quizScores[`unit_${unitNum}`] = selectedIdx;
          localStorage.setItem('fisica3_quiz_scores', JSON.stringify(this.quizScores));

          buttons.forEach((b, i) => {
            b.disabled = true;
            if (i === unit.quiz.correctIndex) b.classList.add('is-correct');
            else if (i === selectedIdx) b.classList.add('is-wrong');
          });

          const feedbackBox = document.getElementById(`quiz-feedback-${unitNum}`);
          if (feedbackBox) {
            feedbackBox.classList.remove('hidden');
            const statusEl = feedbackBox.querySelector('.feedback-status');
            if (statusEl) {
              statusEl.textContent = selectedIdx === unit.quiz.correctIndex ? '¡Excelente! Respuesta Correcta.' : 'Respuesta Incorrecta.';
            }
          }
        };
      });
    });
  }

  initGlossary() {
    const grid = document.getElementById('glossary-cards-grid');
    const input = document.getElementById('glossary-search-input');
    if (!grid) return;

    const render = (query = '') => {
      const filtered = GLOSSARY_TERMS.filter(t => !query || t.term.toLowerCase().includes(query) || t.def.toLowerCase().includes(query));
      grid.innerHTML = filtered.map(t => `
        <div class="glossary-entry-card" style="background:#ffffff; border-color:#cbd5e1; color:#1e293b;">
          <div class="entry-header">
            <span class="entry-cat-badge">${t.category}</span>
            <h4 style="color:#1e1b4b;">${t.term}</h4>
          </div>
          <div class="entry-meta-row" style="color:#64748b;">
            ${t.symbol !== '-' ? `<span>Símbolo: <strong>$${t.symbol}$</strong></span> &middot; ` : ''}
            <span>Unidad: <strong>${t.unit}</strong></span>
          </div>
          <p class="entry-def" style="color:#334155;">${t.def}</p>
        </div>
      `).join('');
      this.renderFormulasInNode(grid);
    };

    render();
    if (input) {
      input.oninput = (e) => render(e.target.value.toLowerCase().trim());
    }
  }

  initFormulaSearch() {
    const container = document.getElementById('formulas-cards-list');
    const input = document.getElementById('formula-search-input');
    if (!container) return;

    const formulas = [
      { name: "Velocidad de fase", eq: "v = \\lambda f = \\frac{\\omega}{k}", vars: "v: m/s; \\lambda: m; f: Hz", cat: "Cinemática" },
      { name: "Ecuación de onda 1D", eq: "\\frac{\\partial^2 y}{\\partial t^2} = v^2 \\frac{\\partial^2 y}{\\partial x^2}", vars: "EDO clásica", cat: "Ecuaciones" },
      { name: "Cuerda tensa", eq: "v = \\sqrt{\\frac{T}{\\mu}}", vars: "T: N; \\mu: kg/m", cat: "Dinámica" },
      { name: "Potencia media", eq: "\\bar{P} = \\frac{1}{2}\\mu v \\omega^2 A^2", vars: "P: W", cat: "Energía" },
      { name: "Decibelios", eq: "\\beta = 10\\log_{10}(I/I_0)", vars: "\\beta: dB; I_0 = 10^{-12}\\text{ W/m}²", cat: "Acústica" },
      { name: "Efecto Doppler", eq: "f' = f \\frac{v \\pm v_o}{v \\mp v_s}", vars: "v_o, v_s: m/s", cat: "Doppler" }
    ];

    const render = (query = '') => {
      const filtered = formulas.filter(f => !query || f.name.toLowerCase().includes(query) || f.cat.toLowerCase().includes(query));
      container.innerHTML = filtered.map(f => `
        <div class="formula-card" style="background:#ffffff; border-color:#cbd5e1; color:#1e293b; margin-bottom:10px;">
          <div class="formula-card-header">
            <span class="formula-cat-badge">${f.cat}</span>
            <h4 style="color:#1e1b4b;">${f.name}</h4>
          </div>
          <div class="formula-math-display" style="color:#1e1b4b;">$$${f.eq}$$</div>
          <div class="formula-vars-meta" style="color:#64748b;"><strong>Variables:</strong> ${f.vars}</div>
        </div>
      `).join('');
      this.renderFormulasInNode(container);
    };

    render();
    if (input) {
      input.oninput = (e) => render(e.target.value.toLowerCase().trim());
    }
  }

  initComprehensiveQuiz() {
    const container = document.getElementById('comp-quiz-mount');
    if (!container) return;

    const questions = [
      { id: "q1", q: "¿Qué ocurre con la longitud de onda si la velocidad se duplica a frecuencia constante?", opts: ["Se reduce a la mitad.", "Se duplica.", "Permanece igual."], ans: 1, exp: "$\\lambda = v/f$. Al duplicar $v$, $\\lambda$ se duplica." },
      { id: "q2", q: "¿Cuándo es la interferencia totalmente destructiva?", opts: ["Desfase nulo.", "Desfase múltiplo impar de π.", "Frecuencias distintas."], ans: 1, exp: "$\\Delta\\phi = (2m+1)\\pi \\implies \\cos(\\pi/2) = 0$." }
    ];

    container.innerHTML = questions.map((item) => `
      <div class="comprehensive-question-card" style="background:#ffffff; border:1px solid #cbd5e1; padding:14px; border-radius:10px; margin-bottom:10px;">
        <h5 style="color:#1e1b4b; margin:0 0 10px 0;">${item.q}</h5>
        <div class="quiz-options-list">
          ${item.opts.map((opt, oIdx) => `
            <button type="button" class="quiz-opt-btn" onclick="this.classList.add(${oIdx === item.ans ? "'is-correct'" : "'is-wrong'"});">
              <span class="opt-letter">${String.fromCharCode(65 + oIdx)}</span>
              <span>${opt}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  renderFormulasInNode(node) {
    if (!node || !window.katex) return;
    try {
      const textNodes = [];
      const walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
      let n;
      while ((n = walk.nextNode())) {
        if (n.nodeValue.includes('$')) textNodes.push(n);
      }

      textNodes.forEach(tn => {
        const parent = tn.parentNode;
        if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') return;
        const text = tn.nodeValue;

        if (text.includes('$$')) {
          const parts = text.split('$$');
          if (parts.length > 2) {
            const fragment = document.createDocumentFragment();
            for (let i = 0; i < parts.length; i++) {
              if (i % 2 === 1) {
                const span = document.createElement('span');
                try {
                  window.katex.render(parts[i], span, { displayMode: true, throwOnError: false });
                } catch (e) { span.textContent = parts[i]; }
                fragment.appendChild(span);
              } else if (parts[i]) {
                fragment.appendChild(document.createTextNode(parts[i]));
              }
            }
            parent.replaceChild(fragment, tn);
          }
        }
      });
    } catch (e) {
      console.warn('KaTeX render error:', e);
    }
  }
}
