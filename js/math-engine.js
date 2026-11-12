/**
 * Motor Matemático y Compilador de Expresiones de Onda
 * Admite variables: x (posición), t (tiempo), v (velocidad)
 * Admite funciones: sen/sin, cos, tan/tg, exp, ln/log, sqrt/raiz, abs, sinc, rect, step
 * Admite constantes: pi (π), e
 * Maneja multiplicación implícita, operadores unarios, potencias '^' y fracciones
 * Genera LaTeX para KaTeX y compila a funciones nativas ultrarrápidas
 */

export class MathEngine {
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
