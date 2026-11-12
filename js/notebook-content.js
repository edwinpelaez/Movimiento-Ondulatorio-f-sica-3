// notebook-content.js - Contenido Académico Completo del Cuaderno Virtual Universitario de Física 3
// Movimiento Ondulatorio

export const NOTEBOOK_METADATA = {
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

export const PRELIMINARY_SECTIONS = [
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

export const UNITS = [
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

export const GLOSSARY_TERMS = [
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

export const BIBLIOGRAPHY_APA7 = [
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
