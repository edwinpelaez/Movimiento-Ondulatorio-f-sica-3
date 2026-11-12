/**
 * build-doppler-bundle.mjs
 * Empaqueta DopplerPhysics, DopplerAudio, DopplerCanvas y DopplerUI
 * en un único archivo standalone js/doppler-bundle.js compatible con apertura directa (file://)
 * y con servidores web (http://), sin restricciones CORS de módulos ES.
 */

import fs from 'fs';
import path from 'path';

const filesOrder = [
  'doppler-physics.js',
  'doppler-audio.js',
  'doppler-canvas.js',
  'doppler-ui.js'
];

let bundleContent = `/**
 * SIMULADOR AVANZADO DEL EFECTO DOPPLER ACÚSTICO — BUNDLE STANDALONE
 * Compatible con ejecución local directa (file://) y HTTP.
 */
(function(global) {
  'use strict';

`;

for (const fileName of filesOrder) {
  const filePath = path.join('js', fileName);
  let code = fs.readFileSync(filePath, 'utf8');

  // 1. Eliminar imports
  code = code.replace(/^import\s[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '');

  // 2. export class X -> class X
  code = code.replace(/export\s+class\s+/g, 'class ');

  // 3. export const X -> const X
  code = code.replace(/export\s+const\s+/g, 'const ');

  // 4. export default
  code = code.replace(/export\s+default\s+/g, '');

  bundleContent += `\n/* ======================== ${fileName} ======================== */\n` + code + '\n';
}

bundleContent += `
  // Exponer clases globalmente
  global.DopplerPhysics = DopplerPhysics;
  global.DopplerAudio = DopplerAudio;
  global.DopplerCanvas = DopplerCanvas;
  global.DopplerUI = DopplerUI;

  // Auto-inicialización robusta en DOMContentLoaded o inmediata si ya cargó
  function startDopplerApp() {
    if (global.__dopplerApp) return;
    try {
      const app = new DopplerUI();
      app.init();
      global.__dopplerApp = app;
      console.log('Simulador Doppler inicializado exitosamente.');
    } catch (err) {
      console.error('Error al inicializar DopplerUI:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startDopplerApp);
  } else {
    startDopplerApp();
  }
})(typeof window !== 'undefined' ? window : globalThis);
`;

fs.writeFileSync(path.join('js', 'doppler-bundle.js'), bundleContent, 'utf8');
console.log('js/doppler-bundle.js generado con éxito (' + bundleContent.length + ' bytes).');
