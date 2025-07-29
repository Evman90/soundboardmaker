import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ConversationRecorderOptions {
  maxSizeBytes?: number; // 10MB default
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onRecordingSaved?: () => void;
}

export function useConversationRecorder(options: ConversationRecorderOptions = {}) {
  const { maxSizeBytes = 10 * 1024 * 1024, onRecordingStart, onRecordingStop, onRecordingSaved } = options;
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentSize, setCurrentSize] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return await apiRequest("/api/conversation-recordings", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversation-recordings"] });
      toast({
        title: "Success",
        description: "Conversation recording saved successfully",
      });
      onRecordingSaved?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save conversation recording",
        variant: "destructive",
      });
    },
  });

  const startRecording = useCallback(async () => {
    try {
      console.log("🎙️ Starting conversation recording...");
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setCurrentSize(0);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          setCurrentSize(prev => prev + event.data.size);
          
          // Check size limit
          const totalSize = audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
          if (totalSize > maxSizeBytes) {
            console.warn("Recording size limit reached, stopping recording");
            stopRecording();
            toast({
              title: "Recording Stopped",
              description: "Maximum recording size (10MB) reached",
              variant: "destructive",
            });
          }
        }
      };

      mediaRecorder.onstop = () => {
        console.log("🎙️ Conversation recording stopped, processing audio...");
        
        const blob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType || 'audio/webm' 
        });
        setAudioBlob(blob);
        setCurrentSize(blob.size);
        
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      console.log("🎙️ Conversation recording started successfully");
      onRecordingStart?.();
      
    } catch (error) {
      console.error("Failed to start conversation recording:", error);
      toast({
        title: "Error",
        description: "Failed to start conversation recording. Please check microphone permissions.",
        variant: "destructive",
      });
    }
  }, [maxSizeBytes, onRecordingStart, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      console.log("🎙️ Stopping conversation recording...");
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      onRecordingStop?.();
    }
  }, [isRecording, onRecordingStop]);

  const clearRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setCurrentSize(0);
    audioChunksRef.current = [];
  }, [audioUrl]);

  const saveRecording = useCallback((name: string) => {
    if (!audioBlob) return;

    const formData = new FormData();
    formData.append("audio", audioBlob, `${name}.webm`);
    formData.append("name", name);
    formData.append("duration", recordingTime.toString());
    
    console.log("Saving conversation recording:", name);
    console.log("Recording duration:", recordingTime);
    console.log("Recording size:", audioBlob.size);
    
    uploadMutation.mutate(formData);
  }, [audioBlob, recordingTime, uploadMutation]);

  const formatSize = useCallback((bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  }, []);

  const getSizePercentage = useCallback(() => {
    return (currentSize / maxSizeBytes) * 100;
  }, [currentSize, maxSizeBytes]);

  return {
    isRecording,
    recordingTime,
    audioBlob,
    audioUrl,
    currentSize,
    startRecording,
    stopRecording,
    clearRecording,
    saveRecording,
    formatSize,
    getSizePercentage,
    maxSizeBytes,
    isUploading: uploadMutation.isPending,
  };
}