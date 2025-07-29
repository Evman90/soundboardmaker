import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Trash2, Smartphone, Settings } from "lucide-react";
import { useVoiceRecognition } from "@/hooks/use-voice-recognition";
import AudioVisualizer from "@/components/audio-visualizer";

export function VoiceControls() {
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    clearTranscript,
    isSupported,
    audioLevel,
    errorMessage
  } = useVoiceRecognition();

  const [status, setStatus] = useState("Ready to Listen");
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const userAgent = navigator.userAgent;
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    setIsMobile(mobile);
  }, []);

  // Update status based on listening state
  useEffect(() => {
    if (errorMessage) {
      setStatus("Error");
    } else if (isListening) {
      setStatus("Listening");
    } else {
      setStatus("Ready to Listen");
    }
  }, [isListening, errorMessage]);

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MicOff className="h-5 w-5 text-red-500" />
            <span>Voice Recognition Not Supported</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-300">
            Voice recognition is not supported in this browser. Please use Chrome or Edge on desktop for the best experience.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Voice Recognition Controls</span>
            {isMobile && <Smartphone className="h-4 w-4 text-blue-500" />}
          </div>
          <Badge variant={isListening ? "default" : "secondary"}>
            {status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Message */}
        {errorMessage && (
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
          </div>
        )}

        {/* Main Controls */}
        <div className="flex flex-col space-y-4">
          <Button
            onClick={handleToggleListening}
            size="lg"
            className={`w-full h-16 text-lg font-semibold transition-all duration-200 ${
              isListening 
                ? "bg-red-500 hover:bg-red-600 text-white shadow-lg scale-105" 
                : "bg-green-500 hover:bg-green-600 text-white"
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="h-6 w-6 mr-3" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="h-6 w-6 mr-3" />
                Start Listening
              </>
            )}
          </Button>

          {/* Audio Visualizer */}
          {isListening && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Audio Level (Max Sensitivity)</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {audioLevel}dB
                </span>
              </div>
              <AudioVisualizer audioLevel={audioLevel} />
            </div>
          )}
        </div>

        {/* Live Transcript */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Live Transcript</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearTranscript}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
          <div className="min-h-16 max-h-32 overflow-y-auto">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {transcript || (isListening ? "Listening..." : "No speech detected")}
            </p>
          </div>
        </div>
        
        {/* Sensitivity Info */}
        <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Maximum Sensitivity Mode:</strong> Echo cancellation, noise suppression, and auto-gain control are disabled for maximum microphone sensitivity.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}