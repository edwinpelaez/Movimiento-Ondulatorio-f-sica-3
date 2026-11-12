/**
 * doppler-ui.js
 * Controlador de Interfaz de Usuario, Gráficas, Telemetría,
 * Matemáticas (KaTeX/LaTeX) y Escenarios Didácticos del Efecto Doppler.
 */

import { DopplerPhysics } from './doppler-physics.js';
import { DopplerAudio } from './doppler-audio.js';
import { DopplerCanvas } from './doppler-canvas.js';

export class DopplerUI {
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

    // Iniciar loop de animación — siempre fresco al montar (el canvas es nuevo)
    this._animLoopRunning = false; // Detiene cualquier loop anterior
    this._animLoopStarted = false;
    // Usar setTimeout para ceder al browser un ciclo de layout antes de renderizar
    setTimeout(() => {
      this.startAnimationLoop();
      this._animLoopStarted = true;
    }, 0);

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
    this._animLoopRunning = true; // Marca este loop como activo
    const loop = (currentTime) => {
      if (!this._animLoopRunning) return; // Cancelar si se re-montó

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
              if (this.audio) {
                const ratio = (arrival && arrival.fMeasured && this.physics.f > 0) ? (arrival.fMeasured / this.physics.f) : 1.0;
                if (typeof this.audio.triggerArrivalPulse === 'function') {
                  this.audio.triggerArrivalPulse(ratio);
                } else if (typeof this.audio.playArrivalPulse === 'function') {
                  this.audio.playArrivalPulse(arrival.waveId, ratio);
                }
              }
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
    const posF = typeof this.physics.getSourcePosition === 'function' ? this.physics.getSourcePosition(t) : this.physics.getSourcePos(t);
    const posO = typeof this.physics.getObserverPosition === 'function' ? this.physics.getObserverPosition(t) : this.physics.getObserverPos(t);
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
