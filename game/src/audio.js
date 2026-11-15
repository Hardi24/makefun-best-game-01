// Procedural WebAudio sounds: no audio files, no network. Every effect is
// a short oscillator or noise burst shaped by an envelope. The context is
// created lazily on the first user gesture (browsers block audio before
// that) and every call is guarded, so headless runs never throw.
export function makeAudio() {
  return { ctx: null, muted: false, master: null };
}

function ensure(audio) {
  if (audio.ctx) return audio.ctx;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audio.ctx = new Ctx();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.35;
    audio.master.connect(audio.ctx.destination);
  } catch {
    audio.ctx = null;
  }
  return audio.ctx;
}

export function unlockAudio(audio) {
  const ctx = ensure(audio);
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

export function toggleMute(audio) {
  audio.muted = !audio.muted;
  if (audio.master) audio.master.gain.value = audio.muted ? 0 : 0.35;
  return audio.muted;
}

function tone(audio, freq, dur, type, vol, slideTo) {
  const ctx = ensure(audio);
  if (!ctx || audio.muted) return;
  try {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch { /* audio must never break the game */ }
}

function noise(audio, dur, vol, lowpass) {
  const ctx = ensure(audio);
  if (!ctx || audio.muted) return;
  try {
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt);
    filt.connect(gain);
    gain.connect(audio.master);
    src.start(t0);
  } catch { /* audio must never break the game */ }
}

export const sfx = {
  pickup(audio, combo) {
    tone(audio, 520 + combo * 60, 0.12, 'sine', 0.25, 880 + combo * 60);
  },
  shoot(audio) {
    tone(audio, 740, 0.09, 'triangle', 0.2, 320);
  },
  wispDown(audio) {
    tone(audio, 220, 0.18, 'sawtooth', 0.16, 60);
    noise(audio, 0.12, 0.1, 900);
  },
  hit(audio) {
    tone(audio, 140, 0.22, 'sawtooth', 0.3, 55);
    noise(audio, 0.18, 0.22, 500);
  },
  dash(audio) {
    noise(audio, 0.16, 0.16, 2400);
  },
  waveHorn(audio) {
    tone(audio, 196, 0.7, 'triangle', 0.22, 196);
    tone(audio, 294, 0.7, 'triangle', 0.14, 294);
  },
  heraldHorn(audio) {
    tone(audio, 98, 1.1, 'sawtooth', 0.24, 98);
    tone(audio, 147, 1.1, 'sawtooth', 0.16, 147);
  },
  upgrade(audio) {
    tone(audio, 523, 0.1, 'sine', 0.22);
    setTimeout(() => tone(audio, 659, 0.1, 'sine', 0.22), 90);
    setTimeout(() => tone(audio, 784, 0.16, 'sine', 0.22), 180);
  },
  victory(audio) {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => tone(audio, f, 0.3, 'sine', 0.22), i * 130);
    });
  },
  defeat(audio) {
    [392, 330, 262, 196].forEach((f, i) => {
      setTimeout(() => tone(audio, f, 0.35, 'triangle', 0.2), i * 160);
    });
  },
};
