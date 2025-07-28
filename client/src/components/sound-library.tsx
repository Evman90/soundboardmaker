import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Play, Pause, Edit, Trash2, Search, Mic, Square, RotateCcw, Zap, X, PlayCircle, StopCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import type { SoundClip, TriggerWord } from "@shared/schema";

export default function SoundLibrary() {
  const [searchTerm, setSearchTerm] = useState("");
  const [masterVolume, setMasterVolume] = useState(75);
  const [micSensitivity, setMicSensitivity] = useState(50);
  const [recordingName, setRecordingName] = useState("");
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [selectedSoundForTrigger, setSelectedSoundForTrigger] = useState<SoundClip | null>(null);
  const [triggerPhrase, setTriggerPhrase] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [currentPreviewClip, setCurrentPreviewClip] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCancelRef = useRef<boolean>(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { playSound, stopSound, currentlyPlaying, stopAllSounds } = useAudioPlayer();
  const { 
    isRecording, 
    recordingTime, 
    audioBlob, 
    audioUrl, 
    startRecording, 
    stopRecording, 
    clearRecording 
  } = useAudioRecorder();

  const { data: soundClips = [], isLoading } = useQuery<SoundClip[]>({
    queryKey: ["/api/sound-clips"],
  });

  const { data: triggerWords = [] } = useQuery<TriggerWord[]>({
    queryKey: ["/api/trigger-words"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      console.log("Sending form data to server...");
      // Log form data contents
      for (const [key, value] of formData.entries()) {
        console.log(`FormData ${key}:`, value);
      }
      
      // Use direct fetch for file uploads to preserve FormData
      const response = await fetch("/api/sound-clips", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error("Upload failed:", response.status, error);
        throw new Error(`Upload failed: ${response.status} ${error}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sound-clips"] });
      toast({
        title: "Success",
        description: "Sound clip uploaded successfully",
      });
    },
    onError: (error: any) => {
      console.error("Upload mutation error:", error);
      toast({
        title: "Error",
        description: `Failed to upload sound clip: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/sound-clips/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sound-clips"] });
      toast({
        title: "Success",
        description: "Sound clip deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete sound clip",
        variant: "destructive",
      });
    },
  });

  const createTriggerMutation = useMutation({
    mutationFn: async (data: { phrase: string; soundClipIds: number[]; caseSensitive: boolean; enabled: boolean }) => {
      const response = await apiRequest("/api/trigger-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trigger-words"] });
      setSelectedSoundForTrigger(null);
      setTriggerPhrase("");
      setCaseSensitive(false);
      toast({
        title: "Success",
        description: "Trigger word created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create trigger word",
        variant: "destructive",
      });
    },
  });

  const deleteTriggerMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/trigger-words/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trigger-words"] });
      toast({
        title: "Success",
        description: "Trigger word deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to delete trigger word",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("Uploading file:", file.name, file.size, file.type);

    const formData = new FormData();
    formData.append("audio", file);
    formData.append("name", file.name.replace(/\.[^/.]+$/, ""));
    
    // Get audio duration
    const audio = new Audio();
    audio.src = URL.createObjectURL(file);
    
    const handleMetadata = () => {
      formData.append("duration", audio.duration.toString());
      console.log("Audio duration:", audio.duration);
      uploadMutation.mutate(formData);
      URL.revokeObjectURL(audio.src);
    };

    const handleError = () => {
      console.log("Could not load audio metadata, using default duration");
      formData.append("duration", "0");
      uploadMutation.mutate(formData);
      URL.revokeObjectURL(audio.src);
    };
    
    audio.addEventListener('loadedmetadata', handleMetadata);
    audio.addEventListener('error', handleError);
    
    // Fallback timeout in case metadata doesn't load
    setTimeout(() => {
      if (audio.readyState === 0) {
        console.log("Metadata loading timeout, proceeding without duration");
        formData.append("duration", "0");
        uploadMutation.mutate(formData);
        URL.revokeObjectURL(audio.src);
      }
    }, 3000);
  };

  const saveRecording = async () => {
    if (!audioBlob || !recordingName.trim()) {
      toast({
        title: "Error",
        description: "Please provide a name for your recording",
        variant: "destructive",
      });
      return;
    }

    console.log("Saving recorded audio:", recordingName);
    
    const formData = new FormData();
    formData.append("audio", audioBlob, `${recordingName}.webm`);
    formData.append("name", recordingName);
    
    // Get audio duration from the recorded blob
    const audio = new Audio();
    audio.src = audioUrl!;
    
    const handleMetadata = () => {
      const duration = isFinite(audio.duration) ? audio.duration : recordingTime;
      formData.append("duration", duration.toString());
      console.log("Recording duration:", duration);
      uploadMutation.mutate(formData);
      
      // Reset recording state
      clearRecording();
      setRecordingName("");
      setShowRecordDialog(false);
      URL.revokeObjectURL(audio.src);
    };

    const handleError = () => {
      console.log("Could not load recording metadata, using recorded time");
      formData.append("duration", recordingTime.toString());
      uploadMutation.mutate(formData);
      
      // Reset recording state
      clearRecording();
      setRecordingName("");
      setShowRecordDialog(false);
      URL.revokeObjectURL(audio.src);
    };
    
    audio.addEventListener('loadedmetadata', handleMetadata);
    audio.addEventListener('error', handleError);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredSoundClips = soundClips.filter(clip =>
    clip.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    return `${seconds.toFixed(1)}s`;
  };

  const getSoundTriggers = (soundClipId: number) => {
    return triggerWords.filter(trigger => 
      trigger.soundClipIds && trigger.soundClipIds.includes(soundClipId)
    );
  };

  const handleCreateTrigger = () => {
    if (!selectedSoundForTrigger || !triggerPhrase.trim()) {
      toast({
        title: "Error",
        description: "Please enter a trigger phrase",
        variant: "destructive",
      });
      return;
    }

    createTriggerMutation.mutate({
      phrase: triggerPhrase.trim(),
      soundClipIds: [selectedSoundForTrigger.id],
      caseSensitive,
      enabled: true,
    });
  };

  const playAllClipsPreview = useCallback(async () => {
    if (soundClips.length === 0) {
      toast({
        title: "No Clips",
        description: "Add some sound clips first",
        variant: "destructive",
      });
      return;
    }

    if (isPreviewPlaying) {
      previewCancelRef.current = true;
      setIsPreviewPlaying(false);
      setPreviewProgress(0);
      setCurrentPreviewClip("");
      toast({
        title: "Preview Stopped",
        description: "Preview cancelled by user",
      });
      return;
    }

    setIsPreviewPlaying(true);
    setPreviewProgress(0);
    previewCancelRef.current = false;

    try {
      for (let i = 0; i < soundClips.length; i++) {
        if (previewCancelRef.current) break;

        const clip = soundClips[i];
        setCurrentPreviewClip(clip.name);
        setPreviewProgress(((i + 1) / soundClips.length) * 100);

        // Create and play audio
        const audio = new Audio(clip.url);
        audio.volume = masterVolume / 100;

        await new Promise<void>((resolve, reject) => {
          let hasResolved = false;

          const cleanup = () => {
            if (!hasResolved) {
              hasResolved = true;
              audio.removeEventListener('ended', onEnded);
              audio.removeEventListener('error', onError);
              audio.removeEventListener('canplaythrough', onCanPlay);
            }
          };

          const onEnded = () => {
            cleanup();
            resolve();
          };

          const onError = () => {
            cleanup();
            console.warn(`Failed to play clip: ${clip.name}`);
            resolve(); // Continue to next clip
          };

          const onCanPlay = () => {
            if (!previewCancelRef.current) {
              audio.play().catch(() => {
                cleanup();
                resolve();
              });
            } else {
              cleanup();
              resolve();
            }
          };

          audio.addEventListener('ended', onEnded);
          audio.addEventListener('error', onError);
          audio.addEventListener('canplaythrough', onCanPlay);

          // Start loading the audio
          audio.load();
        });

        // Add delay between clips
        if (i < soundClips.length - 1 && !previewCancelRef.current) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (!previewCancelRef.current) {
        toast({
          title: "Preview Complete",
          description: `Played ${soundClips.length} sound clips in sequence`,
        });
      }
    } catch (error) {
      console.error('Preview error:', error);
      toast({
        title: "Preview Error",
        description: "An error occurred during preview",
        variant: "destructive",
      });
    } finally {
      setIsPreviewPlaying(false);
      setPreviewProgress(0);
      setCurrentPreviewClip("");
      previewCancelRef.current = false;
    }
  }, [soundClips, masterVolume, isPreviewPlaying, toast]);

  return (
    <div className="space-y-6">
      

      {/* Sound Library */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Sound Library
            <div className="flex space-x-2">
              <Button
                onClick={playAllClipsPreview}
                className={`${isPreviewPlaying ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"} text-white`}
                size="sm"
                disabled={soundClips.length === 0}
              >
                {isPreviewPlaying ? (
                  <>
                    <StopCircle className="h-4 w-4 mr-1" />
                    Stop Preview
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 mr-1" />
                    Preview All
                  </>
                )}
              </Button>
              
              {isPreviewPlaying && (
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-green-600 dark:text-green-400">Playing:</span>
                  <span className="font-medium truncate max-w-32">{currentPreviewClip}</span>
                  <span className="text-gray-500">({Math.round(previewProgress)}%)</span>
                </div>
              )}
              
              <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-red-500 hover:bg-red-600 text-white"
                    size="sm"
                  >
                    <Mic className="h-4 w-4 mr-1" />
                    Record
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Record Audio</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="recordingName">Recording Name</Label>
                      <Input
                        id="recordingName"
                        value={recordingName}
                        onChange={(e) => setRecordingName(e.target.value)}
                        placeholder="Enter a name for your recording..."
                        className="mt-1"
                      />
                    </div>

                    <div className="flex flex-col items-center space-y-4">
                      {!isRecording && !audioBlob && (
                        <Button
                          onClick={startRecording}
                          className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 text-lg"
                        >
                          <Mic className="h-5 w-5 mr-2" />
                          Start Recording
                        </Button>
                      )}

                      {isRecording && (
                        <div className="flex flex-col items-center space-y-2">
                          <div className="text-lg font-mono text-red-500">
                            {formatTime(recordingTime)}
                          </div>
                          <Button
                            onClick={stopRecording}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-3"
                          >
                            <Square className="h-5 w-5 mr-2" />
                            Stop Recording
                          </Button>
                        </div>
                      )}

                      {audioBlob && audioUrl && (
                        <div className="flex flex-col items-center space-y-2">
                          <audio controls src={audioUrl} className="w-full" />
                          <div className="flex space-x-2">
                            <Button
                              onClick={clearRecording}
                              variant="outline"
                              size="sm"
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Re-record
                            </Button>
                            <Button
                              onClick={saveRecording}
                              disabled={!recordingName.trim() || uploadMutation.isPending}
                              className="bg-green-500 hover:bg-green-600 text-white"
                              size="sm"
                            >
                              Save Recording
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-primary hover:bg-primary-dark text-white"
                size="sm"
                disabled={uploadMutation.isPending}
              >
                <Upload className="h-4 w-4 mr-1" />
                Upload
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.ogg"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Search/Filter */}
          <div className="mb-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search sounds..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            </div>
          </div>

          {/* Sound Cards */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-4">
                <p className="text-gray-500">Loading sounds...</p>
              </div>
            ) : filteredSoundClips.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-2">No sound clips found</p>
                <p className="text-sm text-gray-400">
                  {searchTerm ? "Try a different search term" : "Upload your first sound clip to get started"}
                </p>
              </div>
            ) : (
              filteredSoundClips.map((clip) => (
                <div
                  key={clip.id}
                  className={`bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border transition-all ${
                    currentlyPlaying === clip.id
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                      : "border-gray-200 dark:border-gray-600 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                        {clip.name}
                      </h4>
                      {(() => {
                        const triggers = getSoundTriggers(clip.id);
                        const hasTriggersAssigned = triggers.length > 0;
                        return hasTriggersAssigned ? (
                          <Badge variant="outline" className="text-xs px-2 py-0.5 text-green-600 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-600 dark:bg-green-900/20">
                            Assigned
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs px-2 py-0.5 text-blue-600 border-blue-300 bg-blue-50 dark:text-blue-400 dark:border-blue-600 dark:bg-blue-900/20">
                            Default
                          </Badge>
                        );
                      })()}
                    </div>
                    <div className="flex items-center space-x-1">
                      {currentlyPlaying === clip.id ? (
                        <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full">
                          PLAYING
                        </span>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => 
                          currentlyPlaying === clip.id 
                            ? stopSound() 
                            : playSound(clip.url, clip.id, masterVolume / 100)
                        }
                        className="text-primary hover:text-primary-dark"
                      >
                        {currentlyPlaying === clip.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSoundForTrigger(clip);
                              setTriggerPhrase("");
                              setCaseSensitive(false);
                            }}
                            className="text-blue-500 hover:text-blue-700"
                            title="Add trigger word"
                          >
                            <Zap className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Trigger for "{clip.name}"</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="triggerPhrase">Trigger Phrase</Label>
                              <Input
                                id="triggerPhrase"
                                value={triggerPhrase}
                                onChange={(e) => setTriggerPhrase(e.target.value)}
                                placeholder="Enter trigger phrase"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="caseSensitive"
                                checked={caseSensitive}
                                onChange={(e) => setCaseSensitive(e.target.checked)}
                                className="rounded"
                              />
                              <Label htmlFor="caseSensitive">Case sensitive</Label>
                            </div>
                            <div className="flex space-x-3 pt-4">
                              <Button 
                                type="button" 
                                variant="outline"
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                              <Button 
                                onClick={handleCreateTrigger}
                                className="flex-1 bg-primary hover:bg-primary-dark text-white"
                                disabled={createTriggerMutation.isPending}
                              >
                                {createTriggerMutation.isPending ? "Creating..." : "Create Trigger"}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(clip.id)}
                        className="text-gray-500 hover:text-red-500"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatDuration(clip.duration)}</span>
                    <span>{formatFileSize(clip.size)}</span>
                    <span className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded uppercase">
                      {clip.format}
                    </span>
                  </div>
                  
                  {/* Show existing triggers */}
                  {(() => {
                    const triggers = getSoundTriggers(clip.id);
                    return triggers.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Triggers:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {triggers.map((trigger) => (
                            <div key={trigger.id} className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-xs">
                              <span>"{trigger.phrase}"</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteTriggerMutation.mutate(trigger.id)}
                                className="h-3 w-3 p-0 text-blue-600 hover:text-red-500"
                                title="Delete trigger"
                              >
                                <X className="h-2 w-2" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  
                  {currentlyPlaying === clip.id && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                        <div className="bg-orange-500 h-1 rounded-full animate-pulse" style={{ width: "45%" }} />
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Browser Compatibility Status */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
        <CardContent className="pt-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 text-sm mb-1">Browser Support</h4>
              <p className="text-xs text-blue-700 dark:text-blue-200 mb-2">
                Web Speech API works best in Chrome/Edge. Safari and Firefox have limited support.
              </p>
              <div className="flex items-center space-x-4 text-xs">
                <span className="flex items-center text-green-600 dark:text-green-400">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>Chrome ✓
                </span>
                <span className="flex items-center text-yellow-600 dark:text-yellow-400">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></span>Safari ~
                </span>
                <span className="flex items-center text-red-600 dark:text-red-400">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>Firefox ✗
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
