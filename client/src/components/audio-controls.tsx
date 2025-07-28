import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Volume2, Mic, VolumeX, MicOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AudioControls() {
  const [masterVolume, setMasterVolume] = useState([80]);
  const [micSensitivity, setMicSensitivity] = useState([100]);
  const { toast } = useToast();

  // Apply master volume to all audio elements
  useEffect(() => {
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.volume = masterVolume[0] / 100;
    });
  }, [masterVolume]);

  // Store sensitivity in localStorage for use by voice recognition
  useEffect(() => {
    localStorage.setItem('micSensitivity', micSensitivity[0].toString());
  }, [micSensitivity]);

  const handleVolumeChange = (value: number[]) => {
    setMasterVolume(value);
    if (value[0] === 0) {
      toast({
        title: "Volume Muted",
        description: "Master volume is set to 0%",
      });
    }
  };

  const handleSensitivityChange = (value: number[]) => {
    setMicSensitivity(value);
    if (value[0] === 100) {
      toast({
        title: "Maximum Sensitivity",
        description: "Microphone sensitivity is at maximum level",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Volume2 className="h-5 w-5" />
          <span>Audio Controls</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master Volume */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center space-x-2">
              {masterVolume[0] === 0 ? (
                <VolumeX className="h-4 w-4 text-red-500" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
              <span>Master Volume</span>
            </Label>
            <Badge variant="secondary">{masterVolume[0]}%</Badge>
          </div>
          <Slider
            value={masterVolume}
            onValueChange={handleVolumeChange}
            max={100}
            min={0}
            step={5}
            className="w-full"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Controls the volume of all sound clips
          </p>
        </div>

        {/* Microphone Sensitivity */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center space-x-2">
              {micSensitivity[0] === 0 ? (
                <MicOff className="h-4 w-4 text-red-500" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              <span>Mic Sensitivity</span>
            </Label>
            <Badge variant={micSensitivity[0] === 100 ? "default" : "secondary"}>
              {micSensitivity[0]}%
            </Badge>
          </div>
          <Slider
            value={micSensitivity}
            onValueChange={handleSensitivityChange}
            max={100}
            min={0}
            step={5}
            className="w-full"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {micSensitivity[0] === 100 
              ? "Maximum sensitivity - echo cancellation, noise suppression, and auto-gain disabled"
              : "Higher values increase microphone sensitivity for voice detection"
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}