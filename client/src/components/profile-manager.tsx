import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, Trash2, FileJson, Cloud, Loader2, Lock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { apiRequest, queryClient } from '@/lib/queryClient';

export function ProfileManager() {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [serverFilename, setServerFilename] = useState('');
  const [selectedServerProfile, setSelectedServerProfile] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [readOnlyMode, setReadOnlyMode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for server profiles
  const { data: serverProfiles = [], refetch: refetchServerProfiles } = useQuery({
    queryKey: ['/api/profile/server-profiles'],
    select: (data: any) => data?.profiles || [],
  });

  // Query for sound clips to check if any exist
  const { data: soundClips = [] } = useQuery({
    queryKey: ['/api/sound-clips'],
  });

  // Mutation to save profile to server
  const saveToServerMutation = useMutation({
    mutationFn: async ({ filename, readOnly }: { filename: string, readOnly: boolean }) => {
      // Client-side validation
      if (soundClips.length === 0) {
        throw new Error('Cannot save profile: At least one sound clip is required');
      }
      
      const response = await fetch('/api/profile/save-to-server', {
        method: 'POST',
        body: JSON.stringify({ filename, readOnly }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save profile to server');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile saved to server",
        description: "Your profile has been saved to the server successfully.",
      });
      refetchServerProfiles();
      setShowSaveDialog(false);
      setServerFilename('');
      setReadOnlyMode(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error saving profile",
        description: error.message || "Failed to save profile to server",
        variant: "destructive",
      });
    },
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
    onSuccess: () => {
      toast({
        title: "Profile loaded from server",
        description: "Your profile has been loaded successfully.",
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

  // Mutation to delete profile from server
  const deleteFromServerMutation = useMutation({
    mutationFn: async (filename: string) => {
      const response = await fetch(`/api/profile/server-profiles/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete profile from server');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile deleted from server",
        description: "Profile has been deleted successfully.",
      });
      refetchServerProfiles();
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting profile",
        description: error.message || "Failed to delete profile from server",
        variant: "destructive",
      });
    },
  });

  const handleExportProfile = async () => {
    try {
      setIsExporting(true);
      
      const response = await fetch('/api/profile/export');
      if (!response.ok) {
        throw new Error('Failed to export profile');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `callsound-profile-${new Date().toISOString().split('T')[0]}.json`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Profile exported successfully",
        description: "Your soundboard profile has been downloaded to your computer.",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Could not export your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportProfile = async () => {
    if (!importFile) {
      toast({
        title: "No file selected",
        description: "Please select a profile file to import.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsImporting(true);

      const formData = new FormData();
      formData.append('profile', importFile);

      const response = await fetch('/api/profile/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import profile');
      }

      // Invalidate all queries to refresh the UI
      await queryClient.invalidateQueries();

      toast({
        title: "Profile imported successfully",
        description: "Your soundboard profile has been restored. The page will refresh to show your imported data.",
      });

      // Refresh the page to show imported data
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Could not import profile. Please check the file format and try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      setImportFile(null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        setImportFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a JSON profile file.",
          variant: "destructive",
        });
        event.target.value = '';
      }
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="h-5 w-5" />
          Profile Management
        </CardTitle>
        <CardDescription>
          Your data is stored temporarily in this session only. Use profiles to save and restore your soundboard configurations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export Section */}
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-medium">Export Profile</h3>
            <p className="text-sm text-muted-foreground">
              Download all your sound clips, trigger words, and settings as a portable file.
            </p>
          </div>
          <Button 
            onClick={handleExportProfile} 
            disabled={isExporting}
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exporting..." : "Export Profile"}
          </Button>
        </div>

        <Separator />

        {/* Import Section */}
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-medium">Import Profile</h3>
            <p className="text-sm text-muted-foreground">
              Upload a previously saved profile file to restore your sound clips and settings.
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              ⚠️ Warning: This will replace all current data with the imported profile.
            </p>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="profile-file">Select Profile File</Label>
              <Input
                id="profile-file"
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="mt-1"
              />
            </div>
            
            {importFile && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">
                  <strong>Selected file:</strong> {importFile.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Size: {(importFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  disabled={!importFile || isImporting}
                  variant="destructive"
                  className="w-full sm:w-auto"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isImporting ? "Importing..." : "Import Profile"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Import Profile</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently replace all your current sound clips, trigger words, and settings with the data from the selected profile file. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleImportProfile}>
                    Import Profile
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <Separator />

        {/* Server Profile Management */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Server Storage (10MB limit)
            </h3>
            <p className="text-sm text-muted-foreground">
              Save profiles to the server for cloud backup and access across devices.
            </p>
          </div>

          {/* Save to Server */}
          <div className="space-y-3">
            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
              <DialogTrigger asChild>
                <Button className="w-full" variant="outline">
                  <Cloud className="h-4 w-4 mr-2" />
                  Save to Server
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Profile to Server</DialogTitle>
                  <DialogDescription>
                    Enter a filename for your profile. It will be saved to the server with a 10MB size limit.
                    {soundClips.length === 0 && (
                      <span className="block text-amber-600 dark:text-amber-400 font-medium mt-2">
                        ⚠️ You need at least one sound clip to save a profile.
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="server-filename">Filename</Label>
                    <Input
                      id="server-filename"
                      value={serverFilename}
                      onChange={(e) => setServerFilename(e.target.value)}
                      placeholder="my-soundboard-config"
                      maxLength={100}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="read-only-mode"
                      checked={readOnlyMode}
                      onCheckedChange={setReadOnlyMode}
                    />
                    <Label htmlFor="read-only-mode" className="flex items-center gap-2 text-sm">
                      <Lock className="h-4 w-4" />
                      Save as read-only (cannot be overwritten)
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => saveToServerMutation.mutate({ filename: serverFilename, readOnly: readOnlyMode })}
                    disabled={!serverFilename.trim() || saveToServerMutation.isPending || soundClips.length === 0}
                  >
                    {saveToServerMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Save to Server
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Load from Server */}
            <div className="space-y-2">
              <Label htmlFor="server-profile-select">Load from Server</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedServerProfile}
                  onValueChange={setSelectedServerProfile}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select server profile..." />
                  </SelectTrigger>
                  <SelectContent>
                    {serverProfiles.length === 0 ? (
                      <SelectItem value="no-profiles" disabled>
                        No server profiles found
                      </SelectItem>
                    ) : (
                      serverProfiles.map((profile: any) => {
                        const profileName = typeof profile === 'string' ? profile : profile.name;
                        const isReadOnly = typeof profile === 'object' && profile.readOnly;
                        return (
                          <SelectItem key={profileName} value={profileName}>
                            <div className="flex items-center gap-2">
                              <span>{profileName}</span>
                              {isReadOnly && (
                                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                  <Lock className="h-3 w-3" />
                                  Read-only
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => loadFromServerMutation.mutate(selectedServerProfile)}
                  disabled={!selectedServerProfile || selectedServerProfile === 'no-profiles' || loadFromServerMutation.isPending}
                  variant="outline"
                >
                  {loadFromServerMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={!selectedServerProfile || selectedServerProfile === 'no-profiles'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Server Profile</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{selectedServerProfile}" from the server? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          deleteFromServerMutation.mutate(selectedServerProfile);
                          setSelectedServerProfile('');
                        }}
                        disabled={deleteFromServerMutation.isPending}
                      >
                        {deleteFromServerMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Info Section */}
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-medium">⚠️ Session-Based Storage</h3>
            <div className="text-sm text-muted-foreground space-y-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Important: Your data is only stored temporarily during this session.
              </p>
              <p>
                • Data will be lost when you close the browser or refresh the page
              </p>
              <p>
                • Use "Export Profile" to save your work permanently to your computer
              </p>
              <p>
                • Use "Import Profile" to restore previously saved configurations
              </p>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium">About Profiles</h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                • Profile files contain all your sound clips (including audio data), trigger words, and app settings
              </p>
              <p>
                • Files are saved in JSON format and can be shared between different devices or users
              </p>
              <p>
                • Audio files are embedded as base64 data, so profiles can be large depending on your sound library
              </p>
              <p>
                • Export regularly to avoid losing your work
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}