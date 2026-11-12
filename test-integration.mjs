// Test completo de la aplicación de Movimiento Ondulatorio
import { MathEngine } from './js/math-engine.js';
import { WaveStore } from './js/wave-model.js';
import { DIDACTIC_PRESETS } from './js/didactic-presets.js';

// ============== TEST 1: MOTOR MATEMÁTICO ==============
console.log('=== TEST MOTOR MATEMATICO ===');
const testCases = [
  ['2 * sen(x - v*t)', 1, 0.5, 2],
  ['2 / (((x - v * t)^4) + 1)', 0, 1, 2],
  ['exp(-((x - v*t)/2)^2)', 2, 0, 1],
  ['3*cos(2*pi*x - 4*t)', 0, 0, 1],
  ['sinc(x - v*t)', 0, 0, 2],
  ['4 / ((x - 2*t)^2 + 1)', 0, 0, 2],
  ['2*sen(x - v*t) + sen(2*x - 2*v*t)', 0, 0, 1],
  ['-2 / (((x + 2*t - 6)^2) + 1)', 0, 3, 2],
  ['(2/3) * sen(3*x - 6*t)', Math.PI / 3, 0.1, 2],
  ['step(x - v*t)', 5, 1, 2],
  ['abs(sen(x - v*t))', 0, 0, 1],
];

let allPassed = true;
for (const [expr, x, t, v] of testCases) {
  const comp = MathEngine.compile(expr);
  const val = comp.fn(x, t, v);
  const ok = comp.valid && Number.isFinite(val);
  const status = ok ? 'OK' : 'FAIL';
  console.log(`  [${status}] ${expr.substring(0, 45).padEnd(47)} => ${val.toFixed(5)} (valid=${comp.valid})`);
  if (!ok) allPassed = false;
}

// ============== TEST 2: SUPERPOSICION ==============
console.log('\n=== TEST SUPERPOSICION ===');
const store = new WaveStore();
store.addWave({ rawExpr: 'sen(x - v*t)', v: 2, inSum: true });
store.addWave({ rawExpr: 'sen(x + v*t)', v: 2, inSum: true });

// Ondas estacionarias en x=pi/2, t=0 => y1=sen(pi/2)=1, y2=sen(pi/2)=1, sum=2
const x0 = Math.PI / 2;
const t0 = 0;
const y1 = store.waves[0].evaluate(x0, t0);
const y2 = store.waves[1].evaluate(x0, t0);
const res = store.evaluateResultant(x0, t0);
const sumExpected = y1 + y2;
const sumOk = Math.abs(res - sumExpected) < 1e-9;
console.log(`  [${sumOk ? 'OK' : 'FAIL'}] Onda estacionaria: y1=${y1.toFixed(4)}, y2=${y2.toFixed(4)}, sum=${res.toFixed(4)} (esperado=${sumExpected.toFixed(4)})`);
if (!sumOk) allPassed = false;

// Principio de exclusion: inSum = false
store.waves[1].inSum = false;
const resExcluded = store.evaluateResultant(x0, t0);
const excludeOk = Math.abs(resExcluded - y1) < 1e-9;
console.log(`  [${excludeOk ? 'OK' : 'FAIL'}] Excluir onda 2 del sum: resultante=${resExcluded.toFixed(4)} (esperado=${y1.toFixed(4)})`);
if (!excludeOk) allPassed = false;
store.waves[1].inSum = true;

// Test inspection point
const insp = store.inspectAt(x0, t0);
const inspOk = insp.components.length === 2 && Number.isFinite(insp.resultantValue);
console.log(`  [${inspOk ? 'OK' : 'FAIL'}] Inspector en x=${x0.toFixed(2)}: ${insp.components.length} componentes, y_total=${insp.resultantValue.toFixed(4)}`);
if (!inspOk) allPassed = false;

// ============== TEST 3: PRESETS DIDACTICOS ==============
console.log('\n=== TEST PRESETS DIDACTICOS ===');
for (const preset of DIDACTIC_PRESETS) {
  const s = new WaveStore();
  for (const w of preset.waves) s.addWave(w);
  const val0 = s.evaluateResultant(0, 0);
  const val1 = s.evaluateResultant(1, 0.5);
  const ok = Number.isFinite(val0) && Number.isFinite(val1);
  console.log(`  [${ok ? 'OK' : 'FAIL'}] "${preset.title.substring(0, 45)}" => y(0,0)=${val0.toFixed(4)}, y(1,0.5)=${val1.toFixed(4)}`);
  if (!ok) allPassed = false;
}

