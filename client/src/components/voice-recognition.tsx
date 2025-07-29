import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Activity, Smartphone } from "lucide-react";
import { useVoiceRecognition } from "@/hooks/use-voice-recognition";
import AudioVisualizer from "@/components/audio-visualizer";

export default function VoiceRecognition() {
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
            <Activity className="h-5 w-5" />
            <span>Voice Status</span>
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

        {/* Quick Toggle */}
        <Button
          onClick={handleToggleListening}
          size="lg"
          className={`w-full h-12 text-base font-semibold transition-all duration-200 ${
            isListening 
              ? "bg-red-500 hover:bg-red-600 text-white shadow-lg" 
              : "bg-green-500 hover:bg-green-600 text-white"
          }`}
        >
          {isListening ? (
            <>
              <MicOff className="h-5 w-5 mr-2" />
              Stop Listening
            </>
          ) : (
            <>
              <Mic className="h-5 w-5 mr-2" />
              Start Listening
            </>
          )}
        </Button>

        {/* Compact Audio Visualizer */}
        {isListening && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Audio Level</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {audioLevel}dB
              </span>
            </div>
            <AudioVisualizer audioLevel={audioLevel} isListening={isListening} />
          </div>
        )}

        {/* Recent Speech */}
        {transcript && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1">Last Heard:</span>
            <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
              {transcript}
            </p>
          </div>
        )}
        
        {/* Settings Note */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            For detailed controls and transcript, visit Settings
          </p>
        </div>
      </CardContent>
    </Card>
  );
}