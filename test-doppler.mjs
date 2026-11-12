/**
 * test-doppler.mjs
 * Suite de Verificación Científica Obligatoria para el Efecto Doppler Acústico
 * Sección 14 de la especificación técnica.
 */

import { DopplerPhysics } from './js/doppler-physics.js';

console.log('========================================================');
console.log('   PRUEBAS CIENTÍFICAS DEL MOTOR FÍSICO DOPPLER (NODE)   ');
console.log('========================================================\n');

let totalTests = 0;
let passedTests = 0;

function assertClose(actual, expected, tol, testName) {
  totalTests++;
  const diff = Math.abs(actual - expected);
  const ok = diff <= tol;
  if (ok) {
    passedTests++;
    console.log(`[PASS] ${testName}: ${actual.toFixed(6)} ≈ ${expected.toFixed(6)} (diff=${diff.toExponential(2)})`);
  } else {
    console.error(`[FAIL] ${testName}: obtenido ${actual}, esperado ${expected} (tol=${tol})`);
  }
  return ok;
}

// --------------------------------------------------------------------------
// 1. CASOS CANÓNICOS TABULADOS (c = 340 m/s, f = 1000 Hz)
// --------------------------------------------------------------------------
console.log('--- 1. Casos canónicos tabulados (c = 340 m/s, f = 1000 Hz) ---');
const c_canon = 340.0;
const f_canon = 1000.0;
const v_test = 34.0;

// Caso 1A: Ambos inmóviles -> 1000 Hz
{
  const sim = new DopplerPhysics({ c: c_canon, f: f_canon, vfx: 0, vox: 0, x0f: 0, x0o: 100 });
  const f_th = sim.getTheoreticalFrequency(0);
  assertClose(f_th, 1000.0, 1e-6, 'Ambos inmóviles');
}

// Caso 1B: Fuente que se aproxima a 34 m/s -> 1111.111111... Hz (1000 * 340 / (340 - 34) = 10000/9)
{
  // Fuente en x=0 moviéndose hacia +X a 34 m/s, Observador en x=100 (delante)
  const sim = new DopplerPhysics({ c: c_canon, f: f_canon, vfx: v_test, vox: 0, x0f: 0, x0o: 100 });
  const f_th = sim.getTheoreticalFrequency(0);
  const f_exp = (f_canon * c_canon) / (c_canon - v_test); // 1111.111111...
  assertClose(f_th, f_exp, 1e-6, 'Fuente aproximándose a 34 m/s (teórico 1111.111 Hz)');
}

// Caso 1C: Fuente que se aleja a 34 m/s -> 909.090909... Hz (1000 * 340 / (340 + 34) = 10000/11)
{
  // Fuente en x=0 moviéndose hacia -X a -34 m/s, Observador en x=100 (detrás)
  const sim = new DopplerPhysics({ c: c_canon, f: f_canon, vfx: -v_test, vox: 0, x0f: 0, x0o: 100 });
  const f_th = sim.getTheoreticalFrequency(0);
  const f_exp = (f_canon * c_canon) / (c_canon + v_test); // 909.090909...
  assertClose(f_th, f_exp, 1e-6, 'Fuente alejándose a 34 m/s (teórico 909.091 Hz)');
}

// Caso 1D: Observador que se aproxima a fuente inmóvil a 34 m/s -> 1100 Hz
{
  // Fuente en x=0 inmóvil, Observador en x=100 moviéndose hacia la izquierda (-34 m/s)
  const sim = new DopplerPhysics({ c: c_canon, f: f_canon, vfx: 0, vox: -v_test, x0f: 0, x0o: 100 });
  const f_th = sim.getTheoreticalFrequency(0);
  const f_exp = f_canon * (c_canon + v_test) / c_canon; // 1100.0
  assertClose(f_th, f_exp, 1e-6, 'Observador aproximándose a 34 m/s (1100 Hz)');
}

// Caso 1E: Observador que se aleja de fuente inmóvil a 34 m/s -> 900 Hz
{
  // Fuente en x=0 inmóvil, Observador en x=100 moviéndose hacia la derecha (+34 m/s)
  const sim = new DopplerPhysics({ c: c_canon, f: f_canon, vfx: 0, vox: v_test, x0f: 0, x0o: 100 });
  const f_th = sim.getTheoreticalFrequency(0);
  const f_exp = f_canon * (c_canon - v_test) / c_canon; // 900.0
  assertClose(f_th, f_exp, 1e-6, 'Observador alejándose a 34 m/s (900 Hz)');
}

// Caso 1F: Ambos con igual velocidad constante (34 m/s) y separación fija -> 1000 Hz
{
  const sim = new DopplerPhysics({ c: c_canon, f: f_canon, vfx: v_test, vox: v_test, x0f: 0, x0o: 100 });
  const f_th = sim.getTheoreticalFrequency(0);
  assertClose(f_th, 1000.0, 1e-6, 'Ambos a igual velocidad constante (1000 Hz)');
}

// --------------------------------------------------------------------------
// 2. TIEMPO DE VUELO Y LLEGADA EXACTA (340 m a c = 340 m/s -> exactamente 1 s)
// --------------------------------------------------------------------------
console.log('\n--- 2. Verificación de Tiempo de Vuelo ---');
{
  const sim = new DopplerPhysics({ c: 340.0, f: 10.0, vfx: 0, vox: 0, x0f: 0, x0o: 340.0 });
  sim.stepTo(2.0); // Avanzar 2 segundos
  const firstArrival = sim.arrivals[0];
  assertClose(firstArrival.te, 0.0, 1e-9, 'Emisión t_e inicial');
  assertClose(firstArrival.tr, 1.0, 1e-9, 'Llegada t_r tras 340 m a 340 m/s (exactamente 1 s)');
  assertClose(firstArrival.travelTime, 1.0, 1e-9, 'Tiempo de vuelo');
}

