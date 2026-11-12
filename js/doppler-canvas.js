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

export class DopplerCanvas {
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
