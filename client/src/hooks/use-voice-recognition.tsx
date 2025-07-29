import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAudioPlayer } from "./use-audio-player";
import type { TriggerWord, SoundClip, Settings } from "@shared/schema";

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  start(): void;
  stop(): void;
  onstart?: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export function useVoiceRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [audioLevel, setAudioLevel] = useState(-42);
  const [isSupported, setIsSupported] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const triggerCooldownRef = useRef<Set<string>>(new Set());
  const wordCountRef = useRef<number>(0);
  const { playSound } = useAudioPlayer();

  const { data: triggerWords = [] } = useQuery<TriggerWord[]>({
    queryKey: ["/api/trigger-words"],
  });

  const { data: soundClips = [] } = useQuery<SoundClip[]>({
    queryKey: ["/api/sound-clips"],
  });

  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const supported = !!SpeechRecognition;
    
    // Detect mobile devices
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    setIsSupported(supported);
    
    if (!supported) {
      if (isMobile) {
        setErrorMessage("Voice recognition has limited support on mobile devices. Works best on desktop Chrome or Edge.");
      } else {
        setErrorMessage("Speech recognition not supported in this browser. Use Chrome or Edge for best results.");
      }
    } else if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage("Microphone access not available. Please check browser permissions.");
    } else if (isAndroid) {
      setErrorMessage("Voice recognition may have limited functionality on Android. For best results, use desktop Chrome or Edge.");
    } else {
      setErrorMessage("");
    }
    
    console.log("Voice recognition support:", supported);
    console.log("Is mobile device:", isMobile);
    console.log("Is Android:", isAndroid);
    console.log("User agent:", navigator.userAgent);
  }, []);

  const initializeAudioAnalyzer = useCallback(async () => {
    try {
      console.log("Requesting microphone access...");
      
      // Detect mobile for optimized audio settings
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Get mic sensitivity from localStorage (0-100, default 100 for maximum)
      const micSensitivity = parseInt(localStorage.getItem('micSensitivity') || '100', 10);
      const useMaxSensitivity = micSensitivity >= 80; // Use max settings when >= 80%
      
      const audioConstraints = {
        echoCancellation: !useMaxSensitivity, // Disabled for high sensitivity
        noiseSuppression: !useMaxSensitivity, // Disabled for high sensitivity  
        autoGainControl: !useMaxSensitivity, // Disabled for high sensitivity
        // Adaptive settings based on sensitivity
        ...(isMobile ? {
          sampleRate: useMaxSensitivity ? 44100 : 16000,
          channelCount: 1, // Mono audio for better mobile performance
          latency: useMaxSensitivity ? 0.05 : 0.2
        } : {
          sampleRate: useMaxSensitivity ? 48000 : 24000,
          channelCount: useMaxSensitivity ? 2 : 1,
          latency: useMaxSensitivity ? 0.01 : 0.1
        })
      };
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: audioConstraints
      });
      streamRef.current = stream;
      console.log("Microphone access granted with mobile optimizations:", isMobile);

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      // Adaptive settings based on mic sensitivity
      analyser.fftSize = useMaxSensitivity ? 2048 : 1024; // Higher resolution for high sensitivity
      analyser.smoothingTimeConstant = useMaxSensitivity ? 0.1 : 0.3; // Lower smoothing for high sensitivity
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const updateAudioLevel = () => {
        if (!analyser) return;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const db = 20 * Math.log10(average / 255) || -60;
        setAudioLevel(Math.max(db, -60));

        if (isListening) {
          requestAnimationFrame(updateAudioLevel);
        }
      };

      updateAudioLevel();
      setErrorMessage("");
    } catch (error: any) {
      console.error("Error accessing microphone:", error);
      if (error.name === 'NotAllowedError') {
        setErrorMessage("Microphone permission denied. Please allow microphone access and try again.");
      } else if (error.name === 'NotFoundError') {
        setErrorMessage("No microphone found. Please connect a microphone and try again.");
      } else {
        setErrorMessage(`Microphone error: ${error.message}`);
      }
      throw error;
    }
  }, [isListening]);

  const checkForTriggerWords = useCallback((text: string) => {
    const lowerText = text.toLowerCase();
    let triggerMatched = false;
    
    triggerWords.forEach((trigger) => {
      if (!trigger.enabled) return;
      
      const phrase = trigger.caseSensitive ? trigger.phrase : trigger.phrase.toLowerCase();
      const searchText = trigger.caseSensitive ? text : lowerText;
      
      if (searchText.includes(phrase)) {
        triggerMatched = true;
        
        // Implement cooldown to prevent rapid repeated triggers
        const cooldownKey = `${trigger.id}-${phrase}`;
        if (triggerCooldownRef.current.has(cooldownKey)) return;
        
        triggerCooldownRef.current.add(cooldownKey);
        setTimeout(() => {
          triggerCooldownRef.current.delete(cooldownKey);
        }, 2000); // 2 second cooldown
        
        // Get the next sound clip for this trigger (handles cycling through multiple clips)
        fetch(`/api/trigger-words/${trigger.id}/next-sound-clip`)
          .then(response => response.json())
          .then(data => {
            if (data.soundClipId) {
              const soundClip = soundClips.find(clip => clip.id === data.soundClipId);
              if (soundClip) {
                console.log("🎯 Trigger matched:", phrase, "-> Playing cycling sound:", soundClip.name);
                playSound(soundClip.url, soundClip.id, 0.75);
              }
            }
          })
          .catch(error => {
            console.error("Error getting next sound clip:", error);
            // Fallback: use first sound clip from soundClipIds array if API fails
            if (trigger.soundClipIds && trigger.soundClipIds.length > 0) {
              const soundClip = soundClips.find(clip => clip.id === trigger.soundClipIds[0]);
              if (soundClip) {
                console.log("🎯 Trigger matched:", phrase, "-> Playing fallback sound:", soundClip.name);
                playSound(soundClip.url, soundClip.id, 0.75);
              }
            }
          });
      }
    });

    // Check for default clips response if no triggers matched and speech was detected
    if (!triggerMatched && text.trim().length > 0) {
      const defaultClips = soundClips.filter(clip => clip.isDefault);
      
      if (defaultClips.length > 0) {
        const cooldownKey = "default-clips-response";
        if (!triggerCooldownRef.current.has(cooldownKey)) {
          triggerCooldownRef.current.add(cooldownKey);
          setTimeout(() => {
            triggerCooldownRef.current.delete(cooldownKey);
          }, 1000); // 1 second cooldown for faster responses

          // Play random default clip immediately
          const randomClip = defaultClips[Math.floor(Math.random() * defaultClips.length)];
          console.log("🔄 No trigger matched, playing random default clip:", randomClip.name);
          playSound(randomClip.url, randomClip.id, 0.75);
        }
      }
    }
  }, [triggerWords, soundClips, playSound, settings]);

  const startListening = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setErrorMessage("Speech recognition not supported in this browser");
      return false;
    }

    try {
      console.log("Starting voice recognition...");
      await initializeAudioAnalyzer();

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // Detect mobile for optimized speech recognition settings
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isAndroid = /Android/i.test(navigator.userAgent);
      
      // Mobile-optimized settings
      recognition.continuous = !isMobile; // Use non-continuous on mobile for better stability
      recognition.interimResults = true;
      recognition.lang = "en-US";
      
      // Android-specific optimizations
      if (isAndroid) {
        recognition.maxAlternatives = 1; // Reduce alternatives for better performance
        console.log("Applied Android-specific optimizations");
      }
      
      console.log("Speech recognition settings - Mobile:", isMobile, "Continuous:", recognition.continuous);

      recognition.onstart = () => {
        console.log("Speech recognition started");
        setErrorMessage("");
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const fullTranscript = finalTranscript || interimTranscript;
        setTranscript(fullTranscript);
        console.log("🎤 Speech detected:", fullTranscript);
        console.log("📝 Final transcript:", finalTranscript);
        console.log("⏳ Interim transcript:", interimTranscript);

        if (finalTranscript) {
          console.log("🔍 Checking for trigger words in:", finalTranscript);
          checkForTriggerWords(finalTranscript);
          
          // Count words and restart every 20 words to prevent timeout
          const words = finalTranscript.trim().split(/\s+/).filter(word => word.length > 0);
          wordCountRef.current += words.length;
          console.log(`📊 Word count: ${wordCountRef.current} (added ${words.length} words)`);
          
          // Restart recognition every 10 words to prevent stopping
          if (wordCountRef.current >= 10) {
            console.log("🔄 Restarting voice recognition after 10 words to prevent timeout");
            wordCountRef.current = 0; // Reset word count
            
            // Stop and restart recognition with a brief delay
            setTimeout(() => {
              if (isListening && recognitionRef.current === recognition) {
                try {
                  recognition.stop();
                  // The onend handler will automatically restart it
                } catch (e) {
                  console.error("Failed to restart recognition:", e);
                }
              }
            }, 100);
          }
          
          // Mobile optimization: provide haptic feedback when trigger words are detected
          if (isMobile && navigator.vibrate) {
            // Check if any trigger word was matched (simplified check)
            const lowerText = finalTranscript.toLowerCase();
            const hasMatch = triggerWords.some(trigger => 
              trigger.enabled && lowerText.includes(trigger.caseSensitive ? trigger.phrase : trigger.phrase.toLowerCase())
            );
            if (hasMatch) {
              navigator.vibrate(200); // Trigger detected vibration
            }
          }
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error, event);
        switch (event.error) {
          case "not-allowed":
            setErrorMessage("Microphone permission denied. Please allow microphone access.");
            setIsListening(false);
            break;
          case "no-speech":
            console.log("No speech detected, continuing to listen...");
            // Don't stop listening for no-speech, it's normal
            break;
          case "audio-capture":
            setErrorMessage("Audio capture failed. Check your microphone.");
            setIsListening(false);
            break;
          case "network":
            setErrorMessage("Network error. Check your internet connection.");
            setIsListening(false);
            break;
          case "aborted":
            console.log("Speech recognition was aborted, attempting to restart...");
            // Try to restart after a brief delay
            setTimeout(() => {
              if (isListening) {
                try {
                  recognition.start();
                  wordCountRef.current = 0; // Reset word count on abort restart
                } catch (e) {
                  console.error("Failed to restart after abort:", e);
                  setErrorMessage("Speech recognition stopped. If it stops responding, click Stop and Start again.");
                  setIsListening(false);
                }
              }
            }, 500);
            break;
          default:
            console.log(`Speech recognition error: ${event.error}, attempting to continue...`);
            // For other errors, try to continue unless critical
            if (event.error === "service-not-allowed" || event.error === "language-not-supported") {
              setErrorMessage(`Speech recognition error: ${event.error}`);
              setIsListening(false);
            }
        }
      };

      recognition.onend = () => {
        console.log("Speech recognition ended");
        
        // Only restart if we're still supposed to be listening and haven't been manually stopped
        if (isListening && recognitionRef.current === recognition) {
          console.log("Automatically restarting speech recognition to maintain continuous listening...");
          
          // Different restart strategies for mobile vs desktop
          const restartDelay = isMobile ? 300 : 100; // Minimal delay for fastest restart
          
          setTimeout(() => {
            // Double-check we should still be listening
            if (isListening && recognitionRef.current === recognition) {
              try {
                // Create new recognition instance to avoid any state issues
                const newRecognition = new SpeechRecognition();
                newRecognition.continuous = !isMobile;
                newRecognition.interimResults = true;
                newRecognition.lang = "en-US";
                
                if (isAndroid) {
                  newRecognition.maxAlternatives = 1;
                }
                
                // Copy all the event handlers
                newRecognition.onstart = recognition.onstart;
                newRecognition.onresult = recognition.onresult;
                newRecognition.onerror = recognition.onerror;
                newRecognition.onend = recognition.onend;
                
                newRecognition.start();
                recognitionRef.current = newRecognition;
                wordCountRef.current = 0; // Reset word count on restart
                console.log("Successfully restarted speech recognition");
              } catch (e) {
                console.error("Failed to restart recognition:", e);
                
                // Fallback retry with minimal delay
                const fallbackDelay = isMobile ? 500 : 200;
                setTimeout(() => {
                  if (isListening && recognitionRef.current === recognition) {
                    try {
                      const fallbackRecognition = new SpeechRecognition();
                      fallbackRecognition.continuous = !isMobile;
                      fallbackRecognition.interimResults = true;
                      fallbackRecognition.lang = "en-US";
                      
                      // Copy handlers again
                      fallbackRecognition.onstart = recognition.onstart;
                      fallbackRecognition.onresult = recognition.onresult;
                      fallbackRecognition.onerror = recognition.onerror;
                      fallbackRecognition.onend = recognition.onend;
                      
                      fallbackRecognition.start();
                      recognitionRef.current = fallbackRecognition;
                      wordCountRef.current = 0; // Reset word count on fallback restart
                      console.log("Fallback restart successful");
                    } catch (e2) {
                      console.error("Failed fallback restart:", e2);
                      setErrorMessage(isMobile 
                        ? "Voice recognition stopped. If it stops responding, tap Stop and Start again." 
                        : "Voice recognition stopped. If it stops responding, click Stop and Start again."
                      );
                      setIsListening(false);
                    }
                  }
                }, fallbackDelay);
              }
            }
          }, restartDelay);
        } else {
          console.log("Speech recognition ended - not restarting (manually stopped or different instance)");
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      wordCountRef.current = 0; // Reset word count when starting
      setIsListening(true);
      console.log("Voice recognition initialized successfully");
      return true;
    } catch (error: any) {
      console.error("Failed to start voice recognition:", error);
      setErrorMessage(`Failed to start: ${error.message}`);
      setIsListening(false);
      return false;
    }
  }, [isSupported, initializeAudioAnalyzer, checkForTriggerWords, isListening]);

  const stopListening = useCallback(() => {
    console.log("Stopping voice recognition...");
    
    // Stop speech recognition first
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log("Recognition already stopped");
      }
      recognitionRef.current = null;
    }

    // Clean up audio resources
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.log("Track already stopped");
        }
      });
      streamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {
        console.log("Audio context already closed");
      }
      audioContextRef.current = null;
    }

    setIsListening(false);
    setAudioLevel(-42);
    setErrorMessage("");
    console.log("Voice recognition stopped and cleaned up");
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript("");
  }, []);



  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    transcript,
    audioLevel,
    isSupported,
    errorMessage,
    startListening,
    stopListening,
    clearTranscript,
  };
}
