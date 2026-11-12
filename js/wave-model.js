/**
 * Modelo de Datos para Ondas Componentes y Superposición
 */
import { MathEngine } from './math-engine.js';

export class WaveComponent {
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

export class WaveStore {
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
