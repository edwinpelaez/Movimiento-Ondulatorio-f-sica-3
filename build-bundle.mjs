// build-bundle.mjs - Empaqueta todos los módulos en js/bundle.js para apertura directa (doble clic)
import fs from 'fs';
import path from 'path';

const filesOrder = [
  'math-engine.js',
  'wave-model.js',
  'graph-renderer.js',
  'virtual-keyboard.js',
  'didactic-presets.js',
  'doppler-physics.js',
  'doppler-audio.js',
  'doppler-canvas.js',
  'doppler-ui.js',
  'app.js',
  'tubes-sim.js',
  'strings-sim.js',
  'notebook-content.js',
  'mindmap.js',
  'timeline.js',
  'simulations-lab.js',
  'notebook-app.js'
];

let bundleContent = `/**
 * FÍSICA 3: MOVIMIENTO ONDULATORIO — BUNDLE COMPLETO STANDALONE
 * Apertura directa de index.html (doble clic / file://) — sin servidor.
 * Autores: Edwin Santiago Peláez · Camila Rengifo · Alejandra Barreto
 * Universidad Tecnológica de Pereira (UTP) — 1.ª Edición Digital 2026
 */
(function(global) {
  'use strict';

`;

for (const fileName of filesOrder) {
  const filePath = path.join('js', fileName);
  let code = fs.readFileSync(filePath, 'utf8');

  // 1. Eliminar todas las líneas import … from '…'
  code = code.replace(/^import\s[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '');

  // 2. Eliminar export default
  code = code.replace(/export\s+default\s+/g, '');

  // 3. export class X  →  class X
  code = code.replace(/export\s+class\s+/g, 'class ');

  // 4. export const X  →  const X
  code = code.replace(/export\s+const\s+/g, 'const ');

  // 5. export function X  →  function X
  code = code.replace(/export\s+function\s+/g, 'function ');

  // 6. Eliminar export { ... } al final de archivo
  code = code.replace(/export\s*\{[^}]*\};?\s*$/gm, '');

  // 7. Eliminar double-init DOMContentLoaded de app.js (lo manejamos nosotros)
  if (fileName === 'app.js') {
    code = code.replace(
      /\/\/ Inicialización[\s\S]*?window\.addEventListener\('DOMContentLoaded'[\s\S]*?\}\);/,
      '// Init manejado por bundle'
    );
  }

  bundleContent += `\n/* ======================== ${fileName} ======================== */\n` + code + '\n';
}

// ── Registrar todos los símbolos en window para compatibilidad global ──
bundleContent += `

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
`;

fs.writeFileSync(path.join('js', 'bundle.js'), bundleContent, 'utf8');
const sizeKb = Math.round(bundleContent.length / 1024);
console.log(`✅ js/bundle.js generado exitosamente — ${sizeKb} KB`);
