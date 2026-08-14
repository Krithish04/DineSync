/**
 * Synthesizes clear, high-volume audio chime and bell notifications using Web Audio API.
 * Guaranteed to play cleanly across modern browsers at maximum volume without external file dependencies.
 */

// 1. Staff Assistance Alert (Loud Double Service Bell)
export const playStaffAlertSound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(1.0, ctx.currentTime); // Maximum volume boost
    masterGain.connect(ctx.destination);

    // Chime 1 (D5 - 587.33 Hz + 2nd Harmonic)
    [587.33, 1174.66].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(idx === 0 ? 0.9 : 0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    });

    // Chime 2 (A5 - 880 Hz + 2nd Harmonic)
    [880, 1760].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(idx === 0 ? 1.0 : 0.5, ctx.currentTime + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.75);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(ctx.currentTime + 0.18);
      osc.stop(ctx.currentTime + 0.75);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[SoundAlert] Staff audio alert error:', err);
  }
};

// 2. Kitchen New Order Alert (High-Volume Kitchen Order Bell / Loud Ding-Ding)
export const playKitchenAlertSound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(1.0, ctx.currentTime); // Maximum volume boost
    masterGain.connect(ctx.destination);

    // Strike 1 (E5 - 659.25 Hz + Bell Harmonics)
    [659.25, 1318.5, 1845.9].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      const vol = idx === 0 ? 1.0 : idx === 1 ? 0.5 : 0.25;
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    });

    // Strike 2 (High B5 - 987.77 Hz + Bell Harmonics)
    [987.77, 1975.54, 2765.7].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      const vol = idx === 0 ? 1.0 : idx === 1 ? 0.5 : 0.25;
      gain.gain.setValueAtTime(vol, ctx.currentTime + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.95);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(ctx.currentTime + 0.2);
      osc.stop(ctx.currentTime + 0.95);
    });

    // Optional Echo Strike 3 for maximum kitchen audibility
    setTimeout(() => {
      try {
        const ctx2 = new AudioCtx();
        const mg2 = ctx2.createGain();
        mg2.gain.setValueAtTime(1.0, ctx2.currentTime);
        mg2.connect(ctx2.destination);
        const osc = ctx2.createOscillator();
        const gain = ctx2.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 987.77;
        gain.gain.setValueAtTime(0.9, ctx2.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 0.7);
        osc.connect(gain);
        gain.connect(mg2);
        osc.start(ctx2.currentTime);
        osc.stop(ctx2.currentTime + 0.7);
      } catch (e) {}
    }, 450);

  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[SoundAlert] Kitchen audio alert error:', err);
  }
};

// 3. Bill Settlement Alert (Loud Ascending Major Arpeggio Chime)
export const playBillSettledAlertSound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(1.0, ctx.currentTime); // Maximum volume boost
    masterGain.connect(ctx.destination);

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + index * 0.08;

      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.85, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[SoundAlert] Bill settlement audio alert error:', err);
  }
};

