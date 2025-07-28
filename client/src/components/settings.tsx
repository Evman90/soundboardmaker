import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Settings as SettingsIcon, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Settings, SoundClip } from "@shared/schema";

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const { data: soundClips = [] } = useQuery<SoundClip[]>({
    queryKey: ["/api/sound-clips"],
  });

  const [defaultResponseEnabled, setDefaultResponseEnabled] = useState(false);
  const [defaultResponseSoundClipIds, setDefaultResponseSoundClipIds] = useState<number[]>([]);
  const [defaultResponseDelay, setDefaultResponseDelay] = useState(2000);

  // Update local state when settings data loads
  React.useEffect(() => {
    if (settings) {
      setDefaultResponseEnabled(settings.defaultResponseEnabled || false);
      setDefaultResponseSoundClipIds(settings.defaultResponseSoundClipIds || []);
      setDefaultResponseDelay(settings.defaultResponseDelay || 2000);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: {
      defaultResponseEnabled: boolean;
      defaultResponseSoundClipIds?: number[];
      defaultResponseDelay: number;
    }) => {
      const response = await apiRequest("PATCH", "/api/settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const data = {
      defaultResponseEnabled,
      defaultResponseSoundClipIds: defaultResponseSoundClipIds.length > 0 ? defaultResponseSoundClipIds : undefined,
      defaultResponseDelay,
    };
    updateMutation.mutate(data);
  };

  const toggleSoundClip = (clipId: number) => {
    setDefaultResponseSoundClipIds(prev => 
      prev.includes(clipId) 
        ? prev.filter(id => id !== clipId)
        : [...prev, clipId]
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <SettingsIcon className="h-5 w-5" />
          <span>Default Response Settings</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="defaultResponseEnabled"
              checked={defaultResponseEnabled}
              onCheckedChange={(checked) => setDefaultResponseEnabled(checked as boolean)}
            />
            <Label htmlFor="defaultResponseEnabled">
              Enable default response when no trigger words match
            </Label>
          </div>

          {defaultResponseEnabled && (
            <>
              <div>
                <Label>Default Response Sounds (cycles through sequentially)</Label>
                <div className="space-y-2 mt-2 max-h-40 overflow-y-auto border rounded-md p-3">
                  {soundClips.length === 0 ? (
                    <p className="text-sm text-gray-500">No sound clips available. Upload some sounds first.</p>
                  ) : (
                    soundClips.map((clip) => (
                      <div key={clip.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`clip-${clip.id}`}
                          checked={defaultResponseSoundClipIds.includes(clip.id)}
                          onCheckedChange={() => toggleSoundClip(clip.id)}
                        />
                        <Label htmlFor={`clip-${clip.id}`} className="text-sm font-normal cursor-pointer">
                          {clip.name}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
                {defaultResponseSoundClipIds.length > 0 && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Selected {defaultResponseSoundClipIds.length} sound{defaultResponseSoundClipIds.length !== 1 ? 's' : ''}. They will play in the order shown above.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="defaultDelay">Response Delay (milliseconds)</Label>
                <Input
                  id="defaultDelay"
                  type="number"
                  min="500"
                  max="10000"
                  step="100"
                  value={defaultResponseDelay}
                  onChange={(e) => setDefaultResponseDelay(parseInt(e.target.value) || 2000)}
                  placeholder="2000"
                />
                <p className="text-sm text-gray-500 mt-1">
                  How long to wait after speech ends before playing default response
                </p>
              </div>
            </>
          )}

          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="w-full bg-primary hover:bg-primary-dark text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>How it works:</strong> When voice is detected but no trigger words match, 
            a default response sound will play after the specified delay. If multiple sounds are selected, 
            they will cycle through sequentially - playing the first sound, then the second, then the third, 
            and so on, returning to the first after reaching the end. This creates varied responses 
            for unmatched speech.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}