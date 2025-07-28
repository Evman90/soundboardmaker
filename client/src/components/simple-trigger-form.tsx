import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SimpleTriggerFormProps {
  soundClips: any[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  triggerWord?: any;
}

export function SimpleTriggerForm({ soundClips, onSubmit, onCancel, triggerWord }: SimpleTriggerFormProps) {
  const { toast } = useToast();
  const [phrase, setPhrase] = useState(triggerWord?.phrase || "");
  const [selectedSoundClips, setSelectedSoundClips] = useState<number[]>(
    triggerWord?.soundClipIds || (triggerWord?.soundClipId ? [triggerWord.soundClipId] : [])
  );
  const [caseSensitive, setCaseSensitive] = useState(triggerWord?.caseSensitive || false);
  const [enabled, setEnabled] = useState(triggerWord?.enabled !== false);

  const addSoundClip = (soundClipId: string) => {
    const id = parseInt(soundClipId);
    if (!selectedSoundClips.includes(id)) {
      setSelectedSoundClips([...selectedSoundClips, id]);
    }
  };

  const removeSoundClip = (soundClipId: number) => {
    setSelectedSoundClips(selectedSoundClips.filter(id => id !== soundClipId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phrase.trim()) {
      toast({ title: "Error", description: "Trigger phrase is required", variant: "destructive" });
      return;
    }
    
    if (selectedSoundClips.length === 0) {
      toast({ title: "Error", description: "At least one sound clip is required", variant: "destructive" });
      return;
    }

    onSubmit({
      phrase: phrase.trim(),
      soundClipIds: selectedSoundClips,
      caseSensitive,
      enabled,
    });
  };

  const availableSoundClips = soundClips.filter(clip => !selectedSoundClips.includes(clip.id));

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {triggerWord ? "Edit Trigger Word" : "Create Trigger Word"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="phrase">Trigger Phrase</Label>
            <Input
              id="phrase"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="Enter trigger phrase"
            />
          </div>

          <div className="space-y-4">
            <Label>Sound Clips (will cycle through in order)</Label>
            
            {/* Selected Sound Clips */}
            {selectedSoundClips.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Selected clips (in order):</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedSoundClips.map((clipId, index) => {
                    const clip = soundClips.find(c => c.id === clipId);
                    return clip ? (
                      <Badge key={clipId} variant="secondary" className="flex items-center gap-2">
                        {index + 1}. {clip.name}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-destructive" 
                          onClick={() => removeSoundClip(clipId)}
                        />
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Add Sound Clip */}
            {availableSoundClips.length > 0 && (
              <div className="flex gap-2">
                <Select onValueChange={addSoundClip}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Add sound clip..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSoundClips.map((clip) => (
                      <SelectItem key={clip.id} value={clip.id.toString()}>
                        {clip.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedSoundClips.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Select at least one sound clip to play when this trigger is detected.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="caseSensitive"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="caseSensitive">Case Sensitive</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enabled"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="enabled">Enabled</Label>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              type="submit" 
              disabled={selectedSoundClips.length === 0}
              className="flex-1"
            >
              {triggerWord ? "Update Trigger" : "Create Trigger"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}