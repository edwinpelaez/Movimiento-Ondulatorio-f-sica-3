/**
 * FÍSICA 3: MOVIMIENTO ONDULATORIO — BUNDLE COMPLETO STANDALONE
 * Apertura directa de index.html (doble clic / file://) — sin servidor.
 * Autores: Edwin Santiago Peláez · Camila Rengifo · Alejandra Barreto
 * Universidad Tecnológica de Pereira (UTP) — 1.ª Edición Digital 2026
 */
(function(global) {
  'use strict';


/* ======================== math-engine.js ======================== */
/**
 * Motor Matemático y Compilador de Expresiones de Onda
 * Admite variables: x (posición), t (tiempo), v (velocidad)
 * Admite funciones: sen/sin, cos, tan/tg, exp, ln/log, sqrt/raiz, abs, sinc, rect, step
 * Admite constantes: pi (π), e
 * Maneja multiplicación implícita, operadores unarios, potencias '^' y fracciones
 * Genera LaTeX para KaTeX y compila a funciones nativas ultrarrápidas
 */

class MathEngine {
  /**
   * Tokeniza la cadena de entrada
   * @param {string} str 
   * @returns {Array<{type: string, value: any, text?: string}>}
   */
  static tokenize(str) {
    if (!str || typeof str !== 'string') return [];
    const tokens = [];
    let i = 0;
    const s = str
      .replace(/·|×/g, '*')
      .replace(/÷/g, '/')
      .replace(/π/g, 'pi');

    while (i < s.length) {
      const ch = s[i];

      // Espacios
      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      // Números (enteros y decimales)
      if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < s.length && /[0-9]/.test(s[i + 1]))) {
        let numStr = '';
        while (i < s.length && /[0-9.]/.test(s[i])) {
          numStr += s[i++];
        }
        tokens.push({ type: 'num', value: parseFloat(numStr), text: numStr });
        continue;
      }

      // Identificadores (variables, funciones, constantes)
      if (/[a-zA-Z_]/.test(ch)) {
        let id = '';
        while (i < s.length && /[a-zA-Z0-9_]/.test(s[i])) {
          id += s[i++];
        }
        const lower = id.toLowerCase();
        let normalized = lower;
        if (lower === 'sen') normalized = 'sin';
        if (lower === 'tg') normalized = 'tan';
        if (lower === 'raiz') normalized = 'sqrt';
        if (lower === 'log') normalized = 'ln';

        tokens.push({ type: 'ident', value: normalized, original: id });
        continue;
      }

      // Operadores y delimitadores
      if ('+-*/^(),'.includes(ch)) {
        tokens.push({ type: 'op', value: ch });
        i++;
        continue;
      }

      i++; // Omitir caracteres no reconocidos
    }

    // Insertar multiplicaciones implícitas
    // Ejemplos: 2x -> 2*x, 2(x) -> 2*(x), (a)(b) -> (a)*(b), x t -> x*t, 2sen(x) -> 2*sen(x)
    const processed = [];
    const KNOWN_FUNCS = new Set(['sin', 'cos', 'tan', 'exp', 'ln', 'sqrt', 'abs', 'sinc', 'rect', 'step', 'cosh', 'sinh', 'tanh']);
    const KNOWN_VARS = new Set(['x', 't', 'v', 'pi', 'e']);

    for (let k = 0; k < tokens.length; k++) {
      const curr = tokens[k];
      processed.push(curr);

      if (k + 1 < tokens.length) {
        const next = tokens[k + 1];

        const isCurrNum = curr.type === 'num';
        const isCurrIdent = curr.type === 'ident';
        const isCurrRParen = curr.type === 'op' && curr.value === ')';

        const isNextLParen = next.type === 'op' && next.value === '(';
        const isNextIdent = next.type === 'ident';
        const isNextNum = next.type === 'num';

        // 2x o 2sen(x) o 2(x)
        if (isCurrNum && (isNextIdent || isNextLParen)) {
          processed.push({ type: 'op', value: '*' });
        }
        // ) ( o )x o )2
        else if (isCurrRParen && (isNextLParen || isNextIdent || isNextNum)) {
          processed.push({ type: 'op', value: '*' });
        }
        // x y o x sen(x) o x(t) [cuando x no es función]
        else if (isCurrIdent && !KNOWN_FUNCS.has(curr.value)) {
          if (isNextLParen || isNextIdent || isNextNum) {
            processed.push({ type: 'op', value: '*' });
          }
        }
      }
    }

    return processed;
  }

  /**
   * Construye un AST o código JS compilado a partir de los tokens usando Shunting-Yard
   * @param {string} rawExpr 
   */
  static parse(rawExpr) {
    const tokens = this.tokenize(rawExpr);
    if (tokens.length === 0) {
      return { js: '0', latex: '0', error: null };
    }

    const KNOWN_FUNCS = new Set(['sin', 'cos', 'tan', 'exp', 'ln', 'sqrt', 'abs', 'sinc', 'rect', 'step', 'cosh', 'sinh', 'tanh']);
    const KNOWN_CONSTS = { 'pi': 'Math.PI', 'e': 'Math.E' };
    const KNOWN_VARS = new Set(['x', 't', 'v']);

    // Precedencias de operadores matemáticos estándar (^ supera a u-)
    const precedence = {
      '^': 4,  // Exponenciación (asociativo por derecha)
      'u-': 3, // Unario negativo
      'u+': 3, // Unario positivo
      '*': 2,
      '/': 2,
      '+': 1,
      '-': 1
    };

    const isRightAssociative = (op) => op === '^' || op === 'u-' || op === 'u+';

    const outputQueue = [];
    const opStack = [];

    let mayBeUnary = true;

    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];

      if (tok.type === 'num') {
        outputQueue.push({ type: 'num', value: tok.value, text: tok.text });
        mayBeUnary = false;
      } else if (tok.type === 'ident') {
        if (KNOWN_FUNCS.has(tok.value)) {
          opStack.push({ type: 'func', value: tok.value });
          mayBeUnary = true;
        } else if (KNOWN_CONSTS[tok.value]) {
          outputQueue.push({ type: 'const', value: tok.value, js: KNOWN_CONSTS[tok.value] });
          mayBeUnary = false;
        } else if (KNOWN_VARS.has(tok.value)) {
          outputQueue.push({ type: 'var', value: tok.value });
          mayBeUnary = false;
        } else {
          // Identificador no reconocido: lo tratamos como variable o constante 1
          outputQueue.push({ type: 'var', value: tok.value });
          mayBeUnary = false;
        }
      } else if (tok.type === 'op') {
        if (tok.value === '(') {
          opStack.push(tok);
          mayBeUnary = true;
        } else if (tok.value === ')') {
          while (opStack.length > 0 && opStack[opStack.length - 1].value !== '(') {
            outputQueue.push(opStack.pop());
          }
          if (opStack.length === 0) {
            return { error: 'Paréntesis desbalanceados' };
          }
          opStack.pop(); // Sacar '('
          if (opStack.length > 0 && opStack[opStack.length - 1].type === 'func') {
            outputQueue.push(opStack.pop());
          }
          mayBeUnary = false;
        } else if (tok.value === ',') {
          while (opStack.length > 0 && opStack[opStack.length - 1].value !== '(') {
            outputQueue.push(opStack.pop());
          }
          mayBeUnary = true;
        } else {
          // Operador binario o unario (+, -, *, /, ^)
          let op = tok.value;
          if (mayBeUnary && (op === '-' || op === '+')) {
            op = 'u' + op; // 'u-' o 'u+'
          }

          while (opStack.length > 0) {
            const top = opStack[opStack.length - 1];
            if (top.type === 'func') {
              outputQueue.push(opStack.pop());
              continue;
            }
            if (top.type === 'op' && top.value !== '(') {
              const topPrec = precedence[top.value] || 0;
              const currPrec = precedence[op] || 0;
              if (topPrec > currPrec || (topPrec === currPrec && !isRightAssociative(op))) {
                outputQueue.push(opStack.pop());
                continue;
              }
            }
            break;
          }

          opStack.push({ type: 'op', value: op });
          mayBeUnary = true;
        }
      }
    }

    while (opStack.length > 0) {
      const top = opStack.pop();
      if (top.value === '(' || top.value === ')') {
        return { error: 'Paréntesis desbalanceados' };
      }
      outputQueue.push(top);
    }

    // Convertir RPN a Código JS y a LaTeX
    const evalStack = [];
    const latexStack = [];

    for (const item of outputQueue) {
      if (item.type === 'num') {
        evalStack.push(String(item.value));
        latexStack.push(String(item.value));
      } else if (item.type === 'const') {
        evalStack.push(item.js);
        latexStack.push(item.value === 'pi' ? '\\pi' : 'e');
      } else if (item.type === 'var') {
        evalStack.push(item.value);
        latexStack.push(item.value);
      } else if (item.type === 'func') {
        const arg = evalStack.pop() || '0';
        const argLatex = latexStack.pop() || '0';
        const f = item.value;

        let jsFn = '';
        let latFn = '';

        if (f === 'sin') { jsFn = `Math.sin(${arg})`; latFn = `\\sin(${argLatex})`; }
        else if (f === 'cos') { jsFn = `Math.cos(${arg})`; latFn = `\\cos(${argLatex})`; }
        else if (f === 'tan') { jsFn = `Math.tan(${arg})`; latFn = `\\tan(${argLatex})`; }
        else if (f === 'exp') { jsFn = `Math.exp(${arg})`; latFn = `e^{${argLatex}}`; }
        else if (f === 'ln') { jsFn = `Math.log(${arg})`; latFn = `\\ln(${argLatex})`; }
        else if (f === 'sqrt') { jsFn = `Math.sqrt(${arg})`; latFn = `\\sqrt{${argLatex}}`; }
        else if (f === 'abs') { jsFn = `Math.abs(${arg})`; latFn = `|${argLatex}|`; }
        else if (f === 'sinc') { jsFn = `_sinc(${arg})`; latFn = `\\text{sinc}(${argLatex})`; }
        else if (f === 'rect') { jsFn = `_rect(${arg})`; latFn = `\\text{rect}(${argLatex})`; }
        else if (f === 'step') { jsFn = `_step(${arg})`; latFn = `\\text{u}(${argLatex})`; }
        else { jsFn = `Math.${f}(${arg})`; latFn = `\\text{${f}}(${argLatex})`; }

        evalStack.push(jsFn);
        latexStack.push(latFn);
      } else if (item.type === 'op') {
        if (item.value === 'u-') {
          const a = evalStack.pop() || '0';
          const aL = latexStack.pop() || '0';
          evalStack.push(`(-(${a}))`);
          latexStack.push(`-${aL}`);
        } else if (item.value === 'u+') {
          // No-op
        } else {
          const b = evalStack.pop() || '0';
          const a = evalStack.pop() || '0';
          const bL = latexStack.pop() || '0';
          const aL = latexStack.pop() || '0';

          if (item.value === '+') {
            evalStack.push(`((${a}) + (${b}))`);
            latexStack.push(`${aL} + ${bL}`);
          } else if (item.value === '-') {
            evalStack.push(`((${a}) - (${b}))`);
            latexStack.push(`${aL} - ${bL}`);
          } else if (item.value === '*') {
            evalStack.push(`((${a}) * (${b}))`);
            latexStack.push(`${aL} \\cdot ${bL}`);
          } else if (item.value === '/') {
            evalStack.push(`((${a}) / (${b}))`);
            latexStack.push(`\\frac{${aL}}{${bL}}`);
          } else if (item.value === '^') {
            evalStack.push(`Math.pow((${a}), (${b}))`);
            latexStack.push(`{(${aL})}^{${bL}}`);
          }
        }
      }
    }

    const finalJS = evalStack.pop() || '0';
    let finalLatex = latexStack.pop() || '0';

    // Limpieza menor de LaTeX
    finalLatex = finalLatex.replace(/\{\(([^)]+)\)\}/g, '{$1}');

    return { js: finalJS, latex: finalLatex, error: null };
  }

  /**
   * Valida sintácticamente y compila la expresión a una función (x, t, v)
   * @param {string} rawExpr 
   */
  static compile(rawExpr) {
    if (!rawExpr || !rawExpr.trim()) {
      return { fn: () => 0, valid: true, latex: '0' };
    }

    try {
      const parsed = this.parse(rawExpr);
      if (parsed.error) {
        return { fn: () => NaN, valid: false, error: parsed.error, latex: rawExpr };
      }

      const fnBody = `
        const _sinc = (u) => Math.abs(u) < 1e-9 ? 1 : Math.sin(u) / u;
        const _rect = (u) => Math.abs(u) <= 0.5 ? 1 : 0;
        const _step = (u) => u >= 0 ? 1 : 0;
        try {
          const val = (${parsed.js});
          return (typeof val === 'number' && Number.isFinite(val)) ? val : (isNaN(val) ? NaN : (val > 0 ? 1e6 : -1e6));
        } catch (e) {
          return NaN;
        }
      `;

      const compiledFn = new Function('x', 't', 'v', fnBody);

      // Verificación con valores reales
      const testVal = compiledFn(0, 0, 1);
      if (typeof testVal !== 'number') {
        return { fn: () => NaN, valid: false, error: 'La función no retorna números válidos', latex: parsed.latex };
      }

      return { fn: compiledFn, valid: true, latex: parsed.latex, js: parsed.js };
    } catch (err) {
      return { fn: () => NaN, valid: false, error: err.message, latex: rawExpr };
    }
  }

  /**
   * Obtiene la representación LaTeX para visualización con KaTeX
   * @param {string} rawExpr 
   */
  static toLaTeX(rawExpr) {
    const res = this.compile(rawExpr);
    return res.latex || rawExpr;
  }

  /**
   * Muestreo adaptado con detección de discontinuidades y singularidades
   * @param {Function} fn 
   * @param {number} xMin 
   * @param {number} xMax 
   * @param {number} t 
   * @param {number} v 
   * @param {number} baseSteps 
   * @param {number} maxDeltaY 
   * @returns {Array<Array<{x: number, y: number}>>}
   */
  static evaluateSegments(fn, xMin, xMax, t, v, baseSteps = 600, maxDeltaY = 50) {
    const segments = [];
    let currentSegment = [];
    const dx = (xMax - xMin) / baseSteps;

    let prevY = null;

    for (let i = 0; i <= baseSteps; i++) {
      const x = xMin + i * dx;
      const y = fn(x, t, v);

      if (Number.isNaN(y) || !Number.isFinite(y)) {
        if (currentSegment.length > 0) {
          segments.push(currentSegment);
          currentSegment = [];
        }
        prevY = null;
        continue;
      }

      // Corte en saltos asintóticos
      if (prevY !== null) {
        const dy = Math.abs(y - prevY);
        if (dy > maxDeltaY && (y * prevY < 0 || dy / dx > 250)) {
          if (currentSegment.length > 0) {
            segments.push(currentSegment);
            currentSegment = [];
          }
        }
      }

      currentSegment.push({ x, y });
      prevY = y;
    }

    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    return segments;
  }
}


/* ======================== wave-model.js ======================== */
/**
 * Modelo de Datos para Ondas Componentes y Superposición
 */

class WaveComponent {
  constructor(options = {}) {
    this.id = options.id || 'wave_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    this.name = options.name || 'Onda';
    this.rawExpr = options.rawExpr || 'sen(x - v*t)';
    this.v = options.v !== undefined ? options.v : 2.0; // Velocidad de propagación
    this.color = options.color || '#3b82f6';
    this.lineWidth = options.lineWidth !== undefined ? options.lineWidth : 2.5;
    this.lineDash = options.lineDash || []; // [] sólido, [6, 4] punteado, etc.
    this.opacity = options.opacity !== undefined ? options.opacity : 0.85;
    this.visible = options.visible !== undefined ? options.visible : true; // Mostrar/ocultar en lienzo
    this.inSum = options.inSum !== undefined ? options.inSum : true; // Incluir/excluir en superposición
    this.showVector = options.showVector !== undefined ? options.showVector : true; // Mostrar flecha de velocidad

    this.recompile();
  }

  recompile() {
    this.compiled = MathEngine.compile(this.rawExpr);
  }

  setExpression(expr) {
    this.rawExpr = expr;
    this.recompile();
  }

  evaluate(x, t) {
    if (!this.compiled || !this.compiled.valid) return 0;
    const y = this.compiled.fn(x, t, this.v);
    return Number.isFinite(y) ? y : 0;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      rawExpr: this.rawExpr,
      v: this.v,
      color: this.color,
      lineWidth: this.lineWidth,
      lineDash: this.lineDash,
      opacity: this.opacity,
      visible: this.visible,
      inSum: this.inSum,
      showVector: this.showVector
    };
  }

  static fromJSON(data) {
    return new WaveComponent(data);
  }
}

class WaveStore {
  constructor() {
    this.waves = [];
    this.resultantStyle = {
      visible: true,
      name: 'Onda Resultante (Superposición)',
      color: '#f43f5e', // Rosa/Rojo neón de alto impacto
      lineWidth: 3.5,
      lineDash: [],
      opacity: 1.0,
      glow: true,
      glowColor: 'rgba(244, 63, 94, 0.4)',
      glowBlur: 10
    };

    // Paleta de colores predeterminados para nuevas ondas
    this.colorPalette = [
      '#06b6d4', // Cyan
      '#3b82f6', // Azul real
      '#8b5cf6', // Violeta
      '#ec4899', // Rosa
      '#10b981', // Esmeralda
      '#f59e0b', // Ámbar
      '#6366f1', // Índigo
      '#14b8a6'  // Teal
    ];
    this.nextColorIndex = 0;
  }

  getNextColor() {
    const color = this.colorPalette[this.nextColorIndex % this.colorPalette.length];
    this.nextColorIndex++;
    return color;
  }

  addWave(options = {}) {
    if (!options.color) {
      options.color = this.getNextColor();
    }
    const wave = new WaveComponent(options);
    this.waves.push(wave);
    return wave;
  }

  removeWave(id) {
    const idx = this.waves.findIndex(w => w.id === id);
    if (idx !== -1) {
      this.waves.splice(idx, 1);
      return true;
    }
    return false;
  }

  getWave(id) {
    return this.waves.find(w => w.id === id);
  }

  clear() {
    this.waves = [];
    this.nextColorIndex = 0;
  }

  /**
   * Evalúa el valor de la onda resultante en (x, t) sumando únicamente
   * las componentes que tienen `inSum === true` y compilación válida.
   */
  evaluateResultant(x, t) {
    let total = 0;
    for (const wave of this.waves) {
      if (wave.inSum && wave.compiled && wave.compiled.valid) {
        const val = wave.compiled.fn(x, t, wave.v);
        if (Number.isFinite(val)) {
          total += val;
        }
      }
    }
    return total;
  }

  /**
   * Obtiene la inspección punto a punto en una coordenada x_0 y tiempo t
   */
  inspectAt(x0, t) {
    const components = [];
    let sum = 0;

    for (const wave of this.waves) {
      let val = 0;
      if (wave.compiled && wave.compiled.valid) {
        val = wave.compiled.fn(x0, t, wave.v);
        if (!Number.isFinite(val)) val = 0;
      }
      if (wave.inSum) {
        sum += val;
      }
      components.push({
        id: wave.id,
        name: wave.name,
        color: wave.color,
        value: val,
        visible: wave.visible,
        inSum: wave.inSum
      });
    }

    return {
      x: x0,
      t: t,
      components,
      resultantValue: sum
    };
  }

  toJSON() {
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      resultantStyle: this.resultantStyle,
      waves: this.waves.map(w => w.toJSON())
    };
  }

  loadJSON(data) {
    if (!data || !Array.isArray(data.waves)) {
      throw new Error('Formato JSON inválido');
    }
    this.clear();
    if (data.resultantStyle) {
      this.resultantStyle = { ...this.resultantStyle, ...data.resultantStyle };
    }
    for (const waveData of data.waves) {
      this.addWave(waveData);
    }
  }
}


/* ======================== graph-renderer.js ======================== */
/**
 * Renderizador de Gráficos Cartesianos Estilo GeoGebra
 * Con cuadrícula mayor, menor (papel milimetrado), ticks, marcas numéricas,
 * reglas sobre ejes, flechas de propagación, manejo HiDPI,
 * escalamiento manual individual de ejes y soporte táctil / mouse.
 */

class GraphRenderer {
  /**
   * @param {HTMLCanvasElement} canvas 
   * @param {Object} options 
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Estado de la vista en coordenadas matemáticas
    this.originX = options.originX || canvas.width / 2;
    this.originY = options.originY || canvas.height / 2;
    this.scaleX = options.scaleX || 50; // Píxeles por unidad en X
    this.scaleY = options.scaleY || 50; // Píxeles por unidad en Y
    this.lockAspectRatio = options.lockAspectRatio !== undefined ? options.lockAspectRatio : true;

    // Configuración de Estilo Visual
    this.style = {
      theme: 'dark', // 'dark' | 'light' | 'millimeter'
      bgColor: '#0b0f19',
      axisColor: '#94a3b8',
      axisWidth: 2.0,
      majorGridColor: '#334155',
      majorGridWidth: 1.0,
      majorGridDash: [],
      majorGridOpacity: 0.6,
      minorGridColor: '#1e293b',
      minorGridWidth: 0.6,
      minorGridDash: [2, 2],
      minorGridOpacity: 0.5,
      showMinorGrid: true,
      showMajorGrid: true,
      fontSize: 12,
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      textColor: '#cbd5e1',
      vectorColor: '#38bdf8',
      vectorScale: 15, // Píxeles por unidad de velocidad
      showVectors: true,
      crosshairColor: '#e2e8f0',
      showRules: true
    };

    if (options.style) {
      Object.assign(this.style, options.style);
    }

    // Estado del cursor e interacción
    this.isDragging = false;
    this.dragMode = 'pan'; // 'pan' | 'scaleX' | 'scaleY'
    this.lastMousePos = { x: 0, y: 0 };
    this.inspectorActive = false;
    this.inspectorX = null; // Posición X en coordenadas matemáticas
    this.hoverPos = null; // Posición de mouse en pantalla

    this.dpr = window.devicePixelRatio || 1;

    this.setupEvents();
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    // Fallback en cascada: BoundingClientRect → offsetWidth/Height → padre → bisabuelo → 800×270
    const cssW = rect.width  > 0 ? rect.width
               : this.canvas.offsetWidth  > 0 ? this.canvas.offsetWidth
               : this.canvas.parentElement?.clientWidth  > 0 ? this.canvas.parentElement.clientWidth
               : this.canvas.parentElement?.parentElement?.clientWidth  > 0 ? this.canvas.parentElement.parentElement.clientWidth
               : 800;
    const cssH = rect.height > 0 ? rect.height
               : this.canvas.offsetHeight > 0 ? this.canvas.offsetHeight
               : this.canvas.parentElement?.clientHeight > 0 ? this.canvas.parentElement.clientHeight
               : this.canvas.parentElement?.parentElement?.clientHeight > 0 ? this.canvas.parentElement.parentElement.clientHeight
               : 270;

    if (cssW === 0 || cssH === 0) return;

    this.dpr = window.devicePixelRatio || 1;
    const oldWidth = this.canvas.width / this.dpr;
    const oldHeight = this.canvas.height / this.dpr;

    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);

    // Primera inicialización: centrar el origen matemático
    if (!this.initialized || oldWidth === 0) {
      this.originX = cssW / 2;
      this.originY = cssH / 2;
      this.initialized = true;
    } else {
      // Ajustar origen proporcionalmente al nuevo tamaño
      const dxRatio = cssW / (oldWidth || cssW);
      const dyRatio = cssH / (oldHeight || cssH);
      this.originX *= dxRatio;
      this.originY *= dyRatio;
    }
  }


  // Conversiones de coordenadas
  mathToScreen(x, y) {
    return {
      x: this.originX + x * this.scaleX,
      y: this.originY - y * this.scaleY
    };
  }

  screenToMath(sx, sy) {
    return {
      x: (sx - this.originX) / this.scaleX,
      y: (this.originY - sy) / this.scaleY
    };
  }

  getBounds() {
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;
    return {
      xMin: (0 - this.originX) / this.scaleX,
      xMax: (width - this.originX) / this.scaleX,
      yMin: (this.originY - height) / this.scaleY,
      yMax: (this.originY - 0) / this.scaleY,
      width,
      height
    };
  }

  /**
   * Cálculo de paso "agradable" (1, 2, 5 * 10^k)
   */
  calculateNiceStep(scale, targetPx = 80) {
    const unitsPerTarget = targetPx / scale;
    const exponent = Math.floor(Math.log10(unitsPerTarget));
    const fraction = unitsPerTarget / Math.pow(10, exponent);

    let niceFraction;
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3.5) niceFraction = 2;
    else if (fraction < 7.5) niceFraction = 5;
    else niceFraction = 10;

