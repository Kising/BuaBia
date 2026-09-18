import { clamp, randomBetween } from "../random.js";

export class BobingAudio {
  constructor({ enabled = true } = {}) {
    this.enabled = enabled;
    this.context = null;
    this.activeVoices = 0;
    this.maxVoices = 9;
    this.lastHitAt = 0;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled && this.context) {
      this.context.suspend();
      return;
    }
    if (enabled && this.context?.state === "suspended") {
      this.context.resume();
    }
  }

  async unlock() {
    if (!this.enabled) return;
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext();
    }
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  playStartChime() {
    if (!this.enabled || !this.context) return;
    this.playCeramicHit({ intensity: 0.55, pan: 0, pitch: 1.18, force: true });
    window.setTimeout(() => this.playCeramicHit({ intensity: 0.38, pan: -0.18, pitch: 1.36, force: true }), 80);
  }

  playCeramicHit({ intensity = 0.5, pan = 0, pitch = 1, force = false } = {}) {
    if (!this.enabled || !this.context) return;
    const nowMs = performance.now();
    if (!force && nowMs - this.lastHitAt < 28) return;
    if (this.activeVoices >= this.maxVoices) return;

    this.lastHitAt = nowMs;
    this.activeVoices += 1;

    const ctx = this.context;
    const now = ctx.currentTime;
    const safeIntensity = clamp(intensity, 0.08, 1);
    const output = ctx.createGain();
    const panner = ctx.createStereoPanner();
    const filter = ctx.createBiquadFilter();
    const body = ctx.createOscillator();
    const ping = ctx.createOscillator();
    const noise = ctx.createBufferSource();

    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / data.length, 2.4);
    }
    noise.buffer = noiseBuffer;

    body.type = "sine";
    body.frequency.setValueAtTime(520 * pitch * randomBetween(0.94, 1.08), now);
    body.frequency.exponentialRampToValueAtTime(260 * pitch, now + 0.12);

    ping.type = "triangle";
    ping.frequency.setValueAtTime(1460 * pitch * randomBetween(0.9, 1.14), now);
    ping.frequency.exponentialRampToValueAtTime(780 * pitch, now + 0.08);

    filter.type = "bandpass";
    filter.frequency.value = 2400 * randomBetween(0.88, 1.15);
    filter.Q.value = 7;

    output.gain.setValueAtTime(0.0001, now);
    output.gain.exponentialRampToValueAtTime(0.16 * safeIntensity, now + 0.006);
    output.gain.exponentialRampToValueAtTime(0.0001, now + randomBetween(0.11, 0.18));

    panner.pan.value = clamp(pan, -0.65, 0.65);

    body.connect(output);
    ping.connect(output);
    noise.connect(filter);
    filter.connect(output);
    output.connect(panner);
    panner.connect(ctx.destination);

    body.start(now);
    ping.start(now);
    noise.start(now);
    body.stop(now + 0.18);
    ping.stop(now + 0.14);
    noise.stop(now + 0.08);

    window.setTimeout(() => {
      body.disconnect();
      ping.disconnect();
      noise.disconnect();
      filter.disconnect();
      output.disconnect();
      panner.disconnect();
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    }, 240);
  }
}
