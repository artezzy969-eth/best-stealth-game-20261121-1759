// audio.js — WebAudio-only sound for "Night Shift".
// No audio files, no network: every sound is synthesized with
// oscillators and filtered noise at run time. All sound goes through
// one master gain so the game can mute with a single call.
//
// Autoplay policy: browsers block audio before a user gesture. Nothing
// here creates or resumes an AudioContext on its own — the game calls
// initAudio() from a real user gesture (first keydown / click / the
// Start button). Until then playSound() is a silent no-op, and every
// public function is safe to call before init.
//
// B2's engine / input wiring: call initAudio() on the first gesture,
// then playSound('footstep' | 'runstep' | 'suspicious' | 'alert' |
// 'pickup' | 'win' | 'caught' | 'click') at the matching game events.
// startAmbient() / stopAmbient() control the low room hum; call
// startAmbient() right after initAudio() on the start screen.

export const SOUND_NAMES = [
  'footstep',
  'runstep',
  'suspicious',
  'alert',
  'pickup',
  'win',
  'caught',
  'click',
];

let audioCtx = null;
let masterGain = null;
let ambientNodes = null;
let muted = false;
let lastFootstepAt = 0;
let footstepSide = 0; // 0 = left foot, 1 = right foot; alternates each step.

// --- setup -----------------------------------------------------------------

export function initAudio() {
  try {
    if (!audioCtx) {
      const Ctor =
        window.AudioContext ||
        window.webkitAudioContext;
      if (!Ctor) return false;
      audioCtx = new Ctor();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = muted ? 0 : 0.5;
      masterGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    return audioCtx.state === 'running';
  } catch {
    return false;
  }
}

export function isAudioReady() {
  return !!audioCtx && audioCtx.state === 'running';
}

export function setMuted(value) {
  muted = !!value;
  if (masterGain && audioCtx) {
    masterGain.gain.setTargetAtTime(muted ? 0 : 0.5, audioCtx.currentTime, 0.02);
  }
}

export function isMuted() {
  return muted;
}

// --- tiny synth helpers -----------------------------------------------------

function tone({ freq = 440, freqEnd = null, type = 'sine', dur = 0.15, vol = 0.2, delay = 0 }) {
  if (!audioCtx || !masterGain) return;
  const t0 = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
  }
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// Short burst of filtered noise: footsteps, rustles, thuds.
function noiseBurst({ dur = 0.07, vol = 0.12, freq = 900, type = 'lowpass', delay = 0 }) {
  if (!audioCtx || !masterGain) return;
  const t0 = audioCtx.currentTime + delay;
  const len = Math.max(1, Math.floor(audioCtx.sampleRate * dur));
  const buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) {
    // Fade the burst out so it sounds like a tap, not a click.
    data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  src.start(t0);
}

// --- the sounds ---------------------------------------------------------------

function playFootstep(running) {
  // Throttle: at most one tick every 90 ms so a held key cannot stack
  // dozens of overlapping bursts.
  const now = performance.now();
  if (now - lastFootstepAt < 90) return;
  lastFootstepAt = now;
  // The two feet land a touch differently: alternate the filter pitch
  // so steps never sound like one identical tick repeated.
  footstepSide = 1 - footstepSide;
  const freq = (running ? 700 : 1100) * (footstepSide ? 1.12 : 0.9);
  noiseBurst({
    dur: running ? 0.09 : 0.06,
    vol: running ? 0.22 : 0.1,
    freq,
  });
}

function playSuspicious() {
  // One short questioning blip: up a minor third, then back.
  tone({ freq: 620, freqEnd: 780, type: 'triangle', dur: 0.12, vol: 0.16 });
  tone({ freq: 780, freqEnd: 620, type: 'triangle', dur: 0.12, vol: 0.12, delay: 0.12 });
}

function playAlert() {
  // Rising sting: two-note alarm that climbs and holds.
  tone({ freq: 330, freqEnd: 660, type: 'sawtooth', dur: 0.28, vol: 0.14 });
  tone({ freq: 495, freqEnd: 990, type: 'square', dur: 0.28, vol: 0.07, delay: 0.05 });
  tone({ freq: 660, freqEnd: 660, type: 'sawtooth', dur: 0.18, vol: 0.1, delay: 0.3 });
}

function playPickup() {
  // Bright two-note chime, major third up.
  tone({ freq: 880, type: 'sine', dur: 0.12, vol: 0.18 });
  tone({ freq: 1174, type: 'sine', dur: 0.22, vol: 0.18, delay: 0.09 });
}

function playWin() {
  // Little four-note jingle: C E G C, unhurried.
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    tone({ freq, type: 'triangle', dur: 0.3, vol: 0.18, delay: i * 0.13 });
  });
}

function playCaught() {
  // Low descending sting: the run is over.
  tone({ freq: 220, freqEnd: 55, type: 'sawtooth', dur: 0.6, vol: 0.2 });
  tone({ freq: 110, freqEnd: 55, type: 'square', dur: 0.6, vol: 0.1, delay: 0.05 });
  noiseBurst({ dur: 0.25, vol: 0.18, freq: 300, delay: 0.05 });
}

// --- public API ---------------------------------------------------------------

export function playSound(name) {
  if (!isAudioReady() || muted) return;
  switch (name) {
    case 'footstep':
      playFootstep(false);
      break;
    case 'runstep':
      playFootstep(true);
      break;
    case 'suspicious':
      playSuspicious();
      break;
    case 'alert':
      playAlert();
      break;
    case 'pickup':
      playPickup();
      break;
    case 'win':
      playWin();
      break;
    case 'caught':
      playCaught();
      break;
    case 'click':
      tone({ freq: 1200, type: 'sine', dur: 0.05, vol: 0.1 });
      break;
    default:
      break;
  }
}

// Low room hum + faint airy shimmer, looped until stopAmbient().
// Built from two detuned low oscillators through a lowpass filter so
// it sits under the game instead of competing with it.
export function startAmbient() {
  if (!isAudioReady() || ambientNodes) return;
  try {
    const gain = audioCtx.createGain();
    gain.gain.value = 0.035;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 240;
    const oscA = audioCtx.createOscillator();
    oscA.type = 'sine';
    oscA.frequency.value = 55;
    const oscB = audioCtx.createOscillator();
    oscB.type = 'sine';
    oscB.frequency.value = 55.7;
    const lfo = audioCtx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.08;
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    oscA.start();
    oscB.start();
    lfo.start();
    ambientNodes = { gain, oscA, oscB, lfo };
  } catch {
    ambientNodes = null;
  }
}

export function stopAmbient() {
  if (!ambientNodes || !audioCtx) return;
  try {
    const { gain, oscA, oscB, lfo } = ambientNodes;
    gain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
    const stopAt = audioCtx.currentTime + 0.5;
    oscA.stop(stopAt);
    oscB.stop(stopAt);
    lfo.stop(stopAt);
  } catch {
    // Already stopped; nothing to clean up.
  }
  ambientNodes = null;
}
