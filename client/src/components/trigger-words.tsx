import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, ArrowRight, Volume2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TriggerWord, SoundClip } from "@shared/schema";

export default function TriggerWords() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<TriggerWord | null>(null);
  const [phrase, setPhrase] = useState("");
  const [selectedSoundId, setSelectedSoundId] = useState<string>("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: triggerWords = [] } = useQuery<TriggerWord[]>({
    queryKey: ["/api/trigger-words"],
  });

  const { data: soundClips = [] } = useQuery<SoundClip[]>({
    queryKey: ["/api/sound-clips"],
  });

  const createMutation = useMutation({
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
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Trigger word added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add trigger word",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TriggerWord> }) => {
      const response = await apiRequest(`/api/trigger-words/${id}`, {
        method: "PATCH", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trigger-words"] });
      setIsDialogOpen(false);
      setEditingTrigger(null);
      resetForm();
      toast({
        title: "Success",
        description: "Trigger word updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update trigger word",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/trigger-words/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trigger-words"] });
      toast({
        title: "Success",
        description: "Trigger word deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete trigger word",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setPhrase("");
    setSelectedSoundId("");
    setCaseSensitive(false);
    setEditingTrigger(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phrase || !selectedSoundId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const data = {
      phrase: phrase.trim(),
      soundClipIds: [parseInt(selectedSoundId)], // Convert to array format expected by schema
      caseSensitive,
      enabled: true,
    };

    if (editingTrigger) {
      updateMutation.mutate({ id: editingTrigger.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (trigger: TriggerWord) => {
    setEditingTrigger(trigger);
    setPhrase(trigger.phrase);
    // Use first sound clip ID from the array for editing
    setSelectedSoundId(trigger.soundClipIds?.[0]?.toString() || "");
    setCaseSensitive(trigger.caseSensitive || false);
    setIsDialogOpen(true);
  };

  const getSoundClipName = (soundClipIds: number[]) => {
    if (!soundClipIds || soundClipIds.length === 0) return "No sound assigned";
    const clip = soundClips.find(c => c.id === soundClipIds[0]);
    const name = clip ? clip.name : "Unknown Sound";
    return soundClipIds.length > 1 ? `${name} (+${soundClipIds.length - 1} more)` : name;
  };

  const testSound = (soundClipIds: number[]) => {
    if (!soundClipIds || soundClipIds.length === 0) return;
    const clip = soundClips.find(c => c.id === soundClipIds[0]);
    if (clip) {
      console.log("🔊 Testing sound:", clip.name, clip.url);
      const audio = new Audio(clip.url);
      audio.volume = 0.75;
      audio.play().catch(error => {
        console.error("Failed to play sound:", error);
        toast({
          title: "Error",
          description: "Failed to play sound. Check browser permissions.",
          variant: "destructive",
        });
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Trigger Words & Phrases
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-primary hover:bg-primary-dark text-white"
                onClick={resetForm}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Trigger
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingTrigger ? "Edit Trigger Word" : "Add Trigger Word"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="phrase">Trigger Phrase</Label>
                  <Input
                    id="phrase"
                    type="text"
                    placeholder="e.g., applause, victory, drumroll"
                    value={phrase}
                    onChange={(e) => setPhrase(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="sound">Select Sound</Label>
                  <Select value={selectedSoundId} onValueChange={setSelectedSoundId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a sound..." />
                    </SelectTrigger>
                    <SelectContent>
                      {soundClips.map((clip) => (
                        <SelectItem key={clip.id} value={clip.id.toString()}>
                          {clip.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="caseSensitive"
                    checked={caseSensitive}
                    onCheckedChange={(checked) => setCaseSensitive(checked as boolean)}
                  />
                  <Label htmlFor="caseSensitive">Case sensitive</Label>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary-dark text-white"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingTrigger ? "Update Trigger" : "Add Trigger"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {triggerWords.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">No trigger words configured</p>
              <p className="text-sm text-gray-400">
                Add trigger words to automatically play sounds when detected in speech
              </p>
            </div>
          ) : (
            triggerWords.map((trigger) => (
              <div
                key={trigger.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    trigger.enabled ? "bg-green-500" : "bg-gray-400"
                  }`} />
                  <span className="font-medium text-gray-900 dark:text-white">
                    "{trigger.phrase}"
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {getSoundClipName(trigger.soundClipIds)}
                  </span>
                  {trigger.caseSensitive && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Case Sensitive
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => testSound(trigger.soundClipIds)}
                    className="text-gray-500 hover:text-green-500"
                    title="Test sound"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(trigger)}
                    className="text-gray-500 hover:text-primary"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(trigger.id)}
                    className="text-gray-500 hover:text-red-500"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
