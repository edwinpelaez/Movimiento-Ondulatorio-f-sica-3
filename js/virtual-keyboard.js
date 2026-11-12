/**
 * Teclado Virtual Matemático Completo y Elegante
 * Soporta edición contextual en cualquier input de fórmula,
 * inserción en la posición del cursor, selección de funciones,
 * constantes, operadores y plantillas rápidas de ondas.
 */

export class VirtualKeyboard {
  constructor(options = {}) {
    this.activeInput = null;
    this.onInputChange = options.onInputChange || (() => {});
    this.visible = false;
    this.currentTab = 'basico'; // 'basico' | 'funciones' | 'plantillas'

    this.createDOM();
    this.setupListeners();
  }

  createDOM() {
    this.container = document.createElement('div');
    this.container.id = 'virtual-keyboard-dock';
    this.container.className = 'virtual-keyboard-dock hidden';
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-label', 'Teclado Virtual Matemático');

    this.container.innerHTML = `
      <div class="vk-header">
        <div class="vk-tabs">
          <button type="button" class="vk-tab-btn active" data-tab="basico">
            <span class="vk-tab-icon">123</span> Básico
          </button>
          <button type="button" class="vk-tab-btn" data-tab="funciones">
            <span class="vk-tab-icon">f(x)</span> Funciones
          </button>
          <button type="button" class="vk-tab-btn" data-tab="plantillas">
            <span class="vk-tab-icon">⚡</span> Ondas Rápidas
          </button>
        </div>
        <div class="vk-actions">
          <span class="vk-target-hint" id="vk-target-label">Editando Onda</span>
          <button type="button" class="vk-ctrl-btn" id="vk-close-btn" title="Cerrar teclado">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <div class="vk-body">
        <!-- Panel 1: Básico & Variables -->
        <div class="vk-tab-panel active" id="vk-panel-basico">
          <div class="vk-grid">
            <!-- Fila 1: Variables de onda y constantes -->
            <button type="button" class="vk-key vk-var" data-insert="x"><i>x</i></button>
            <button type="button" class="vk-key vk-var" data-insert="t"><i>t</i></button>
            <button type="button" class="vk-key vk-var" data-insert="v"><i>v</i></button>
            <button type="button" class="vk-key vk-const" data-insert="pi">&pi;</button>
            <button type="button" class="vk-key vk-const" data-insert="e"><i>e</i></button>
            <button type="button" class="vk-key vk-action" data-action="backspace" title="Borrar">&larr;</button>

            <!-- Fila 2: 7, 8, 9, /, ^ -->
            <button type="button" class="vk-key" data-insert="7">7</button>
            <button type="button" class="vk-key" data-insert="8">8</button>
            <button type="button" class="vk-key" data-insert="9">9</button>
            <button type="button" class="vk-key vk-op" data-insert=" / ">&divide;</button>
            <button type="button" class="vk-key vk-op" data-insert="^">x<sup>y</sup></button>
            <button type="button" class="vk-key vk-op" data-insert="^2">x<sup>2</sup></button>

            <!-- Fila 3: 4, 5, 6, *, () -->
            <button type="button" class="vk-key" data-insert="4">4</button>
            <button type="button" class="vk-key" data-insert="5">5</button>
            <button type="button" class="vk-key" data-insert="6">6</button>
            <button type="button" class="vk-key vk-op" data-insert=" * ">&times;</button>
            <button type="button" class="vk-key vk-sym" data-insert="(">(</button>
            <button type="button" class="vk-key vk-sym" data-insert=")">)</button>

            <!-- Fila 4: 1, 2, 3, -, frac -->
            <button type="button" class="vk-key" data-insert="1">1</button>
            <button type="button" class="vk-key" data-insert="2">2</button>
            <button type="button" class="vk-key" data-insert="3">3</button>
            <button type="button" class="vk-key vk-op" data-insert=" - ">&minus;</button>
            <button type="button" class="vk-key vk-sym" data-insert="(x - v*t)" title="Fase (x - v*t)">(x - v&middot;t)</button>
            <button type="button" class="vk-key vk-sym" data-insert="(x + v*t)" title="Fase (x + v*t)">(x + v&middot;t)</button>

            <!-- Fila 5: 0, ., +, clear, arrows -->
            <button type="button" class="vk-key" data-insert="0">0</button>
            <button type="button" class="vk-key" data-insert=".">.</button>
            <button type="button" class="vk-key vk-op" data-insert=" + ">+</button>
            <button type="button" class="vk-key vk-action vk-clear" data-action="clear" title="Borrar todo">AC</button>
            <button type="button" class="vk-key vk-action" data-action="left">&ltrif;</button>
            <button type="button" class="vk-key vk-action" data-action="right">&rtrif;</button>
          </div>
        </div>

        <!-- Panel 2: Funciones Matemáticas -->
        <div class="vk-tab-panel" id="vk-panel-funciones">
          <div class="vk-grid-func">
            <button type="button" class="vk-key vk-func" data-insert="sen(" data-cursor-offset="4">sen( &middot; )</button>
            <button type="button" class="vk-key vk-func" data-insert="cos(" data-cursor-offset="4">cos( &middot; )</button>
            <button type="button" class="vk-key vk-func" data-insert="tan(" data-cursor-offset="4">tan( &middot; )</button>
            <button type="button" class="vk-key vk-func" data-insert="exp(" data-cursor-offset="4">exp( &middot; )</button>

            <button type="button" class="vk-key vk-func" data-insert="sqrt(" data-cursor-offset="5">&radic;( &middot; )</button>
            <button type="button" class="vk-key vk-func" data-insert="ln(" data-cursor-offset="3">ln( &middot; )</button>
            <button type="button" class="vk-key vk-func" data-insert="abs(" data-cursor-offset="4">| x |</button>
            <button type="button" class="vk-key vk-func" data-insert="sinc(" data-cursor-offset="5">sinc( &middot; )</button>

            <button type="button" class="vk-key vk-func" data-insert="cosh(" data-cursor-offset="5">cosh( &middot; )</button>
            <button type="button" class="vk-key vk-func" data-insert="sinh(" data-cursor-offset="5">sinh( &middot; )</button>
            <button type="button" class="vk-key vk-func" data-insert="rect(" data-cursor-offset="5">rect( &middot; )</button>
            <button type="button" class="vk-key vk-func" data-insert="step(" data-cursor-offset="5">u(t)</button>
          </div>
        </div>

        <!-- Panel 3: Plantillas Físicas Rápidas -->
        <div class="vk-tab-panel" id="vk-panel-plantillas">
          <div class="vk-templates-list">
            <button type="button" class="vk-template-card" data-template="2 * sen(x - v*t)">
              <div class="vk-tmpl-title">Onda Senoidal Estándar</div>
              <div class="vk-tmpl-math">y(x,t) = 2 &middot; sen(x - v&middot;t)</div>
            </button>
            <button type="button" class="vk-template-card" data-template="2 / (((x - v*t)^4) + 1)">
              <div class="vk-tmpl-title">Pulso Racional Cuártico (Solitón)</div>
              <div class="vk-tmpl-math">y(x,t) = 2 / ((x - v&middot;t)&sup4; + 1)</div>
            </button>
            <button type="button" class="vk-template-card" data-template="3 * exp(-((x - v*t)/1.5)^2)">
              <div class="vk-tmpl-title">Paquete de Onda Gaussiano</div>
              <div class="vk-tmpl-math">y(x,t) = 3 &middot; exp(-((x - v&middot;t)/1.5)&sup2;)</div>
            </button>
            <button type="button" class="vk-template-card" data-template="1.5 * cos(3*x - 3*v*t)">
              <div class="vk-tmpl-title">Armónico Superior</div>
              <div class="vk-tmpl-math">y(x,t) = 1.5 &middot; cos(3x - 3v&middot;t)</div>
            </button>
            <button type="button" class="vk-template-card" data-template="2.5 * sinc(x - v*t)">
              <div class="vk-tmpl-title">Pulso Difractivo (Sinc)</div>
              <div class="vk-tmpl-math">y(x,t) = 2.5 &middot; sinc(x - v&middot;t)</div>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
  }

  setupListeners() {
    // Pestañas
    const tabs = this.container.querySelectorAll('.vk-tab-btn');
    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        tabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.getAttribute('data-tab');
        this.container.querySelectorAll('.vk-tab-panel').forEach(p => p.classList.remove('active'));
        const panel = this.container.querySelector(`#vk-panel-${tab}`);
        if (panel) panel.classList.add('active');
      });
    });

    // Cerrar teclado
    const closeBtn = this.container.querySelector('#vk-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Clicks en teclas de inserción
    this.container.addEventListener('click', (e) => {
      const key = e.target.closest('.vk-key');
      if (key) {
        e.preventDefault();
        const insertText = key.getAttribute('data-insert');
        const action = key.getAttribute('data-action');
        const cursorOffset = key.getAttribute('data-cursor-offset');

        if (insertText !== null) {
          this.insertText(insertText, cursorOffset ? parseInt(cursorOffset, 10) : null);
        } else if (action === 'backspace') {
          this.backspace();
        } else if (action === 'clear') {
          this.clear();
        } else if (action === 'left') {
          this.moveCursor(-1);
        } else if (action === 'right') {
          this.moveCursor(1);
        }
      }

      // Plantillas
      const tmplCard = e.target.closest('.vk-template-card');
      if (tmplCard) {
        e.preventDefault();
        const tmpl = tmplCard.getAttribute('data-template');
        if (tmpl && this.activeInput) {
          this.activeInput.value = tmpl;
          this.activeInput.dispatchEvent(new Event('input', { bubbles: true }));
          this.onInputChange(this.activeInput);
          this.activeInput.focus();
        }
      }
    });
  }

  attachTo(inputElement, label = 'Editando Onda') {
    this.activeInput = inputElement;
    const labelEl = this.container.querySelector('#vk-target-label');
    if (labelEl) labelEl.textContent = label;
    this.show();
  }

  show() {
    this.container.classList.remove('hidden');
    this.visible = true;
  }

  hide() {
    this.container.classList.add('hidden');
    this.visible = false;
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show();
  }

  insertText(text, cursorOffset = null) {
    if (!this.activeInput) return;

    const input = this.activeInput;
    const start = input.selectionStart !== null ? input.selectionStart : input.value.length;
    const end = input.selectionEnd !== null ? input.selectionEnd : input.value.length;
    const val = input.value;

    const newVal = val.substring(0, start) + text + val.substring(end);
    input.value = newVal;

    const newPos = cursorOffset !== null ? start + cursorOffset : start + text.length;
    input.setSelectionRange(newPos, newPos);
    input.focus();

    input.dispatchEvent(new Event('input', { bubbles: true }));
    this.onInputChange(input);
  }

  backspace() {
    if (!this.activeInput) return;
    const input = this.activeInput;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const val = input.value;

    if (start === end) {
      if (start > 0) {
        input.value = val.substring(0, start - 1) + val.substring(end);
        input.setSelectionRange(start - 1, start - 1);
      }
    } else {
      input.value = val.substring(0, start) + val.substring(end);
      input.setSelectionRange(start, start);
    }

    input.focus();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    this.onInputChange(input);
  }

  clear() {
    if (!this.activeInput) return;
    this.activeInput.value = '';
    this.activeInput.focus();
    this.activeInput.dispatchEvent(new Event('input', { bubbles: true }));
    this.onInputChange(this.activeInput);
  }

  moveCursor(delta) {
    if (!this.activeInput) return;
    const input = this.activeInput;
    const pos = Math.max(0, Math.min(input.value.length, input.selectionStart + delta));
    input.setSelectionRange(pos, pos);
    input.focus();
  }
}
