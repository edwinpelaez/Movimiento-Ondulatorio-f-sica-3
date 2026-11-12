/**
 * doppler-audio.js
 * Módulo de Sonificación Acústica Avanzada con Web Audio API.
 * 
 * Implementa:
 * 1. Pulsos de llegada (Clicks / Beeps en cada recepción de frente de onda).
 * 2. Comparación tonal (Tono continuo modulado por el corrimiento Doppler fo/fe).
 * 3. Sonificación ilustrativa del estampido sónico (envolvente Mach).
 * 4. Control de volumen, silencio y cancelación inmediata al pausar/buscar.
 */

export class DopplerAudio {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.isEnabled = false;
    this.volume = 0.5;
    this.mode = 'pulses'; // 'pulses' | 'continuous'
    
    // Tono continuo
    this.continuousOsc = null;
    this.continuousGain = null;
    this.basePitch = 440; // Frecuencia audible base (Hz) - Tono La4
    this.isPlayingContinuous = false;
  }

  // Inicialización bajo gesto de usuario (política de navegadores)
  ensureContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('Web Audio API no soportada en este navegador.');
        return false;
      }
      this.audioCtx = new AudioContextClass();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
      this.masterGain.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return true;
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (enabled) {
      this.ensureContext();
      if (this.mode === 'continuous') {
        this.startContinuousTone();
      }
    } else {
      this.stopAll();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.audioCtx.currentTime, 0.03);
    }
  }

  setMode(mode) {
    if (this.mode === mode) return;
    this.stopAll();
    this.mode = mode;
    if (this.isEnabled && this.mode === 'continuous') {
      this.startContinuousTone();
    }
  }

  // Disparo de pulso breve al recibir un frente
  triggerArrivalPulse(freqRatio = 1.0) {
    if (!this.isEnabled || this.mode !== 'pulses') return;
    if (!this.ensureContext()) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      // Frecuencia del beep didáctico adaptada a la tasa de compresión
      const pitch = Math.max(200, Math.min(2500, 880 * Math.pow(freqRatio, 0.5)));
      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, now);

      // Envolvente suave para evitar clicks espurios
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.4, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      // Ignorar errores transitorios de audio
    }
  }

  playArrivalPulse(waveId, freqRatio = 1.0) {
    this.triggerArrivalPulse(freqRatio);
  }

  // Inicio de tono continuo
  startContinuousTone() {
    if (!this.isEnabled || this.isPlayingContinuous) return;
    if (!this.ensureContext()) return;

    try {
      const now = this.audioCtx.currentTime;
      this.continuousOsc = this.audioCtx.createOscillator();
      this.continuousGain = this.audioCtx.createGain();

      this.continuousOsc.type = 'triangle';
      this.continuousOsc.frequency.setValueAtTime(this.basePitch, now);

      this.continuousGain.gain.setValueAtTime(0.0001, now);
      this.continuousGain.gain.exponentialRampToValueAtTime(0.3, now + 0.05);

      this.continuousOsc.connect(this.continuousGain);
      this.continuousGain.connect(this.masterGain);

      this.continuousOsc.start(now);
      this.isPlayingContinuous = true;
    } catch (e) {
      console.warn('Error al iniciar tono continuo:', e);
    }
  }

  // Modulación en tiempo real del tono continuo
  updateContinuousPitch(freqRatio) {
    if (!this.isPlayingContinuous || !this.continuousOsc || !this.audioCtx) return;
    if (!Number.isFinite(freqRatio) || freqRatio <= 0) return;

    // Limitar tono audible a rango cómodo y seguro [60 Hz, 3500 Hz]
    const targetFreq = Math.max(60, Math.min(3500, this.basePitch * freqRatio));
    this.continuousOsc.frequency.setTargetAtTime(targetFreq, this.audioCtx.currentTime, 0.04);
  }

  // Sonificación ilustrativa del frente de choque Mach
  triggerSonicBoom() {
    if (!this.isEnabled) return;
    if (!this.ensureContext()) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      // Golpe grave con caída de frecuencia
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.6, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {}
  }

  // Detener toda reproducción de audio de forma segura
  stopAll() {
    if (this.continuousOsc) {
      try {
        if (this.audioCtx) {
          const now = this.audioCtx.currentTime;
          this.continuousGain?.gain.setTargetAtTime(0.0001, now, 0.02);
          this.continuousOsc.stop(now + 0.03);
        } else {
          this.continuousOsc.stop();
        }
      } catch (e) {}
      this.continuousOsc = null;
      this.continuousGain = null;
      this.isPlayingContinuous = false;
    }
  }
}
