let audioCtx = null;

function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Menghasilkan suara gesekan & kibasan lembar kertas buku secara realistis offline
export function playPageFlipSound(muted = false) {
  if (muted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.28;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);

    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink-ish noise untuk tekstur serat kertas yang hangat, bukan desis kasar
      data[i] = (lastOut + 0.08 * white) / 1.08;
      lastOut = data[i];
      data[i] *= 2.4;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1100, now);
    bandpass.frequency.exponentialRampToValueAtTime(2400, now + 0.12);
    bandpass.frequency.exponentialRampToValueAtTime(850, now + duration);
    bandpass.Q.value = 1.1;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.17);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  } catch {
    // Abaikan jika browser/WebView belum membuka konteks audio
  }
}
