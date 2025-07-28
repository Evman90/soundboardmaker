import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  Square, 
  Download, 
  Trash2, 
  Play, 
  Pause, 
  RotateCcw,
  Clock,
  HardDrive,
  Calendar
} from "lucide-react";
import { useConversationRecorder } from "@/hooks/use-conversation-recorder";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ConversationRecording, Settings } from "@shared/schema";

export default function ConversationRecorder() {
  const [recordingName, setRecordingName] = useState("");
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { playSound, stopSound, currentlyPlaying } = useAudioPlayer();

  // Get settings to check if conversation recording is enabled
  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  // Get conversation recordings
  const { data: recordings = [], isLoading } = useQuery<ConversationRecording[]>({
    queryKey: ["/api/conversation-recordings"],
  });

  const {
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
    isUploading,
  } = useConversationRecorder({
    onRecordingSaved: () => {
      clearRecording();
      setRecordingName("");
      setShowRecordDialog(false);
    },
  });

  // Toggle conversation recording setting
  const settingsMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return await apiRequest("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ conversationRecordingEnabled: enabled }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  // Delete recording mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/conversation-recordings/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversation-recordings"] });
      toast({
        title: "Success",
        description: "Conversation recording deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete conversation recording",
        variant: "destructive",
      });
    },
  });

  const handleSaveRecording = () => {
    if (!recordingName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the recording",
        variant: "destructive",
      });
      return;
    }
    saveRecording(recordingName);
  };

  const downloadRecording = (recording: ConversationRecording) => {
    const link = document.createElement('a');
    link.href = recording.url;
    link.download = `${recording.originalName}.${recording.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Settings Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Conversation Recording
            <Badge variant={settings?.conversationRecordingEnabled ? "default" : "secondary"}>
              {settings?.conversationRecordingEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                Record entire conversations between you and the soundboard
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Captures both voice input and soundboard responses (up to 10MB)
              </p>
            </div>
            <Button
              onClick={() => settingsMutation.mutate(!settings?.conversationRecordingEnabled)}
              variant={settings?.conversationRecordingEnabled ? "destructive" : "default"}
              disabled={settingsMutation.isPending}
            >
              {settings?.conversationRecordingEnabled ? "Disable" : "Enable"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recording Controls */}
      {settings?.conversationRecordingEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Record Conversation
              <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-red-500 hover:bg-red-600 text-white">
                    <Mic className="h-4 w-4 mr-2" />
                    Start Recording
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Record Conversation</DialogTitle>
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

                    {/* Size Indicator */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Recording Size</span>
                        <span className={getSizePercentage() > 90 ? "text-red-500" : "text-gray-600"}>
                          {formatSize(currentSize)} / {formatSize(maxSizeBytes)}
                        </span>
                      </div>
                      <Progress value={getSizePercentage()} className="h-2" />
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
                          <div className="text-xs text-gray-500">
                            {formatSize(currentSize)}
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
                        <div className="flex flex-col items-center space-y-2 w-full">
                          <audio controls src={audioUrl} className="w-full" />
                          <div className="text-xs text-gray-500">
                            Duration: {formatTime(recordingTime)} • Size: {formatSize(currentSize)}
                          </div>
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
                              onClick={handleSaveRecording}
                              disabled={!recordingName.trim() || isUploading}
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
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Record entire conversations including your voice input and soundboard responses. 
              Perfect for creating highlights, reviewing interactions, or sharing funny moments.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recorded Conversations */}
      {settings?.conversationRecordingEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>Recorded Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">Loading recordings...</p>
                </div>
              ) : recordings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2">No conversation recordings found</p>
                  <p className="text-sm text-gray-400">
                    Start a recording to capture your conversations with the soundboard
                  </p>
                </div>
              ) : (
                recordings.map((recording) => (
                  <div
                    key={recording.id}
                    className={`bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border transition-all ${
                      currentlyPlaying === recording.id
                        ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                        : "border-gray-200 dark:border-gray-600 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                          {recording.originalName}
                        </h4>
                        {currentlyPlaying === recording.id && (
                          <Badge variant="secondary" className="text-xs">
                            PLAYING
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => 
                            currentlyPlaying === recording.id 
                              ? stopSound() 
                              : playSound(recording.url, recording.id, 0.75)
                          }
                          className="text-primary hover:text-primary-dark"
                        >
                          {currentlyPlaying === recording.id ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadRecording(recording)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(recording.id)}
                          className="text-gray-500 hover:text-red-500"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(recording.duration)}
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3" />
                          {formatSize(recording.size)}
                        </span>
                        <span className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded uppercase">
                          {recording.format}
                        </span>
                      </div>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(recording.createdAt!)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}