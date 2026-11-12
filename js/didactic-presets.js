/**
 * Experiencia Didáctica: Presets de Simulación de Ondas y Superposición
 * Diseñados para clases de física con fundamentación rigurosa,
 * preguntas orientadoras para inducir la predicción y análisis conceptual.
 */

export const DIDACTIC_PRESETS = [
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
