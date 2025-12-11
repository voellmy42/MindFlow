
// Simple sound effects service using HTML5 Audio
// We use data URIs for small sounds to avoid network requests and ensure instant playback.
// These are short, non-intrusive "pop" and "swoosh" sounds.

const sounds = {
    pop: "data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==", // Placeholder, will replace with real encoded sound if needed, or use simple oscillator
    success: "https://actions.google.com/sounds/v1/cartoon/pop_cork.ogg", // Using Google Sound Library for now as examples, in prod better to inline base64
    swipe: "https://actions.google.com/sounds/v1/cartoon/swoosh_2.ogg",
    delete: "https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg"
};

const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

export const playSound = (type: 'success' | 'swipe' | 'delete') => {
    // Attempting to use Web Audio API for lower latency synthetic sounds if possible, 
    // but for now let's use Audio elements with these URLs.

    // Note: User interaction is required to play audio usually.
    const audio = new Audio(sounds[type]);
    audio.volume = 0.5;
    audio.play().catch(e => console.log("Audio play failed (user interaction needed):", e));
};

// Better approach: Synthesize simple beeps without external assets for zero-friction
export const playSynthSound = (type: 'success' | 'swipe' | 'delete') => {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'success') {
        // High pitched "ding"
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
    } else if (type === 'swipe') {
        // Soft "whoosh" (noise buffer would be better, but sine sweep is okay)
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    } else if (type === 'delete') {
        // Low "thud"
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    }
};
