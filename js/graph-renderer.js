/**
 * Renderizador de Gráficos Cartesianos Estilo GeoGebra
 * Con cuadrícula mayor, menor (papel milimetrado), ticks, marcas numéricas,
 * reglas sobre ejes, flechas de propagación, manejo HiDPI,
 * escalamiento manual individual de ejes y soporte táctil / mouse.
 */

export class GraphRenderer {
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