// ============== TEST 4: LATEX ==============
console.log('\n=== TEST LATEX OUTPUT ===');
const latexTests = [
  '2 * sen(x - v*t)',
  '2 / (((x - v * t)^4) + 1)',
  'exp(-((x - v*t)/2)^2)',
  '3*cos(2*pi*x - 4*t)'
];
for (const expr of latexTests) {
  const res = MathEngine.compile(expr);
  console.log(`  ${expr.substring(0, 35).padEnd(37)} => ${res.latex}`);
}

// ============== TEST 5: VALIDACIÓN DEL CUADERNO UNIVERSITARIO ==============
console.log('\n=== TEST CUADERNO UNIVERSITARIO (UNIDADES Y 10 PASOS) ===');
import { UNITS, GLOSSARY_TERMS, BIBLIOGRAPHY_APA7 } from './js/notebook-content.js';
import { MINDMAP_DATA } from './js/mindmap.js';
import { TIMELINE_EVENTS } from './js/timeline.js';

// Validar 12 Unidades
const unitsOk = UNITS.length === 12;
console.log(`  [${unitsOk ? 'OK' : 'FAIL'}] Total de unidades = ${UNITS.length} (esperado 12)`);
if (!unitsOk) allPassed = false;

// Validar que cada unidad tenga su ejercicio con los 10 pasos obligatorios
let exercises10StepsOk = true;
UNITS.forEach(u => {
  const ex = u.exercise;
  if (!ex || !ex.steps || ex.steps.length !== 10) {
    console.log(`  [FAIL] Unidad ${u.number} (${u.title}) no tiene 10 pasos en su ejercicio resuelto!`);
    exercises10StepsOk = false;
  } else {
    // Validar numeración secuencial de los 10 pasos
    const stepsNumbered = ex.steps.every((st, idx) => st.num === idx + 1);
    if (!stepsNumbered) {
      console.log(`  [FAIL] Pasos no numerados 1 a 10 en unidad ${u.number}`);
      exercises10StepsOk = false;
    }
  }
});
console.log(`  [${exercises10StepsOk ? 'OK' : 'FAIL'}] Los 12 ejercicios resueltos cumplen estrictamente con los 10 pasos obligatorios`);
if (!exercises10StepsOk) allPassed = false;

// Validar Glosario (al menos 30 términos)
const glossaryOk = GLOSSARY_TERMS.length >= 30;
console.log(`  [${glossaryOk ? 'OK' : 'FAIL'}] Glosario de términos científicos = ${GLOSSARY_TERMS.length} (mínimo 30)`);
if (!glossaryOk) allPassed = false;

// Validar Bibliografía APA 7
const biblioOk = BIBLIOGRAPHY_APA7.length >= 5;
console.log(`  [${biblioOk ? 'OK' : 'FAIL'}] Bibliografía APA 7 = ${BIBLIOGRAPHY_APA7.length} fuentes académicas`);
if (!biblioOk) allPassed = false;

// Validar Mapa Mental y Línea de Tiempo
const mindmapOk = MINDMAP_DATA && MINDMAP_DATA.children && MINDMAP_DATA.children.length >= 10;
const timelineOk = TIMELINE_EVENTS && TIMELINE_EVENTS.length >= 10;
console.log(`  [${mindmapOk ? 'OK' : 'FAIL'}] Nodos principales del Mapa Mental = ${MINDMAP_DATA.children.length}`);
console.log(`  [${timelineOk ? 'OK' : 'FAIL'}] Hitos de la Línea de Tiempo = ${TIMELINE_EVENTS.length}`);
if (!mindmapOk || !timelineOk) allPassed = false;

console.log('\n=== RESULTADO FINAL ===');
console.log(allPassed ? 'TODAS LAS PRUEBAS PASARON EXITOSAMENTE (100% OK)' : 'Algunas pruebas FALLARON');
process.exit(allPassed ? 0 : 1);

