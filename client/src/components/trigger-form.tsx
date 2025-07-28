import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const triggerFormSchema = z.object({
  phrase: z.string().min(1, "Trigger phrase is required"),
  soundClipIds: z.array(z.number()).min(1, "At least one sound clip is required"),
  caseSensitive: z.boolean().default(false),
  enabled: z.boolean().default(true),
});

type TriggerFormData = z.infer<typeof triggerFormSchema>;

interface TriggerFormProps {
  soundClips: any[];
  triggerWord?: any;
  onCancel: () => void;
}

export function TriggerForm({ soundClips, triggerWord, onCancel }: TriggerFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSoundClips, setSelectedSoundClips] = useState<number[]>(
    triggerWord?.soundClipIds || []
  );

  const form = useForm<TriggerFormData>({
    resolver: zodResolver(triggerFormSchema),
    defaultValues: {
      phrase: triggerWord?.phrase || "",
      soundClipIds: triggerWord?.soundClipIds || [],
      caseSensitive: triggerWord?.caseSensitive || false,
      enabled: triggerWord?.enabled !== false,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: TriggerFormData) => apiRequest("/api/trigger-words", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trigger-words"] });
      toast({ title: "Success", description: "Trigger word created successfully" });
      onCancel();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create trigger word",
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: TriggerFormData) => 
      apiRequest(`/api/trigger-words/${triggerWord.id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trigger-words"] });
      toast({ title: "Success", description: "Trigger word updated successfully" });
      onCancel();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update trigger word",
        variant: "destructive" 
      });
    },
  });

  const addSoundClip = (soundClipId: number) => {
    if (!selectedSoundClips.includes(soundClipId)) {
      const newSelectedClips = [...selectedSoundClips, soundClipId];
      setSelectedSoundClips(newSelectedClips);
      form.setValue("soundClipIds", newSelectedClips);
    }
  };

  const removeSoundClip = (soundClipId: number) => {
    const newSelectedClips = selectedSoundClips.filter(id => id !== soundClipId);
    setSelectedSoundClips(newSelectedClips);
    form.setValue("soundClipIds", newSelectedClips);
  };

  const onSubmit = (data: TriggerFormData) => {
    const submitData = { ...data, soundClipIds: selectedSoundClips };
    if (triggerWord) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="phrase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trigger Phrase</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter trigger phrase" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  <Select onValueChange={(value) => addSoundClip(parseInt(value))}>
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
                  <Button type="button" variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {selectedSoundClips.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Select at least one sound clip to play when this trigger is detected.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="caseSensitive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Case Sensitive</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Match exact case of the trigger phrase
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enabled</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Trigger will be active and respond to voice commands
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3">
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending || selectedSoundClips.length === 0}
                className="flex-1"
              >
                {createMutation.isPending || updateMutation.isPending 
                  ? "Saving..." 
                  : triggerWord ? "Update Trigger" : "Create Trigger"
                }
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}