    return niceFraction * Math.pow(10, exponent);
  }

  setupEvents() {
    let initialPinchDist = null;
    let initialScale = null;

    const onMouseDown = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      // Verificar si el click fue cerca del eje X o Y para reescalar ese eje (estilo GeoGebra)
      const nearAxisThreshold = 20;
      const isNearXAxis = Math.abs(sy - this.originY) < nearAxisThreshold;
      const isNearYAxis = Math.abs(sx - this.originX) < nearAxisThreshold;

      if (isNearXAxis && !isNearYAxis && !this.lockAspectRatio) {
        this.dragMode = 'scaleX';
      } else if (isNearYAxis && !isNearXAxis && !this.lockAspectRatio) {
        this.dragMode = 'scaleY';
      } else {
        this.dragMode = 'pan';
      }

      this.isDragging = true;
      this.lastMousePos = { x: sx, y: sy };
    };

    const onMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      this.hoverPos = { x: sx, y: sy };

      const math = this.screenToMath(sx, sy);
      this.inspectorX = math.x;

      if (!this.isDragging) {
        // Actualizar cursor según cercanía a los ejes
        const nearAxisThreshold = 18;
        const isNearXAxis = Math.abs(sy - this.originY) < nearAxisThreshold;
        const isNearYAxis = Math.abs(sx - this.originX) < nearAxisThreshold;

        if (!this.lockAspectRatio && isNearXAxis && !isNearYAxis) {
          this.canvas.style.cursor = 'col-resize';
        } else if (!this.lockAspectRatio && isNearYAxis && !isNearXAxis) {
          this.canvas.style.cursor = 'row-resize';
        } else {
          this.canvas.style.cursor = this.inspectorActive ? 'crosshair' : 'grab';
        }
        return;
      }

      const dx = sx - this.lastMousePos.x;
      const dy = sy - this.lastMousePos.y;

      if (this.dragMode === 'pan') {
        this.originX += dx;
        this.originY += dy;
        this.canvas.style.cursor = 'grabbing';
      } else if (this.dragMode === 'scaleX') {
        const factor = 1 + dx * 0.01;
        this.scaleX = Math.max(5, Math.min(2000, this.scaleX * factor));
      } else if (this.dragMode === 'scaleY') {
        const factor = 1 - dy * 0.01;
        this.scaleY = Math.max(5, Math.min(2000, this.scaleY * factor));
      }

      this.lastMousePos = { x: sx, y: sy };
    };

    const onMouseUp = () => {
      this.isDragging = false;
      this.canvas.style.cursor = this.inspectorActive ? 'crosshair' : 'grab';
    };

    const onWheel = (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      this.zoomAt(sx, sy, zoomFactor);
    };

    // Soporte táctil móvil (Pan y Pinch-to-zoom)
    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        const rect = this.canvas.getBoundingClientRect();
        const sx = e.touches[0].clientX - rect.left;
        const sy = e.touches[0].clientY - rect.top;
        this.isDragging = true;
        this.dragMode = 'pan';
        this.lastMousePos = { x: sx, y: sy };
        this.inspectorX = this.screenToMath(sx, sy).x;
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDist = Math.hypot(dx, dy);
        initialScale = { sx: this.scaleX, sy: this.scaleY };
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 1 && this.isDragging) {
        const rect = this.canvas.getBoundingClientRect();
        const sx = e.touches[0].clientX - rect.left;
        const sy = e.touches[0].clientY - rect.top;
        const dx = sx - this.lastMousePos.x;
        const dy = sy - this.lastMousePos.y;
        this.originX += dx;
        this.originY += dy;
        this.lastMousePos = { x: sx, y: sy };
        this.inspectorX = this.screenToMath(sx, sy).x;
      } else if (e.touches.length === 2 && initialPinchDist && initialScale) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const factor = dist / initialPinchDist;

        const rect = this.canvas.getBoundingClientRect();
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

        this.zoomAt(midX, midY, factor / (this.lastTouchFactor || 1));
        this.lastTouchFactor = factor;
      }
    };

    const onTouchEnd = () => {
      this.isDragging = false;
      initialPinchDist = null;
      initialScale = null;
      this.lastTouchFactor = 1;
    };

    this.canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    this.canvas.addEventListener('wheel', onWheel, { passive: false });

    this.canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    this.canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    this.canvas.addEventListener('touchend', onTouchEnd, { passive: true });
  }

  zoomAt(screenX, screenY, factor) {
    const mathBefore = this.screenToMath(screenX, screenY);

    const minScale = 5;
    const maxScale = 3000;
    const newScaleX = Math.max(minScale, Math.min(maxScale, this.scaleX * factor));
    const newScaleY = this.lockAspectRatio ? newScaleX : Math.max(minScale, Math.min(maxScale, this.scaleY * factor));

    this.scaleX = newScaleX;
    this.scaleY = newScaleY;

    // Mantener fijo el punto bajo el cursor
    this.originX = screenX - mathBefore.x * this.scaleX;
    this.originY = screenY + mathBefore.y * this.scaleY;
  }

  zoomIn() {
    const bounds = this.getBounds();
    this.zoomAt(bounds.width / 2, bounds.height / 2, 1.25);
  }

  zoomOut() {
    const bounds = this.getBounds();
    this.zoomAt(bounds.width / 2, bounds.height / 2, 0.8);
  }

  resetView() {
    const bounds = this.getBounds();
    this.originX = bounds.width / 2;
    this.originY = bounds.height / 2;
    this.scaleX = 50;
    this.scaleY = 50;
  }

  autoFit(waves = []) {
    const bounds = this.getBounds();
    this.originX = bounds.width * 0.15; // Origen a la izquierda para ver propagación hacia la derecha
    this.originY = bounds.height / 2;
    this.scaleX = 45;
    this.scaleY = 55;
  }

  // ================= RENDERIZADO =================

  render(waveStore, t) {
    const ctx = this.ctx;
    const dpr = this.dpr;
    const bounds = this.getBounds();
    const w = bounds.width;
    const h = bounds.height;

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Limpieza de fondo
    ctx.fillStyle = this.style.bgColor;
    ctx.fillRect(0, 0, w, h);

    // 2. Cuadrícula GeoGebra (Menor y Mayor)
    this.renderGrids(ctx, bounds);

    // 3. Ejes Cartesianos, marcas y números
    this.renderAxes(ctx, bounds);

    // 4. Ondas Componentes
    for (const wave of waveStore.waves) {
      if (wave.visible && wave.compiled && wave.compiled.valid) {
        this.renderWave(ctx, wave, bounds, t);
        if (this.style.showVectors && wave.showVector && Math.abs(wave.v) > 0.05) {
          this.renderVelocityVectors(ctx, wave, bounds, t);
        }
      }
    }

    // 5. Onda Resultante (Superposición)
    if (waveStore.resultantStyle.visible) {
      this.renderResultant(ctx, waveStore, bounds, t);
    }

    // 6. Inspector de punto (Sonda de coordenadas)
    if (this.inspectorActive && this.inspectorX !== null) {
      this.renderInspector(ctx, waveStore, bounds, t);
    }

    ctx.restore();
  }

  renderGrids(ctx, bounds) {
    const stepX = this.calculateNiceStep(this.scaleX, 80);
    const stepY = this.calculateNiceStep(this.scaleY, 80);

    const minorSubdivisions = 5;
    const minorStepX = stepX / minorSubdivisions;
    const minorStepY = stepY / minorSubdivisions;

    // --- Cuadrícula Menor (Estilo papel milimetrado) ---
    if (this.style.showMinorGrid && (minorStepX * this.scaleX >= 10)) {
      ctx.save();
      ctx.strokeStyle = this.style.minorGridColor;
      ctx.lineWidth = this.style.minorGridWidth;
      ctx.globalAlpha = this.style.minorGridOpacity;
      if (this.style.minorGridDash.length > 0) {
        ctx.setLineDash(this.style.minorGridDash);
      }

      ctx.beginPath();
      const startX = Math.floor(bounds.xMin / minorStepX) * minorStepX;
      for (let x = startX; x <= bounds.xMax; x += minorStepX) {
        const sx = Math.round(this.originX + x * this.scaleX);
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, bounds.height);
      }

      const startY = Math.floor(bounds.yMin / minorStepY) * minorStepY;
      for (let y = startY; y <= bounds.yMax; y += minorStepY) {
        const sy = Math.round(this.originY - y * this.scaleY);
        ctx.moveTo(0, sy);
        ctx.lineTo(bounds.width, sy);
      }
      ctx.stroke();
      ctx.restore();
    }

    // --- Cuadrícula Mayor ---
    if (this.style.showMajorGrid) {
      ctx.save();
      ctx.strokeStyle = this.style.majorGridColor;
      ctx.lineWidth = this.style.majorGridWidth;
      ctx.globalAlpha = this.style.majorGridOpacity;
      if (this.style.majorGridDash.length > 0) {
        ctx.setLineDash(this.style.majorGridDash);
      }

      ctx.beginPath();
      const startX = Math.floor(bounds.xMin / stepX) * stepX;
      for (let x = startX; x <= bounds.xMax; x += stepX) {
        const sx = Math.round(this.originX + x * this.scaleX);
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, bounds.height);
      }

      const startY = Math.floor(bounds.yMin / stepY) * stepY;
      for (let y = startY; y <= bounds.yMax; y += stepY) {
        const sy = Math.round(this.originY - y * this.scaleY);
        ctx.moveTo(0, sy);
        ctx.lineTo(bounds.width, sy);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  renderAxes(ctx, bounds) {
    const ox = this.originX;
    const oy = this.originY;
    const w = bounds.width;
    const h = bounds.height;

    const stepX = this.calculateNiceStep(this.scaleX, 80);
    const stepY = this.calculateNiceStep(this.scaleY, 80);

    ctx.save();
    ctx.strokeStyle = this.style.axisColor;
    ctx.lineWidth = this.style.axisWidth;
    ctx.fillStyle = this.style.textColor;
    ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`;

    // Líneas de ejes
    ctx.beginPath();
    // Eje X
    const clampedY = Math.max(0, Math.min(h, oy));
    ctx.moveTo(0, clampedY);
    ctx.lineTo(w, clampedY);
    // Eje Y
    const clampedX = Math.max(0, Math.min(w, ox));
    ctx.moveTo(clampedX, 0);
    ctx.lineTo(clampedX, h);
    ctx.stroke();

    // Flechas de dirección de ejes (estilo GeoGebra)
    const arrowSize = 8;
    ctx.fillStyle = this.style.axisColor;
    // Flecha +X
    ctx.beginPath();
    ctx.moveTo(w - arrowSize * 1.5, clampedY - arrowSize * 0.6);
    ctx.lineTo(w, clampedY);
    ctx.lineTo(w - arrowSize * 1.5, clampedY + arrowSize * 0.6);
    ctx.fill();

    // Flecha +Y
    ctx.beginPath();
    ctx.moveTo(clampedX - arrowSize * 0.6, arrowSize * 1.5);
    ctx.lineTo(clampedX, 0);
    ctx.lineTo(clampedX + arrowSize * 0.6, arrowSize * 1.5);
    ctx.fill();

    // Ticks y Marcas Numéricas en Eje X
    const tickLen = 6;
    const startX = Math.floor(bounds.xMin / stepX) * stepX;
    for (let x = startX; x <= bounds.xMax; x += stepX) {
      if (Math.abs(x) < 1e-9) continue; // Evitar el 0 del centro por ahora
      const sx = this.originX + x * this.scaleX;

      // Tick
      ctx.beginPath();
      ctx.moveTo(sx, clampedY - tickLen);
      ctx.lineTo(sx, clampedY + tickLen);
      ctx.stroke();

      // Número
      const label = this.formatNumber(x);
      ctx.textAlign = 'center';
      ctx.textBaseline = clampedY + 18 > h ? 'bottom' : 'top';
      const textY = clampedY + 18 > h ? clampedY - 8 : clampedY + 8;
      ctx.fillText(label, sx, textY);
    }

    // Ticks y Marcas Numéricas en Eje Y
    const startY = Math.floor(bounds.yMin / stepY) * stepY;
    for (let y = startY; y <= bounds.yMax; y += stepY) {
      if (Math.abs(y) < 1e-9) continue;
      const sy = this.originY - y * this.scaleY;

      // Tick
      ctx.beginPath();
      ctx.moveTo(clampedX - tickLen, sy);
      ctx.lineTo(clampedX + tickLen, sy);
      ctx.stroke();

      // Número
      const label = this.formatNumber(y);
      ctx.textAlign = clampedX - 10 < 25 ? 'left' : 'right';
      ctx.textBaseline = 'middle';
      const textX = clampedX - 10 < 25 ? clampedX + 10 : clampedX - 10;
      ctx.fillText(label, textX, sy);
    }

    // Marca 0 en el origen
    if (ox >= 0 && ox <= w && oy >= 0 && oy <= h) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('0', ox - 6, oy + 6);
    }

    // Rótulos de ejes
    ctx.font = `600 ${this.style.fontSize + 1}px ${this.style.fontFamily}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('x (m)', w - 16, clampedY - 8);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('y (m)', clampedX + 10, 8);

    ctx.restore();
  }

  formatNumber(val) {
    if (Math.abs(val) >= 10000 || (Math.abs(val) < 0.01 && Math.abs(val) > 0)) {
      return val.toExponential(1);
    }
    // Redondear a 4 decimales para eliminar artefactos flotantes
    const rounded = Math.round(val * 10000) / 10000;
    return rounded.toString();
  }

  renderWave(ctx, wave, bounds, t) {
    const fn = wave.compiled.fn;
    const v = wave.v;

    // Cantidad de puntos adaptada al ancho en píxeles para máxima nitidez (1 punto por píxel)
    const pointsCount = Math.max(300, Math.min(2500, Math.round(bounds.width)));
    const dx = (bounds.xMax - bounds.xMin) / pointsCount;

    ctx.save();
    ctx.strokeStyle = wave.color;
    ctx.lineWidth = wave.lineWidth;
    ctx.globalAlpha = wave.opacity;
    if (wave.lineDash && wave.lineDash.length > 0) {
      ctx.setLineDash(wave.lineDash);
    }

    ctx.beginPath();
    let isDrawing = false;
    let prevSy = null;

    for (let i = 0; i <= pointsCount; i++) {
      const x = bounds.xMin + i * dx;
      const y = fn(x, t, v);

      if (!Number.isFinite(y)) {
        isDrawing = false;
        prevSy = null;
        continue;
      }

      const sx = this.originX + x * this.scaleX;
      const sy = this.originY - y * this.scaleY;

      // Detección de singularidades y saltos verticales fuera del viewport
      if (prevSy !== null && Math.abs(sy - prevSy) > bounds.height * 1.5) {
        isDrawing = false;
      }

      if (!isDrawing) {
        ctx.moveTo(sx, sy);
        isDrawing = true;
      } else {
        ctx.lineTo(sx, sy);
      }
      prevSy = sy;
    }

    ctx.stroke();
    ctx.restore();
  }

  renderResultant(ctx, waveStore, bounds, t) {
    const style = waveStore.resultantStyle;
    const pointsCount = Math.max(400, Math.min(3000, Math.round(bounds.width * 1.2)));
    const dx = (bounds.xMax - bounds.xMin) / pointsCount;

    ctx.save();

    if (style.glow) {
      ctx.shadowColor = style.glowColor || style.color;
      ctx.shadowBlur = style.glowBlur || 12;
    }

    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.lineWidth;
    ctx.globalAlpha = style.opacity;
    if (style.lineDash && style.lineDash.length > 0) {
      ctx.setLineDash(style.lineDash);
    }

    ctx.beginPath();
    let isDrawing = false;
    let prevSy = null;

    for (let i = 0; i <= pointsCount; i++) {
      const x = bounds.xMin + i * dx;
      const y = waveStore.evaluateResultant(x, t);

      if (!Number.isFinite(y)) {
        isDrawing = false;
        prevSy = null;
        continue;
      }

      const sx = this.originX + x * this.scaleX;
      const sy = this.originY - y * this.scaleY;

      if (prevSy !== null && Math.abs(sy - prevSy) > bounds.height * 1.5) {
        isDrawing = false;
      }

      if (!isDrawing) {
        ctx.moveTo(sx, sy);
        isDrawing = true;
      } else {
        ctx.lineTo(sx, sy);
      }
      prevSy = sy;
    }

    ctx.stroke();
    ctx.restore();
  }

  renderVelocityVectors(ctx, wave, bounds, t) {
    // Busca crestas y máximos locales para colocar vectores de propagación elegantes
    const samples = 120;
    const dx = (bounds.xMax - bounds.xMin) / samples;
    const fn = wave.compiled.fn;
    const v = wave.v;

    let crests = [];
    let prevY = fn(bounds.xMin, t, v);
    let prevSlope = null;

    for (let i = 1; i <= samples; i++) {
      const x = bounds.xMin + i * dx;
      const y = fn(x, t, v);
      if (!Number.isFinite(y)) continue;

      const slope = (y - prevY) / dx;
      if (prevSlope !== null && prevSlope > 0 && slope <= 0 && prevY > 0.3) {
        // Encontramos un máximo local
        crests.push({ x: x - dx / 2, y: prevY });
      }
      prevSlope = slope;
      prevY = y;
    }

    // Dibujar hasta 3 vectores más representativos
    const maxVectors = 3;
    const step = Math.max(1, Math.floor(crests.length / maxVectors));

    ctx.save();
    ctx.strokeStyle = wave.color;
    ctx.fillStyle = wave.color;
    ctx.lineWidth = 2.0;

    for (let k = 0; k < crests.length; k += step) {
      const crest = crests[k];
      const s = this.mathToScreen(crest.x, crest.y);

      // Posicionar flecha justo por encima de la cresta
      const arrowY = s.y - 14;
      const arrowLen = Math.sign(v) * Math.min(45, Math.max(22, Math.abs(v) * 16));

      ctx.beginPath();
      ctx.moveTo(s.x, arrowY);
      ctx.lineTo(s.x + arrowLen, arrowY);
      ctx.stroke();

      // Cabeza de flecha
      const head = 6 * Math.sign(arrowLen);
      ctx.beginPath();
      ctx.moveTo(s.x + arrowLen, arrowY);
      ctx.lineTo(s.x + arrowLen - head, arrowY - 4);
      ctx.lineTo(s.x + arrowLen - head, arrowY + 4);
      ctx.closePath();
      ctx.fill();

      // Etiqueta del vector
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`v = ${v > 0 ? '+' : ''}${v} m/s`, s.x + arrowLen / 2, arrowY - 4);
    }

    ctx.restore();
  }

  renderInspector(ctx, waveStore, bounds, t) {
    const x0 = this.inspectorX;
    if (x0 === null) return;

    const sx = this.originX + x0 * this.scaleX;
    if (sx < 0 || sx > bounds.width) return;

    ctx.save();

    // 1. Línea vertical de la sonda (Crosshair)
    ctx.strokeStyle = this.style.crosshairColor;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, bounds.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Puntos luminosos en cada componente visible
    const inspection = waveStore.inspectAt(x0, t);

    for (const comp of inspection.components) {
      if (comp.visible) {
        const sy = this.originY - comp.value * this.scaleY;
        ctx.fillStyle = comp.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // 3. Punto en la resultante
    if (waveStore.resultantStyle.visible) {
      const syRes = this.originY - inspection.resultantValue * this.scaleY;
      ctx.fillStyle = waveStore.resultantStyle.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sx, syRes, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Exporta la vista actual a una imagen en Base64 o Blob PNG
   */
  exportImage(format = 'image/png') {
    return this.canvas.toDataURL(format);
  }
}


/* ======================== virtual-keyboard.js ======================== */
/**
 * Teclado Virtual Matemático Completo y Elegante
 * Soporta edición contextual en cualquier input de fórmula,
 * inserción en la posición del cursor, selección de funciones,
 * constantes, operadores y plantillas rápidas de ondas.
 */

class VirtualKeyboard {
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


/* ======================== didactic-presets.js ======================== */
/**
 * Experiencia Didáctica: Presets de Simulación de Ondas y Superposición
 * Diseñados para clases de física con fundamentación rigurosa,
 * preguntas orientadoras para inducir la predicción y análisis conceptual.
 */

const DIDACTIC_PRESETS = [
  {
    id: 'constructive-pulses',
    title: '1. Dos pulsos iguales en sentidos opuestos',
    subtitle: 'Interferencia Constructiva Máxima',
    badge: 'Constructiva',
    badgeClass: 'badge-constructive',
    explanation: 'Dos pulsos idénticos viajan en sentidos contrarios (velocidades +2 m/s y -2 m/s). De acuerdo con el principio de superposición lineal, cuando ambos se traslapan en x = 0, sus elongaciones se suman algebraicamente produciendo una amplitud total exactamente igual al doble de las individuales (y_max = 4.0 m). Tras cruzarse, continúan su viaje inalterados.',
    guidingQuestions: [
      '¿Qué amplitud esperas ver en el centro (x = 0) en el instante de encuentro t = 3.0 s?',
      '¿Se destruyen o pierden energía los pulsos al chocar, o conservan su velocidad y forma original tras separarse?'
    ],
    initialTime: 0,
    timeScale: 1.0,
    waves: [
      {
        name: 'Pulso hacia la derecha (+v)',
        rawExpr: '2 / (((x - 2*t + 6)^2) + 1)',
        v: 2.0,
        color: '#06b6d4',
        lineWidth: 2.5,
        lineDash: [6, 4],
        opacity: 0.9,
        visible: true,
        inSum: true,
        showVector: true
      },
      {
        name: 'Pulso hacia la izquierda (-v)',
        rawExpr: '2 / (((x + 2*t - 6)^2) + 1)',
        v: -2.0,
        color: '#8b5cf6',
        lineWidth: 2.5,
        lineDash: [6, 4],
        opacity: 0.9,
        visible: true,
        inSum: true,
        showVector: true
      }
    ]
  },

  {
    id: 'destructive-pulses',
    title: '2. Dos pulsos de signos contrarios',
    subtitle: 'Interferencia Destructiva y Cancelación Transitoria',
    badge: 'Destructiva',
    badgeClass: 'badge-destructive',
    explanation: 'Un pulso positivo (+2 m) y un pulso invertido (-2 m) se dirigen mutuamente hacia el centro. En el instante exacto de coincidencia (t = 3.0 s), la suma algebraica y_total = y_1 + y_2 da 0 en toda la cuerda. La cuerda parece plana, pero no está en reposo: las partículas tienen velocidad transversal máxima en sentidos opuestos, por lo que ambos pulsos resurgen intactos al continuar el tiempo.',
    guidingQuestions: [
      'Cuando la cuerda está totalmente plana en t = 3.0 s, ¿dónde se encuentra la energía de las ondas?',
      'Usa el botón de Pausa y Paso a Paso para detener la simulación en t = 3.0 s y verifica con la Sonda de Inspección el valor de cada onda.'
    ],
    initialTime: 0,
    timeScale: 1.0,
    waves: [
      {
        name: 'Pulso positivo (+A)',
        rawExpr: '2 / (((x - 2*t + 6)^2) + 1)',
        v: 2.0,
        color: '#10b981',
        lineWidth: 2.5,
        lineDash: [6, 4],
        opacity: 0.9,
        visible: true,
        inSum: true,
        showVector: true
      },
      {
        name: 'Pulso negativo (-A)',
        rawExpr: '-2 / (((x + 2*t - 6)^2) + 1)',
        v: -2.0,
        color: '#f59e0b',
        lineWidth: 2.5,
        lineDash: [6, 4],
        opacity: 0.9,
        visible: true,
        inSum: true,
        showVector: true
      }
    ]
  },

  {
    id: 'asymmetric-pulses',
    title: '3. Pulsos con diferentes amplitudes y anchuras',
    subtitle: 'Superposición Asimétrica (Gaussiano vs Racional)',
    badge: 'Asimétrico',
    badgeClass: 'badge-info',
    explanation: 'Se superponen dos perturbaciones con geometrías dispares: un paquete gaussiano amplio de gran amplitud y un pulso cuártico angosto y agudo. El principio de superposición no requiere que las ondas tengan la misma forma ni simetría: en cada punto y en cada instante, el resultado es simplemente la suma punto a punto.',
    guidingQuestions: [
      '¿Qué forma adquiere la resultante cuando el pulso angosto "cabalga" sobre la cúspide del pulso ancho?',
      '¿La cresta máxima resultante supera la suma aritmética de los dos máximos individuales?'
    ],
    initialTime: 0,
    timeScale: 1.0,
    waves: [
      {
        name: 'Paquete Gaussiano Ancho (A = 3)',
        rawExpr: '3 * exp(-((x - 2*t + 7)/2)^2)',
        v: 2.0,
        color: '#3b82f6',
        lineWidth: 2.5,
        lineDash: [6, 4],
        opacity: 0.85,
        visible: true,
        inSum: true,
        showVector: true
      },
      {
        name: 'Pulso Cuártico Angosto (A = 1.5)',
        rawExpr: '1.5 / (((x + 2*t - 7)^4) + 1)',
        v: -2.0,
        color: '#ec4899',
        lineWidth: 2.5,
        lineDash: [6, 4],
        opacity: 0.85,
        visible: true,
        inSum: true,
        showVector: true
      }
    ]
  },

  {
    id: 'fourier-synthesis',
    title: '4. Superposición de tres o más componentes',
    subtitle: 'Síntesis Armónica de Fourier (Hacia la Onda Cuadrada)',
    badge: '3+ Componentes',
    badgeClass: 'badge-purple',
    explanation: 'Sumando armónicos impares con frecuencias múltiples (f, 3f, 5f) y amplitudes proporcionales a 1/n, observamos cómo una serie de ondas senoidales puras converge hacia el perfil de una onda cuadrada en movimiento. Usa los interruptores de suma (∑) para agregar o quitar el 3° y 5° armónico y observar la evolución.',
    guidingQuestions: [
      '¿Qué ocurre con la pendiente de las paredes de la onda a medida que sumas más armónicos superiores?',
      'Desactiva el interruptor ∑ del 5° armónico: ¿cómo cambia la ondulación sobre la cresta plana?'
    ],
    initialTime: 0,
    timeScale: 0.8,
    waves: [
      {
        name: 'Armónico Fundamental (n = 1)',
        rawExpr: '2 * sen(x - 2*t)',
        v: 2.0,
        color: '#06b6d4',
        lineWidth: 2.0,
        lineDash: [4, 4],
        opacity: 0.75,
        visible: true,
        inSum: true,
        showVector: true
      },
      {
        name: 'Tercer Armónico (n = 3)',
        rawExpr: '(2/3) * sen(3*x - 6*t)',
        v: 2.0,
        color: '#8b5cf6',
        lineWidth: 2.0,
        lineDash: [4, 4],
        opacity: 0.75,
        visible: true,
        inSum: true,
        showVector: false
      },
      {
        name: 'Quinto Armónico (n = 5)',
        rawExpr: '(2/5) * sen(5*x - 10*t)',
        v: 2.0,
        color: '#f59e0b',
        lineWidth: 2.0,
        lineDash: [4, 4],
        opacity: 0.75,
        visible: true,
        inSum: true,
        showVector: false
      }
    ]
  },

  {
    id: 'standing-waves',
    title: '5. Dos ondas sinusoidales en sentidos opuestos',
    subtitle: 'Generación de Ondas Estacionarias y Nodos',
    badge: 'Onda Estacionaria',
    badgeClass: 'badge-constructive',
    explanation: 'La superposición de dos ondas armónicas idénticas que viajan en direcciones contrarias genera una Onda Estacionaria: y(x,t) = 2A · sen(kx) · cos(ωt). No hay transporte neto de energía. Existen puntos fijos en el espacio llamados NODOS donde el desplazamiento es permanentemente cero para todo tiempo t.',
    guidingQuestions: [
      '¿Dónde se encuentran los nodos (puntos que nunca se mueven verticalmente)? Usa el Inspector para verificar x = 0, π, 2π...',
      '¿Con qué amplitud máxima oscilan los antinodos o vientres?'
    ],
    initialTime: 0,
    timeScale: 0.8,
    waves: [
      {
        name: 'Onda hacia la derecha (+v)',
        rawExpr: '2 * sen(x - 2*t)',
        v: 2.0,
        color: '#3b82f6',
        lineWidth: 2.0,
        lineDash: [5, 5],
        opacity: 0.75,
        visible: true,
        inSum: true,
        showVector: true
      },
      {
        name: 'Onda hacia la izquierda (-v)',
        rawExpr: '2 * sen(x + 2*t)',
        v: -2.0,
        color: '#ec4899',
        lineWidth: 2.0,
        lineDash: [5, 5],
        opacity: 0.75,
        visible: true,
        inSum: true,
        showVector: true
      }
    ]
  },

  {
    id: 'wave-beats',
    title: '6. Dos ondas con frecuencias cercanas (Batidos)',
    subtitle: 'Modulación de Amplitud Envolvente',
    badge: 'Batidos',
    badgeClass: 'badge-info',
    explanation: 'Cuando dos ondas de frecuencias muy próximas se superponen, se produce el fenómeno acústico y físico de batidos o pulsaciones. La onda resultante oscila a la frecuencia promedio mientras su amplitud es modulada periódicamente por una envolvente lenta.',
    guidingQuestions: [
      'Observa cómo la amplitud de la resultante crece y decrece rítmicamente a lo largo del eje x.',
      '¿Qué relación existe entre la diferencia de frecuencias (Δf) y la separación espacial entre los paquetes de batido?'
    ],
    initialTime: 0,
    timeScale: 0.8,
    waves: [
      {
        name: 'Onda f1 = 1.0 rad/m',
        rawExpr: '2 * sen(1.0*x - 2.0*t)',
        v: 2.0,
        color: '#10b981',
        lineWidth: 2.0,
        lineDash: [4, 4],
        opacity: 0.8,
        visible: true,
        inSum: true,
        showVector: true
      },
      {
        name: 'Onda f2 = 1.15 rad/m',
        rawExpr: '2 * sen(1.15*x - 2.3*t)',
        v: 2.0,
        color: '#06b6d4',
        lineWidth: 2.0,
        lineDash: [4, 4],
        opacity: 0.8,
        visible: true,
        inSum: true,
        showVector: false
      }
    ]
  }
];


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

  playArrivalPulse(waveId, freqRatio = 1.0) {
    this.triggerArrivalPulse(freqRatio);
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


/* ======================== app.js ======================== */
/**
 * Aplicación Principal de Movimiento Ondulatorio y Principio de Superposición
 * Controla el ciclo de animación, estado, sincronización entre vistas,
 * eventos de UI, paleta de estilos, experiencia didáctica y teclado virtual.
 */






class WaveApp {
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

// Init manejado por bundle


/* ======================== tubes-sim.js ======================== */
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



/* ======================== strings-sim.js ======================== */
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



/* ======================== notebook-content.js ======================== */
// notebook-content.js - Contenido Académico Completo del Cuaderno Virtual Universitario de Física 3
// Movimiento Ondulatorio

const NOTEBOOK_METADATA = {
  title: "Física 3: Movimiento Ondulatorio",
  subtitle: "Cuaderno Virtual Interactivo y Laboratorio de Superposición",
  university: "Física Universitaria para Ciencias e Ingeniería",
  authors: [
    { name: "Edwin Santiago Peláez", role: "Autor e Investigador" },
    { name: "Camila Rengifo", role: "Autora e Investigadora" },
    { name: "Alejandra Barreto", role: "Autora e Investigadora" }
  ],
  edition: "1.ª Edición Digital Interactiva (2026)",
  coverImage: "Imagenes/Portada.png",
  templateImage: "Imagenes/Plantilla.png"
};

const PRELIMINARY_SECTIONS = [
  {
    id: "presentacion",
    num: "P.1",
    title: "Presentación del Cuaderno Virtual",
    subtitle: "Propósito didáctico, rigor científico y metodología del aprendizaje activo",
    content: `
      <div class="prose-academic">
        <p class="lead-paragraph">
          Bienvenido al <strong>Cuaderno Virtual Interactivo de Física 3</strong>, una obra concebida como un puente integrador entre el rigor analítico de la física teórica y la intuición visual proporcionada por la computación científica contemporánea. En los cursos universitarios de ciencias e ingeniería, el estudio del <strong>movimiento ondulatorio</strong> representa un hito epistemológico fundamental: es la transición formal del estudio de partículas discretas y cuerpos rígidos al análisis de medios continuos, campos y transporte de energía en el espacio-tiempo.
        </p>

        <div class="academic-callout callout-info">
          <div class="callout-icon">📚</div>
          <div class="callout-body">
            <h4>Enfoque Metodológico</h4>
            <p>
              Este cuaderno combina el modelo editorial de un texto universitario de referencia con simulaciones dinámicas en tiempo real (estilo GeoGebra), resolución analítica estructurada en <strong>10 pasos obligatorios</strong>, autoevaluaciones formativas y una línea de tiempo historiográfica.
            </p>
          </div>
        </div>

        <h3>Estructura del Aprendizaje</h3>
        <p>
          Cada capítulo o unidad temática está diseñado con una arquitectura pedagógica multinivel:
        </p>
        <ul class="academic-list">
          <li><strong>Fundamentación conceptual rigurosa:</strong> Definición precisa de magnitudes, axiomas y derivaciones matemáticas.</li>
          <li><strong>Formulación matemática explícita:</strong> Ecuaciones con KaTeX, análisis dimensional y delimitación de hipótesis y condiciones de frontera.</li>
          <li><strong>Laboratorios interactivos vinculados:</strong> Simulaciones con controles cuantitativos para contrastar la teoría con la fenomenología.</li>
          <li><strong>Ejemplos resueltos en 10 pasos:</strong> Código cromático normativo (<span class="badge-dato">DATO: Azul #2563EB</span>, <span class="badge-incognita">INCÓGNITA: Rojo #DC2626</span>, <span class="badge-calculado">CALCULADO: Naranja #F97316</span>).</li>
          <li><strong>Evaluación formativa continua:</strong> Preguntas de comprobación conceptual y bancos de ejercicios.</li>
        </ul>
      </div>
    `
  },
  {
    id: "objetivos",
    num: "P.2",
    title: "Objetivos y Competencias de Aprendizaje",
    subtitle: "Metas curriculares del curso de Física 3",
    content: `
      <div class="prose-academic">
        <h3>Objetivo General</h3>
        <p>
          Desarrollar la capacidad de modelar, analizar cuantitativamente y predecir el comportamiento de perturbaciones ondulatorias mecánicas y electromagnéticas en una, dos y tres dimensiones, aplicando principios de conservación de energía, la ecuación diferencial de onda y el principio de superposición lineal.
        </p>

        <div class="competencies-grid">
          <div class="competency-card">
            <div class="card-badge">Competencia Conceptual</div>
            <h4>Comprensión Teórica</h4>
            <p>Distinguir con precisión matemática entre oscilación local de partículas y propagación de fase; deducir la ecuación de onda unidimensional a partir de las leyes de Newton y relacionar las propiedades del medio con la velocidad de fase.</p>
          </div>

          <div class="competency-card">
            <div class="card-badge">Competencia Procedimental</div>
            <h4>Análisis Cuantitativo y Experimental</h4>
            <p>Resolver problemas de interferencia, difracción, ondas estacionarias y efecto Doppler utilizando algoritmos analíticos de 10 pasos, validando consistencia dimensional y contrastando con simuladores interactivos.</p>
          </div>

          <div class="competency-card">
            <div class="card-badge">Competencia Actitudinal</div>
            <h4>Pensamiento Crítico y Científico</h4>
            <p>Evaluar los límites de validez de los modelos lineales e idealizados frente a fenómenos reales como la dispersión cromática, atenuación viscosa y condiciones de frontera imperfectas.</p>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "resena-historica",
    num: "P.3",
    title: "Reseña Histórica del Movimiento Ondulatorio",
    subtitle: "Evolución epistémica desde la armonía pitagórica hasta la síntesis electromagnética",
    content: `
      <div class="prose-academic">
        <p>
          La comprensión científica de las ondas constituye uno de los capítulos más apasionantes en la historia de la ciencia. Comenzó formalmente en la Grecia clásica con <strong>Pitágoras de Samos</strong> (c. 570–495 a. C.), quien descubrió que cuerdas sonoras tensadas cuyas longitudes guardaban relaciones de números enteros producían intervalos consonantes (octavas 2:1, quintas 3:2 y cuartas 4:3). No obstante, durante casi dos milenios el sonido y la luz fueron concebidos mediante intuiciones filosóficas sin fundamento cinemático.
        </p>

        <p>
          El siglo XVII marcó el inicio de la era moderna: <strong>Galileo Galilei</strong> (1638) en sus <em>Dos Nuevas Ciencias</em> demostró la relación entre frecuencia, longitud de la cuerda y tono percibido. Décadas después, el astrónomo y físico neerlandés <strong>Christiaan Huygens</strong> (1678) formuló su célebre principio ondulatorio, proponiendo que cada punto alcanzado por un frente de onda se comporta como una fuente secundaria de ondas esféricas. Este modelo explicó naturalmente la reflexión y la refracción, aunque rivalizó con la teoría corpuscular sostenida por <strong>Isaac Newton</strong>.
        </p>

        <p>
          La formalización matemática definitiva ocurrió en el siglo XVIII: <strong>Jean le Rond d'Alembert</strong> (1747) dedujo la primera ecuación diferencial parcial de las ondas en una cuerda vibrante:
        </p>
        <div class="math-display">$$\\frac{\\partial^2 y}{\\partial t^2} = v^2 \\frac{\\partial^2 y}{\\partial x^2}$$</div>
        <p>
          y propuso su famosa solución mediante la superposición de dos funciones viajeras arbitrarias $y(x,t) = f(x - vt) + g(x + vt)$. Posteriormente, <strong>Leonhard Euler</strong> y <strong>Daniel Bernoulli</strong> debatieron sobre la descomposición en series trigonométricas para representar las vibraciones de cuerdas, sentando las bases del análisis de Fourier.
        </p>

        <p>
          En 1801, <strong>Thomas Young</strong> asestó un golpe decisivo a la teoría corpuscular mediante su histórico <em>experimento de la doble rendija</em>, demostrando de manera irrebatible el fenómeno de interferencia luminosa. Poco después, <strong>Augustin-Jean Fresnel</strong> (1815-1818) completó el marco matemático de la difracción y demostró la naturaleza transversal de las ondas de luz para explicar la polarización.
        </p>

        <p>
          Hacia 1842, el físico austriaco <strong>Christian Doppler</strong> dedujo el cambio aparente en la frecuencia recibida debido al movimiento relativo entre la fuente y el observador. La culminación teórica llegó de la mano de <strong>James Clerk Maxwell</strong> (1865), cuyas cuatro ecuaciones fundamentales predijeron la existencia de ondas electromagnéticas autoinducidas que se propagan en el vacío a la velocidad de la luz:
        </p>
        <div class="math-display">$$c = \\frac{1}{\\sqrt{\\mu_0 \\varepsilon_0}} \\approx 3\\times 10^8 \\text{ m/s}$$</div>
        <p>
          Esta predicción fue confirmada experimentalmente en 1888 por <strong>Heinrich Hertz</strong> mediante emisores y resonadores de chispa, cerrando la unificación de la óptica, la acústica y el electromagnetismo dentro del paradigma ondulatorio clásico.
        </p>
      </div>
    `
  },
  {
    id: "instrucciones",
    num: "P.4",
    title: "Instrucciones de Uso y Herramientas del Cuaderno",
    subtitle: "Cómo aprovechar las funciones interactivas, la gráfica GeoGebra y los simuladores",
    content: `
      <div class="prose-academic">
        <p>
          Este cuaderno virtual cuenta con módulos de visualización y cálculo activos. A continuación se detallan las principales herramientas:
        </p>

        <div class="tools-guide-grid">
          <div class="tool-guide-card">
            <h4>1. Plano Cartesiano GeoGebra</h4>
            <p>Lienzo interactivo de alta precisión con rejilla milimétrica y sincronización en tiempo real. Permite:</p>
            <ul>
              <li><strong>Arrastrar con el ratón o tacto:</strong> Desplaza el plano cartesiano en $X$ y $Y$.</li>
              <li><strong>Rueda del ratón o botones +/-:</strong> Zoom interactivo de escala.</li>
              <li><strong>Botón Restablecer:</strong> Regresa a la vista predeterminada centrada.</li>
              <li><strong>Sonda Inspector (Tecla 'I'):</strong> Inspecciona el valor exacto punto a punto $y(x,t)$ de cada componente y de la resultante.</li>
            </ul>
          </div>

          <div class="tool-guide-card">
            <h4>2. Controles de Tiempo y Reproducción</h4>
            <p>Ubicados en la barra superior y en el scrubber inferior:</p>
            <ul>
              <li><strong>Reproducir / Pausa:</strong> Inicia o detiene el flujo continuo del tiempo físico $t$.</li>
              <li><strong>Paso adelante / atrás:</strong> Avanza fotogramas de $\Delta t = 0.05\\text{ s}$ para estudiar instantes críticos.</li>
              <li><strong>Selector de velocidad:</strong> Regula desde 0.25x (cámara lenta para análisis fino) hasta 2.0x.</li>
            </ul>
          </div>

          <div class="tool-guide-card">
            <h4>3. Teclado Virtual y Editor de Ecuaciones</h4>
            <p>Permite ingresar funciones matemáticas analíticas con sintaxis intuitiva en español o estándar:</p>
            <ul>
              <li>Funciones admitidas: <code>sen(u)</code>, <code>cos(u)</code>, <code>tan(u)</code>, <code>exp(u)</code>, <code>sinc(u)</code>, <code>abs(u)</code>.</li>
              <li>Variables: <code>x</code> (posición), <code>t</code> (tiempo), <code>v</code> (velocidad de propagación), <code>pi</code> ($\pi$).</li>
            </ul>
          </div>

          <div class="tool-guide-card">
            <h4>4. Barra de Lectura y Navegación</h4>
            <p>Barra inferior persistente:</p>
            <ul>
              <li>Navega secuencialmente entre secciones con <strong>Anterior</strong> y <strong>Siguiente</strong>.</li>
              <li>Visualiza el porcentaje de progreso global del curso.</li>
              <li>Accede al índice desplegable o al botón Inicio en cualquier instante.</li>
            </ul>
          </div>
        </div>
      </div>
    `
  }
];

const UNITS = [
  // ================= UNIDAD 1 =================
  {
    id: "unidad-1",
    number: 1,
    title: "Fundamentos del Movimiento Ondulatorio",
    shortTitle: "U1: Fundamentos",
    summary: "Naturaleza de la onda, transporte de energía sin transporte neto de materia y magnitudes cinemáticas fundamentales.",
    sections: [
      {
        subtitle: "1.1 Concepto de Onda, Pulso y Tren de Ondas",
        html: `
          <p>
            En física, una <strong>onda</strong> se define rigurosamente como la propagación de una perturbación en las propiedades físicas de un medio (tales como la densidad, la presión, el campo eléctrico o el campo magnético) a través del espacio y en el tiempo, caracterizada por transportar <strong>energía y momento lineal sin transporte neto de materia</strong>.
          </p>
          <p>
            Es imperativo diferenciar tres conceptos esenciales:
          </p>
          <ul>
            <li><strong>Pulso de onda:</strong> Una perturbación aislada y de duración finita que viaja a través del medio, como la generada al sacudir una sola vez el extremo de una cuerda tensa.</li>
            <li><strong>Tren de ondas:</strong> Una sucesión continua de pulsos periódicos generados por una fuente que oscila de manera armónica o regular.</li>
            <li><strong>Oscilación local:</strong> El movimiento repetitivo de cada elemento del medio alrededor de su posición de equilibrio. Mientras que las partículas individuales del medio únicamente oscilan localmente, la perturbación geométrica global avanza a una velocidad de fase definida $v$.</li>
          </ul>
        `
      },
      {
        subtitle: "1.2 Magnitudes Físicas Fundamentales",
        html: `
          <p>
            Para caracterizar cuantitativamente una onda armónica se emplean las siguientes magnitudes:
          </p>
          <div class="table-responsive">
            <table class="academic-table">
              <thead>
                <tr>
                  <th>Magnitud</th>
                  <th>Símbolo</th>
                  <th>Unidad SI</th>
                  <th>Definición y Expresión Matemática</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Amplitud</strong></td>
                  <td>$A$</td>
                  <td>$\\text{m}$</td>
                  <td>Desplazamiento máximo respecto a la posición de equilibrio: $A = \\max|y(x,t)|$.</td>
                </tr>
                <tr>
                  <td><strong>Longitud de onda</strong></td>
                  <td>$\\lambda$</td>
                  <td>$\\text{m}$</td>
                  <td>Distancia espacial mínima entre dos puntos en idéntico estado de fase (p. ej., entre dos crestas consecutivas).</td>
                </tr>
                <tr>
                  <td><strong>Período</strong></td>
                  <td>$T$</td>
                  <td>$\\text{s}$</td>
                  <td>Tiempo necesario para que un punto del medio complete un ciclo entero de oscilación: $T = 1/f$.</td>
                </tr>
                <tr>
                  <td><strong>Frecuencia</strong></td>
                  <td>$f$</td>
                  <td>$\\text{Hz} = \\text{s}^{-1}$</td>
                  <td>Número de ciclos completados por unidad de tiempo: $f = 1/T$.</td>
                </tr>
                <tr>
                  <td><strong>Frecuencia angular</strong></td>
                  <td>$\\omega$</td>
                  <td>$\\text{rad/s}$</td>
                  <td>Tasa temporal de cambio de la fase: $\\omega = 2\\pi f = \\frac{2\\pi}{T}$.</td>
                </tr>
                <tr>
                  <td><strong>Número de onda</strong></td>
                  <td>$k$</td>
                  <td>$\\text{rad/m}$</td>
                  <td>Tasa espacial de cambio de la fase: $k = \\frac{2\\pi}{\\lambda}$.</td>
                </tr>
                <tr>
                  <td><strong>Velocidad de fase</strong></td>
                  <td>$v$</td>
                  <td>$\\text{m/s}$</td>
                  <td>Velocidad con la que se propaga la cresta en el espacio: $v = \\lambda f = \\frac{\\omega}{k}$.</td>
                </tr>
                <tr>
                  <td><strong>Fase inicial</strong></td>
                  <td>$\\phi_0$</td>
                  <td>$\\text{rad}$</td>
                  <td>Estado de perturbación en el origen $(x=0, t=0)$.</td>
                </tr>
              </tbody>
            </table>
          </div>
        `
      }
    ],
    exercise: {
      title: "Ejercicio Resuelto 1.1: Cinemática de una Onda Armónica",
      statement: "Una onda mecánica sinusoidal que viaja por una cuerda en dirección $+x$ tiene una amplitud de $0.08\\text{ m}$, una frecuencia de $12.0\\text{ Hz}$ y se propaga con una velocidad de fase de $24.0\\text{ m/s}$. En $x=0$ y $t=0$, el desplazamiento vertical es $y(0,0)=0$ y la partícula se mueve en dirección ascendente ($v_y > 0$). Calcule: (a) el período $T$, (b) la longitud de onda $\\lambda$, (c) el número de onda $k$, (d) la frecuencia angular $\\omega$, y (e) escriba la función de onda matemática completa $y(x,t)$.",
      steps: [
        {
          num: 1,
          name: "Comprensión e interpretación del enunciado",
          content: "Se estudia una onda armónica unidimensional transversal que viaja en el sentido positivo del eje $x$. Se requiere obtener los parámetros temporales y espaciales básicos para formular la función de onda de la forma $y(x,t) = A\\sin(kx - \\omega t + \\phi_0)$."
        },
        {
          num: 2,
          name: "Identificación de los datos",
          content: `
            <div class="data-table-wrapper">
              <span class="badge-dato">DATOS IDENTIFICADOS (#2563EB)</span>
              <table class="data-table">
                <tr><th>Magnitud</th><th>Símbolo</th><th>Valor Numérico</th><th>Unidad</th></tr>
                <tr><td>Amplitud</td><td>$A$</td><td>$0.08$</td><td>$\\text{m}$</td></tr>
                <tr><td>Frecuencia</td><td>$f$</td><td>$12.0$</td><td>$\\text{Hz}$</td></tr>
                <tr><td>Velocidad de propagación</td><td>$v$</td><td>$24.0$</td><td>$\\text{m/s}$</td></tr>
                <tr><td>Desplazamiento inicial</td><td>$y(0,0)$</td><td>$0.0$</td><td>$\\text{m}$</td></tr>
              </table>
            </div>
          `
        },
        {
          num: 3,
          name: "Identificación de las incógnitas",
          content: `
            <div class="incognitas-table-wrapper">
              <span class="badge-incognita">INCÓGNITAS (#DC2626)</span>
              <ul>
                <li><strong>Período temporal:</strong> $T$ $[\\text{s}]$</li>
                <li><strong>Longitud de onda:</strong> $\\lambda$ $[\\text{m}]$</li>
                <li><strong>Número de onda angular:</strong> $k$ $[\\text{rad/m}]$</li>
                <li><strong>Frecuencia angular:</strong> $\\omega$ $[\\text{rad/s}]$</li>
                <li><strong>Función de onda completa:</strong> $y(x,t)$</li>
              </ul>
            </div>
          `
        },
        {
          num: 4,
          name: "Selección de las ecuaciones",
          content: `
            Ecuaciones cinemáticas fundamentales para ondas armónicas lineales:
            $$T = \\frac{1}{f}, \\quad \\lambda = \\frac{v}{f}, \\quad k = \\frac{2\\pi}{\\lambda}, \\quad \\omega = 2\\pi f, \\quad y(x,t) = A\\sin(kx - \\omega t + \\phi_0)$$
          `
        },
        {
          num: 5,
          name: "Conversión de unidades",
          content: "Todos los datos suministrados ($A = 0.08\\text{ m}$, $f = 12.0\\text{ s}^{-1}$, $v = 24.0\\text{ m/s}$) ya se encuentran rigurosamente expresados en el Sistema Internacional de Unidades (SI)."
        },
        {
          num: 6,
          name: "Sustitución, despeje y procedimiento algebraico",
          content: `
            <div class="algebra-steps">
              <p>1. Cálculo del período $T$:</p>
              $$T = \\frac{1}{12.0\\text{ s}^{-1}} = <span class="badge-calculado">0.08333\\text{ s}</span>$$
              <p>2. Longitud de onda $\\lambda$:</p>
              $$\\lambda = \\frac{v}{f} = \\frac{24.0\\text{ m/s}}{12.0\\text{ s}^{-1}} = <span class="badge-calculado">2.000\\text{ m}</span>$$
              <p>3. Número de onda angular $k$:</p>
              $$k = \\frac{2\\pi}{\\lambda} = \\frac{2\\pi}{2.000\\text{ m}} = \\pi\\text{ rad/m} \\approx <span class="badge-calculado">3.1416\\text{ rad/m}</span>$$
              <p>4. Frecuencia angular $\\omega$:</p>
              $$\\omega = 2\\pi(12.0\\text{ s}^{-1}) = 24\\pi\\text{ rad/s} \\approx <span class="badge-calculado">75.398\\text{ rad/s}</span>$$
              <p>5. Fase inicial $\\phi_0$:</p>
              $$y(0,0) = A\\sin(\\phi_0) = 0 \\implies \\phi_0 = 0 \\text{ ó } \\pi$$
              Dado que $v_y(0,0) = -A\\omega\\cos(\\phi_0) > 0$, se verifica que $\\phi_0 = 0$ cumple con la velocidad transversal ascendente.
            </div>
          `
        },
        {
          num: 7,
          name: "Resultado final",
          content: `
            <div class="result-box">
              <p><strong>Resultados con tres cifras significativas:</strong></p>
              <ul>
                <li>$T = 0.0833\\text{ s}$</li>
                <li>$\\lambda = 2.00\\text{ m}$</li>
                <li>$k = 3.14\\text{ rad/m} = \\pi\\text{ rad/m}$</li>
                <li>$\\omega = 75.4\\text{ rad/s} = 24\\pi\\text{ rad/s}$</li>
                <li>$y(x,t) = 0.08\\sin(3.14 x - 75.4 t)\\text{ m} = 0.08\\sin(\\pi x - 24\\pi t)\\text{ m}$</li>
              </ul>
            </div>
          `
        },
        {
          num: 8,
          name: "Validación del resultado",
          content: "Validación dimensional: $[\\omega/k] = [\\text{rad/s}] / [\\text{rad/m}] = [\\text{m/s}]$. Numéricamente: $\\omega/k = (24\\pi)/(\\pi) = 24.0\\text{ m/s} = v$. La relación de dispersión se satisface exactamente."
        },
        {
          num: 9,
          name: "Conclusión",
          content: "La perturbación recorre una distancia de dos metros en cada ciclo completo de vibración, oscilando cada elemento de masa doce veces por segundo con una excursión total pico a pico de $0.16\\text{ m}$."
        },
        {
          num: 10,
          name: "Verificación independiente",
          content: "Comprobación mediante $v = \\lambda / T$: $v = 2.00\\text{ m} / (1/12\\text{ s}) = 2.00 \\times 12 = 24.0\\text{ m/s}$. El cálculo coincide plenamente con los datos de entrada."
        }
      ]
    },
    quiz: {
      question: "¿Cuál de las siguientes afirmaciones describe con mayor precisión la diferencia física entre una oscilación armónica y una onda armónica?",
      options: [
        "Una oscilación se desplaza en el espacio mientras que una onda permanece fija en un punto.",
        "Una oscilación es un fenómeno temporal confinado a una coordenada espacial, mientras que una onda es una perturbación distribuida espaciotemporalmente que transporta energía.",
        "Las ondas transportan materia a alta velocidad mientras que las oscilaciones no transportan nada.",
        "Una oscilación requiere necesariamente un medio elástico mientras que las ondas mecánicas se propagan en el vacío."
      ],
      correctIndex: 1,
      explanation: "Correcto. Una oscilación es una variación temporal en una posición localizada (función de $t$), mientras que una onda es una función de dos variables $y(x,t)$ donde la perturbación de fase se propaga en el espacio transportando energía y momento lineal sin arrastrar masa neta."
    }
  },

  // ================= UNIDAD 2 =================
  {
    id: "unidad-2",
    number: 2,
    title: "Clasificación y Tipos de Ondas",
    shortTitle: "U2: Clasificación",
    summary: "Ondas mecánicas vs electromagnéticas, transversales vs longitudinales, dimensionalidad y modos de propagación.",
    sections: [
      {
        subtitle: "2.1 Taxonomía General de los Fenómenos Ondulatorios",
        html: `
          <p>
            Las ondas se clasifican según criterios físicos independientes y complementarios:
          </p>
          <div class="taxonomy-grid">
            <div class="tax-card">
              <h4>Por la Necesidad de Medio Material</h4>
              <ul>
                <li><strong>Ondas Mecánicas:</strong> Requieren un medio elástico y deformable (gas, líquido, sólido) para su propagación. La restitución se debe a las fuerzas intermoleculares del medio (sonido, ondas sísmicas, cuerdas tensas). No se propagan en el vacío.</li>
                <li><strong>Ondas Electromagnéticas:</strong> Consisten en campos eléctricos y magnéticos oscilantes perpendiculares entre sí que se autosostienen y se propagan en el vacío a la velocidad $c = 3\\times 10^8\\text{ m/s}$ (luz, radio, microondas, rayos X).</li>
                <li><strong>Ondas Gravitacionales:</strong> Ondulaciones del propio tejido espaciotemporal predichas por la Relatividad General de Einstein.</li>
              </ul>
            </div>

            <div class="tax-card">
              <h4>Por la Dirección de Oscilación Respecto a la Propagación</h4>
              <ul>
                <li><strong>Ondas Transversales:</strong> La oscilación de las partículas o campos es perpendicular a la dirección de avance de la onda. P. ej.: ondas en una cuerda tensa, ondas electromagnéticas en el vacío, ondas sísmicas secundarias (S).</li>
                <li><strong>Ondas Longitudinales:</strong> La oscilación de las partículas del medio ocurre paralelamente a la dirección de propagación, produciendo regiones alternadas de compresión y rarefacción. P. ej.: ondas sonoras en fluidos, ondas en resortes comprimidos, ondas sísmicas primarias (P).</li>
              </ul>
            </div>
          </div>
        `
      },
      {
        subtitle: "2.2 Dimensionalidad y Geometría de Frentes de Onda",
        html: `
          <p>
            Según la geometría espacial en la que se distribuye la energía:
          </p>
          <ul>
            <li><strong>Unidimensionales (1D):</strong> La energía se canaliza a lo largo de una única dimensión lineal (cuerda tensa, resorte slinky). La amplitud se mantiene constante si no hay disipación.</li>
            <li><strong>Bidimensionales (2D):</strong> La perturbación se expande en una superficie (ondas superficiales en agua, membrana de tambor). Los frentes de onda son circunferencias concéntricas; la amplitud decrece como $A \\propto 1/\\sqrt{r}$.</li>
            <li><strong>Tridimensionales (3D):</strong> La energía se radia esféricamente en el volumen (sonido en aire libre, radiación de una antena puntual). Los frentes de onda son esferas; la amplitud decrece como $A \\propto 1/r$, y la intensidad cumple la ley del inverso del cuadrado: $I \\propto 1/r^2$.</li>
          </ul>
        `
      }
    ],
    exercise: {
      title: "Ejercicio Resuelto 2.1: Clasificación y Cinemática de Ondas Sísmicas P y S",
      statement: "Durante un sismo, una estación sismográfica registra la llegada de las ondas primarias longitudinales (P) con una velocidad de $v_P = 8.00\\text{ km/s}$ y, $18.5\\text{ s}$ después, la llegada de las ondas secundarias transversales (S) cuya velocidad es de $v_S = 4.50\\text{ km/s}$. Asumiendo una trayectoria rectilínea: (a) clasifique ambas ondas física y mecánicamente, (b) determine la distancia $d$ desde el hipocentro del sismo hasta la estación, y (c) calcule el tiempo de viaje de la onda P.",
      steps: [
        {
          num: 1,
          name: "Comprensión e interpretación del enunciado",
          content: "Se tienen dos ondas mecánicas que viajan por el mismo medio geológico desde una fuente común puntual. Debido a que las ondas longitudinales P tienen mayor velocidad que las transversales S, se produce un retardo temporal $\\Delta t = t_S - t_P = 18.5\\text{ s}$."
        },
        {
          num: 2,
          name: "Identificación de los datos",
          content: `
            <div class="data-table-wrapper">
              <span class="badge-dato">DATOS (#2563EB)</span>
              <table class="data-table">
                <tr><th>Magnitud</th><th>Símbolo</th><th>Valor Numérico</th><th>Unidad</th></tr>
                <tr><td>Velocidad onda P</td><td>$v_P$</td><td>$8.00$</td><td>$\\text{km/s}$</td></tr>
                <tr><td>Velocidad onda S</td><td>$v_S$</td><td>$4.50$</td><td>$\\text{km/s}$</td></tr>
                <tr><td>Diferencia de tiempo de arribo</td><td>$\\Delta t$</td><td>$18.5$</td><td>$\\text{s}$</td></tr>
              </table>
            </div>
          `
        },
        {
          num: 3,
          name: "Identificación de las incógnitas",
          content: `
            <div class="incognitas-table-wrapper">
              <span class="badge-incognita">INCÓGNITAS (#DC2626)</span>
              <ul>
                <li>Clasificación física y mecánica de ondas P y S.</li>
                <li>Distancia hipocentral: $d$ $[\\text{m} \\text{ ó } \\text{km}]$.</li>
                <li>Tiempo de tránsito de onda P: $t_P$ $[\\text{s}]$.</li>
              </ul>
            </div>
          `
        },
        {
          num: 4,
          name: "Selección de las ecuaciones",
          content: `
            Para movimiento a velocidad uniforme en medio homogéneo:
            $$d = v_P t_P = v_S t_S \\implies t_S = \\frac{d}{v_S}, \\quad t_P = \\frac{d}{v_P}$$
            $$\\Delta t = t_S - t_P = d \\left(\\frac{1}{v_S} - \\frac{1}{v_P}\\right) = d \\left(\\frac{v_P - v_S}{v_P v_S}\\right)$$
          `
        },
        {
          num: 5,
          name: "Conversión de unidades",
          content: `
            Conversión de velocidades al Sistema Internacional:
            $$v_P = 8.00\\text{ km/s} = 8.00 \\times 10^3\\text{ m/s}$$
            $$v_S = 4.50\\text{ km/s} = 4.50 \\times 10^3\\text{ m/s}$$
          `
        },
        {
          num: 6,
          name: "Sustitución, despeje y procedimiento algebraico",
          content: `
            <div class="algebra-steps">
              <p>Despeje de la distancia $d$:</p>
              $$d = \\Delta t \\cdot \\frac{v_P v_S}{v_P - v_S}$$
              $$d = 18.5\\text{ s} \\cdot \\frac{(8000\\text{ m/s})(4500\\text{ m/s})}{8000\\text{ m/s} - 4500\\text{ m/s}} = 18.5 \\cdot \\frac{36\\times 10^6}{3500} = <span class="badge-calculado">190285.7\\text{ m}</span>$$
              $$d = <span class="badge-calculado">190.29\\text{ km}</span>$$
              <p>Tiempo de viaje de la onda P:</p>
              $$t_P = \\frac{d}{v_P} = \\frac{190285.7\\text{ m}}{8000\\text{ m/s}} = <span class="badge-calculado">23.79\\text{ s}</span>$$
            </div>
          `
        },
        {
          num: 7,
          name: "Resultado final",
          content: `
            <div class="result-box">
              <ul>
                <li><strong>Clasificación:</strong> La onda P es mecánica, longitudinal, volumétrica (compresiones y dilataciones). La onda S es mecánica, transversal, de cizalla.</li>
                <li><strong>Distancia al hipocentro:</strong> $d = 190\\text{ km}$ ($1.90\\times 10^5\\text{ m}$).</li>
                <li><strong>Tiempo de viaje onda P:</strong> $t_P = 23.8\\text{ s}$.</li>
              </ul>
            </div>
          `
        },
        {
          num: 8,
          name: "Validación del resultado",
          content: "Validación de arribo de onda S: $t_S = 190.29\\text{ km} / 4.50\\text{ km/s} = 42.29\\text{ s}$. Verificación del intervalo: $\\Delta t = 42.29\\text{ s} - 23.79\\text{ s} = 18.50\\text{ s}$. La comprobación es idéntica al enunciado."
        },
        {
          num: 9,
          name: "Conclusión",
          content: "La disparidad de velocidades entre los modos mecánicos longitudinales (módulo volumétrico y rigidez) y transversales (solo rigidez) es el fundamento sismológico para la triangulación precisa de terremotos."
        },
        {
          num: 10,
          name: "Verificación independiente",
          content: "Cálculo alternativo de la velocidad aparente relativa $v_{rel} = \\frac{v_P v_S}{v_P - v_S} = \\frac{36}{3.5} = 10.286\\text{ km/s}$. Distancia: $d = 10.286\\text{ km/s} \\times 18.5\\text{ s} = 190.29\\text{ km}$. Confirmado."
        }
      ]
    },
    quiz: {
      question: "¿Por qué las ondas transversales de cizalla (ondas S) no pueden propagarse a través del núcleo externo de la Tierra?",
      options: [
        "Porque el núcleo externo se encuentra a temperaturas cercanas al cero absoluto.",
        "Porque el núcleo externo es líquido y los fluidos carecen de módulo de rigidez al corte estático, impidiendo fuerzas de restitución transversales.",
        "Porque la gravedad en el centro de la Tierra es cero y las ondas transversales requieren gravedad para propagarse.",
        "Porque la densidad del hierro líquido es tan alta que absorbe instantáneamente toda la energía mecánica."
      ],
      correctIndex: 1,
      explanation: "Exacto. Las ondas transversales mecánicas requieren una fuerza restauradora de cizalladura (corte). Como los líquidos y gases no soportan esfuerzos de corte estáticos (su módulo de cizalla es nulo), únicamente permiten la propagación de ondas longitudinales de presión."
    }
  },

  // ================= UNIDAD 3 =================
  {
    id: "unidad-3",
    number: 3,
    title: "Descripción Matemática de las Ondas",
    shortTitle: "U3: Matemática",
    summary: "Funciones sinusoidales, fase, ecuación diferencial de onda unidimensional y deducibilidad física.",
    sections: [
      {
        subtitle: "3.1 Función de Onda Viajera y Condición de d'Alembert",
        html: `
          <p>
            Cualquier perturbación que mantenga su perfil inalterado mientras se desplaza con velocidad $v$ a lo largo del eje $x$ puede representarse genéricamente mediante la forma funcional:
          </p>
          <div class="math-display">$$y(x,t) = f(x \\mp vt)$$</div>
          <p>
            donde el signo negativo corresponde a propagación hacia $+x$ (hacia la derecha) y el signo positivo a propagación hacia $-x$ (hacia la izquierda).
          </p>
          <p>
            Para una perturbación armónica pura, la solución se expresa mediante:
          </p>
          <div class="math-display">$$y(x,t) = A\\sin(kx - \\omega t + \\phi_0) = A\\sin\\left[\\frac{2\\pi}{\\lambda}(x - vt) + \\phi_0\\right]$$</div>
          <p>
            El argumento del seno, $\\Phi(x,t) = kx - \\omega t + \\phi_0$, se denomina <strong>fase instantánea</strong>. Para seguir un punto de fase constante (como una cresta):
          </p>
          <div class="math-display">$$d\\Phi = k\\,dx - \\omega\\,dt = 0 \\implies v = \\frac{dx}{dt} = \\frac{\\omega}{k}$$</div>
        `
      },
      {
        subtitle: "3.2 Deducción de la Ecuación Diferencial Clásica de Onda",
        html: `
          <p>
            Calculando las derivadas parciales de segundo orden respecto a la posición y respecto al tiempo:
          </p>
          <div class="math-display">$$\\frac{\\partial y}{\\partial x} = k A\\cos(kx - \\omega t + \\phi_0) \\implies \\frac{\\partial^2 y}{\\partial x^2} = -k^2 A\\sin(kx - \\omega t + \\phi_0) = -k^2 y$$</div>
          <div class="math-display">$$\\frac{\\partial y}{\\partial t} = -\\omega A\\cos(kx - \\omega t + \\phi_0) \\implies \\frac{\\partial^2 y}{\\partial t^2} = -\\omega^2 A\\sin(kx - \\omega t + \\phi_0) = -\\omega^2 y$$</div>
          <p>
            Dividiendo ambas expresiones:
          </p>
          <div class="math-display">$$\\frac{\\frac{\\partial^2 y}{\\partial t^2}}{\\frac{\\partial^2 y}{\\partial x^2}} = \\frac{-\\omega^2 y}{-k^2 y} = \\frac{\\omega^2}{k^2} = v^2$$</div>
          <div class="academic-callout callout-important">
            <div class="callout-icon">⚡</div>
            <div class="callout-body">
              <h4>Ecuación Diferencial Clásica de Onda Unidimensional</h4>
              <div class="math-display">$$\\frac{\\partial^2 y}{\\partial t^2} = v^2 \\frac{\\partial^2 y}{\\partial x^2}$$</div>
              <p>Esta ecuación diferencial lineal en derivadas parciales gobierna todo fenómeno ondulatorio no dispersivo y garantiza que la suma de soluciones es también una solución (principio de superposición).</p>
            </div>
          </div>
        `
      }
    ],
    exercise: {
      title: "Ejercicio Resuelto 3.1: Verificación de Solución y Velocidad Transversal",
      statement: "Dada la función de onda transversal en una cuerda: $y(x,t) = 0.05\\cos(4.0 x - 12.0 t)$ (con $x$ en metros, $t$ en segundos e $y$ en metros): (a) demuestre formalmente que satisface la ecuación diferencial clásica de onda y determine la velocidad de propagación $v$, (b) halle la velocidad transversal instantánea $v_y(x,t)$ y la aceleración transversal $a_y(x,t)$ de una partícula del medio en la posición $x = 0.50\\text{ m}$ en $t = 0.20\\text{ s}$, y (c) calcule la rapidez máxima de oscilación transversal de cualquier partícula.",
      steps: [
        {
          num: 1,
          name: "Comprensión e interpretación del enunciado",
          content: "Se requiere verificar rigurosamente la ecuación de onda mediante diferenciación parcial y contrastar la velocidad de fase de la onda $v$ con la velocidad cinemática de las partículas del medio $v_y = \\partial y / \\partial t$."
        },
        {
          num: 2,
          name: "Identificación de los datos",
          content: `
            <div class="data-table-wrapper">
              <span class="badge-dato">DATOS (#2563EB)</span>
              <ul>
                <li>Amplitud: $A = 0.05\\text{ m}$</li>
                <li>Número de onda: $k = 4.0\\text{ rad/m}$</li>
                <li>Frecuencia angular: $\\omega = 12.0\\text{ rad/s}$</li>
                <li>Punto de evaluación: $x = 0.50\\text{ m}$</li>
                <li>Instante de evaluación: $t = 0.20\\text{ s}$</li>
              </ul>
            </div>
          `
        },
        {
          num: 3,
          name: "Identificación de las incógnitas",
          content: `
            <div class="incognitas-table-wrapper">
              <span class="badge-incognita">INCÓGNITAS (#DC2626)</span>
              <ul>
                <li>Velocidad de propagación de la onda: $v$ $[\\text{m/s}]$</li>
                <li>Velocidad transversal en $(x,t)$: $v_y(0.5, 0.2)$ $[\\text{m/s}]$</li>
                <li>Aceleración transversal en $(x,t)$: $a_y(0.5, 0.2)$ $[\\text{m/s}^2]$</li>
                <li>Rapidez transversal máxima: $v_{y,\\max}$ $[\\text{m/s}]$</li>
              </ul>
            </div>
          `
        },
        {
          num: 4,
          name: "Selección de las ecuaciones",
          content: `
            Ecuaciones de derivadas parciales:
            $$v_y(x,t) = \\frac{\\partial y}{\\partial t} = -A\\omega [-\\sin(kx - \\omega t)] = A\\omega\\sin(kx - \\omega t)$$
            $$a_y(x,t) = \\frac{\\partial^2 y}{\\partial t^2} = -A\\omega^2\\cos(kx - \\omega t) = -\\omega^2 y(x,t)$$
            $$v_{y,\\max} = A\\omega, \\quad v = \\frac{\\omega}{k}$$
          `
        },
        {
          num: 5,
          name: "Conversión de unidades",
          content: "Las magnitudes están dadas directamente en unidades estándar del SI: $k = 4.0\\text{ m}^{-1}$, $\\omega = 12.0\\text{ s}^{-1}$."
        },
        {
          num: 6,
          name: "Sustitución, despeje y procedimiento algebraico",
          content: `
            <div class="algebra-steps">
              <p>1. Velocidad de propagación de la perturbación:</p>
              $$v = \\frac{\\omega}{k} = \\frac{12.0\\text{ rad/s}}{4.0\\text{ rad/m}} = <span class="badge-calculado">3.00\\text{ m/s}</span>$$
              <p>2. Evaluación de la fase en $(x=0.50\\text{ m}, t=0.20\\text{ s})$:</p>
              $$\\Phi = 4.0(0.50) - 12.0(0.20) = 2.0 - 2.4 = -0.40\\text{ rad}$$
              $$\\sin(-0.40\\text{ rad}) = -0.38942, \\quad \\cos(-0.40\\text{ rad}) = 0.92106$$
              <p>3. Velocidad transversal en ese punto:</p>
              $$v_y = (0.05)(12.0)\\sin(-0.40) = 0.60(-0.38942) = <span class="badge-calculado">-0.2337\\text{ m/s}</span>$$
              <p>4. Aceleración transversal:</p>
              $$a_y = -(0.05)(12.0)^2\\cos(-0.40) = -7.20(0.92106) = <span class="badge-calculado">-6.632\\text{ m/s}^2</span>$$
              <p>5. Rapidez máxima transversal de las partículas:</p>
              $$v_{y,\\max} = A\\omega = (0.05\\text{ m})(12.0\\text{ s}^{-1}) = <span class="badge-calculado">0.60\\text{ m/s}</span>$$
            </div>
          `
        },
        {
          num: 7,
          name: "Resultado final",
          content: `
            <div class="result-box">
              <ul>
                <li>Velocidad de fase de la onda: $v = 3.00\\text{ m/s}$ (hacia $+x$).</li>
                <li>Velocidad transversal puntual: $v_y(0.5, 0.2) = -0.234\\text{ m/s}$ (hacia abajo).</li>
                <li>Aceleración transversal puntual: $a_y(0.5, 0.2) = -6.63\\text{ m/s}^2$.</li>
                <li>Velocidad transversal máxima posible: $v_{y,\\max} = 0.600\\text{ m/s}$.</li>
              </ul>
            </div>
          `
        },
        {
          num: 8,
          name: "Validación del resultado",
          content: "Verificación de la cota: $|v_y| = 0.234\\text{ m/s} \\le v_{y,\\max} = 0.600\\text{ m/s}$. La aceleración satisface la relación del movimiento armónico simple local: $a_y = -\\omega^2 y = -(144)(0.05 \\times 0.92106) = -6.63\\text{ m/s}^2$."
        },
        {
          num: 9,
          name: "Conclusión",
          content: "Es fundamental no confundir la velocidad con la que viaja la onda por el espacio ($v = 3.00\\text{ m/s}$) con la velocidad oscilatoria perpendicular de la masa del medio ($v_{y,\\max} = 0.60\\text{ m/s}$). Ambas magnitudes tienen direcciones y significados mecánicos totalmente distintos."
        },
        {
          num: 10,
          name: "Verificación independiente",
          content: "Verificación de la relación diferencial: $\\partial^2 y / \\partial x^2 = -k^2 y = -(16)(0.04605) = -0.7369\\text{ m}^{-1}$. Entonces $v^2 \\cdot (\\partial^2 y / \\partial x^2) = (9)(-0.7369) = -6.632\\text{ m/s}^2 = \\partial^2 y / \\partial t^2$. Ecuación de onda demostrada con exactitud."
        }
      ]
    },
    quiz: {
      question: "Si la función de una onda en una cuerda es $y(x,t) = A\\cos(kx + \\omega t)$, ¿hacia dónde se propaga la onda y cuál es su velocidad?",
      options: [
        "Se propaga hacia la derecha ($+x$) con velocidad $v = k/\\omega$.",
        "Se propaga hacia la izquierda ($-x$) con velocidad $v = \\omega/k$.",
        "Es una onda estacionaria y no se propaga en ninguna dirección.",
        "Se propaga verticalmente en dirección $+y$ con velocidad constante $A\\omega$."
      ],
      correctIndex: 1,
      explanation: "Correcto. El argumento de fase $kx + \\omega t$ indica que para mantener una fase constante $\\Phi$, al aumentar el tiempo $t$, la coordenada $x$ debe disminuir ($dx/dt = -\\omega/k < 0$), lo que corresponde a una propagación hacia la izquierda (dirección $-x$) con rapidez $v = \\omega/k$."
    }
  },

  // ================= UNIDAD 4 =================
  {
    id: "unidad-4",
    number: 4,
    title: "Velocidad de Propagación y Energía",
    shortTitle: "U4: Energía y Velocidad",
    summary: "Propiedades elásticas e inerciales del medio, transporte de potencia, energía cinética y potencial, e intensidad.",
    sections: [
      {
        subtitle: "4.1 Velocidad de Onda y Propiedades del Medio",
        html: `
          <p>
            La velocidad de propagación de una onda mecánica está determinada exclusivamente por las propiedades mecánicas intrínsecas del medio, siguiendo la ley general:
          </p>
          <div class="math-display">$$v = \\sqrt{\\frac{\\text{Propiedad elástica (Fuerza restauradora)}}{\\text{Propiedad inercial (Resistencia a la aceleración)}}}$$</div>
          <p>
            Ejemplos representativos:
          </p>
          <ul>
            <li><strong>Cuerda tensa:</strong> $v = \\sqrt{\\frac{T}{\\mu}}$, donde $T$ es la tensión $[\\text{N}]$ y $\\mu = m/L$ es la densidad lineal de masa $[\\text{kg/m}]$.</li>
            <li><strong>Onda longitudinal en varilla sólida:</strong> $v = \\sqrt{\\frac{Y}{\\rho}}$, donde $Y$ es el módulo de Young y $\\rho$ es la densidad volumétrica.</li>
            <li><strong>Onda acústica en fluido/gas:</strong> $v = \\sqrt{\\frac{B}{\\rho}} = \\sqrt{\\frac{\\gamma R T}{M}}$, donde $B$ es el módulo de compresibilidad adiabático.</li>
          </ul>
        `
      },
      {
        subtitle: "4.2 Transporte de Energía, Potencia e Intensidad",
        html: `
          <p>
            Al propagarse, la onda transmite energía cinética (debida a la velocidad de las partículas $v_y$) y energía potencial elástica (debida a la deformación y estiramiento del medio). Para un segmento diferencial de cuerda:
          </p>
          <div class="math-display">$$dK = \\frac{1}{2} dm\\, v_y^2 = \\frac{1}{2}(\\mu\\,dx)\\left(\\frac{\\partial y}{\\partial t}\\right)^2$$</div>
          <div class="math-display">$$dU = \\frac{1}{2} T\\,dx \\left(\\frac{\\partial y}{\\partial x}\\right)^2$$</div>
          <p>
            La <strong>potencia instantánea</strong> transmitida a través de cualquier sección transversal es:
          </p>
          <div class="math-display">$$P(t) = -T \\left(\\frac{\\partial y}{\\partial x}\\right)\\left(\\frac{\\partial y}{\\partial t}\\right) = \\mu v \\omega^2 A^2 \\sin^2(kx - \\omega t)$$</div>
          <p>
            Dado que el promedio temporal de $\\sin^2(\\cdot)$ en un ciclo es $1/2$, la <strong>potencia media</strong> transportada es:
          </p>
          <div class="academic-callout callout-important">
            <div class="callout-icon">⚡</div>
            <div class="callout-body">
              <h4>Potencia Media Transportada por una Onda Armónica</h4>
              <div class="math-display">$$\\bar{P} = \\frac{1}{2}\\mu v \\omega^2 A^2$$</div>
              <p>La potencia es directamente proporcional a la velocidad de la onda, a la densidad inercial y <strong>al cuadrado de la frecuencia y de la amplitud</strong>.</p>
            </div>
          </div>
        `
      }
    ],
    exercise: {
      title: "Ejercicio Resuelto 4.1: Tensión en Cuerda y Transmisión de Potencia",
      statement: "Una cuerda uniforme de $12.0\\text{ m}$ de longitud tiene una masa total de $0.360\\text{ kg}$ y está sometida a una tensión de $90.0\\text{ N}$. Un oscilador armónico conectado en un extremo genera una onda transversal sinusoidal con una frecuencia de $30.0\\text{ Hz}$ y una amplitud de $4.00\\text{ cm}$. (a) Determine la velocidad de propagación $v$ y la longitud de onda $\\lambda$. (b) Calcule la potencia media $\\bar{P}$ transportada por la cuerda. (c) Si se desea duplicar la velocidad de propagación manteniendo constante la longitud de la cuerda, ¿qué nueva tensión $T'$ se debe aplicar?",
      steps: [
        {
          num: 1,
          name: "Comprensión e interpretación del enunciado",
          content: "Se estudia una onda transversal en una cuerda tensa con masa distribuida uniformemente. Se requiere calcular los parámetros dinámicos de velocidad a partir de la tensión y la densidad lineal, luego la potencia media transportada y la variación cuadrática de la tensión requerida."
        },
        {
          num: 2,
          name: "Identificación de los datos",
          content: `
            <div class="data-table-wrapper">
              <span class="badge-dato">DATOS (#2563EB)</span>
              <ul>
                <li>Longitud de la cuerda: $L = 12.0\\text{ m}$</li>
                <li>Masa de la cuerda: $m = 0.360\\text{ kg}$</li>
                <li>Tensión original: $T = 90.0\\text{ N}$</li>
                <li>Frecuencia: $f = 30.0\\text{ Hz}$</li>
                <li>Amplitud: $A = 4.00\\text{ cm} = 0.0400\\text{ m}$</li>
              </ul>
            </div>
          `
        },
        {
          num: 3,
          name: "Identificación de las incógnitas",
          content: `
            <div class="incognitas-table-wrapper">
              <span class="badge-incognita">INCÓGNITAS (#DC2626)</span>
              <ul>
                <li>Densidad lineal de masa: $\\mu$ $[\\text{kg/m}]$</li>
                <li>Velocidad de propagación: $v$ $[\\text{m/s}]$</li>
                <li>Longitud de onda: $\\lambda$ $[\\text{m}]$</li>
                <li>Potencia media: $\\bar{P}$ $[\\text{W}]$</li>
                <li>Tensión para duplicar velocidad: $T'$ $[\\text{N}]$</li>
              </ul>
            </div>
          `
        },
        {
          num: 4,
          name: "Selección de las ecuaciones",
          content: `
            $$\\mu = \\frac{m}{L}, \\quad v = \\sqrt{\\frac{T}{\\mu}}, \\quad \\lambda = \\frac{v}{f}$$
            $$\\omega = 2\\pi f, \\quad \\bar{P} = \\frac{1}{2}\\mu v \\omega^2 A^2, \\quad T' = \\mu (v')^2 = \\mu (2v)^2 = 4T$$
          `
        },
        {
          num: 5,
          name: "Conversión de unidades",
          content: "Amplitud: $A = 4.00\\text{ cm} = 0.0400\\text{ m}$. Las demás magnitudes ya se encuentran en el SI."
        },
        {
          num: 6,
          name: "Sustitución, despeje y procedimiento algebraico",
          content: `
            <div class="algebra-steps">
              <p>1. Densidad lineal $\\mu$:</p>
              $$\\mu = \\frac{0.360\\text{ kg}}{12.0\\text{ m}} = <span class="badge-calculado">0.0300\\text{ kg/m}</span>$$
              <p>2. Velocidad de fase $v$:</p>
              $$v = \\sqrt{\\frac{90.0\\text{ N}}{0.0300\\text{ kg/m}}} = \\sqrt{3000} = <span class="badge-calculado">54.77\\text{ m/s}</span>$$
              <p>3. Longitud de onda $\\lambda$:</p>
              $$\\lambda = \\frac{54.77\\text{ m/s}}{30.0\\text{ s}^{-1}} = <span class="badge-calculado">1.826\\text{ m}</span>$$
              <p>4. Frecuencia angular $\\omega$:</p>
              $$\\omega = 2\\pi(30.0) = 188.50\\text{ rad/s}$$
              <p>5. Potencia media $\\bar{P}$:</p>
              $$\\bar{P} = \\frac{1}{2}(0.0300)(54.77)(188.50)^2 (0.0400)^2$$
              $$\\bar{P} = 0.5 \\times 0.0300 \\times 54.77 \\times 35530.6 \\times 0.0016 = <span class="badge-calculado">46.70\\text{ W}</span>$$
              <p>6. Nueva tensión para duplicar la velocidad ($v' = 2v$):</p>
              $$T' = 4 \\times T = 4 \\times 90.0\\text{ N} = <span class="badge-calculado">360.0\\text{ N}</span>$$
            </div>
          `
        },
        {
          num: 7,
          name: "Resultado final",
          content: `
            <div class="result-box">
              <ul>
                <li>Velocidad de propagación: $v = 54.8\\text{ m/s}$.</li>
                <li>Longitud de onda: $\\lambda = 1.83\\text{ m}$.</li>
                <li>Potencia media transportada: $\\bar{P} = 46.7\\text{ W}$.</li>
                <li>Tensión requerida para $v' = 2v$: $T' = 360\\text{ N}$.</li>
              </ul>
            </div>
          `
        },
        {
          num: 8,
          name: "Validación del resultado",
          content: "Validación dimensional: $[\\bar{P}] = [\\text{kg/m}] \\cdot [\\text{m/s}] \\cdot [\\text{s}^{-2}] \\cdot [\\text{m}^2] = \\text{kg}\\cdot\\text{m}^2/\\text{s}^3 = \\text{J/s} = \\text{W}$. Coherente."
        },
        {
          num: 9,
          name: "Conclusión",
          content: "Debido a la relación de raíz cuadrada $v \\propto \\sqrt{T}$, para duplicar la rapidez de una perturbación elástica es necesario cuadruplicar la tensión aplicada a la cuerda."
        },
        {
          num: 10,
          name: "Verificación independiente",
          content: "Cálculo alternativo de la energía por unidad de longitud (densidad lineal de energía): $\\eta = \\frac{1}{2}\\mu \\omega^2 A^2 = 0.5(0.030)(188.5)^2(0.04)^2 = 0.8527\\text{ J/m}$. Potencia: $\\bar{P} = \\eta \\cdot v = 0.8527\\text{ J/m} \\times 54.77\\text{ m/s} = 46.70\\text{ W}$. Coincidencia total."
        }
      ]
    },
    quiz: {
      question: "Si en una cuerda tensa se duplica la amplitud $A$ y simultáneamente se reduce la frecuencia $f$ a la mitad, ¿qué sucede con la potencia media transportada por la onda?",
      options: [
        "La potencia media se cuadruplica.",
        "La potencia media permanece constante.",
        "La potencia media se duplica.",
        "La potencia media se reduce a la cuarta parte."
      ],
      correctIndex: 1,
      explanation: "Correcto. La potencia media depende del producto $\\omega^2 A^2 \\propto (f A)^2$. Si se duplica $A$ ($2A$) y se reduce $f$ a la mitad ($f/2$), el producto resulta $(f/2 \\cdot 2A)^2 = (f A)^2$, por lo que la potencia transportada se mantiene invariable."
    }
  },

  // ================= UNIDAD 5 =================
  {
    id: "unidad-5",
    number: 5,
    title: "Principio de Superposición e Interferencia",
    shortTitle: "U5: Superposición",
    summary: "Superposición lineal de ondas armónicas, interferencia constructiva y destructiva, y fenómeno de batidos.",
    sections: [
      {
        subtitle: "5.1 Principio de Superposición Lineal",
        html: `
          <p>
            El <strong>principio de superposición</strong> establece que cuando dos o más ondas se propagan simultáneamente en un medio elástico lineal, la perturbación resultante en cualquier punto y momento es la <strong>suma algebraica vectorial</strong> de los desplazamientos que produciría cada onda de forma independiente:
          </p>
          <div class="math-display">$$y_{\\text{res}}(x,t) = \\sum_{i=1}^{N} y_i(x,t) = y_1(x,t) + y_2(x,t) + \\dots + y_N(x,t)$$</div>
          <p>
            Este principio se deriva directamente de la linealidad de la ecuación diferencial de onda. Las ondas se cruzan e interfieren en el espacio, pero continúan su propagación posterior sin experimentar alteración en sus perfiles individuales.
          </p>
        `
      },
      {
        subtitle: "5.2 Interferencia de Dos Ondas Armónicas Coherentes",
        html: `
          <p>
            Consideremos dos ondas armónicas de idéntica amplitud $A$, longitud de onda $\\lambda$ y frecuencia $\\omega$, desfasadas por un ángulo constante $\\Delta\\phi$:
          </p>
          <div class="math-display">$$y_1(x,t) = A\\sin(kx - \\omega t), \\quad y_2(x,t) = A\\sin(kx - \\omega t + \\Delta\\phi)$$</div>
          <p>
            Aplicando la identidad trigonométrica $\\sin\\alpha + \\sin\\beta = 2\\cos\\left(\\frac{\\alpha - \\beta}{2}\\right)\\sin\\left(\\frac{\\alpha + \\beta}{2}\\right)$:
          </p>
          <div class="academic-callout callout-important">
            <div class="callout-icon">🎯</div>
            <div class="callout-body">
              <h4>Ecuación de Interferencia Armónica</h4>
              <div class="math-display">$$y_{\\text{res}}(x,t) = \\left[2A\\cos\\left(\\frac{\\Delta\\phi}{2}\\right)\\right] \\sin\\left(kx - \\omega t + \\frac{\\Delta\\phi}{2}\\right)$$</div>
              <p>La amplitud resultante efectiva es $A_{\\text{res}} = 2A\\left|\\cos\\left(\\frac{\\Delta\\phi}{2}\\right)\\right|$.</p>
            </div>
          </div>
          <ul>
            <li><strong>Interferencia totalmente constructiva:</strong> Cuando $\\Delta\\phi = 2m\\pi$ ($m \\in \\mathbb{Z}$). $\\cos(\\Delta\\phi/2) = \\pm 1 \\implies A_{\\text{res}} = 2A$.</li>
            <li><strong>Interferencia totalmente destructiva:</strong> Cuando $\\Delta\\phi = (2m + 1)\\pi$ ($m \\in \\mathbb{Z}$). $\\cos(\\Delta\\phi/2) = 0 \\implies A_{\\text{res}} = 0$.</li>
          </ul>
        `
      },
      {
        subtitle: "5.3 Fenómeno de Batidos (Beats)",
        html: `
          <p>
            Cuando se superponen dos ondas con amplitudes iguales pero frecuencias ligeramente distintas $f_1 \\approx f_2$:
          </p>
          <div class="math-display">$$y(t) = A\\sin(2\\pi f_1 t) + A\\sin(2\\pi f_2 t) = \\left[2A\\cos\\left(2\\pi \\frac{f_1 - f_2}{2} t\\right)\\right] \\sin\\left(2\\pi \\frac{f_1 + f_2}{2} t\\right)$$</div>
          <p>
            El término entre corchetes actúa como una <strong>envolvente de amplitud modulada</strong> lentamente en el tiempo. Como el oído humano percibe un máximo de sonoridad cada medio período de la envolvente, la <strong>frecuencia de batido</strong> audible es:
          </p>
          <div class="math-display">$$f_{\\text{batido}} = |f_1 - f_2|$$</div>
        `
      }
    ],
    exercise: {
      title: "Ejercicio Resuelto 5.1: Interferencia por Diferencia de Camino y Batidos",
      statement: "Dos altavoces idénticos $S_1$ y $S_2$, separados por una distancia $d = 3.00\\text{ m}$, emiten en fase ondas sonoras sinusoidales con una frecuencia $f = 686\\text{ Hz}$ en un recinto donde la velocidad del sonido es $v = 343\\text{ m/s}$. Un oyente se ubica en un punto $P$ a una distancia $r_1 = 4.00\\text{ m}$ del altavoz $S_1$ y a $r_2 = 4.75\\text{ m}$ del altavoz $S_2$. (a) Determine la diferencia de camino $\\Delta r$ y el desfase angular $\\Delta\\phi$ en el punto $P$. (b) Indique el tipo de interferencia resultante. (c) Si el altavoz $S_2$ se reajusta para emitir a $690\\text{ Hz}$, determine la frecuencia de batido percibida por el oyente.",
      steps: [
        {
          num: 1,
          name: "Comprensión e interpretación del enunciado",
          content: "Se tiene un sistema de dos fuentes coherentes en fase emitiendo ondas esféricas en el aire. La diferencia de distancia recorrida $\\Delta r = |r_2 - r_1|$ introduce un desfase espacial $\\Delta\\phi = k\\Delta r$ que determina la amplitud acústica en el punto $P$."
        },
        {
          num: 2,
          name: "Identificación de los datos",
          content: `
            <div class="data-table-wrapper">
              <span class="badge-dato">DATOS (#2563EB)</span>
              <ul>
                <li>Frecuencia de las fuentes: $f = 686\\text{ Hz}$</li>
                <li>Velocidad del sonido: $v = 343\\text{ m/s}$</li>
                <li>Distancia al altavoz 1: $r_1 = 4.00\\text{ m}$</li>
                <li>Distancia al altavoz 2: $r_2 = 4.75\\text{ m}$</li>
                <li>Frecuencia modificada en fuente 2: $f_2' = 690\\text{ Hz}$</li>
              </ul>
            </div>
          `
        },
        {
          num: 3,
          name: "Identificación de las incógnitas",
          content: `
            <div class="incognitas-table-wrapper">
              <span class="badge-incognita">INCÓGNITAS (#DC2626)</span>
              <ul>
                <li>Longitud de onda del sonido: $\\lambda$ $[\\text{m}]$</li>
                <li>Diferencia de camino: $\\Delta r$ $[\\text{m}]$</li>
                <li>Diferencia de fase angular: $\\Delta\\phi$ $[\\text{rad}]$</li>
                <li>Tipo de interferencia (constructiva, destructiva o intermedia)</li>
                <li>Frecuencia de batidos: $f_{\\text{batido}}$ $[\\text{Hz}]$</li>
              </ul>
            </div>
          `
        },
        {
          num: 4,
          name: "Selección de las ecuaciones",
          content: `
            $$\\lambda = \\frac{v}{f}, \\quad \\Delta r = |r_2 - r_1|, \\quad \\Delta\\phi = \\frac{2\\pi}{\\lambda}\\Delta r = k\\Delta r, \\quad f_{\\text{batido}} = |f_2' - f|$$
          `
        },
        {
          num: 5,
          name: "Conversión de unidades",
          content: "Todas las unidades se encuentran en el Sistema Internacional: distancias en metros y frecuencias en hercios."
        },
        {
          num: 6,
          name: "Sustitución, despeje y procedimiento algebraico",
          content: `
            <div class="algebra-steps">
              <p>1. Longitud de onda del sonido:</p>
              $$\\lambda = \\frac{343\\text{ m/s}}{686\\text{ Hz}} = <span class="badge-calculado">0.500\\text{ m}</span>$$
              <p>2. Diferencia de camino $\\Delta r$:</p>
              $$\\Delta r = 4.75\\text{ m} - 4.00\\text{ m} = <span class="badge-calculado">0.750\\text{ m}</span>$$
              <p>3. Relación de camino en términos de $\\lambda$:</p>
              $$\\frac{\\Delta r}{\\lambda} = \\frac{0.750\\text{ m}}{0.500\\text{ m}} = 1.50 = \\frac{3}{2}$$
              <p>4. Diferencia de fase $\\Delta\\phi$:</p>
              $$\\Delta\\phi = 2\\pi \\left(\\frac{\\Delta r}{\\lambda}\\right) = 2\\pi(1.50) = <span class="badge-calculado">3\\pi\\text{ rad} \\approx 9.425\\text{ rad}</span>$$
              <p>5. Cálculo de la frecuencia de batido con $f_2' = 690\\text{ Hz}$:</p>
              $$f_{\\text{batido}} = |690\\text{ Hz} - 686\\text{ Hz}| = <span class="badge-calculado">4.00\\text{ Hz}</span>$$
            </div>
          `
        },
        {
          num: 7,
          name: "Resultado final",
          content: `
            <div class="result-box">
              <ul>
                <li>Longitud de onda: $\\lambda = 0.500\\text{ m}$.</li>
                <li>Diferencia de camino: $\\Delta r = 0.750\\text{ m} = \\frac{3}{2}\\lambda$.</li>
                <li>Diferencia de fase: $\\Delta\\phi = 3\\pi\\text{ rad}$ (múltiplo impar de $\\pi$).</li>
                <li><strong>Tipo de interferencia: Destructiva total.</strong> La amplitud resultante en $P$ es nula ($A_{\\text{res}} = 0$).</li>
                <li>Frecuencia de batidos: $f_{\\text{batido}} = 4.00\\text{ Hz}$ (4 pulsaciones sonoras por segundo).</li>
              </ul>
            </div>
          `
        },
        {
          num: 8,
          name: "Validación del resultado",
          content: "Amplitud resultante: $A_{\\text{res}} = 2A|\\cos(3\\pi/2)| = 2A(0) = 0$. La destrucción del sonido es completa."
        },
        {
          num: 9,
          name: "Conclusión",
          content: "Al llegar las crestas de la fuente $S_1$ exactamente en oposición de fase con los valles de la fuente $S_2$, las variaciones de presión acústica se cancelan exactamente en el punto de escucha."
        },
        {
          num: 10,
          name: "Verificación independiente",
          content: "Verificación de la condición de mínimo: $\\Delta r = (m + 1/2)\\lambda$. Para $m = 1$: $\\Delta r = (1 + 0.5)(0.50\\text{ m}) = 0.75\\text{ m}$. Coincide exactamente con el valor calculado."
        }
      ]
    },
    quiz: {
      question: "Dos diapasones vibran a frecuencias de $440\\text{ Hz}$ y $443\\text{ Hz}$. ¿Cuántos batidos por segundo percibirá un observador ubicado cerca de ellos?",
      options: [
        "883 batidos por segundo.",
        "3 batidos por segundo.",
        "1.5 batidos por segundo.",
        "No se perciben batidos porque las frecuencias son audibles y muy elevadas."
      ],
      correctIndex: 1,
      explanation: "Correcto. La frecuencia de batido se define como el valor absoluto de la diferencia de frecuencias: $f_{\\text{batido}} = |443 - 440| = 3\\text{ Hz}$, lo que se percibe como 3 modulaciones rítmicas de intensidad sonora por segundo."
    }
  },

  // ================= UNIDAD 6 =================
  {
    id: "unidad-6",
    number: 6,
    title: "Reflexión, Refracción, Difracción y Fenómenos Ondulatorios",
    shortTitle: "U6: Fenómenos",
    summary: "Condiciones de frontera, inversión de fase en reflexión, ley de Snell, principio de Huygens y difracción.",
    sections: [
      {
        subtitle: "6.1 Reflexión en Condiciones de Frontera",
        html: `
          <p>
            Cuando un pulso u onda alcanza la frontera entre dos medios distintos:
          </p>
          <ul>
            <li><strong>Extremo Fijo (frontera infinitamente rígida):</strong> El punto terminal debe permanecer inmóvil ($y(L,t) = 0$). Por tercera ley de Newton, el soporte ejerce una fuerza de reacción hacia abajo sobre la cuerda, generando una onda reflejada <strong>invertida con un desfase de $\\pi\\text{ rad}$ ($180^\\circ$)</strong>.</li>
            <li><strong>Extremo Libre (anillo sin fricción sobre poste vertical):</strong> El extremo se mueve libremente y la pendiente debe ser nula en el extremo ($\\partial y / \\partial x = 0$). La onda se refleja <strong>en fase sin inversión (desfase nulo $\\Delta\\phi = 0$)</strong>.</li>
          </ul>
        `
      },
      {
        subtitle: "6.2 Refracción y Ley de Snell para Ondas",
        html: `
          <p>
            Al pasar de un medio 1 a un medio 2, la frecuencia temporal $f$ se mantiene constante (determinada por la fuente primaria), pero la velocidad de propagación cambia de $v_1$ a $v_2$. Como consecuencia, la longitud de onda cambia en proporción directa a la velocidad:
          </p>
          <div class="math-display">$$\\frac{\\lambda_1}{\\lambda_2} = \\frac{v_1}{v_2}$$</div>
          <p>
            Para ondas planas que inciden con un ángulo $\\theta_1$ respecto a la normal de la interfase, la <strong>ley de refracción</strong> (Snell) establece:
          </p>
          <div class="math-display">$$\\frac{\\sin\\theta_1}{v_1} = \\frac{\\sin\\theta_2}{v_2} \\implies \\frac{\\sin\\theta_1}{\\sin\\theta_2} = \\frac{v_1}{v_2} = \\frac{n_2}{n_1}$$</div>
        `
      },
      {
        subtitle: "6.3 Difracción y Principio de Huygens",
        html: `
          <p>
            El <strong>Principio de Huygens</strong> postula que todo punto de un frente de onda principal actúa como una fuente emisora de ondículas secundarias esféricas que avanzan con la velocidad de la onda en el medio. La envolvente tangente a estas ondículas secundarias define el nuevo frente de onda en un instante posterior.
          </p>
          <p>
            La <strong>difracción</strong> es la curvatura y dispersión de las ondas alrededor de obstáculos o a través de orificios. El efecto es apreciable únicamente cuando el tamaño de la abertura $a$ es del mismo orden de magnitud o menor que la longitud de onda:
          </p>
          <div class="math-display">$$a \\lesssim \\lambda$$</div>
        `
      }
    ],
    exercise: {
      title: "Ejercicio Resuelto 6.1: Refracción y Cambio de Longitud de Onda en Cuerda Compuesta",
      statement: "Una cuerda larga está compuesta por dos segmentos unidos en $x=0$. El segmento 1 ($x < 0$) tiene una densidad lineal $\\mu_1 = 0.040\\text{ kg/m}$, mientras que el segmento 2 ($x > 0$) tiene una densidad lineal $\\mu_2 = 0.160\\text{ kg/m}$. Toda la cuerda se encuentra sometida a una tensión uniforme $T = 64.0\\text{ N}$. Un oscilador en $x = -\\infty$ envía una onda sinusoidal incidente hacia $+x$ con amplitud $A_i = 3.00\\text{ cm}$ y frecuencia $f = 20.0\\text{ Hz}$. Calcule: (a) la velocidad de propagación y la longitud de onda en ambos medios, (b) el coeficiente de reflexión de amplitud $r$ y de transmisión $t$, y (c) la amplitud de la onda reflejada $A_r$ y transmitida $A_t$.",
      steps: [
        {
          num: 1,
          name: "Comprensión e interpretación del enunciado",
          content: "Se estudia la propagación y transmisión de una onda armónica transversal en la discontinuidad de masa de dos cuerdas semiinfinitas unidas bajo tensión idéntica. Se deben aplicar las condiciones de continuidad del desplazamiento y de la derivada espacial en la unión $x=0$."
        },
        {
          num: 2,
          name: "Identificación de los datos",
          content: `
            <div class="data-table-wrapper">
              <span class="badge-dato">DATOS (#2563EB)</span>
              <ul>
                <li>Densidad cuerda 1: $\\mu_1 = 0.040\\text{ kg/m}$</li>
                <li>Densidad cuerda 2: $\\mu_2 = 0.160\\text{ kg/m}$</li>
                <li>Tensión uniforme: $T = 64.0\\text{ N}$</li>
                <li>Amplitud incidente: $A_i = 3.00\\text{ cm} = 0.0300\\text{ m}$</li>
                <li>Frecuencia: $f = 20.0\\text{ Hz}$</li>
              </ul>
            </div>
          `
        },
        {
          num: 3,
          name: "Identificación de las incógnitas",
          content: `
            <div class="incognitas-table-wrapper">
              <span class="badge-incognita">INCÓGNITAS (#DC2626)</span>
              <ul>
                <li>Velocidades: $v_1$ y $v_2$ $[\\text{m/s}]$</li>
                <li>Longitudes de onda: $\\lambda_1$ y $\\lambda_2$ $[\\text{m}]$</li>
                <li>Coeficientes de amplitud: $r$ y $t$</li>
                <li>Amplitud reflejada: $A_r$ y transmitida: $A_t$ $[\\text{cm}]$</li>
              </ul>
            </div>
          `
        },
        {
          num: 4,
          name: "Selección de las ecuaciones",
          content: `
            $$v_1 = \\sqrt{\\frac{T}{\\mu_1}}, \\quad v_2 = \\sqrt{\\frac{T}{\\mu_2}}, \\quad \\lambda_1 = \\frac{v_1}{f}, \\quad \\lambda_2 = \\frac{v_2}{f}$$
            $$r = \\frac{v_2 - v_1}{v_2 + v_1} = \\frac{\\sqrt{\\mu_1} - \\sqrt{\\mu_2}}{\\sqrt{\\mu_1} + \\sqrt{\\mu_2}}, \\quad t = \\frac{2v_2}{v_2 + v_1} = \\frac{2\\sqrt{\\mu_1}}{\\sqrt{\\mu_1} + \\sqrt{\\mu_2}}$$
            $$A_r = |r| A_i, \\quad A_t = t A_i$$
          `
        },
        {
          num: 5,
          name: "Conversión de unidades",
          content: "Las magnitudes ya están en unidades consistentes del Sistema Internacional."
        },
        {
          num: 6,
          name: "Sustitución, despeje y procedimiento algebraico",
          content: `
            <div class="algebra-steps">
              <p>1. Velocidades de fase:</p>
              $$v_1 = \\sqrt{\\frac{64.0}{0.040}} = \\sqrt{1600} = <span class="badge-calculado">40.0\\text{ m/s}</span>$$
              $$v_2 = \\sqrt{\\frac{64.0}{0.160}} = \\sqrt{400} = <span class="badge-calculado">20.0\\text{ m/s}</span>$$
              <p>2. Longitudes de onda:</p>
              $$\\lambda_1 = \\frac{40.0\\text{ m/s}}{20.0\\text{ Hz}} = <span class="badge-calculado">2.00\\text{ m}</span>$$
              $$\\lambda_2 = \\frac{20.0\\text{ m/s}}{20.0\\text{ Hz}} = <span class="badge-calculado">1.00\\text{ m}</span>$$
              <p>3. Coeficiente de reflexión de amplitud $r$:</p>
              $$r = \\frac{v_2 - v_1}{v_2 + v_1} = \\frac{20.0 - 40.0}{20.0 + 40.0} = \\frac{-20.0}{60.0} = <span class="badge-calculado">-\\frac{1}{3} \\approx -0.3333</span>$$
              (El signo negativo confirma una inversión de fase de $\\pi\\text{ rad}$ en la onda reflejada).
              <p>4. Coeficiente de transmisión $t$:</p>
              $$t = \\frac{2 v_2}{v_2 + v_1} = \\frac{2(20.0)}{60.0} = <span class="badge-calculado">+\\frac{2}{3} \\approx +0.6667</span>$$
              <p>5. Amplitudes reflejada y transmitida:</p>
              $$A_r = |r| A_i = \\frac{1}{3}(3.00\\text{ cm}) = <span class="badge-calculado">1.00\\text{ cm}</span>$$
              $$A_t = t A_i = \\frac{2}{3}(3.00\\text{ cm}) = <span class="badge-calculado">2.00\\text{ cm}</span>$$
            </div>
          `
        },
        {
          num: 7,
          name: "Resultado final",
          content: `
            <div class="result-box">
              <ul>
                <li>$v_1 = 40.0\\text{ m/s}, \\quad v_2 = 20.0\\text{ m/s}$</li>
                <li>$\\lambda_1 = 2.00\\text{ m}, \\quad \\lambda_2 = 1.00\\text{ m}$</li>
                <li>$r = -1/3$ (inversión de fase de $180^\\circ$ en la reflexión)</li>
                <li>$t = +2/3$ (la onda transmitida entra en fase)</li>
                <li>Amplitud reflejada: $A_r = 1.00\\text{ cm}$</li>
                <li>Amplitud transmitida: $A_t = 2.00\\text{ cm}$</li>
              </ul>
            </div>
          `
        },
        {
          num: 8,
          name: "Validación del resultado",
          content: "Verificación de conservación de energía: Reflectancia energética $R = r^2 = 1/9$. Transmitancia energética $T_{\\text{energ}} = (\\mu_2 v_2 / \\mu_1 v_1) t^2 = ((0.160 \\times 20) / (0.040 \\times 40)) (2/3)^2 = (3.2 / 1.6)(4/9) = 2 \\times (4/9) = 8/9$. Verificación: $R + T_{\\text{energ}} = 1/9 + 8/9 = 1.000$. La energía se conserva exactamente."
        },
        {
          num: 9,
          name: "Conclusión",
          content: "Al pasar a un medio más denso (más lento), la perturbación experimenta una reflexión con inversión de fase análoga a un extremo fijo parcial, reduciéndose la longitud de onda a la mitad en el segundo medio."
        },
        {
          num: 10,
          name: "Verificación independiente",
          content: "Condición de frontera cinemática en $x=0$: $y_i(0,t) + y_r(0,t) = y_t(0,t) \\implies 1 + r = t \\implies 1 + (-1/3) = 2/3$. Cumplida a la perfección."
        }
      ]
    },
    quiz: {
      question: "¿Qué ocurre con la frecuencia $f$, la velocidad $v$ y la longitud de onda $\\lambda$ de una onda de luz monocromática cuando pasa del aire a un bloque de vidrio con índice de refracción $n = 1.50$?",
      options: [
        "$f$ se divide entre $1.5$, mientras que $v$ y $\\lambda$ permanecen inalteradas.",
        "$f$ permanece constante, mientras que $v$ y $\\lambda$ se reducen por un factor de $1.50$.",
        "Tanto $f$, $v$ como $\\lambda$ aumentan en un factor de $1.50$.",
        "La velocidad aumenta y la frecuencia disminuye para conservar la energía fotónica."
      ],
      correctIndex: 1,
      explanation: "Correcto. La frecuencia $f$ de una onda está determinada invariablemente por la fuente emisora. En un medio con índice $n = 1.50$, la velocidad se reduce a $v = c/n$ y, consecuentemente, la longitud de onda disminuye en la misma proporción: $\\lambda = \\lambda_0 / n$."
    }
  },

  // ================= UNIDAD 7 =================
  {
    id: "unidad-7",
    number: 7,
    title: "Ondas Estacionarias",
    shortTitle: "U7: Estacionarias",
    summary: "Formación de modos normales, nodos y antinodos, frecuencias resonantes y condiciones de frontera en cuerdas.",
    sections: [
      {
        subtitle: "7.1 Formación Matemática de una Onda Estacionaria",
        html: `
          <p>
            Una <strong>onda estacionaria</strong> se forma por la superposición de dos ondas armónicas idénticas que viajan en la misma dirección pero en sentidos opuestos:
          </p>
          <div class="math-display">$$y_1(x,t) = A\\sin(kx - \\omega t), \\quad y_2(x,t) = A\\sin(kx + \\omega t)$$</div>
          <p>
            Aplicando identidades trigonométricas de suma:
          </p>
          <div class="academic-callout callout-important">
            <div class="callout-icon">🎻</div>
            <div class="callout-body">
              <h4>Ecuación de Onda Estacionaria</h4>
              <div class="math-display">$$y_{\\text{est}}(x,t) = [2A\\sin(kx)]\\cos(\\omega t)$$</div>
              <p>A diferencia de una onda viajera, <strong>las variables espacial y temporal están factorizadas</strong>. No hay propagación de fase a lo largo de $x$. No hay transporte neto de energía a través de los nodos.</p>
            </div>
          </div>
          <ul>
            <li><strong>Nodos:</strong> Puntos de inmovilidad permanente donde $\\sin(kx) = 0 \\implies kx = m\\pi \\implies x_n = m \\frac{\\lambda}{2}$ ($m=0,1,2,\\dots$). La distancia entre nodos consecutivos es exactamente $\\lambda/2$.</li>
            <li><strong>Vientres o Antinodos:</strong> Puntos de amplitud máxima $2A$ donde $|\\sin(kx)| = 1 \\implies x_v = \\left(m + \\frac{1}{2}\\right)\\frac{\\lambda}{2}$.</li>
          </ul>
        `
      },
      {
        subtitle: "7.2 Modos Normales en Cuerda con Extremos Fijos",
        html: `
          <p>
            Para una cuerda de longitud $L$ fija en ambos extremos ($x=0$ y $x=L$):
          </p>
          <div class="math-display">$$y(0,t) = 0 \\quad \\text{y} \\quad y(L,t) = 2A\\sin(k L)\\cos(\\omega t) = 0 \\implies \\sin(k L) = 0$$</div>
          <p>
            Esto impone una <strong>cuantización geométrica</strong> sobre las longitudes de onda y frecuencias permitidas:
          </p>
          <div class="math-display">$$k_n L = n\\pi \\implies \\lambda_n = \\frac{2L}{n}, \\quad n = 1, 2, 3, \\dots$$</div>
          <div class="math-display">$$f_n = \\frac{v}{\\lambda_n} = n\\frac{v}{2L} = n f_1, \\quad f_1 = \\frac{v}{2L} = \\frac{1}{2L}\\sqrt{\\frac{T}{\\mu}}$$</div>
          <p>
            $f_1$ es la <strong>frecuencia fundamental</strong> o primer armónico; $f_2 = 2f_1$ es el segundo armónico, etc.
          </p>
        `
      }
    ],
    exercise: {
      title: "Ejercicio Resuelto 7.1: Modos Normales y Tensión en Cuerda de Violonchelo",
      statement: "Una cuerda de violonchelo afinada tiene una longitud efectiva de $0.700\\text{ m}$ entre cejuela y puente, y una masa de $8.40\\text{ g}$. Debe emitir su nota fundamental a una frecuencia de $f_1 = 65.4\\text{ Hz}$ (nota Do2). Calcule: (a) la longitud de onda de la fundamental $\\lambda_1$ y la velocidad de propagación $v$ en la cuerda, (b) la tensión mecánica $T$ requerida para su afinación, (c) las frecuencias de los siguientes tres armónicos ($f_2, f_3, f_4$), y (d) la ubicación de todos los nodos del tercer armónico medidos desde el extremo izquierdo.",
      steps: [
        {
          num: 1,
          name: "Comprensión e interpretación del enunciado",
          content: "Se analiza una cuerda tensa con extremos fijos que vibra en sus modos normales. Se requiere calcular la tensión a partir de las condiciones de frontera de la frecuencia fundamental y la distribución espacial de nodos para el tercer armónico ($n=3$)."
        },
        {
          num: 2,
          name: "Identificación de los datos",
          content: `
            <div class="data-table-wrapper">
              <span class="badge-dato">DATOS (#2563EB)</span>
              <ul>
                <li>Longitud vibrante: $L = 0.700\\text{ m}$</li>
                <li>Masa de la cuerda: $m = 8.40\\text{ g} = 8.40 \\times 10^{-3}\\text{ kg}$</li>
                <li>Frecuencia fundamental: $f_1 = 65.4\\text{ Hz}$</li>
              </ul>
            </div>
          `
        },
        {
          num: 3,
          name: "Identificación de las incógnitas",
          content: `
            <div class="incognitas-table-wrapper">
              <span class="badge-incognita">INCÓGNITAS (#DC2626)</span>
              <ul>
                <li>Longitud de onda fundamental: $\\lambda_1$ $[\\text{m}]$</li>
                <li>Velocidad de propagación: $v$ $[\\text{m/s}]$</li>
                <li>Densidad lineal: $\\mu$ $[\\text{kg/m}]$</li>
                <li>Tensión de afinación: $T$ $[\\text{N}]$</li>
                <li>Frecuencias armónicas: $f_2, f_3, f_4$ $[\\text{Hz}]$</li>
                <li>Posición de nodos para $n=3$: $x_{n3}$ $[\\text{m}]$</li>
              </ul>
            </div>
          `
        },
        {
          num: 4,
          name: "Selección de las ecuaciones",
          content: `
            $$\\lambda_n = \\frac{2L}{n}, \\quad v = f_1 \\lambda_1 = 2 L f_1, \\quad \\mu = \\frac{m}{L}, \\quad T = \\mu v^2$$
            $$f_n = n f_1, \\quad x_{\\text{nodo}, m} = m \\frac{\\lambda_n}{2} = m \\frac{L}{n}$$
          `
        },
        {
          num: 5,
          name: "Conversión de unidades",
          content: "Masa: $m = 8.40\\text{ g} = 0.00840\\text{ kg}$. Longitud: $L = 0.700\\text{ m}$."
        },
        {
          num: 6,
          name: "Sustitución, despeje y procedimiento algebraico",
          content: `
            <div class="algebra-steps">
              <p>1. Longitud de onda fundamental $\\lambda_1$:</p>
              $$\\lambda_1 = 2L = 2(0.700\\text{ m}) = <span class="badge-calculado">1.400\\text{ m}</span>$$
              <p>2. Velocidad de fase $v$:</p>
              $$v = \\lambda_1 f_1 = (1.400\\text{ m})(65.4\\text{ Hz}) = <span class="badge-calculado">91.56\\text{ m/s}</span>$$
              <p>3. Densidad lineal de masa $\\mu$:</p>
              $$\\mu = \\frac{0.00840\\text{ kg}}{0.700\\text{ m}} = <span class="badge-calculado">0.01200\\text{ kg/m}</span>$$
              <p>4. Tensión mecánica $T$:</p>
              $$T = \\mu v^2 = (0.01200\\text{ kg/m})(91.56\\text{ m/s})^2 = 0.01200 \\times 8383.23 = <span class="badge-calculado">100.60\\text{ N}</span>$$
              <p>5. Frecuencias armónicas superiores ($n=2, 3, 4$):</p>
              $$f_2 = 2 f_1 = 2(65.4) = <span class="badge-calculado">130.8\\text{ Hz}</span>$$
              $$f_3 = 3 f_1 = 3(65.4) = <span class="badge-calculado">196.2\\text{ Hz}</span>$$
              $$f_4 = 4 f_1 = 4(65.4) = <span class="badge-calculado">261.6\\text{ Hz}</span>$$
              <p>6. Posición de nodos para el tercer armónico ($n=3$):</p>
              $$\\lambda_3 = \\frac{2L}{3} = \\frac{1.400}{3} = 0.4667\\text{ m} \\implies \\frac{\\lambda_3}{2} = \\frac{L}{3} = 0.2333\\text{ m}$$
              $$x_0 = 0.000\\text{ m}, \\quad x_1 = 0.233\\text{ m}, \\quad x_2 = 0.467\\text{ m}, \\quad x_3 = 0.700\\text{ m}$$
            </div>
          `
        },
        {
          num: 7,
          name: "Resultado final",
          content: `
            <div class="result-box">
              <ul>
                <li>$\\lambda_1 = 1.40\\text{ m}, \\quad v = 91.6\\text{ m/s}$</li>
                <li>Tensión requerida: $T = 101\\text{ N}$</li>
                <li>Armónicos: $f_2 = 131\\text{ Hz}$, $f_3 = 196\\text{ Hz}$, $f_4 = 262\\text{ Hz}$</li>
                <li>Nodos del 3.er armónico: a $0\\text{ cm}$, $23.3\\text{ cm}$, $46.7\\text{ cm}$ y $70.0\\text{ cm}$.</li>
              </ul>
            </div>
          `
        },
        {
          num: 8,
          name: "Validación del resultado",
          content: "Validación de la tensión: $f_1 = \\frac{1}{2(0.700)}\\sqrt{\\frac{100.6}{0.012}} = \\frac{1}{1.40}\\sqrt{8383.3} = \\frac{91.56}{1.40} = 65.40\\text{ Hz}$. Coincide exactamente con la nota deseada."
        },
        {
          num: 9,
          name: "Conclusión",
          content: "Una cuerda con extremos fijos solo puede resonar en múltiplos enteros discretos de su frecuencia fundamental. Para el tercer armónico la cuerda vibra en tres vientres separados por cuatro nodos inmóviles."
        },
        {
          num: 10,
          name: "Verificación independiente",
          content: "Distancia entre nodos para $n=3$: $\\Delta x = L/3 = 0.700/3 = 0.2333\\text{ m}$. Número total de antinodos: $n = 3$, ubicados exactamente en los puntos medios de los nodos."
        }
      ]
    },
    quiz: {
      question: "En una cuerda de longitud $L$ con ambos extremos fijos que oscila en su cuarto armónico ($n=4$), ¿cuántos nodos y cuántos vientres (antinodos) existen en total a lo largo de la cuerda?",
      options: [
        "4 nodos y 4 vientres.",
        "5 nodos (incluyendo los dos extremos) y 4 vientres.",
        "3 nodos y 4 vientres.",
        "4 nodos y 5 vientres."
      ],
      correctIndex: 1,
      explanation: "Correcto. Para el $n$-ésimo modo normal de una cuerda con extremos fijos, siempre existen exactamente $n$ vientres (bucles de oscilación) y $n + 1$ nodos (los $n-1$ nodos interiores más los dos nodos fijos en los extremos). Para $n=4$: 5 nodos y 4 vientres."
    }
  },

  // ================= UNIDAD 8 =================
  {
    id: "unidad-8",
    number: 8,
    title: "Acústica y Ondas Sonoras",
    shortTitle: "U8: Acústica",
    summary: "Naturaleza mecánica del sonido, presión vs desplazamiento, intensidad acústica, nivel sonoro en decibelios y audición.",
    sections: [
      {
        subtitle: "8.1 Ondas Sonoras: Presión Acústica vs Desplazamiento Molecular",
        html: `
          <p>
            El <strong>sonido</strong> es una onda mecánica longitudinal que se propaga por variaciones locales de presión y densidad en un medio elástico. Si el desplazamiento longitudinal de las partículas de aire se describe por:
          </p>
          <div class="math-display">$$s(x,t) = s_{\\max}\\cos(kx - \\omega t)$$</div>
          <p>
            la variación de presión respecto al valor atmosférico de equilibrio $\\Delta P(x,t) = -B \\frac{\\partial s}{\\partial x}$ resulta:
          </p>
          <div class="academic-callout callout-important">
            <div class="callout-icon">🔊</div>
            <div class="callout-body">
              <h4>Onda de Presión Acústica</h4>
              <div class="math-display">$$\\Delta P(x,t) = \\Delta P_{\\max}\\sin(kx - \\omega t), \\quad \\text{con } \\Delta P_{\\max} = B k s_{\\max} = \\rho v \\omega s_{\\max}$$</div>
              <p><strong>Desfase crítico:</strong> La onda de presión y la onda de desplazamiento están <strong>desfasadas exactamente en $90^\\circ$ ($\\pi/2\\text{ rad}$)</strong>. Donde el desplazamiento molecular es nulo (nodo de desplazamiento), la variación de presión es máxima (vientre de presión).</p>
            </div>
          </div>
        `
      },
      {
        subtitle: "8.2 Intensidad Sonora y Escala Logarítmica de Decibelios",
        html: `
          <p>
            La <strong>intensidad acústica</strong> $I$ es la potencia sonora promedio que atraviesa perpendicularmente una unidad de área:
          </p>
          <div class="math-display">$$I = \\frac{\\bar{P}}{A} = \\frac{1}{2}\\rho v \\omega^2 s_{\\max}^2 = \\frac{(\\Delta P_{\\max})^2}{2\\rho v}$$</div>
          <p>
            Debido a que el oído humano responde de forma aproximadamente logarítmica y abarca un rango dinámico de intensidades de $10^{12}$ órdenes de magnitud, se define el <strong>nivel de intensidad sonora</strong> $\\beta$ en <strong>decibelios (dB)</strong>:
          </p>
          <div class="math-display">$$\\beta = 10\\log_{10}\\left(\\frac{I}{I_0}\\right)$$</div>
          <p>
            donde $I_0 = 1.00\\times 10^{-12}\\text{ W/m}^2$ es el <strong>umbral de audición humana de referencia</strong> a $1000\\text{ Hz}$. El umbral de dolor corresponde a $I \\approx 1\\text{ W/m}^2$ ($\\beta = 120\\text{ dB}$).
          </p>
        `
      }
    ],
    exercise: {
      title: "Ejercicio Resuelto 8.1: Cálculo de Intensidad, Decibelios y Presión Acústica",
      statement: "Una fuente sonora puntual emite ondas isotrópicamente en el aire con una potencia acústica constante de $12.5\\text{ W}$. La densidad del aire es $\\rho = 1.20\\text{ kg/m}^3$ y la velocidad del sonido es $v = 344\\text{ m/s}$. (a) Determine la intensidad sonora $I$ y el nivel de intensidad $\\beta$ a una distancia de $r_1 = 5.00\\text{ m}$ de la fuente. (b) Calcule la amplitud de presión $\\Delta P_{\\max}$ a esa misma distancia. (c) Determine a qué distancia $r_2$ el nivel de sonido habrá descendido a $80.0\\text{ dB}$.",
      steps: [
        {
          num: 1,
          name: "Comprensión e interpretación del enunciado",
          content: "Se estudia la propagación tridimensional de ondas sonoras esféricas generadas por una fuente isotrópica puntual en aire libre sin reflexiones (campo libre), aplicando la ley del inverso del cuadrado y la escala logarítmica de decibelios."
        },
        {
          num: 2,
          name: "Identificación de los datos",
          content: `
            <div class="data-table-wrapper">
              <span class="badge-dato">DATOS (#2563EB)</span>
              <ul>
                <li>Potencia de la fuente: $P_{\\text{fuente}} = 12.5\\text{ W}$</li>
                <li>Distancia 1: $r_1 = 5.00\\text{ m}$</li>
                <li>Densidad del aire: $\\rho = 1.20\\text{ kg/m}^3$</li>
                <li>Velocidad del sonido: $v = 344\\text{ m/s}$</li>
                <li>Nivel sonoro deseado: $\\beta_2 = 80.0\\text{ dB}$</li>
                <li>Umbral de audición: $I_0 = 1.00 \\times 10^{-12}\\text{ W/m}^2$</li>
              </ul>
            </div>
          `
        },
        {
          num: 3,
          name: "Identificación de las incógnitas",
          content: `
            <div class="incognitas-table-wrapper">
              <span class="badge-incognita">INCÓGNITAS (#DC2626)</span>
              <ul>
                <li>Intensidad en $r_1$: $I_1$ $[\\text{W/m}^2]$</li>
                <li>Nivel sonoro en $r_1$: $\\beta_1$ $[\\text{dB}]$</li>
                <li>Amplitud de presión en $r_1$: $\\Delta P_{\\max, 1}$ $[\\text{Pa}]$</li>
                <li>Distancia para $\\beta_2 = 80\\text{ dB}$: $r_2$ $[\\text{m}]$</li>
              </ul>
            </div>
          `
        },
        {
          num: 4,
          name: "Selección de las ecuaciones",
          content: `
            $$I_1 = \\frac{P_{\\text{fuente}}}{4\\pi r_1^2}, \\quad \\beta_1 = 10\\log_{10}\\left(\\frac{I_1}{I_0}\\right), \\quad \\Delta P_{\\max} = \\sqrt{2\\rho v I_1}$$
            $$I_2 = I_0 10^{\\beta_2 / 10}, \\quad r_2 = \\sqrt{\\frac{P_{\\text{fuente}}}{4\\pi I_2}} = r_1 \\sqrt{\\frac{I_1}{I_2}}$$
          `
        },
        {
          num: 5,
          name: "Conversión de unidades",
          content: "Todas las cantidades están expresadas en unidades estándar del Sistema Internacional."
        },
        {
          num: 6,
          name: "Sustitución, despeje y procedimiento algebraico",
          content: `
            <div class="algebra-steps">
              <p>1. Intensidad $I_1$ a $r_1 = 5.00\\text{ m}$:</p>
              $$A_1 = 4\\pi (5.00\\text{ m})^2 = 4\\pi (25.0) = 100\\pi \\approx 314.16\\text{ m}^2$$
              $$I_1 = \\frac{12.5\\text{ W}}{314.16\\text{ m}^2} = <span class="badge-calculado">0.039789\\text{ W/m}^2</span> \\approx 3.979 \\times 10^{-2}\\text{ W/m}^2$$
              <p>2. Nivel en decibelios $\\beta_1$:</p>
              $$\\beta_1 = 10\\log_{10}\\left(\\frac{3.9789\\times 10^{-2}}{1.00\\times 10^{-12}}\\right) = 10\\log_{10}(3.9789\\times 10^{10}) = 10(10.5998) = <span class="badge-calculado">106.0\\text{ dB}</span>$$
              <p>3. Amplitud de presión acústica $\\Delta P_{\\max}$:</p>
              $$\\Delta P_{\\max} = \\sqrt{2(1.20\\text{ kg/m}^3)(344\\text{ m/s})(0.039789\\text{ W/m}^2)} = \\sqrt{32.858} = <span class="badge-calculado">5.732\\text{ Pa}</span>$$
              <p>4. Distancia $r_2$ para $\\beta_2 = 80.0\\text{ dB}$:</p>
              $$I_2 = 1.00\\times 10^{-12} \\times 10^{80.0/10} = 1.00\\times 10^{-12} \\times 10^8 = 1.00\\times 10^{-4}\\text{ W/m}^2$$
              $$r_2 = \\sqrt{\\frac{12.5\\text{ W}}{4\\pi (1.00\\times 10^{-4}\\text{ W/m}^2)}} = \\sqrt{\\frac{12.5}{1.2566\\times 10^{-3}}} = \\sqrt{9947.18} = <span class="badge-calculado">99.74\\text{ m}</span>$$
            </div>
          `
        },
        {
          num: 7,
          name: "Resultado final",
          content: `
            <div class="result-box">
              <ul>
                <li>Intensidad a $5\\text{ m}$: $I_1 = 3.98\\times 10^{-2}\\text{ W/m}^2$ ($39.8\\text{ mW/m}^2$).</li>
                <li>Nivel de intensidad: $\\beta_1 = 106\\text{ dB}$ (nivel comparable al ruido de una motosierra cercana).</li>
                <li>Amplitud de presión: $\\Delta P_{\\max} = 5.73\\text{ Pa}$ (apenas el $0.0057\\%$ de la presión atmosférica estándar).</li>
                <li>Distancia para $80\\text{ dB}$: $r_2 = 99.7\\text{ m} \\approx 100\\text{ m}$.</li>
              </ul>
            </div>
          `
        },
        {
          num: 8,
          name: "Validación del resultado",
          content: "Verificación de la regla decibélica: $\\Delta\\beta = 106.0 - 80.0 = 26.0\\text{ dB}$. Como cada factor de $20\\text{ dB}$ representa un incremento de distancia de $\\times 10$ ($r \\to 50\\text{ m}$ a $86\\text{ dB}$), $r_2 \\approx 100\\text{ m}$ es físicamente consistente."
        },
        {
          num: 9,
          name: "Conclusión",
          content: "A pesar de que $106\\text{ dB}$ representa un sonido muy fuerte para el oído humano, la sobrepresión mecánica involucrada ($5.73\\text{ Pa}$) es minúscula comparada con la presión atmosférica de equilibrio ($101325\\text{ Pa}$), lo que demuestra la extrema sensibilidad del tímpano humano."
        },
        {
          num: 10,
          name: "Verificación independiente",
          content: "Cálculo alternativo: $\\beta_1 - \\beta_2 = 20\\log_{10}(r_2 / r_1) \\implies 26.0 = 20\\log_{10}(r_2 / 5.0) \\implies 1.30 = \\log_{10}(r_2 / 5.0) \\implies r_2 / 5.0 = 10^{1.30} = 19.953 \\implies r_2 = 99.76\\text{ m}$. Coincidencia total."
        }
      ]
    },
    quiz: {
      question: "Si dos fuentes sonoras independientes emiten cada una un nivel de $70\\text{ dB}$ en el mismo punto de un oyente, ¿cuál será el nivel sonoro total percibido?",
      options: [
        "$140\\text{ dB}$.",
        "$73\\text{ dB}$.",
        "$70\\text{ dB}$.",
        "$80\\text{ dB}$."
      ],
      correctIndex: 1,
      explanation: "Correcto. La intensidad física se duplica al sumar dos fuentes incoherentes: $I_{\\text{total}} = 2I_1$. En escala logarítmica: $\\beta_{\\text{total}} = 10\\log_{10}(2I_1/I_0) = 10\\log_{10}(I_1/I_0) + 10\\log_{10}(2) = 70\\text{ dB} + 3.01\\text{ dB} \\approx 73\\text{ dB}$."
    }
  },

  // ================= UNIDAD 9 =================
  {
    id: "unidad-9",
    number: 9,
    title: "Resonancia y Ondas Estacionarias en Columnas de Aire",
    shortTitle: "U9: Tubos Acústicos",
    summary: "Tubos abiertos y cerrados, modos resonantes de presión y desplazamiento, tubo de Kundt y corrección de extremos.",
    sections: [
      {
        subtitle: "9.1 Modos Normales en Tubos Sonoros",
        html: `
          <p>
            En una columna de aire confinado (instrumentos de viento, tubos acústicos), las condiciones de frontera se determinan por la geometría de los extremos:
          </p>
          <ul>
            <li><strong>Extremo Abierto:</strong> El aire está en contacto directo con la atmósfera, por lo que la presión debe igualar a la atmosférica (<strong>nodo de presión $\\Delta P = 0$</strong>), lo que corresponde a un <strong>vientre de desplazamiento molecular $s_{\\max}$</strong>.</li>
            <li><strong>Extremo Cerrado (pared rígida):</strong> Las moléculas de aire no pueden desplazarse a través de la pared rígida (<strong>nodo de desplazamiento $s = 0$</strong>), lo que origina un <strong>vientre de presión $\\Delta P_{\\max}$</strong>.</li>
          </ul>
        `
      },
      {
        subtitle: "9.2 Ecuaciones Cuantizadas de Resonancia",
        html: `
          <div class="comparison-grid">
            <div class="comp-card">
              <h4>Tubo Abierto en Ambos Extremos</h4>
              <p>Posee vientres de desplazamiento en ambos extremos ($x=0$ y $x=L$).</p>
              <div class="math-display">$$\\lambda_n = \\frac{2L}{n}, \\quad f_n = n\\frac{v}{2L} = n f_1$$</div>
              <p><strong>Contiene TODOS los armónicos enteros:</strong> $n = 1, 2, 3, 4, \\dots$</p>
            </div>

            <div class="comp-card">
              <h4>Tubo Cerrado en un Extremo (Semiabierto)</h4>
              <p>Posee nodo de desplazamiento en el extremo cerrado y vientre en el abierto.</p>
              <div class="math-display">$$\\lambda_n = \\frac{4L}{2n - 1}, \\quad f_n = (2n - 1)\\frac{v}{4L} = (2n - 1)f_1$$</div>
              <p><strong>Solo contiene ARMÓNICOS IMPARES:</strong> $1f_1, 3f_1, 5f_1, 7f_1, \\dots$</p>
            </div>
          </div>
        `
      }
    ],
    exercise: {
      title: "Ejercicio Resuelto 9.1: Resonancia en Tubo Abierto-Cerrado y Velocidad del Sonido",
      statement: "En un experimento de laboratorio de física con un tubo acústico vertical cerrado por una columna de agua en su fondo, un diapasón de $512\\text{ Hz}$ se coloca cerca del extremo superior abierto. A una temperatura ambiente de $20.0^\\circ\\text{C}$ (donde $v = 343\\text{ m/s}$): (a) Calcule la longitud de aire mínima $L_1$ necesaria para producir la primera resonancia (modo fundamental). (b) Determine las longitudes de aire consecutivas $L_2$ y $L_3$ donde se producirán las siguientes dos resonancias. (c) Demuestre cómo determinar experimentalmente la velocidad del sonido a partir de la distancia entre resonancias sucesivas $\\Delta L$, eliminando el error de corrección de extremo.",
      steps: [
        {
          num: 1,
          name: "Comprensión e interpretación del enunciado",
          content: "Se estudia un tubo resonante cerrado en un extremo (superficie del agua) y abierto en el otro. Se requiere determinar las posiciones de resonancia acústica del sistema y fundamentar el método experimental diferencial."
        },
        {
          num: 2,
          name: "Identificación de los datos",
          content: `
            <div class="data-table-wrapper">
              <span class="badge-dato">DATOS (#2563EB)</span>
              <ul>
                <li>Frecuencia del diapasón: $f = 512\\text{ Hz}$</li>
                <li>Velocidad del sonido: $v = 343\\text{ m/s}$</li>
                <li>Tipo de tubo: Abierto en un extremo, cerrado en el otro.</li>
              </ul>
            </div>
          `
        },
        {
          num: 3,
          name: "Identificación de las incógnitas",
          content: `
            <div class="incognitas-table-wrapper">
              <span class="badge-incognita">INCÓGNITAS (#DC2626)</span>
              <ul>
                <li>Longitud de onda sonora: $\\lambda$ $[\\text{m}]$</li>
                <li>Longitud fundamental: $L_1$ $[\\text{m}]$</li>
                <li>Segunda resonancia: $L_2$ $[\\text{m}]$</li>
                <li>Tercera resonancia: $L_3$ $[\\text{m}]$</li>
                <li>Separación entre resonancias consecutivas: $\\Delta L$ $[\\text{m}]$</li>
              </ul>
            </div>
          `
        },
        {
          num: 4,
          name: "Selección de las ecuaciones",
          content: `
            $$\\lambda = \\frac{v}{f}, \\quad L_n = (2n - 1)\\frac{\\lambda}{4} \\quad (n=1,2,3), \\quad \\Delta L = L_{n+1} - L_n = \\frac{\\lambda}{2}$$
            $$v = 2 f \\Delta L$$
          `
        },
        {
          num: 5,
          name: "Conversión de unidades",
          content: "Las magnitudes están dadas en unidades estándar del SI."
        },
        {
          num: 6,
          name: "Sustitución, despeje y procedimiento algebraico",
          content: `
            <div class="algebra-steps">
              <p>1. Longitud de onda $\\lambda$:</p>
              $$\\lambda = \\frac{343\\text{ m/s}}{512\\text{ s}^{-1}} = <span class="badge-calculado">0.66992\\text{ m}</span> = 66.99\\text{ cm}$$
              <p>2. Primera resonancia fundamental ($n=1$):</p>
              $$L_1 = \\frac{\\lambda}{4} = \\frac{0.66992\\text{ m}}{4} = <span class="badge-calculado">0.1675\\text{ m}</span> = 16.75\\text{ cm}$$
              <p>3. Segunda resonancia ($n=2$, tercer armónico):</p>
              $$L_2 = 3\\left(\\frac{\\lambda}{4}\\right) = 3(0.1675\\text{ m}) = <span class="badge-calculado">0.5024\\text{ m}</span> = 50.24\\text{ cm}$$
              <p>4. Tercera resonancia ($n=3$, quinto armónico):</p>
              $$L_3 = 5\\left(\\frac{\\lambda}{4}\\right) = 5(0.1675\\text{ m}) = <span class="badge-calculado">0.8374\\text{ m}</span> = 83.74\\text{ cm}$$
              <p>5. Distancia diferencial entre resonancias consecutivas:</p>
              $$\\Delta L = L_2 - L_1 = L_3 - L_2 = \\frac{\\lambda}{2} = <span class="badge-calculado">0.3350\\text{ m}</span> = 33.50\\text{ cm}$$
            </div>
          `
        },
        {
          num: 7,
          name: "Resultado final",
          content: `
            <div class="result-box">
              <ul>
                <li>$\\lambda = 0.670\\text{ m}$ ($67.0\\text{ cm}$).</li>
                <li>$L_1 = 16.7\\text{ cm}$ (fundamental).</li>
                <li>$L_2 = 50.2\\text{ cm}$ (3.er armónico).</li>
                <li>$L_3 = 83.7\\text{ cm}$ (5.º armónico).</li>
                <li>Distancia entre resonancias consecutivas: $\\Delta L = 33.5\\text{ cm} = \\lambda/2$.</li>
              </ul>
            </div>
          `
        },
        {
          num: 8,
          name: "Validación del resultado",
          content: "Validación del método diferencial: Si el extremo abierto tiene una corrección de extremo $\\Delta r = 0.6 R$ (donde el vientre efectivo se sitúa ligeramente fuera del tubo físico), $L_1 + \\Delta r = \\lambda/4$ y $L_2 + \\Delta r = 3\\lambda/4$. Al restar ambas ecuaciones: $(L_2 + \\Delta r) - (L_1 + \\Delta r) = L_2 - L_1 = \\lambda/2$. La corrección $\\Delta r$ se cancela con exactitud matemática."
        },
        {
          num: 9,
          name: "Conclusión",
          content: "La distancia entre dos resonancias audibles consecutivas en un tubo acústico es rigurosamente igual a media longitud de onda ($\\lambda/2$), independientemente del diámetro o de la corrección de borde del tubo."
        },
        {
          num: 10,
          name: "Verificación independiente",
          content: "Comprobación de la velocidad con la distancia experimental: $v = 2 f \\Delta L = 2 \\times 512\\text{ Hz} \\times 0.33496\\text{ m} = 343.0\\text{ m/s}$. Coincidencia total."
        }
      ]
    },
    quiz: {
      question: "Un tubo de órgano abierto en ambos extremos tiene una frecuencia fundamental de $200\\text{ Hz}$. Si se tapa herméticamente uno de sus extremos, ¿cuál será su nueva frecuencia fundamental?",
      options: [
        "$400\\text{ Hz}$.",
        "$100\\text{ Hz}$.",
        "$200\\text{ Hz}$.",
        "$50\\text{ Hz}$."
      ],
      correctIndex: 1,
      explanation: "Correcto. Para el tubo abierto-abierto $f_{1,\\text{abierto}} = v / (2L) = 200\\text{ Hz}$. Al cerrar un extremo pasa a ser abierto-cerrado con $f_{1,\\text{cerrado}} = v / (4L) = \\frac{1}{2} f_{1,\\text{abierto}} = 100\\text{ Hz}$."
    }
  },

  // ================= UNIDAD 10 =================
  {
    id: "unidad-10",
    number: 10,
    title: "Efecto Doppler",
    shortTitle: "U10: Doppler",
    summary: "Fórmula general para ondas sonoras, convención rigurosa de signos, choque de ondas acústicas y aplicaciones.",
    sections: [
      {
        subtitle: "10.1 Fundamento Físico del Efecto Doppler",
        html: `
          <p>
            El <strong>Efecto Doppler</strong> es el cambio aparente en la frecuencia de una onda percibida por un observador cuando existe movimiento relativo entre la fuente emisora y el observador respecto al medio de propagación.
          </p>
          <ul>
            <li><strong>Fuente en movimiento hacia el observador:</strong> La fuente persigue sus propios frentes de onda, comprimiéndolos espacialmente hacia adelante: $\\lambda' = \\lambda - v_s T = \\frac{v - v_s}{f}$. La frecuencia percibida $f' = v/\\lambda'$ <strong>aumenta (sonido más agudo)</strong>.</li>
            <li><strong>Fuente alejándose del observador:</strong> Los frentes de onda se estiran hacia atrás: $\\lambda' = \\frac{v + v_s}{f}$. La frecuencia percibida <strong>disminuye (sonido más grave)</strong>.</li>
          </ul>
        `
      },
      {
        subtitle: "10.2 Ecuación General Unificada y Convención de Signos",
        html: `
          <p>
            Considerando que tanto el observador como la fuente se mueven a lo largo de la misma recta con velocidades $v_o$ y $v_s$ relativas al medio en reposo (donde el sonido viaja a rapidez $v$):
          </p>
          <div class="academic-callout callout-important">
            <div class="callout-icon">🚑</div>
            <div class="callout-body">
              <h4>Ecuación General de Doppler para Ondas Acústicas</h4>
              <div class="math-display">$$f' = f \\left(\\frac{v \\pm v_o}{v \\mp v_s}\\right)$$</div>
              <p><strong>Regla mnemotécnica infalible de signos:</strong></p>
              <ul>
                <li><strong>Acercamiento mutuo:</strong> La frecuencia percibida debe AUMENTAR $\\implies$ signo $(+)$ en el numerador y signo $(-)$ en el denominador.</li>
                <li><strong>Alejamiento mutuo:</strong> La frecuencia percibida debe DISMINUIR $\\implies$ signo $(-)$ en el numerador y signo $(+)$ en el denominador.</li>
              </ul>
            </div>
          </div>
        `
      }
    ],
    exercise: {
      title: "Ejercicio Resuelto 10.1: Ambulancia en Movimiento y Eco Reflejado",
      statement: "Una ambulancia viaja por una carretera recta a $30.0\\text{ m/s}$ ($108\\text{ km/h}$) haciendo sonar una sirena con frecuencia de $800\\text{ Hz}$. La velocidad del sonido en el aire es $v = 340\\text{ m/s}$. (a) Calcule la frecuencia percibida por un peatón en reposo hacia quien se acerca la ambulancia. (b) Calcule la frecuencia percibida por el mismo peatón una vez la ambulancia lo ha sobrepasado y se aleja. (c) La ambulancia se aproxima directamente a una pared vertical de un túnel reflectante. Determine la frecuencia del eco que el conductor de la ambulancia escucha reflejado desde la pared.",
      steps: [
        {
          num: 1,
          name: "Comprensión e interpretación del enunciado",
          content: "Se analiza el efecto Doppler acústico en tres situaciones cinemáticas: fuente móvil acercándose a observador fijo, alejándose de observador fijo, y el problema del eco reflejado en un obstáculo rígido (donde la pared actúa primero como receptor en reposo y luego como emisor secundario que refleja la onda hacia la ambulancia en movimiento)."
        },
        {
          num: 2,
          name: "Identificación de los datos",
          content: `
            <div class="data-table-wrapper">
              <span class="badge-dato">DATOS (#2563EB)</span>
              <ul>
                <li>Frecuencia de la sirena: $f = 800\\text{ Hz}$</li>
                <li>Velocidad de la ambulancia (fuente): $v_s = 30.0\\text{ m/s}$</li>
                <li>Velocidad del sonido: $v = 340\\text{ m/s}$</li>
                <li>Velocidad del peatón: $v_o = 0\\text{ m/s}$</li>
              </ul>
            </div>
          `
        },
        {
          num: 3,
          name: "Identificación de las incógnitas",
          content: `
            <div class="incognitas-table-wrapper">
              <span class="badge-incognita">INCÓGNITAS (#DC2626)</span>
              <ul>
                <li>Frecuencia de acercamiento al peatón: $f'_{\\text{acerc}}$ $[\\text{Hz}]$</li>
                <li>Frecuencia de alejamiento del peatón: $f'_{\\text{alej}}$ $[\\text{Hz}]$</li>
                <li>Frecuencia del eco recibida por el conductor: $f''_{\\text{eco}}$ $[\\text{Hz}]$</li>
              </ul>
            </div>
          `
        },
        {
          num: 4,
          name: "Selección de las ecuaciones",
          content: `
            $$f'_{\\text{acerc}} = f \\left(\\frac{v}{v - v_s}\\right), \\quad f'_{\\text{alej}} = f \\left(\\frac{v}{v + v_s}\\right)$$
            $$\\text{Fase 1 (Pared receptora): } f_{\\text{pared}} = f \\left(\\frac{v}{v - v_s}\\right)$$
            $$\\text{Fase 2 (Conductor como observador en movimiento hacia la pared reflectora): } f''_{\\text{eco}} = f_{\\text{pared}} \\left(\\frac{v + v_o}{v}\\right) = f \\left(\\frac{v + v_s}{v - v_s}\\right)$$
          `
        },
        {
          num: 5,
          name: "Conversión de unidades",
          content: "Las velocidades ya se encuentran expresadas en $\\text{m/s}$ y las frecuencias en hercios."
        },
        {
          num: 6,
          name: "Sustitución, despeje y procedimiento algebraico",
          content: `
            <div class="algebra-steps">
              <p>1. Peatón mientras la ambulancia se acerca ($v_s = 30.0\\text{ m/s}$, $v_o = 0$):</p>
              $$f'_{\\text{acerc}} = 800\\text{ Hz} \\left(\\frac{340}{340 - 30.0}\\right) = 800 \\left(\\frac{340}{310}\\right) = <span class="badge-calculado">877.42\\text{ Hz}</span>$$
              <p>2. Peatón mientras la ambulancia se aleja:</p>
              $$f'_{\\text{alej}} = 800\\text{ Hz} \\left(\\frac{340}{340 + 30.0}\\right) = 800 \\left(\\frac{340}{370}\\right) = <span class="badge-calculado">735.14\\text{ Hz}</span>$$
              <p>3. Frecuencia del eco reflejado escuchada por el conductor:</p>
              $$f''_{\\text{eco}} = 800\\text{ Hz} \\left(\\frac{340 + 30.0}{340 - 30.0}\\right) = 800 \\left(\\frac{370}{310}\\right) = <span class="badge-calculado">954.84\\text{ Hz}</span>$$
            </div>
          `
        },
        {
          num: 7,
          name: "Resultado final",
          content: `
            <div class="result-box">
              <ul>
                <li>Peatón en aproximación: $f'_{\\text{acerc}} = 877\\text{ Hz}$ (tono claramente más agudo).</li>
                <li>Peatón en alejamiento: $f'_{\\text{alej}} = 735\\text{ Hz}$ (tono más grave, con caída brusca de $142\\text{ Hz}$ al cruzar).</li>
                <li>Eco reflejado escuchado en la cabina: $f''_{\\text{eco}} = 955\\text{ Hz}$.</li>
              </ul>
            </div>
          `
        },
        {
          num: 8,
          name: "Validación del resultado",
          content: "El conductor percibe un doble corrimiento Doppler: el primero por ser fuente que comprime ondas hacia la pared y el segundo por desplazarse como observador activo que intercepta las ondas reflejadas a mayor velocidad relativa."
        },
        {
          num: 9,
          name: "Conclusión",
          content: "El fenómeno del eco con doble desplazamiento Doppler es el principio operativo exacto del radar de velocidad de tráfico y de la ecografía Doppler médica para medir el flujo sanguíneo de glóbulos rojos."
        },
        {
          num: 10,
          name: "Verificación independiente",
          content: "Frecuencia de batido que escucharía el conductor entre su propia sirena ($800\\text{ Hz}$) y el eco ($955\\text{ Hz}$): $\\Delta f = 954.8 - 800 = 154.8\\text{ Hz}$. El cálculo concuerda plenamente con las leyes acústicas."
        }
      ]
    },
    quiz: {
      question: "Un tren se acerca a una estación tocando su silbato. Un pasajero a bordo del tren y un observador parado en el andén de la estación escuchan el silbato. ¿Qué frecuencias registran respectivamente?",
      options: [
        "El pasajero a bordo escucha una frecuencia más alta que la original y el observador en el andén la frecuencia original.",
        "El pasajero a bordo escucha la frecuencia original emitida y el observador en el andén escucha una frecuencia más alta.",
        "Ambos escuchan exactamente la misma frecuencia porque viajan en el mismo aire.",
        "El observador en el andén escucha una frecuencia más baja."
      ],
      correctIndex: 1,
      explanation: "Correcto. El pasajero a bordo del tren se encuentra en reposo relativo respecto a la fuente (el silbato), por lo que no experimenta corrimiento Doppler y escucha la frecuencia propia $f$. El observador en el andén ve a la fuente acercarse, por lo que recibe frentes de onda comprimidos y percibe una frecuencia $f' > f$ más aguda."
    }
  },

  // ================= UNIDAD 11 =================
  {
    id: "unidad-11",
    number: 11,
    title: "Ondas Electromagnéticas y Conexión con la Óptica",
    shortTitle: "U11: Óptica y Ondas EM",
    summary: "Ecuaciones de Maxwell, radiación electromagnética, experimento de la doble rendija de Young, difracción y polarización.",
    sections: [
      {
        subtitle: "11.1 Naturaleza Electromagnética de la Luz",
        html: `
          <p>
            A partir de las cuatro ecuaciones fundamentales de Maxwell en el vacío sin fuentes:
          </p>
          <div class="math-display">$$\\nabla \\cdot \\mathbf{E} = 0, \\quad \\nabla \\cdot \\mathbf{B} = 0, \\quad \\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}, \\quad \\nabla \\times \\mathbf{B} = \\mu_0\\varepsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t}$$</div>
          <p>
            se deduce directamente la ecuación de onda tridimensional para ambos campos:
          </p>
          <div class="math-display">$$\\nabla^2 \\mathbf{E} = \\mu_0\\varepsilon_0 \\frac{\\partial^2 \\mathbf{E}}{\\partial t^2}, \\quad \\nabla^2 \\mathbf{B} = \\mu_0\\varepsilon_0 \\frac{\\partial^2 \\mathbf{B}}{\\partial t^2}$$</div>
          <p>
            lo cual predijo la velocidad de propagación de las ondas electromagnéticas en el vacío:
          </p>
          <div class="math-display">$$c = \\frac{1}{\\sqrt{\\mu_0 \\varepsilon_0}} = \\frac{1}{\\sqrt{(4\\pi\\times 10^{-7})(8.854\\times 10^{-12})}} = 2.998\\times 10^8\\text{ m/s}$$</div>
          <p>
            En todo punto, $\\mathbf{E}$ y $\\mathbf{B}$ son perpendiculares entre sí y perpendiculares a la dirección de propagación $\\mathbf{k}$, cumpliendo $E = c B$.
          </p>
        `
      },
      {
        subtitle: "11.2 Experimento de la Doble Rendija de Young",
        html: `
          <p>
            En 1801, Thomas Young iluminó dos rendijas estrechas paralelas separadas por una distancia $d$ con luz coherente de longitud de onda $\\lambda$. La diferencia de camino óptico hacia un punto en una pantalla lejana a distancia $L$ bajo un ángulo $\\theta$ es $\\Delta r = d\\sin\\theta \\approx d\\frac{y}{L}$.
          </p>
          <div class="academic-callout callout-important">
            <div class="callout-icon">💡</div>
            <div class="callout-body">
              <h4>Posición de Franjas en la Pantalla de Young</h4>
              <ul>
                <li><strong>Máximos de interferencia (franjas brillantes):</strong> $d\\sin\\theta = m\\lambda \\implies y_m = m\\frac{\\lambda L}{d}, \\quad m = 0, \\pm 1, \\pm 2, \\dots$</li>
                <li><strong>Mínimos de interferencia (franjas oscuras):</strong> $d\\sin\\theta = \\left(m + \\frac{1}{2}\\right)\\lambda \\implies y'_m = \\left(m + \\frac{1}{2}\\right)\\frac{\\lambda L}{d}$.</li>
              </ul>
              <p>La separación entre franjas brillantes consecutivas es uniforme: $\\Delta y = \\frac{\\lambda L}{d}$.</p>
            </div>
          </div>
        `
      }
    ],
    exercise: {
      title: "Ejercicio Resuelto 11.1: Doble Rendija de Young y Franjas de Interferencia",
      statement: "Un haz láser de helio-neón con longitud de onda $\\lambda = 632.8\\text{ nm}$ incide normalmente sobre dos rendijas paralelas separadas por $d = 0.200\\text{ mm}$. El patrón de interferencia se observa sobre una pantalla blanca situada a una distancia $L = 1.50\\text{ m}$ de las rendijas. (a) Calcule la separación $\\Delta y$ entre dos franjas brillantes consecutivas en el centro de la pantalla. (b) Determine la distancia lineal desde el máximo central ($m=0$) hasta el tercer mínimo de interferencia ($m'=2$). (c) Si todo el montaje se sumerge en agua ($n = 1.333$), ¿cuál será la nueva separación entre franjas?",
      steps: [
        {
          num: 1,
          name: "Comprensión e interpretación del enunciado",
          content: "Se estudia la interferencia luminosa por división de frente de onda en régimen paraxial de Fraunhofer ($d \\ll L$), aplicando la condición geométrica para franjas de Young y el cambio de longitud de onda en un medio dieléctrico."
        },
        {
          num: 2,
          name: "Identificación de los datos",
          content: `
            <div class="data-table-wrapper">
              <span class="badge-dato">DATOS (#2563EB)</span>
              <ul>
                <li>Longitud de onda en vacío/aire: $\\lambda_0 = 632.8\\text{ nm} = 632.8 \\times 10^{-9}\\text{ m}$</li>
                <li>Separación entre rendijas: $d = 0.200\\text{ mm} = 2.00 \\times 10^{-4}\\text{ m}$</li>
                <li>Distancia a la pantalla: $L = 1.50\\text{ m}$</li>
                <li>Índice de refracción del agua: $n = 1.333$</li>
              </ul>
            </div>
          `
        },
        {
          num: 3,
          name: "Identificación de las incógnitas",
          content: `
            <div class="incognitas-table-wrapper">
              <span class="badge-incognita">INCÓGNITAS (#DC2626)</span>
              <ul>
                <li>Interespaciado entre franjas brillantes en aire: $\\Delta y$ $[\\text{m}]$</li>
                <li>Posición del tercer mínimo oscuro: $y'_{m=2}$ $[\\text{m}]$</li>
                <li>Nuevo interespaciado en agua: $\\Delta y'$ $[\\text{m}]$</li>
              </ul>
            </div>
          `
        },
        {
          num: 4,
          name: "Selección de las ecuaciones",
          content: `
            $$\\Delta y = \\frac{\\lambda L}{d}, \\quad y'_m = \\left(m + \\frac{1}{2}\\right)\\frac{\\lambda L}{d} = \\left(m + \\frac{1}{2}\\right)\\Delta y$$
            $$\\lambda_{\\text{agua}} = \\frac{\\lambda_0}{n}, \\quad \\Delta y' = \\frac{\\Delta y}{n}$$
          `
        },
        {
          num: 5,
          name: "Conversión de unidades",
          content: `
            $\\lambda = 6.328 \\times 10^{-7}\\text{ m}$, $d = 2.00 \\times 10^{-4}\\text{ m}$, $L = 1.50\\text{ m}$.
          `
        },
        {
          num: 6,
          name: "Sustitución, despeje y procedimiento algebraico",
          content: `
            <div class="algebra-steps">
              <p>1. Separación entre franjas consecutivas en aire $\\Delta y$:</p>
              $$\\Delta y = \\frac{(6.328 \\times 10^{-7}\\text{ m})(1.50\\text{ m})}{2.00 \\times 10^{-4}\\text{ m}} = \\frac{9.492 \\times 10^{-7}}{2.00 \\times 10^{-4}} = <span class="badge-calculado">4.746 \\times 10^{-3}\\text{ m}</span> = 4.746\\text{ mm}$$
              <p>2. Posición del tercer mínimo de interferencia ($m'=2$ correspondiente a $\\Delta r = 2.5\\lambda$):</p>
              $$y'_{m=2} = \\left(2 + \\frac{1}{2}\\right)\\Delta y = 2.5 \\times 4.746\\text{ mm} = <span class="badge-calculado">11.865\\text{ mm}</span>$$
              <p>3. Nueva separación entre franjas en agua ($n = 1.333$):</p>
              $$\\Delta y' = \\frac{4.746\\text{ mm}}{1.333} = <span class="badge-calculado">3.560\\text{ mm}</span>$$
            </div>
          `
        },
        {
          num: 7,
          name: "Resultado final",
          content: `
            <div class="result-box">
              <ul>
                <li>Separación entre franjas en aire: $\\Delta y = 4.75\\text{ mm}$.</li>
                <li>Distancia al tercer mínimo: $y'_2 = 11.9\\text{ mm}$ ($1.19\\text{ cm}$).</li>
                <li>Separación en agua: $\\Delta y' = 3.56\\text{ mm}$ (el patrón se comprime un $25\\%$).</li>
              </ul>
            </div>
          `
        },
        {
          num: 8,
          name: "Validación del resultado",
          content: "Validación de la aproximación paraxial: $\\theta \\approx y/L = 0.00475/1.50 = 0.00316\\text{ rad} \\approx 0.18^\\circ$. Como $\\sin\\theta \\approx \\tan\\theta \\approx \\theta$ con error menor a $10^{-5}$, la fórmula lineal es extraordinariamente exacta."
        },
        {
          num: 9,
          name: "Conclusión",
          content: "Al sumergir el montaje en un medio de mayor índice de refracción, la velocidad y la longitud de onda de la luz se reducen, provocando que las franjas de interferencia se acerquen entre sí."
        },
        {
          num: 10,
          name: "Verificación independiente",
          content: "Comprobación del tercer mínimo mediante el ángulo de difracción: $\\sin\\theta = 2.5 \\lambda / d = 2.5(6.328\\times 10^{-7}) / (2.00\\times 10^{-4}) = 7.910\\times 10^{-3}$. Posición en pantalla: $y = L \\tan\\theta \\approx 1.50 \\times 7.910\\times 10^{-3} = 1.1865\\times 10^{-2}\\text{ m} = 11.87\\text{ mm}$. Idéntico."
        }
      ]
    },
    quiz: {
      question: "En el experimento de doble rendija de Young, ¿qué cambio experimental producirá un ensanchamiento (mayor separación) de las franjas de interferencia en la pantalla?",
      options: [
        "Aumentar la separación $d$ entre las dos rendijas.",
        "Utilizar luz con una longitud de onda $\\lambda$ menor (por ejemplo, cambiar luz roja por luz azul).",
        "Aumentar la distancia $L$ desde las rendijas hasta la pantalla de observación.",
        "Sumergir todo el experimento en un líquido con alto índice de refracción."
      ],
      correctIndex: 2,
      explanation: "Correcto. La separación entre franjas es $\\Delta y = \\frac{\\lambda L}{d}$. Por ende, $\\Delta y$ es directamente proporcional a la distancia a la pantalla $L$. Si se aleja la pantalla (mayor $L$), las franjas se separan más."
    }
  },

  // ================= UNIDAD 12 =================
  {
    id: "unidad-12",
    number: 12,
    title: "Aplicaciones y Experimentación en la Ingeniería y la Ciencia",
    shortTitle: "U12: Aplicaciones",
    summary: "Sismología, diagnóstico médico por ecografía, comunicaciones por fibra óptica, acústica de salas y sonar.",
    sections: [
      {
        subtitle: "12.1 Aplicaciones Biomédicas, Industriales y Geofísicas",
        html: `
          <p>
            El movimiento ondulatorio es el principio físico unificador detrás de las tecnologías contemporáneas más trascendentales:
          </p>
          <div class="applications-grid">
            <div class="app-card">
              <h4>1. Diagnóstico por Ultrasonido (Ecografía Médica)</h4>
              <p>Ondas mecánicas de alta frecuencia ($2\\text{ a }15\\text{ MHz}$) emitidas por transductores piezoeléctricos penetran el cuerpo humano. Al encontrar interfases entre tejidos con diferente <strong>impedancia acústica específica</strong> ($Z = \\rho v$), parte de la onda se refleja como eco y se computa para generar imágenes anatómicas en tiempo real sin radiación ionizante.</p>
            </div>

            <div class="app-card">
              <h4>2. Fibra Óptica y Telecomunicaciones</h4>
              <p>Pulsos electromagnéticos infrarrojos ($1550\\text{ nm}$) se transmiten a lo largo de filamentos de sílice de alta pureza mediante el fenómeno de <strong>reflexión interna total</strong> cuando el ángulo de incidencia supera el ángulo crítico $\\theta_c = \\arcsin(n_2/n_1)$. Permite transportar terabits por segundo con atenuaciones inferiores a $0.2\\text{ dB/km}$.</p>
            </div>

            <div class="app-card">
              <h4>3. Acústica Arquitectónica y Tiempo de Reverberación</h4>
              <p>En auditorios y salas de concierto, la calidad acústica está dictada por las reflexiones sucesivas en paredes y cielorrasos. La <strong>fórmula de Sabine</strong> modela el tiempo necesario para que la energía sonora decaiga $60\\text{ dB}$:</p>
              <div class="math-display">$$T_{60} = \\frac{0.161 V}{A_{\\text{absorb}}}$$</div>
            </div>

            <div class="app-card">
              <h4>4. Sismología y Estructura del Interior Planetario</h4>
              <p>El registro de ondas P y S y de ondas superficiales (Rayleigh y Love) permite mapear fallas geológicas, ubicar epicentros y reveló la existencia del núcleo líquido externo y el núcleo sólido interno de la Tierra gracias a las zonas de sombra de ondas S.</p>
            </div>
          </div>
        `
      }
    ],
    exercise: {
      title: "Ejercicio Resuelto 12.1: Reflexión Interna Total y Cono de Aceptación en Fibra Óptica",
      statement: "Una fibra óptica de salto de índice tiene un núcleo cilíndrico de vidrio con índice de refracción $n_1 = 1.480$ y un revestimiento protector con índice $n_2 = 1.440$. La fibra termina en una cara plana expuesta al aire exterior ($n_0 = 1.000$). Calcule: (a) el ángulo crítico $\\theta_c$ en la interfase núcleo-revestimiento para que ocurra reflexión interna total, (b) la apertura numérica ($NA$) de la fibra óptica, y (c) el ángulo máximo de aceptación externo $\\theta_{\\max}$ con el cual un rayo de luz puede incidir desde el aire para quedar guiado.",
      steps: [
        {
          num: 1,
          name: "Comprensión e interpretación del enunciado",
          content: "Se estudia la propagación guiada de ondas electromagnéticas en una guía dieléctrica por reflexión interna total. Se requiere conectar la ley de Snell en la cara de entrada con la condición de reflexión total en la pared lateral del núcleo."
        },
        {
          num: 2,
          name: "Identificación de los datos",
          content: `
            <div class="data-table-wrapper">
              <span class="badge-dato">DATOS (#2563EB)</span>
              <ul>
                <li>Índice del núcleo: $n_1 = 1.480$</li>
                <li>Índice del revestimiento: $n_2 = 1.440$</li>
                <li>Índice del medio exterior (aire): $n_0 = 1.000$</li>
              </ul>
            </div>
          `
        },
        {
          num: 3,
          name: "Identificación de las incógnitas",
          content: `
            <div class="incognitas-table-wrapper">
              <span class="badge-incognita">INCÓGNITAS (#DC2626)</span>
              <ul>
                <li>Ángulo crítico interno: $\\theta_c$ $[^\\circ]$</li>
                <li>Apertura numérica: $NA$ (adimensional)</li>
                <li>Semiángulo máximo de aceptación: $\\theta_{\\max}$ $[^\\circ]$</li>
              </ul>
            </div>
          `
        },
        {
          num: 4,
          name: "Selección de las ecuaciones",
          content: `
            $$\\sin\\theta_c = \\frac{n_2}{n_1}, \\quad NA = \\sqrt{n_1^2 - n_2^2}, \\quad n_0\\sin\\theta_{\\max} = NA = \\sqrt{n_1^2 - n_2^2}$$
          `
        },
        {
          num: 5,
          name: "Conversión de unidades",
          content: "Los índices de refracción son magnitudes adimensionales."
        },
        {
          num: 6,
          name: "Sustitución, despeje y procedimiento algebraico",
          content: `
            <div class="algebra-steps">
              <p>1. Ángulo crítico $\\theta_c$:</p>
              $$\\sin\\theta_c = \\frac{1.440}{1.480} = 0.97297 \\implies \\theta_c = \\arcsin(0.97297) = <span class="badge-calculado">76.65^\\circ</span>$$
              <p>2. Apertura numérica $NA$:</p>
              $$NA = \\sqrt{(1.480)^2 - (1.440)^2} = \\sqrt{2.1904 - 2.0736} = \\sqrt{0.1168} = <span class="badge-calculado">0.3418</span>$$
              <p>3. Ángulo de aceptación exterior $\\theta_{\\max}$ en aire ($n_0 = 1.000$):</p>
              $$\\sin\\theta_{\\max} = \\frac{NA}{n_0} = \\frac{0.3418}{1.000} = 0.3418$$
              $$\\theta_{\\max} = \\arcsin(0.3418) = <span class="badge-calculado">19.98^\\circ</span>$$
            </div>
          `
        },
        {
          num: 7,
          name: "Resultado final",
          content: `
            <div class="result-box">
              <ul>
                <li>Ángulo crítico interno: $\\theta_c = 76.7^\\circ$.</li>
                <li>Apertura numérica de la fibra: $NA = 0.342$.</li>
                <li>Ángulo máximo de aceptación: $\\theta_{\\max} = 20.0^\\circ$ (cono total de aceptación de $2\\theta_{\\max} = 40.0^\\circ$).</li>
              </ul>
            </div>
          `
        },
        {
          num: 8,
          name: "Validación del resultado",
          content: "Verificación geométrica: Un rayo que incide a $19.98^\\circ$ se refracta en el núcleo con $\\sin\\theta_r = (1.000/1.480)\\sin(19.98^\\circ) = 0.2309 \\implies \\theta_r = 13.35^\\circ$. El ángulo con la pared del núcleo es $90^\\circ - 13.35^\\circ = 76.65^\\circ = \\theta_c$. Cumple exactamente la condición de confinamiento total."
        },
        {
          num: 9,
          name: "Conclusión",
          content: "Cualquier haz inyectado dentro del cono cónico de semiángulo $20.0^\\circ$ quedará confinado indefinidamente en el núcleo sin perder energía por refracción hacia el revestimiento."
        },
        {
          num: 10,
          name: "Verificación independiente",
          content: "Verificación de la cota: Como $n_1 > n_2$, la reflexión total existe obligatoriamente. Si $n_2 \\to n_1$, $NA \\to 0$, impidiendo la captura de luz oblicua."
        }
      ]
    },
    quiz: {
      question: "¿Por qué se utiliza gel conductor a base de agua entre la piel del paciente y el transductor en un examen médico de ecografía?",
      options: [
        "Para enfriar el transductor piezoeléctrico y evitar que se sobrecaliente.",
        "Para eliminar las bolsas de aire cuya enorme diferencia de impedancia acústica con la piel reflejaría casi el 99.9% del haz ultrasónico.",
        "Para desinfectar la piel e inhibir bacterias durante el procedimiento.",
        "Para aumentar la frecuencia de resonancia de los cristales piezoeléctricos."
      ],
      correctIndex: 1,
      explanation: "Correcto. La impedancia acústica del aire ($Z \\approx 400\\text{ kg/m}^2\\text{s}$) es órdenes de magnitud menor que la del tejido humano blando ($Z \\approx 1.5\\times 10^6\\text{ kg/m}^2\\text{s}$). Sin el gel acústico de acoplamiento, la interfase aire-piel reflejaría casi la totalidad de la onda incidente, impidiendo que el ultrasonido penetre al cuerpo."
    }
  }
];

const GLOSSARY_TERMS = [
  { term: "Amplitud", category: "Magnitudes", symbol: "A", unit: "m", def: "Magnitud escalar que mide el máximo desplazamiento o perturbación que experimenta una partícula o campo respecto a su posición de equilibrio estable.", relatedUnit: 1 },
  { term: "Armónico", category: "Acústica", symbol: "f_n", unit: "Hz", def: "Modo normal de vibración de una estructura u onda estacionaria cuya frecuencia es un múltiplo entero de la frecuencia fundamental del sistema.", relatedUnit: 7 },
  { term: "Atenuación", category: "Fenómenos", symbol: "\\alpha", unit: "m⁻¹", def: "Disminución progresiva de la amplitud o intensidad de una onda a medida que viaja por el medio, provocada por dispersión geométrica o disipación viscosa.", relatedUnit: 4 },
  { term: "Batido", category: "Fenómenos", symbol: "f_{bat}", unit: "Hz", def: "Fluctuación periódica en la amplitud e intensidad resultante de la superposición de dos ondas coherentes de frecuencias ligeramente distintas.", relatedUnit: 5 },
  { term: "Difracción", category: "Fenómenos", symbol: "\\theta_d", unit: "rad", def: "Curvatura, dispersión y redistribución de frentes de onda cuando estos encuentran un obstáculo o atraviesan una abertura de dimensiones comparables a su longitud de onda.", relatedUnit: 6 },
  { term: "Dispersión", category: "Fenómenos", symbol: "v(\\omega)", unit: "m/s", def: "Fenómeno por el cual la velocidad de fase de una onda depende de su frecuencia o longitud de onda en un medio material.", relatedUnit: 6 },
  { term: "Efecto Doppler", category: "Fenómenos", symbol: "f'", unit: "Hz", def: "Variación aparente en la frecuencia recibida por un observador debido al movimiento relativo entre la fuente emisora y el receptor.", relatedUnit: 10 },
  { term: "Energía ondulatoria", category: "Magnitudes", symbol: "E", unit: "J", def: "Energía cinética y potencial acumulada en las oscilaciones del medio o en los campos electromagnéticos que se transfiere a través del espacio.", relatedUnit: 4 },
  { term: "Fase", category: "Magnitudes", symbol: "\\Phi", unit: "rad", def: "Argumento angular de la función armónica sinusoidal que determina el estado de movimiento instantáneo de una onda en una posición y tiempo dados.", relatedUnit: 3 },
  { term: "Frecuencia", category: "Magnitudes", symbol: "f", unit: "Hz", def: "Número de ciclos o repeticiones completas que efectúa una perturbación periódica por unidad de tiempo.", relatedUnit: 1 },
  { term: "Frecuencia angular", category: "Magnitudes", symbol: "\\omega", unit: "rad/s", def: "Tasa temporal de cambio de la fase de una onda armónica, definida por \\omega = 2\\pi f = 2\\pi / T.", relatedUnit: 1 },
  { term: "Intensidad", category: "Magnitudes", symbol: "I", unit: "W/m²", def: "Flujo medio de potencia que transporta una onda a través de una superficie unitaria perpendicular a la dirección de propagación.", relatedUnit: 4 },
  { term: "Interferencia", category: "Fenómenos", symbol: "y_{res}", unit: "m", def: "Superposición de dos o más ondas en una región del espacio que da lugar a una redistribución espacial de energía con zonas de refuerzo y cancelación.", relatedUnit: 5 },
  { term: "Longitud de onda", category: "Magnitudes", symbol: "\\lambda", unit: "m", def: "Distancia física mínima medida a lo largo de la dirección de propagación entre dos puntos consecutivos que se encuentran en idéntica fase.", relatedUnit: 1 },
  { term: "Nodo", category: "Fenómenos", symbol: "x_n", unit: "m", def: "Punto o superficie en una onda estacionaria donde la amplitud de oscilación es permanentemente nula debido a interferencia destructiva continua.", relatedUnit: 7 },
  { term: "Número de onda", category: "Magnitudes", symbol: "k", unit: "rad/m", def: "Tasa espacial de variación de la fase de la onda por unidad de longitud, definida como k = 2\\pi / \\lambda.", relatedUnit: 1 },
  { term: "Onda", category: "Fundamentos", symbol: "y(x,t)", unit: "m", def: "Perturbación física autopropagada en el espacio y en el tiempo que transporta energía y momento sin transporte neto de masa.", relatedUnit: 1 },
  { term: "Onda estacionaria", category: "Fundamentos", symbol: "y_{est}", unit: "m", def: "Patrón oscilatorio caracterizado por nodos y vientres fijos en el espacio formado por la superposición de dos ondas viajeras de igual amplitud y sentidos opuestos.", relatedUnit: 7 },
  { term: "Onda longitudinal", category: "Fundamentos", symbol: "s(x,t)", unit: "m", def: "Onda en la que la dirección de oscilación de las partículas del medio es paralela a la dirección de propagación de la perturbación.", relatedUnit: 2 },
  { term: "Onda mecánica", category: "Fundamentos", symbol: "-", unit: "-", def: "Perturbación que requiere forzosamente la presencia de un medio material deformable y elástico para poder propagarse.", relatedUnit: 2 },
  { term: "Onda transversal", category: "Fundamentos", symbol: "y(x,t)", unit: "m", def: "Onda en la cual el vector de desplazamiento oscilatorio es rigurosamente perpendicular a la dirección en que viaja la energía.", relatedUnit: 2 },
  { term: "Onda viajera", category: "Fundamentos", symbol: "f(x - vt)", unit: "m", def: "Perturbación que se traslada continuamente en el espacio a una velocidad de fase constante $v$, transfiriendo energía entre puntos remotos.", relatedUnit: 3 },
  { term: "Oscilación", category: "Fundamentos", symbol: "x(t)", unit: "m", def: "Movimiento periódico o cuasiperiódico repetitivo de vaivén de un sistema mecánico o campo alrededor de una posición de equilibrio estable.", relatedUnit: 1 },
  { term: "Período", category: "Magnitudes", symbol: "T", unit: "s", def: "Intervalo temporal mínimo necesario para que un punto del medio complete una oscilación entera.", relatedUnit: 1 },
  { term: "Polarización", category: "Óptica", symbol: "\\mathbf{E}", unit: "V/m", def: "Orientación espacial geométrica del vector campo eléctrico en una onda electromagnética transversal.", relatedUnit: 11 },
  { term: "Presión acústica", category: "Acústica", symbol: "\\Delta P", unit: "Pa", def: "Variación instantánea y local de la presión respecto a la presión barométrica estática de equilibrio provocada por una onda sonora.", relatedUnit: 8 },
  { term: "Pulso", category: "Fundamentos", symbol: "y_p", unit: "m", def: "Perturbación solitaria de duración temporal y extensión espacial finita que viaja por un medio elástico.", relatedUnit: 1 },
  { term: "Reflexión", category: "Fenómenos", symbol: "r", unit: "-", def: "Cambio de dirección que experimenta una onda al incidir sobre la frontera de separación entre dos medios, retornando al medio inicial.", relatedUnit: 6 },
  { term: "Refracción", category: "Fenómenos", symbol: "t", unit: "-", def: "Cambio en la dirección de propagación y en la longitud de onda que sufre una onda al penetrar en un segundo medio con diferente velocidad de fase.", relatedUnit: 6 },
  { term: "Resonancia", category: "Fenómenos", symbol: "f_0", unit: "Hz", def: "Fenómeno en el cual un sistema oscilante es excitado a una de sus frecuencias naturales de vibración, alcanzando amplitudes máximas.", relatedUnit: 7 },
  { term: "Superposición", category: "Fundamentos", symbol: "\\sum y_i", unit: "m", def: "Principio físico de linealidad según el cual el desplazamiento neto resultante es igual a la suma algebraica de los desplazamientos individuales.", relatedUnit: 5 },
  { term: "Velocidad de propagación", category: "Magnitudes", symbol: "v", unit: "m/s", def: "Rapidez con la cual avanza el perfil espacial de la onda o una fase constante a través del medio físico.", relatedUnit: 1 },
  { term: "Vientre o Antinodo", category: "Fenómenos", symbol: "x_v", unit: "m", def: "Punto de una onda estacionaria donde la amplitud de oscilación alcanza su valor máximo absoluto posible.", relatedUnit: 7 }
];

const BIBLIOGRAPHY_APA7 = [
  {
    citationKey: "SerwayJewett2018",
    authors: "Serway, R. A., & Jewett, J. W.",
    year: "2018",
    title: "Física para ciencias e ingeniería (Vol. 1 y 2, 10.ª ed.)",
    publisher: "Cengage Learning",
    notes: "Texto fundamental de referencia para oscilaciones, ondas mecánicas, acústica y ecuaciones de onda."
  },
  {
    citationKey: "HallidayResnick2014",
    authors: "Halliday, D., Resnick, R., & Walker, J.",
    year: "2014",
    title: "Fundamentos de física (10.ª ed.)",
    publisher: "Grupo Editorial Patria / Wiley",
    notes: "Tratamiento analítico de ondas transversales, interferencia y efecto Doppler."
  },
  {
    citationKey: "TiplerMosca2010",
    authors: "Tipler, P. A., & Mosca, G.",
    year: "2010",
    title: "Física para la ciencia y la tecnología (Vol. 1: Mecánica, oscilaciones y ondas, 6.ª ed.)",
    publisher: "Editorial Reverté",
    notes: "Desarrollo formal de la ecuación diferencial clásica de onda y ondas estacionarias."
  },
  {
    citationKey: "SearsZemansky2018",
    authors: "Young, H. D., Freedman, R. A., & Ford, A. L.",
    year: "2018",
    title: "Física universitaria con física moderna (Sears y Zemansky, Vol. 1 y 2, 14.ª ed.)",
    publisher: "Pearson Educación",
    notes: "Exposición rigurosa de acústica, tubos sonoros y óptica ondulatoria."
  },
  {
    citationKey: "French1971",
    authors: "French, A. P.",
    year: "1971",
    title: "Vibraciones y ondas (Curso de Física del MIT)",
    publisher: "Editorial Reverté",
    notes: "Clásico pedagógico del MIT para la deducción rigurosa de modos normales y batidos."
  },
  {
    citationKey: "Crawford1968",
    authors: "Crawford, F. S.",
    year: "1968",
    title: "Ondas (Berkeley Physics Course, Vol. 3)",
    publisher: "McGraw-Hill / Editorial Reverté",
    notes: "Fundamentos de reflexión, transmisión, atenuación y teoría electromagnética ondulatoria."
  },
  {
    citationKey: "Hecht2017",
    authors: "Hecht, E.",
    year: "2017",
    title: "Óptica (5.ª ed.)",
    publisher: "Pearson Educación",
    notes: "Referencia mundial para el experimento de Young, difracción, principio de Huygens y polarización."
  },
  {
    citationKey: "OpenStax2021",
    authors: "Ling, S. J., Sanny, J., & Moebs, W.",
    year: "2021",
    title: "University Physics (Vol. 1 & 3)",
    publisher: "OpenStax, Rice University",
    notes: "Recurso educativo abierto universitario peer-reviewed con modelos computacionales validados."
  }
];


/* ======================== mindmap.js ======================== */
// mindmap.js - Mapa Mental Interactivo del Movimiento Ondulatorio

const MINDMAP_DATA = {
  id: "root",
  label: "Movimiento Ondulatorio",
  category: "central",
  summary: "Transporte de energía y momento lineal en el espacio-tiempo sin transporte neto de masa.",
  unitId: "unidad-1",
  children: [
    {
      id: "fundamentos",
      label: "Fundamentos y Magnitudes",
      category: "teoria",
      summary: "Amplitud (A), Longitud de onda (λ), Período (T), Frecuencia (f), Velocidad de fase (v), Número de onda (k) y Frecuencia angular (ω).",
      unitId: "unidad-1",
      children: [
        { id: "amplitud", label: "Amplitud (A)", category: "parametro", summary: "Excursión máxima respecto al equilibrio. Dicta la energía.", unitId: "unidad-1" },
        { id: "longitud", label: "Longitud de onda (λ)", category: "parametro", summary: "Periodicidad espacial mínima entre crestas o puntos en fase.", unitId: "unidad-1" },
        { id: "frecuencia", label: "Frecuencia (f) y Período (T)", category: "parametro", summary: "Periodicidad temporal del oscilador fuente: T = 1/f.", unitId: "unidad-1" }
      ]
    },
    {
      id: "clasificacion",
      label: "Clasificación de Ondas",
      category: "taxonomia",
      summary: "Mecánicas vs Electromagnéticas; Transversales vs Longitudinales; 1D, 2D y 3D.",
      unitId: "unidad-2",
      children: [
        { id: "mecanicas", label: "Ondas Mecánicas", category: "medio", summary: "Requieren medio material elástico deformable (cuerdas, sonido, sísmicas).", unitId: "unidad-2" },
        { id: "em", label: "Ondas Electromagnéticas", category: "medio", summary: "Campos E y B oscilantes acoplados. Se propagan en el vacío a c = 3×10⁸ m/s.", unitId: "unidad-2" },
        { id: "geom", label: "Transversales vs Longitudinales", category: "geometria", summary: "Transversal: oscilación ⊥ propagación. Longitudinal: oscilación ∥ propagación.", unitId: "unidad-2" }
      ]
    },
    {
      id: "matematica",
      label: "Descripción Matemática",
      category: "ecuaciones",
      summary: "Función de onda y(x,t) = A sin(kx ∓ ωt + φ) y Ecuación diferencial clásica de d'Alembert.",
      unitId: "unidad-3",
      children: [
        { id: "eq-dalembert", label: "Ecuación de Onda 1D", category: "ecuacion", summary: "∂²y/∂t² = v² ∂²y/∂x². Ecuación fundamental en derivadas parciales.", unitId: "unidad-3" },
        { id: "dispersion", label: "Relación v = λf = ω/k", category: "ecuacion", summary: "Conexión cinemática entre escalas espaciales y temporales.", unitId: "unidad-3" }
      ]
    },
    {
      id: "energia",
      label: "Energía y Potencia",
      category: "dinamica",
      summary: "P_med = (1/2) μ v ω² A². Proporcional al cuadrado de la amplitud y la frecuencia.",
      unitId: "unidad-4",
      children: [
        { id: "tension", label: "Velocidad en Cuerda", category: "dinamica", summary: "v = √(T/μ). Determinada por la tensión y la inercia lineal.", unitId: "unidad-4" },
        { id: "intensidad", label: "Intensidad I = P/A", category: "dinamica", summary: "Flujo de energía superficial. Ley del inverso del cuadrado (1/r²).", unitId: "unidad-4" }
      ]
    },
    {
      id: "superposicion",
      label: "Superposición e Interferencia",
      category: "interferencia",
      summary: "Suma lineal y_res = y₁ + y₂. Interferencia constructiva, destructiva y batidos.",
      unitId: "unidad-5",
      children: [
        { id: "constructiva", label: "Constructiva / Destructiva", category: "interferencia", summary: "Δφ = 2mπ (refuerzo) vs Δφ = (2m+1)π (cancelación mutua).", unitId: "unidad-5" },
        { id: "batidos", label: "Batidos Acústicos", category: "interferencia", summary: "Modulación de amplitud por frecuencias cercanas: f_bat = |f₁ - f₂|.", unitId: "unidad-5" }
      ]
    },
    {
      id: "fenomenos",
      label: "Reflexión y Refracción",
      category: "frontera",
      summary: "Condiciones de frontera fija/libre, inversión de fase, ley de Snell y principio de Huygens.",
      unitId: "unidad-6",
      children: [
        { id: "snell", label: "Ley de Refracción", category: "frontera", summary: "sin(θ₁)/v₁ = sin(θ₂)/v₂. Cambio de longitud de onda entre medios.", unitId: "unidad-6" },
        { id: "difraccion", label: "Difracción de Huygens", category: "frontera", summary: "Dispersión de frentes de onda en aberturas y bordes con a ≲ λ.", unitId: "unidad-6" }
      ]
    },
    {
      id: "estacionarias",
      label: "Ondas Estacionarias",
      category: "modos",
      summary: "y_est = 2A sin(kx) cos(ωt). Nodos fijos, antinodos y cuantización de modos normales f_n.",
      unitId: "unidad-7",
      children: [
        { id: "armonicos-cuerda", label: "Cuerdas Tensas", category: "modos", summary: "f_n = n v / (2L). Todos los armónicos enteros presentes.", unitId: "unidad-7" },
        { id: "nodos", label: "Nodos y Antinodos", category: "modos", summary: "Distancia entre nodos consecutivos = λ/2.", unitId: "unidad-7" }
      ]
    },
    {
      id: "acustica",
      label: "Acústica y Sonido",
      category: "acustica",
      summary: "Ondas mecánicas de presión ΔP y desplazamiento s. Escala de decibelios β = 10 log(I/I₀).",
      unitId: "unidad-8",
      children: [
        { id: "decibelios", label: "Nivel Sonoro (dB)", category: "acustica", summary: "Escala logarítmica de audición humana: I₀ = 10⁻¹² W/m².", unitId: "unidad-8" },
        { id: "tubos", label: "Tubos y Resonancia", category: "acustica", summary: "Abiertos (todos los armónicos) vs Cerrados en un extremo (solo impares).", unitId: "unidad-9" }
      ]
    },
    {
      id: "doppler",
      label: "Efecto Doppler",
      category: "cinematica",
      summary: "f' = f (v ± v_o) / (v ∓ v_s). Corrimiento de frecuencia por velocidad relativa.",
      unitId: "unidad-10",
      children: [
        { id: "acercamiento", label: "Compresión y Agudeza", category: "cinematica", summary: "Al aproximarse la fuente o el receptor, la frecuencia percibida se eleva.", unitId: "unidad-10" }
      ]
    },
    {
      id: "optica-em",
      label: "Óptica Ondulatoria y Ondas EM",
      category: "optica",
      summary: "Experimento de Young de la doble rendija, franjas y = m λ L / d y difracción de la luz.",
      unitId: "unidad-11",
      children: [
        { id: "young", label: "Doble Rendija de Young", category: "optica", summary: "Prueba definitiva de la naturaleza ondulatoria de la luz en 1801.", unitId: "unidad-11" }
      ]
    },
    {
      id: "aplicaciones",
      label: "Aplicaciones en Ingeniería",
      category: "tecnologia",
      summary: "Ecografía Doppler, telecomunicaciones por fibra óptica, sonar, sismología y acústica de recintos.",
      unitId: "unidad-12",
      children: [
        { id: "fibra", label: "Fibra Óptica", category: "tecnologia", summary: "Guía dieléctrica por reflexión interna total con ángulo crítico θ_c.", unitId: "unidad-12" },
        { id: "sismos", label: "Sismología (P y S)", category: "tecnologia", summary: "Triangulación hipocentral mediante el desfase temporal Δt = t_S - t_P.", unitId: "unidad-12" }
      ]
    }
  ]
};

class MindMapRenderer {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = options;
    this.activeNode = null;
    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="mindmap-wrapper">
        <div class="mindmap-header">
          <div class="mindmap-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/><path d="M3 12h6m6 0h6M12 3v6m0 6v6"/>
            </svg>
            <strong>Mapa Mental Interactivo: Red Conceptual del Movimiento Ondulatorio</strong>
          </div>
          <span class="mindmap-hint">Haz clic en cualquier nodo para explorar su definición y acceder a la unidad</span>
        </div>

        <div class="mindmap-body">
          <div class="mindmap-canvas-container" id="mindmap-graph-container"></div>
          
          <div class="mindmap-inspector" id="mindmap-inspector">
            <div class="inspector-empty" id="mindmap-inspector-empty">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
              </svg>
              <p>Selecciona un nodo del mapa para ver los fundamentos físicos, fórmulas asociadas y navegar a la unidad correspondiente.</p>
            </div>
            <div class="inspector-card hidden" id="mindmap-inspector-card">
              <div class="card-badge" id="mm-badge">Concepto</div>
              <h4 id="mm-title">Título</h4>
              <p id="mm-summary">Resumen</p>
              <button type="button" class="btn-sm btn-primary" id="mm-goto-btn">
                Ir a la Unidad del Cuaderno
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.buildInteractiveGraph();
  }

  buildInteractiveGraph() {
    const graphContainer = document.getElementById('mindmap-graph-container');
    if (!graphContainer) return;

    // Render tree with modern cards & connected branches
    const root = MINDMAP_DATA;
    let html = `
      <div class="mm-tree">
        <div class="mm-root-card" data-node-id="${root.id}">
          <div class="mm-node-dot pulse"></div>
          <strong>${root.label}</strong>
          <span class="mm-node-sub">Eje Central</span>
        </div>
        <div class="mm-branches-grid">
    `;

    root.children.forEach(branch => {
      html += `
        <div class="mm-branch-col">
          <div class="mm-branch-card" data-node-id="${branch.id}" data-unit-id="${branch.unitId}">
            <div class="mm-branch-header">
              <span class="mm-badge">${branch.category.toUpperCase()}</span>
              <h5>${branch.label}</h5>
            </div>
            <p class="mm-branch-desc">${branch.summary}</p>
            <div class="mm-subnodes-list">
              ${branch.children ? branch.children.map(ch => `
                <button type="button" class="mm-subnode-pill" data-node-id="${ch.id}" data-unit-id="${ch.unitId}">
                  ${ch.label}
                </button>
              `).join('') : ''}
            </div>
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
    graphContainer.innerHTML = html;

    // Attach click events
    this.attachNodeListeners();
  }

  findNode(nodeId, current = MINDMAP_DATA) {
    if (current.id === nodeId) return current;
    if (current.children) {
      for (const child of current.children) {
        const found = this.findNode(nodeId, child);
        if (found) return found;
      }
    }
    return null;
  }

  attachNodeListeners() {
    const allClickables = this.container.querySelectorAll('[data-node-id]');
    allClickables.forEach(elem => {
      elem.addEventListener('click', (e) => {
        e.stopPropagation();
        const nodeId = elem.getAttribute('data-node-id');
        this.selectNode(nodeId, elem);
      });
    });
  }

  selectNode(nodeId, elem) {
    const node = this.findNode(nodeId);
    if (!node) return;

    // Highlight
    this.container.querySelectorAll('.is-selected').forEach(el => el.classList.remove('is-selected'));
    elem.classList.add('is-selected');

    // Update inspector
    const emptyView = document.getElementById('mindmap-inspector-empty');
    const cardView = document.getElementById('mindmap-inspector-card');
    const badge = document.getElementById('mm-badge');
    const title = document.getElementById('mm-title');
    const summary = document.getElementById('mm-summary');
    const gotoBtn = document.getElementById('mm-goto-btn');

    if (emptyView) emptyView.classList.add('hidden');
    if (cardView) cardView.classList.remove('hidden');

    if (badge) badge.textContent = (node.category || 'CONCEPTO').toUpperCase();
    if (title) title.textContent = node.label;
    if (summary) summary.textContent = node.summary;

    if (gotoBtn) {
      gotoBtn.onclick = () => {
        if (node.unitId && typeof this.options.onNavigate === 'function') {
          this.options.onNavigate(node.unitId);
        }
      };
    }
  }
}


/* ======================== timeline.js ======================== */
// timeline.js - Línea de Tiempo Histórica Interactiva del Movimiento Ondulatorio

const TIMELINE_EVENTS = [
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

class TimelineRenderer {
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


/* ======================== simulations-lab.js ======================== */
// simulations-lab.js - Colección de 9 Laboratorios Virtuales de Física de Ondas (Simulaciones A a I)
// Con soporte para Ventana Modal Grande Colapsable

class SimulationsLab {
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


/* ======================== notebook-app.js ======================== */
// notebook-app.js - Controlador del Cuaderno Virtual Universitario Argollado
// Implementa navegación de pliegos de páginas abiertas (Left Page + Anillos Espiral + Right Page)
// Efecto 3D Page Flip realista y motor de síntesis de sonido de papel Web Audio API





// ================= MOTOR DE SÍNTESIS DE SONIDO DE PAPEL REALISTA =================
class PaperSoundEngine {
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

class NotebookApp {
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



  /* ── Exportación global de clases y datos ── */
  try { global.MathEngine = MathEngine; } catch(e) {}
  try { global.WaveComponent = WaveComponent; } catch(e) {}
  try { global.WaveStore = WaveStore; } catch(e) {}
  try { global.GraphRenderer = GraphRenderer; } catch(e) {}
  try { global.VirtualKeyboard = VirtualKeyboard; } catch(e) {}
  try { global.DIDACTIC_PRESETS = DIDACTIC_PRESETS; } catch(e) {}
  try { global.DopplerPhysics = DopplerPhysics; } catch(e) {}
  try { global.DopplerAudio = DopplerAudio; } catch(e) {}
  try { global.DopplerCanvas = DopplerCanvas; } catch(e) {}
  try { global.DopplerUI = DopplerUI; } catch(e) {}
  try { global.WaveApp = WaveApp; } catch(e) {}
  try { global.TubesLab = TubesLab; } catch(e) {}
  try { global.StringsLab = StringsLab; } catch(e) {}
  try { global.NOTEBOOK_METADATA = NOTEBOOK_METADATA; } catch(e) {}
  try { global.PRELIMINARY_SECTIONS = PRELIMINARY_SECTIONS; } catch(e) {}
  try { global.UNITS = UNITS; } catch(e) {}
  try { global.GLOSSARY_TERMS = GLOSSARY_TERMS; } catch(e) {}
  try { if (typeof BIBLIOGRAPHY_APA7 !== 'undefined') global.BIBLIOGRAPHY_APA7 = BIBLIOGRAPHY_APA7; } catch(e) {}
  try { global.MindMapRenderer = MindMapRenderer; } catch(e) {}
  try { global.TimelineRenderer = TimelineRenderer; } catch(e) {}
  try { global.SimulationsLab = SimulationsLab; } catch(e) {}
  try { global.NotebookApp = NotebookApp; } catch(e) {}
  try { global.PaperSoundEngine = PaperSoundEngine; } catch(e) {}

  /* ── Inicialización cuando el DOM esté listo ── */
  function initApp() {
    // 1. Cuaderno Virtual (Física 3 argollado)
    try {
      global.notebookApp = new NotebookApp();
    } catch(err) {
      console.error('[NotebookApp] Error de inicialización:', err);
    }

    // 2. Pestaña Cuaderno: mantener activa siempre (único modo disponible)
    const tabNotebook = document.getElementById('tab-mode-notebook');
    if (tabNotebook) {
      tabNotebook.classList.add('active');
    }

    // 3. Botón de paleta de estilos HUD
    const btnHudStyles = document.getElementById('btn-hud-open-styles');
    if (btnHudStyles) {
      btnHudStyles.onclick = () => {
        document.getElementById('style-modal')?.classList.remove('hidden');
      };
    }

    // 4. Cierre de modales Doppler
    const btnCloseScenarios = document.getElementById('btnCloseScenarios');
    const modalScenarios = document.getElementById('modalScenarios');
    if (btnCloseScenarios && modalScenarios) {
      btnCloseScenarios.onclick = () => modalScenarios.classList.remove('open');
    }

    const btnCloseHelp = document.getElementById('btnCloseHelp');
    const modalHelp = document.getElementById('modalHelp');
    if (btnCloseHelp && modalHelp) {
      btnCloseHelp.onclick = () => modalHelp.classList.remove('open');
    }

    // Cerrar modales con Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (modalScenarios) modalScenarios.classList.remove('open');
        if (modalHelp) modalHelp.classList.remove('open');
        document.getElementById('style-modal')?.classList.add('hidden');
        document.getElementById('expanded-modal')?.classList.add('hidden');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    // DOM ya estaba listo (carga diferida)
    initApp();
  }

})(window);
