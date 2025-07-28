import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, Cloud, Download, Loader2, Lock } from 'lucide-react';

export function ServerProfileLoader() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for server profiles
  const { data: serverProfiles = [], isLoading } = useQuery({
    queryKey: ['/api/profile/server-profiles'],
    select: (data: any) => data?.profiles || [],
  });

  // Mutation to load profile from server
  const loadFromServerMutation = useMutation({
    mutationFn: async (filename: string) => {
      const response = await fetch(`/api/profile/load-from-server/${encodeURIComponent(filename)}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to load profile from server');
      }
      return response.json();
    },
    onSuccess: (data, filename) => {
      toast({
        title: "Profile loaded from server",
        description: `"${filename}" has been loaded successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sound-clips'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trigger-words'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error loading profile",
        description: error.message || "Failed to load profile from server",
        variant: "destructive",
      });
    },
  });

  const handleLoadProfile = (filename: string) => {
    loadFromServerMutation.mutate(filename);
  };

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4" />
                Load Soundboard
                {serverProfiles.length > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {serverProfiles.length} profile{serverProfiles.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <ChevronDown 
                className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
              />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">Loading profiles...</span>
              </div>
            ) : serverProfiles.length === 0 ? (
              <div className="text-center py-6">
                <Cloud className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No server profiles found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Save a profile to server from Settings to see it here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-3">
                  Click any profile to load it (this will replace your current data):
                </p>
                {serverProfiles.map((profile: any) => {
                  const profileName = typeof profile === 'string' ? profile : profile.name;
                  const isReadOnly = typeof profile === 'object' && profile.readOnly;
                  const savedAt = typeof profile === 'object' && profile.savedAt;
                  
                  return (
                    <div key={profileName} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1 mr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {profileName}
                          </span>
                          {isReadOnly && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              Read-only
                            </span>
                          )}
                        </div>
                        {savedAt && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Saved: {new Date(savedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLoadProfile(profileName)}
                        disabled={loadFromServerMutation.isPending}
                        className="shrink-0"
                      >
                        {loadFromServerMutation.isPending && loadFromServerMutation.variables === profileName ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}