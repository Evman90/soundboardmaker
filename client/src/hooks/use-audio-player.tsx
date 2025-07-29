import { useState, useRef, useCallback } from "react";

export function useAudioPlayer() {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = useCallback((url: string, id: number, volume: number = 1) => {
    // Stop any currently playing sound
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Create new audio element
    const audio = new Audio(url);
    audio.volume = Math.max(0, Math.min(1, volume));
    
    audio.addEventListener('ended', () => {
      setCurrentlyPlaying(null);
      audioRef.current = null;
    });

    audio.addEventListener('error', (e) => {
      console.error('Audio playback error:', e);
      setCurrentlyPlaying(null);
      audioRef.current = null;
    });

    // Play the audio
    audio.play().then(() => {
      audioRef.current = audio;
      setCurrentlyPlaying(id);
    }).catch((error) => {
      console.error('Failed to play sound:', error);
    });
  }, []);

  const stopSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setCurrentlyPlaying(null);
  }, []);

  const stopAllSounds = useCallback(() => {
    stopSound();
  }, [stopSound]);

  return {
    currentlyPlaying,
    playSound,
    stopSound,
    stopAllSounds,
  };
}
