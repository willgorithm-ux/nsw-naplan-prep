// src/sound.js - Sound effects using Web Audio API

let audioContext = null;
let soundEnabled = true;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

export async function initSound() {
  const storage = globalThis.__NAPLAN_STORAGE__;
  if (storage) {
    const settings = await storage.getSettings();
    soundEnabled = settings?.soundOn !== false;
  }
}

export function setSoundEnabled(enabled) {
  soundEnabled = enabled;
}

export function isSoundEnabled() {
  return soundEnabled;
}

function playTone(frequency, duration, type = 'sine', volume = 0.3) {
  if (!soundEnabled) return;
  
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn('Audio playback failed:', e);
  }
}

export function playCorrectSound() {
  // Happy ascending tone
  playTone(523.25, 0.15, 'sine', 0.3); // C5
  setTimeout(() => playTone(659.25, 0.15, 'sine', 0.3), 100); // E5
  setTimeout(() => playTone(783.99, 0.2, 'sine', 0.3), 200); // G5
}

export function playWrongSound() {
  // Sad descending tone
  playTone(311.13, 0.2, 'sine', 0.3); // Eb4
  setTimeout(() => playTone(277.18, 0.3, 'sine', 0.3), 150); // C#4
}

export function playClickSound() {
  // Short click
  playTone(800, 0.05, 'square', 0.1);
}

export function playGemSound() {
  // Sparkly sound
  playTone(1200, 0.1, 'sine', 0.2);
  setTimeout(() => playTone(1600, 0.1, 'sine', 0.2), 50);
  setTimeout(() => playTone(2000, 0.15, 'sine', 0.2), 100);
}

export function playLevelUpSound() {
  // Triumphant ascending arpeggio
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, 'sine', 0.3), i * 120);
  });
}

export function playTickSound() {
  // Soft tick for countdown
  playTone(440, 0.05, 'sine', 0.1);
}
