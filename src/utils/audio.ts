// Web Audio API を用いたマイルドなゲーム内SEシンセサイザー

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * 優しいキー打鍵音 (コッ、という木のキーボードのような短い打鍵音)
 */
export function playKeySound(enabled: boolean) {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.05);

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch (e) {
    console.warn('Audio play error:', e);
  }
}

/**
 * 正解音 (ピロリーンという明るい上昇和音)
 */
export function playCorrectWordSound(enabled: boolean) {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const playNote = (freq: number, delay: number, duration: number, volume: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      
      gainNode.gain.setValueAtTime(0, now + delay);
      gainNode.gain.linearRampToValueAtTime(volume, now + delay + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(now + delay);
      osc.stop(now + delay + duration);
    };

    // ドミソの上昇和音
    playNote(523.25, 0.0, 0.25, 0.1);    // C5
    playNote(659.25, 0.07, 0.25, 0.1);   // E5
    playNote(783.99, 0.14, 0.35, 0.12);  // G5
    playNote(1046.50, 0.21, 0.45, 0.12); // C6
  } catch (e) {
    console.warn('Audio play error:', e);
  }
}

/**
 * ミス音 (少し低めのマイルドな警告音)
 */
export function playMistakeSound(enabled: boolean) {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sawtooth'; // 鋸歯状波を少し丸める
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(140, ctx.currentTime + 0.15);

    // バンドパスフィルターで耳に痛くないようにする
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, ctx.currentTime);
    filter.Q.setValueAtTime(1, ctx.currentTime);

    gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch (e) {
    console.warn('Audio play error:', e);
  }
}

/**
 * ゲームオーバー音 (少し寂しい下降音)
 */
export function playGameOverSound(enabled: boolean) {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const playNote = (freq: number, delay: number, duration: number, volume: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + delay);
      osc.frequency.linearRampToValueAtTime(freq - 40, now + delay + duration);
      
      gainNode.gain.setValueAtTime(volume, now + delay);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(now + delay);
      osc.stop(now + delay + duration);
    };

    playNote(392.00, 0.0, 0.3, 0.12);  // G4
    playNote(349.23, 0.2, 0.3, 0.12);  // F4
    playNote(311.13, 0.4, 0.4, 0.12);  // Eb4
    playNote(261.63, 0.6, 0.6, 0.15);  // C4
  } catch (e) {
    console.warn('Audio play error:', e);
  }
}