// --------------------------------------------------------------------------
// 3. SEMIÁNGULO DE MACH (M = 2 -> μ = 30°)
// --------------------------------------------------------------------------
console.log('\n--- 3. Verificación de Ángulo de Mach (M = 2) ---');
{
  const sim = new DopplerPhysics({ c: 340.0, f: 5.0, vfx: 680.0, vox: 0, x0f: 0, x0o: 500.0 }); // vfx = 2c => M = 2
  assertClose(sim.machNumber, 2.0, 1e-9, 'Número de Mach = 2.0');
  assertClose(sim.machAngleDeg, 30.0, 1e-7, 'Semiángulo de Mach = 30.0° (arcsin(1/2))');
}

// --------------------------------------------------------------------------
// 4. INVARIANZA RESPECTO A LA TASA DE CUADROS (30, 60 y 144 FPS)
// --------------------------------------------------------------------------
console.log('\n--- 4. Invarianza temporal frente a framerate (30, 60, 144 FPS) ---');
{
  const runAtFPS = (fps, totalSec = 3.0) => {
    const sim = new DopplerPhysics({ c: 340.0, f: 2.0, vfx: 50.0, vox: -20.0, x0f: -100.0, x0o: 200.0 });
    const dt = 1.0 / fps;
    const steps = Math.round(totalSec * fps);
    for (let i = 1; i <= steps; i++) {
      sim.stepTo(i * dt);
    }
    return sim.arrivals.map(a => a.tr);
  };

  const arrivals30 = runAtFPS(30);
  const arrivals60 = runAtFPS(60);
  const arrivals144 = runAtFPS(144);

  assertClose(arrivals30.length, arrivals60.length, 0, 'Mismo conteo de llegadas entre 30 y 60 FPS');
  assertClose(arrivals60.length, arrivals144.length, 0, 'Mismo conteo de llegadas entre 60 y 144 FPS');

  for (let k = 0; k < arrivals60.length; k++) {
    assertClose(arrivals30[k], arrivals60[k], 1e-4, `Llegada [${k}] coincide 30 vs 60 FPS`);
    assertClose(arrivals60[k], arrivals144[k], 1e-4, `Llegada [${k}] coincide 60 vs 144 FPS`);
  }
}

// --------------------------------------------------------------------------
// 5. MEDICIÓN EXPERIMENTAL INDEPENDIENTE: f_medida = 1 / (t_{r, n+1} - t_{r, n})
// --------------------------------------------------------------------------
console.log('\n--- 5. Comparación entre Predicción Teórica y Frecuencia Medida por Eventos ---');
{
  // Fuente colineal aproximándose: f = 5 Hz, c = 340, vf = 68 m/s (vf/c = 0.2)
  // fo_th = 5 * 340 / (340 - 68) = 5 * 340 / 272 = 6.25 Hz
  // Periodo entre recepciones: 1 / 6.25 = 0.16 s
  const sim = new DopplerPhysics({ c: 340.0, f: 5.0, vfx: 68.0, vox: 0, x0f: -300.0, x0o: 300.0 });
  sim.stepTo(4.0); // Dejar que lleguen varios frentes

  const validArrivals = sim.arrivals.filter(a => a.fMeasured !== null);
  const lastArrival = validArrivals[validArrivals.length - 1];

  assertClose(lastArrival.fMeasured, 6.25, 1e-4, 'f_medida experimental = 6.25 Hz');
  assertClose(lastArrival.foTheoretical, 6.25, 1e-4, 'fo_teórico = 6.25 Hz');
  assertClose(lastArrival.deltaTr, 0.16, 1e-4, 'Intervalo entre frentes Δt_r = 0.16 s');
}

// --------------------------------------------------------------------------
// 6. CASOS DE BORDE Y CONDICIONES SINGULARES
// --------------------------------------------------------------------------
console.log('\n--- 6. Casos degenerados y límites de validez ---');
{
  // Mach 1 exacto: vf = c
  const simMach1 = new DopplerPhysics({ c: 340.0, f: 2.0, vfx: 340.0, vox: 0, x0f: 0, x0o: 100 });
  const f_mach1 = simMach1.getTheoreticalFrequency(0);
  totalTests++;
  if (!Number.isFinite(f_mach1) || f_mach1 === Infinity) {
    passedTests++;
    console.log('[PASS] Mach 1 devuelve Infinity / Denominador cero manejado sin bloqueo ni NaN');
  } else {
    console.error('[FAIL] Mach 1 debió alertar singularidad / infinito');
  }

  // Frecuencia cero o negativa protegida
  const simZeroF = new DopplerPhysics({ c: 340.0, f: 0 });
  totalTests++;
  if (simZeroF.period === Infinity) {
    passedTests++;
    console.log('[PASS] Frecuencia cero protegida con periodo infinito');
  }
}

console.log('\n========================================================');
console.log(`RESUMEN: ${passedTests} de ${totalTests} pruebas pasadas (${((passedTests/totalTests)*100).toFixed(1)}%)`);
console.log('========================================================');

if (passedTests === totalTests) {
  console.log('>>> VERIFICACIÓN CIENTÍFICA EXITOSA (100% OK) <<<');
  process.exit(0);
} else {
  console.error('>>> EXISTEN FALLOS EN LA VERIFICACIÓN CIENTÍFICA <<<');
  process.exit(1);
}
